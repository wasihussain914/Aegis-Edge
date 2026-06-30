/**
 * Answer-key lock (R2.4). Runs the deterministic classifier over the REAL scenario tracks
 * and asserts the published answer key:
 *   - hostiles 0427 & 0318 classify as HIGH-threat drones,
 *   - the friendly (0192) and the bird (0205) are NEVER promoted to a threat.
 * This pins classifier behavior so future realism passes can't silently break the kill-chain.
 * Run via `npm test` (node --test + tsx).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "./threatCall.js";
import { tracks } from "../data/scenario.js";

const byId = Object.fromEntries(tracks().map((t) => [t.id, t]));

function classifyId(id: string) {
  const t = byId[id];
  assert.ok(t, `scenario track ${id} must exist`);
  return classify(t.features);
}

test("0427 hostile → HIGH-threat drone", () => {
  const k = classifyId("0427");
  assert.equal(k.class, "drone");
  assert.equal(k.threat, "HIGH");
});

test("0318 hostile → HIGH-threat drone", () => {
  const k = classifyId("0318");
  assert.equal(k.class, "drone");
  assert.equal(k.threat, "HIGH");
});

test("0192 friendly is NOT promoted to a threat", () => {
  const k = classifyId("0192");
  assert.notEqual(k.class, "drone");
  assert.equal(k.threat, "NONE", "friendly transponder must suppress threat");
});

test("0205 bird is NOT promoted to a threat", () => {
  const k = classifyId("0205");
  assert.equal(k.class, "bird");
  assert.equal(k.threat, "NONE", "a bird must never reach the threat list");
});

test("only the two hostiles reach a non-NONE threat", () => {
  const promoted = tracks()
    .map((t) => classify(t.features))
    .filter((k) => k.threat !== "NONE")
    .map((k) => k.trackId)
    .sort();
  assert.deepEqual(promoted, ["0318", "0427"]);
});
