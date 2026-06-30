// War-room palette — carried over from the platform's C-UAS console chrome.
import type { Classification, Track } from "./sim/types";

export const COLOR = {
  ink: "#0E1726",
  ink2: "#0A1018",
  panel: "#16223a",
  line: "#243247",
  line2: "#2f4255",
  paper: "#ECE6DA",
  sub: "#BFC5CE",
  faint: "#8a98a8",
  bronze: "#C79A53",
  green: "#3EB489",
  warn: "#d9a441",
  crit: "#e0524b",
  sky: "#6aa9e0",
} as const;

export function classColor(c: Classification): string {
  switch (c) {
    case "CRITICAL":
      return COLOR.crit;
    case "WARNING":
      return COLOR.warn;
    case "COOPERATIVE":
      return COLOR.sky;
    case "CLEAR":
    default:
      return COLOR.green;
  }
}

/** Priority for the threat list: CRITICAL > WARNING > closing CLEAR > rest. */
export function trackColor(tr: Track): string {
  if (tr.affiliation === "coop") return COLOR.sky;
  return classColor(tr.gate.classification);
}

export function priorityScore(tr: Track): number {
  if (tr.affiliation === "coop") return -1;
  const base =
    tr.gate.classification === "CRITICAL" ? 3000 : tr.gate.classification === "WARNING" ? 2000 : 1000;
  // sooner time-to-CPA ranks higher
  return base - Math.min(999, tr.timeToCpaS);
}
