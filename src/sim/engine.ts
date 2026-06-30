// The simulation step. Advances kinematics, recomputes IMM-style maneuver weight,
// CPA / time-to-CPA, and re-runs the deterministic gate for every track each frame.
// This is the "fast path": detection -> fusion -> ROE gate, no model in the loop.
import { computeCpa, slantRange, speedOf } from "./geo";
import { evaluate, type GateContext } from "./gate";
import type { Ned, Track, Wcs } from "./types";

const TRAIL_MAX = 64;
const PREDICT_HORIZON_S = 8;
const PREDICT_STEPS = 16;

export interface StepInput {
  wcs: Wcs;
  autoArmed: boolean;
  dt: number;
  t: number;
}

function predictPath(pos: Ned, vel: Ned): Ned[] {
  const out: Ned[] = [];
  const step = PREDICT_HORIZON_S / PREDICT_STEPS;
  for (let i = 1; i <= PREDICT_STEPS; i++) {
    const s = step * i;
    out.push({
      n: pos.n + vel.n * s,
      e: pos.e + vel.e * s,
      alt: Math.max(2, pos.alt + vel.alt * s),
    });
  }
  return out;
}

/** Returns a new track list (immutable update) advanced by dt seconds. */
export function step(tracks: Track[], input: StepInput): Track[] {
  const { wcs, autoArmed, dt, t } = input;

  return tracks.map((tr) => {
    if (!tr.alive || t < tr.spawnT) return tr;

    // Resolve a committed defeat ~1.5 s after engagement (effect time-of-flight).
    if (tr.engaged && !tr.defeated && tr.defeatT !== undefined && t >= tr.defeatT) {
      return { ...tr, defeated: true, alive: false };
    }

    // Integrate position. Non-cooperative inbounds make small course corrections
    // (terminal guidance); cooperatives fly straight.
    const vel = { ...tr.vel };
    if (tr.affiliation === "noncoop" && !tr.engaged) {
      const horiz = Math.hypot(tr.pos.n, tr.pos.e) || 1;
      const un = -tr.pos.n / horiz;
      const ue = -tr.pos.e / horiz;
      const sp = Math.hypot(vel.n, vel.e) || 1;
      // gentle homing: blend current heading toward the FOB
      const k = 0.06;
      vel.n = (vel.n / sp) * (1 - k) * sp + un * k * sp;
      vel.e = (vel.e / sp) * (1 - k) * sp + ue * k * sp;
    }

    const pos: Ned = {
      n: tr.pos.n + vel.n * dt,
      e: tr.pos.e + vel.e * dt,
      alt: Math.max(2, tr.pos.alt + vel.alt * dt),
    };

    const cpa = computeCpa(pos, vel);
    const range = slantRange(pos);
    const speed = speedOf(vel);

    // IMM maneuver-model weight: rises with heading change & proximity (cosmetic-but-plausible).
    const turn = Math.abs(vel.n * tr.vel.e - vel.e * tr.vel.n) / (speed * speed + 1);
    const pManeuver = Math.min(0.95, 0.05 + turn * 8 + (range < 400 ? 0.2 : 0));

    const ctx: GateContext = {
      wcs,
      autoArmed,
      positiveId: tr.positiveId,
      selfDefense: false,
      cooperative: tr.affiliation === "coop",
    };
    const gate = evaluate(
      { cpa: cpa.cpa, timeToCpa: cpa.timeToCpa, rangeNow: range, speed, closing: cpa.closing, pManeuver },
      ctx,
    );

    const trail = tr.trail.length >= TRAIL_MAX ? tr.trail.slice(1) : tr.trail.slice();
    trail.push(tr.pos);

    return {
      ...tr,
      pos,
      vel,
      speed,
      rangeM: range,
      cpaM: cpa.cpa,
      timeToCpaS: cpa.timeToCpa,
      closing: cpa.closing,
      pManeuver,
      gate,
      trail,
      predicted: tr.affiliation === "noncoop" ? predictPath(pos, vel) : [],
    };
  });
}
