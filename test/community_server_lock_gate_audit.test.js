import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/server_lock_gate_audit.mjs";

const invalidShape = { error: { code: "validation_error", message: "invalid server lock." }, ok: false };

function checkInvalid(payload) {
  const before = JSON.stringify(payload);
  const out = runFeature(payload);
  assert.deepStrictEqual(out, invalidShape);
  assert.deepStrictEqual(Object.keys(out), ["error", "ok"]);
  assert.deepStrictEqual(Object.keys(out.error), ["code", "message"]);
  assert.strictEqual(JSON.stringify(payload), before);
}

test("equal pids can start with sorted keys and no mutation", () => {
  const input = { currentPid: 1234, requestPid: 1234 };
  const snap = JSON.stringify(input);
  const out = runFeature(input);
  assert.deepStrictEqual(out, { canStart: true, currentPid: 1234, ok: true, requestPid: 1234 });
  assert.deepStrictEqual(Object.keys(out), ["canStart", "currentPid", "ok", "requestPid"]);
  assert.strictEqual(JSON.stringify(input), snap);
  const again = runFeature({ currentPid: 1234, requestPid: 1234 });
  assert.deepStrictEqual(again, out);
});

test("different pids cannot start with sorted keys and no mutation", () => {
  const input = { currentPid: 1234, requestPid: 5678 };
  const snap = JSON.stringify(input);
  const out = runFeature(input);
  assert.deepStrictEqual(out, { canStart: false, currentPid: 1234, ok: true, requestPid: 5678 });
  assert.deepStrictEqual(Object.keys(out), ["canStart", "currentPid", "ok", "requestPid"]);
  assert.strictEqual(JSON.stringify(input), snap);
});

test("rejects null array and non-object payloads", () => {
  checkInvalid(null);
  checkInvalid([1, 2]);
  checkInvalid([]);
  checkInvalid("lock");
  checkInvalid(1234);
  checkInvalid(undefined);
  checkInvalid(true);
});

test("rejects missing or extra keys", () => {
  checkInvalid({});
  checkInvalid({ currentPid: 1 });
  checkInvalid({ requestPid: 1 });
  checkInvalid({ currentPid: 1, requestPid: 2, extra: 3 });
  checkInvalid({ currentPid: 1, other: 2 });
});

test("rejects wrong types and non-integers", () => {
  checkInvalid({ currentPid: "1234", requestPid: 1234 });
  checkInvalid({ currentPid: 1234, requestPid: "5678" });
  checkInvalid({ currentPid: 1.5, requestPid: 2 });
  checkInvalid({ currentPid: 1, requestPid: 2.5 });
  checkInvalid({ currentPid: null, requestPid: 1 });
  checkInvalid({ currentPid: 1, requestPid: null });
});

test("rejects out of range pids", () => {
  checkInvalid({ currentPid: 0, requestPid: 1234 });
  checkInvalid({ currentPid: 1234, requestPid: 0 });
  checkInvalid({ currentPid: -5, requestPid: 10 });
  checkInvalid({ currentPid: 10, requestPid: -1 });
  checkInvalid({ currentPid: 2147483648, requestPid: 1 });
  checkInvalid({ currentPid: 1, requestPid: 2147483648 });
  checkInvalid({ currentPid: Number.NaN, requestPid: 1 });
  checkInvalid({ currentPid: 1, requestPid: Number.POSITIVE_INFINITY });
});

test("accepts boundary pids", () => {
  const low = runFeature({ currentPid: 1, requestPid: 1 });
  assert.deepStrictEqual(low, { canStart: true, currentPid: 1, ok: true, requestPid: 1 });
  const high = runFeature({ currentPid: 2147483647, requestPid: 2147483647 });
  assert.deepStrictEqual(high, { canStart: true, currentPid: 2147483647, ok: true, requestPid: 2147483647 });
  const mixed = runFeature({ currentPid: 1, requestPid: 2147483647 });
  assert.deepStrictEqual(mixed, { canStart: false, currentPid: 1, ok: true, requestPid: 2147483647 });
});
