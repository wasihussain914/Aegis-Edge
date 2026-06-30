// Scenario seeding. Deterministic (seeded RNG) so runs are reproducible and the
// metrics panel reports the same FP analysis as the platform's analyze_metrics.py.
import type { Affiliation, Ned, PositiveId, Track, TrackKind } from "./types";

// --- tiny seeded RNG (mulberry32) -----------------------------------------
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blankGate(): Track["gate"] {
  return {
    classification: "CLEAR",
    recommendedAction: "MONITOR",
    effectAuthorized: false,
    recommendOnly: true,
    requiresTwoPerson: false,
    fratricideBlock: false,
  };
}

interface Seed {
  id: string;
  kind: TrackKind;
  role: string;
  affiliation: Affiliation;
  positiveId: PositiveId;
  pos: Ned;
  vel: Ned;
  spawnT: number;
}

function mk(s: Seed): Track {
  const speed = Math.hypot(s.vel.n, s.vel.e, s.vel.alt);
  return {
    ...s,
    speed,
    rangeM: Math.hypot(s.pos.n, s.pos.e, s.pos.alt),
    cpaM: 0,
    timeToCpaS: 0,
    closing: false,
    pManeuver: 0.1,
    gate: blankGate(),
    alive: true,
    engaged: false,
    defeated: false,
    trail: [],
    predicted: [],
  };
}

/** Bearing (deg from north, clockwise) + range + alt -> NED position. */
function fromBearing(bearingDeg: number, rangeM: number, altM: number): Ned {
  const b = (bearingDeg * Math.PI) / 180;
  return { n: rangeM * Math.cos(b), e: rangeM * Math.sin(b), alt: altM };
}

/** Velocity heading toward the FOB origin (with optional cross/vertical bias). */
function inboundVel(pos: Ned, speed: number, crossBias = 0, climb = 0): Ned {
  const horiz = Math.hypot(pos.n, pos.e) || 1;
  // unit vector toward origin
  let un = -pos.n / horiz;
  let ue = -pos.e / horiz;
  // add a perpendicular cross component for a curved/offset approach
  const pn = -ue;
  const pe = un;
  un += pn * crossBias;
  ue += pe * crossBias;
  const m = Math.hypot(un, ue) || 1;
  return { n: (un / m) * speed, e: (ue / m) * speed, alt: climb };
}

// The 3 cooperative aircraft mirror FR-01/02/03 from the canonical swarm scenario.
function cooperatives(): Track[] {
  return [
    mk({
      id: "FR-01",
      kind: "fixed-wing",
      role: "light aircraft (ADS-B)",
      affiliation: "coop",
      positiveId: "friendly",
      pos: { n: 1605, e: -501, alt: 220 },
      vel: { n: -47, e: 70, alt: -2 },
      spawnT: 0,
    }),
    mk({
      id: "FR-02",
      kind: "rotary",
      role: "helicopter (ADS-B)",
      affiliation: "coop",
      positiveId: "friendly",
      pos: { n: 549, e: 1533, alt: 140 },
      vel: { n: 37, e: 15, alt: 0 },
      spawnT: 0,
    }),
    mk({
      id: "FR-03",
      kind: "friendly-uas",
      role: "friendly UAS (Remote ID)",
      affiliation: "coop",
      positiveId: "friendly",
      pos: { n: -1177, e: -139, alt: 90 },
      vel: { n: 13, e: -17, alt: 0 },
      spawnT: 0,
    }),
  ];
}

export type ScenarioKind = "single" | "swarm";

export function buildScenario(kind: ScenarioKind): Track[] {
  const r = rng(kind === "swarm" ? 0x5717 : 0x01);
  const tracks: Track[] = cooperatives();

  const count = kind === "swarm" ? 18 : 1;
  for (let i = 0; i < count; i++) {
    const bearing = kind === "swarm" ? r() * 360 : 8 + r() * 14;
    const range = 1500 + r() * 600;
    const alt = 40 + r() * 160;
    const speed = 18 + r() * 16; // 18..34 m/s small-UAS regime
    const cross = (r() - 0.5) * 0.5;
    const climb = -(r() * 1.5); // gentle descent toward target
    const pos = fromBearing(bearing, range, alt);
    tracks.push(
      mk({
        id: `SW-${String(i + 1).padStart(2, "0")}`,
        kind: "small-uas",
        role: "inbound small-UAS (non-cooperative)",
        affiliation: "noncoop",
        positiveId: "unknown",
        pos,
        vel: inboundVel(pos, speed, cross, climb),
        spawnT: kind === "swarm" ? i * 0.6 : 0,
      }),
    );
  }
  return tracks;
}
