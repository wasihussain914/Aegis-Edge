// Geometry helpers: NED kinematics, CPA, and the render-frame transform.
import * as THREE from "three";
import type { Ned } from "./types";

// 1 metre -> world units. 1 km of AO -> 10 units keeps the camera/depth-buffer happy.
export const SCALE = 0.01;

// Half-extent of the defended area-of-operations (metres). 1 km² FOB sits inside a
// generous 2 km × 2 km sensing/AO footprint so ingress is visible before the boundary.
export const AO_HALF_M = 1000;

/** NED (north, east, alt) -> three.js world (X=east, Y=alt, Z=-north), scaled. */
export function worldFromNed(p: Ned): THREE.Vector3 {
  return new THREE.Vector3(p.e * SCALE, p.alt * SCALE, -p.n * SCALE);
}

export function worldTuple(p: Ned): [number, number, number] {
  return [p.e * SCALE, p.alt * SCALE, -p.n * SCALE];
}

/** Slant range to the FOB at NED origin. */
export function slantRange(p: Ned): number {
  return Math.hypot(p.n, p.e, p.alt);
}

export function speedOf(v: Ned): number {
  return Math.hypot(v.n, v.e, v.alt);
}

export interface Cpa {
  cpa: number;
  timeToCpa: number;
  closing: boolean;
}

/**
 * Closest Point of Approach of a constant-velocity track to the FOB (origin).
 * r0 = current position, v = velocity. t* = -(r0·v)/|v|².
 */
export function computeCpa(p: Ned, v: Ned): Cpa {
  const vv = v.n * v.n + v.e * v.e + v.alt * v.alt;
  const range = slantRange(p);
  if (vv < 1e-6) return { cpa: range, timeToCpa: 0, closing: false };

  const rdotv = p.n * v.n + p.e * v.e + p.alt * v.alt;
  const tStar = -rdotv / vv;
  if (tStar <= 0) {
    // Moving away (or tangential past CPA): nearest approach is now.
    return { cpa: range, timeToCpa: 0, closing: false };
  }
  const cn = p.n + v.n * tStar;
  const ce = p.e + v.e * tStar;
  const ca = p.alt + v.alt * tStar;
  return {
    cpa: Math.hypot(cn, ce, ca),
    timeToCpa: tStar,
    closing: true,
  };
}
