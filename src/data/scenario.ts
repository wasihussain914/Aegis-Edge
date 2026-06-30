/**
 * Synthetic scenario for the 1 km² protected site "Joint Base Cascade — North Gate".
 * Procedural but seeded/deterministic. Buildings, sensor sites, and several drone tracks
 * with realistic waypoint flight paths (incl. the hostile penetrator, track 0427).
 *
 * Units: meters, site-local ENU (x east, y up, z north). Site spans ~1000 m.
 */
import type { TrackFeatures } from "../model/threatCall.js";

export interface Building { x: number; z: number; w: number; d: number; h: number; }
export interface SensorSite { id: string; modality: "radar" | "rf" | "eoir"; x: number; z: number; rangeM: number; }
export interface Waypoint { x: number; y: number; z: number; }
export interface DroneTrack {
  id: string;
  path: Waypoint[];          // flight path waypoints (looped)
  speedMps: number;
  features: TrackFeatures;   // what the sensors report (drives the threat-call)
  truth: "hostile" | "friendly" | "bird" | "clutter";
}

export const SITE = { size: 1000, protectedAsset: { x: 0, z: 0, r: 90 }, noFlyR: 250 };

// Deterministic PRNG (mulberry32) so the city is identical every run.
function rng(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildings(): Building[] {
  const r = rng(20260629);
  const out: Building[] = [];
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 900;
    const z = (r() - 0.5) * 900;
    if (Math.hypot(x, z) < SITE.protectedAsset.r + 30) continue; // keep the asset plaza clear
    const w = 14 + r() * 40, d = 14 + r() * 40, h = 10 + r() * 70;
    out.push({ x, z, w, d, h });
  }
  return out;
}

export const sensors: SensorSite[] = [
  { id: "RAD-1", modality: "radar", x: 0, z: 0, rangeM: 500 },
  { id: "RF-1", modality: "rf", x: -120, z: 80, rangeM: 450 },
  { id: "EO-1", modality: "eoir", x: 110, z: -70, rangeM: 380 },
];

/** A loop path from an edge, weaving toward the protected asset. */
function ingressPath(startAngleDeg: number, altM: number): Waypoint[] {
  const a = (startAngleDeg * Math.PI) / 180;
  const r0 = 480;
  return [
    { x: Math.cos(a) * r0, y: altM, z: Math.sin(a) * r0 },
    { x: Math.cos(a) * 320, y: altM * 0.9, z: Math.sin(a) * 320 },
    { x: Math.cos(a + 0.4) * 180, y: altM * 0.8, z: Math.sin(a + 0.4) * 180 },
    { x: 40, y: altM * 0.7, z: 30 },          // over the asset
    { x: Math.cos(a + 1.2) * 260, y: altM, z: Math.sin(a + 1.2) * 260 },
  ];
}

export function tracks(): DroneTrack[] {
  return [
    {
      id: "0427", truth: "hostile", speedMps: 14,
      path: ingressPath(41, 120),
      features: { trackId: "0427", rcsM2: 0.05, altM: 120, speedMps: 14, rfEmitter: "commercial-uas-c2", thermalQuad: true, friendlyTransponder: false, insideNoFly: true },
    },
    {
      id: "0192", truth: "friendly", speedMps: 60,
      path: ingressPath(200, 400),
      features: { trackId: "0192", rcsM2: 3.2, altM: 400, speedMps: 60, rfEmitter: "telemetry", thermalQuad: false, friendlyTransponder: true, insideNoFly: false },
    },
    {
      id: "0205", truth: "bird", speedMps: 9,
      path: ingressPath(300, 70),
      features: { trackId: "0205", rcsM2: 0.8, altM: 70, speedMps: 9, rfEmitter: "none", thermalQuad: false, friendlyTransponder: false, insideNoFly: true },
    },
    {
      id: "0318", truth: "hostile", speedMps: 18,
      path: ingressPath(120, 95),
      features: { trackId: "0318", rcsM2: 0.09, altM: 95, speedMps: 18, rfEmitter: "commercial-uas-c2", thermalQuad: true, friendlyTransponder: false, insideNoFly: true },
    },
  ];
}
