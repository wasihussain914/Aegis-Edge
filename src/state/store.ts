// Central app state (zustand). Owns the simulation tracks, posture, ledger and
// live metrics. The 3D scene and the HUD are both pure views over this store.
import { create } from "zustand";
import { step } from "../sim/engine";
import { appendEntry, verifyChain } from "../sim/ledger";
import { buildScenario, type ScenarioKind } from "../sim/scenario";
import type { LedgerEntry, Metrics, Track, Wcs } from "../sim/types";

const OPERATOR = "OP-7"; // single human operator on station
const SECOND = "SUP-2"; // second authorizer for two-person actions

export interface AppState {
  t: number;
  running: boolean;
  speed: number; // sim-time multiplier
  scenario: ScenarioKind;
  tracks: Track[];
  wcs: Wcs;
  autoArmed: boolean;
  selectedId: string | null;
  ledger: LedgerEntry[];
  metrics: Metrics;
  chainOk: boolean;

  // actions
  tick: (realDt: number) => void;
  setRunning: (r: boolean) => void;
  setSpeed: (s: number) => void;
  setScenario: (s: ScenarioKind) => void;
  reset: () => void;
  setWcs: (w: Wcs) => void;
  armAuto: () => void;
  select: (id: string | null) => void;
  recommendId: (id: string, pid: "hostile") => void;
  commitDefeat: (id: string) => void;
  abort: () => void;
  verify: () => void;
}

const emptyMetrics = (): Metrics => ({
  threatTracksSeen: 0,
  threatTracksDetected: 0,
  coopDecisions: 0,
  falseEngagements: 0,
});

function freshTracks(s: ScenarioKind): Track[] {
  return buildScenario(s);
}

export const useStore = create<AppState>((set, get) => ({
  t: 0,
  running: true,
  speed: 1,
  scenario: "swarm",
  tracks: freshTracks("swarm"),
  wcs: "TIGHT",
  autoArmed: false,
  selectedId: null,
  ledger: [],
  metrics: emptyMetrics(),
  chainOk: true,

  tick: (realDt) => {
    const s = get();
    if (!s.running) return;
    const dt = Math.min(0.1, realDt) * s.speed;
    const t = s.t + dt;
    const tracks = step(s.tracks, { wcs: s.wcs, autoArmed: s.autoArmed, dt, t });

    // Live metrics — recomputed the way detection-fp-analysis.md defines them.
    const m = emptyMetrics();
    const seenThreat = new Set<string>();
    const detectedThreat = new Set<string>();
    let ledger = s.ledger;
    let chainOk = s.chainOk;
    const next = tracks.map((tr) => {
      if (!tr.alive || t < tr.spawnT) return tr;
      if (tr.affiliation === "noncoop") {
        seenThreat.add(tr.id);
        if (tr.gate.classification !== "CLEAR" || tr.closing) detectedThreat.add(tr.id);
      } else {
        // every per-frame decision about a cooperative contact
        m.coopDecisions += 1;
        if (tr.gate.recommendedAction !== "HOLD_FRIENDLY") m.falseEngagements += 1;
      }

      // AUTO-armed critical => the gate auto-tasks a defeat (still logged, two-person armed).
      if (
        tr.affiliation === "noncoop" &&
        !tr.engaged &&
        tr.gate.recommendedAction === "AUTO_DEFEAT"
      ) {
        ledger = appendEntry(ledger, {
          t,
          outcome: "EXECUTED",
          action: "AUTO_DEFEAT (armed envelope)",
          trackId: tr.id,
          who: `${OPERATOR}+${SECOND}`,
        });
        return { ...tr, engaged: true, defeatT: t + 1.5 };
      }
      return tr;
    });

    m.threatTracksSeen = seenThreat.size;
    m.threatTracksDetected = detectedThreat.size;
    // carry cumulative coop-decision counters forward so the FP denominator grows
    m.coopDecisions += s.metrics.coopDecisions;
    m.falseEngagements += s.metrics.falseEngagements;

    set({ t, tracks: next, metrics: m, ledger, chainOk });
  },

  setRunning: (running) => set({ running }),
  setSpeed: (speed) => set({ speed }),
  setScenario: (scenario) =>
    set({ scenario, tracks: freshTracks(scenario), t: 0, ledger: [], metrics: emptyMetrics(), selectedId: null }),
  reset: () =>
    set((s) => ({ tracks: freshTracks(s.scenario), t: 0, ledger: [], metrics: emptyMetrics(), selectedId: null, autoArmed: false })),

  setWcs: (w) =>
    set((s) => ({
      wcs: w,
      autoArmed: w === "AUTO" ? s.autoArmed : false,
      ledger: appendEntry(s.ledger, {
        t: s.t,
        outcome: "POSTURE",
        action: `WCS → ${w}`,
        who: OPERATOR,
      }),
    })),

  armAuto: () =>
    set((s) => ({
      autoArmed: true,
      wcs: "AUTO",
      ledger: appendEntry(s.ledger, {
        t: s.t,
        outcome: "POSTURE",
        action: "AUTO-DEFENSE ARMED (two-person)",
        who: `${OPERATOR}+${SECOND}`,
      }),
    })),

  select: (id) => set({ selectedId: id }),

  recommendId: (id, pid) =>
    set((s) => ({
      tracks: s.tracks.map((tr) => (tr.id === id ? { ...tr, positiveId: pid } : tr)),
      ledger: appendEntry(s.ledger, {
        t: s.t,
        outcome: "ALLOWED",
        action: `POSITIVE ID → ${pid.toUpperCase()}`,
        trackId: id,
        who: OPERATOR,
      }),
    })),

  commitDefeat: (id) =>
    set((s) => {
      const tr = s.tracks.find((x) => x.id === id);
      // Hard guard: a cooperative contact can never be committed (fratricide block).
      if (!tr || tr.affiliation === "coop" || tr.gate.fratricideBlock) {
        return {
          ledger: appendEntry(s.ledger, {
            t: s.t,
            outcome: "DENIED",
            action: "DEFEAT BLOCKED — fratricide guard",
            trackId: id,
            who: OPERATOR,
          }),
        };
      }
      if (!tr.gate.effectAuthorized) {
        return {
          ledger: appendEntry(s.ledger, {
            t: s.t,
            outcome: "DENIED",
            action: "DEFEAT BLOCKED — not authorized under WCS",
            trackId: id,
            who: OPERATOR,
          }),
        };
      }
      const who = tr.gate.requiresTwoPerson ? `${OPERATOR}+${SECOND}` : OPERATOR;
      return {
        tracks: s.tracks.map((x) => (x.id === id ? { ...x, engaged: true, defeatT: s.t + 1.5 } : x)),
        ledger: appendEntry(s.ledger, {
          t: s.t,
          outcome: "EXECUTED",
          action: "DEFEAT — non-kinetic (RF) tasked",
          trackId: id,
          who,
        }),
      };
    }),

  abort: () =>
    set((s) => ({
      wcs: "HOLD",
      autoArmed: false,
      ledger: appendEntry(s.ledger, {
        t: s.t,
        outcome: "ABORT",
        action: "ABORT → MANUAL · WCS HOLD",
        who: OPERATOR,
      }),
    })),

  verify: () => set((s) => ({ chainOk: verifyChain(s.ledger).ok })),
}));
