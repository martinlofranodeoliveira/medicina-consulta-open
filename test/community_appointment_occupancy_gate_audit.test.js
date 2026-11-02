import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/appointment_occupancy_gate_audit.mjs";

test("scheduled is occupied with sorted keys", () => {
  const out = runFeature({ status: "scheduled" });
  assert.deepEqual(out, { occupied: true, ok: true, status: "scheduled" });
  assert.deepEqual(Object.keys(out), ["occupied", "ok", "status"]);
});

test("completed is occupied with sorted keys", () => {
  const out = runFeature({ status: "completed" });
  assert.deepEqual(out, { occupied: true, ok: true, status: "completed" });
  assert.deepEqual(Object.keys(out), ["occupied", "ok", "status"]);
});

test("cancelled frees interval with sorted keys", () => {
  const out = runFeature({ status: "cancelled" });
  assert.deepEqual(out, { occupied: false, ok: true, status: "cancelled" });
  assert.deepEqual(Object.keys(out), ["occupied", "ok", "status"]);
});

test("rejects unknown status with validation_error and no partial data", () => {
  const out = runFeature({ status: "done" });
  assert.deepEqual(out, { error: { code: "validation_error", message: "invalid appointment occupancy." }, ok: false });
  assert.deepEqual(Object.keys(out), ["error", "ok"]);
  assert.deepEqual(Object.keys(out.error), ["code", "message"]);
  assert.equal("occupied" in out, false);
  assert.equal("status" in out, false);
});

test("rejects null array and non-object payloads", () => {
  for (const bad of [null, [], [{ status: "scheduled" }], "scheduled", 1, true, undefined]) {
    const out = runFeature(bad);
    assert.equal(out.ok, false);
    assert.deepEqual(out.error, { code: "validation_error", message: "invalid appointment occupancy." });
    assert.equal("occupied" in out, false);
  }
});

test("rejects missing extra and wrong key", () => {
  const cases = [{}, { wrong: "scheduled" }, { status: "scheduled", extra: 1 }, { status: "cancelled", ok: true }];
  for (const c of cases) {
    const out = runFeature(c);
    assert.equal(out.ok, false);
    assert.deepEqual(out.error, { code: "validation_error", message: "invalid appointment occupancy." });
  }
});

test("rejects wrong status types and case variants", () => {
  const cases = [{ status: null }, { status: 1 }, { status: true }, { status: "Scheduled" }, { status: "SCHEDULED" }, { status: "" }, { status: " scheduled" }];
  for (const c of cases) {
    const out = runFeature(c);
    assert.equal(out.ok, false);
    assert.deepEqual(out.error, { code: "validation_error", message: "invalid appointment occupancy." });
  }
});

test("preserves input and returns new objects deterministically", () => {
  const input = { status: "scheduled" };
  const snap = JSON.stringify(input);
  const a = runFeature(input);
  const b = runFeature({ status: "scheduled" });
  assert.equal(JSON.stringify(input), snap);
  assert.deepEqual(Object.keys(input), ["status"]);
  assert.notEqual(a, input);
  assert.deepEqual(a, b);
  assert.notEqual(a, b);
});
