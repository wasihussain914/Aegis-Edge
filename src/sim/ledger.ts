// Append-only, hash-chained governance ledger — the browser-side mirror of the
// platform's on-device ledger (core/ledger.ts). Every governed action (posture
// change, engagement decision, abort) is chained so the record is tamper-evident.
//
// NOTE: the fielded edge ledger uses SHA-256 + Ed25519 signatures. This in-browser
// visualization uses a compact synchronous FNV-1a chain for zero-dependency replay;
// the chaining property (each entry binds the previous tip) is identical.
import type { LedgerEntry } from "./types";

export const GENESIS = "GENESIS";

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // 8-hex-char tip, like a truncated digest
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function appendEntry(
  ledger: LedgerEntry[],
  e: Omit<LedgerEntry, "seq" | "prevHash" | "hash">,
): LedgerEntry[] {
  const prevHash = ledger.length ? ledger[ledger.length - 1].hash : GENESIS;
  const seq = ledger.length + 1;
  const body = `${seq}|${e.t.toFixed(1)}|${e.outcome}|${e.action}|${e.trackId ?? ""}|${e.who}|${prevHash}`;
  const hash = fnv1a(body);
  return [...ledger, { ...e, seq, prevHash, hash }];
}

/** Recompute the chain and report the first break, if any. */
export function verifyChain(ledger: LedgerEntry[]): { ok: boolean; brokenAt?: number } {
  let prev = GENESIS;
  for (const e of ledger) {
    const body = `${e.seq}|${e.t.toFixed(1)}|${e.outcome}|${e.action}|${e.trackId ?? ""}|${e.who}|${prev}`;
    if (fnv1a(body) !== e.hash || e.prevHash !== prev) {
      return { ok: false, brokenAt: e.seq };
    }
    prev = e.hash;
  }
  return { ok: true };
}
