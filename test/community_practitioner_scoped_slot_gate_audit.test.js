import test from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/practitioner_scoped_slot_gate_audit.mjs";

const failOut = { error: { code: "validation_error", message: "invalid practitioner-filtered slot input." }, ok: false };

test("accepts homogeneous list with extra ignored keys", () => {
  const out = runFeature({ appointments: [{ practitionerId: "demo-cardio", status: "scheduled" }, { practitionerId: "demo-cardio", status: "completed" }], practitionerId: "demo-cardio" });
  assert.deepEqual(out, { count: 2, ok: true, practitionerId: "demo-cardio" });
  assert.deepEqual(Object.keys(out), ["count", "ok", "practitionerId"]);
  assert.deepEqual(Object.keys(out.error || {}), []);
});

test("accepts empty array and minimal valid id", () => {
  assert.deepEqual(runFeature({ appointments: [], practitionerId: "demo-cardio" }), { count: 0, ok: true, practitionerId: "demo-cardio" });
  assert.deepEqual(runFeature({ appointments: [], practitionerId: "demo-a" }), { count: 0, ok: true, practitionerId: "demo-a" });
  assert.deepEqual(runFeature({ appointments: [], practitionerId: "demo-A_9-z" }), { count: 0, ok: true, practitionerId: "demo-A_9-z" });
});

test("rejects null array and non-object payload", () => {
  assert.deepEqual(runFeature(null), failOut);
  assert.deepEqual(runFeature([]), failOut);
  assert.deepEqual(runFeature("demo-cardio"), failOut);
  assert.deepEqual(runFeature(42), failOut);
  assert.deepEqual(runFeature(undefined), failOut);
});

test("rejects missing and extra top keys", () => {
  assert.deepEqual(runFeature({ practitionerId: "demo-cardio" }), failOut);
  assert.deepEqual(runFeature({ appointments: [] }), failOut);
  assert.deepEqual(runFeature({}), failOut);
  assert.deepEqual(runFeature({ appointments: [], practitionerId: "demo-cardio", extra: 1 }), failOut);
  assert.deepEqual(runFeature({ appointments: [], practitionerId: "demo-cardio", count: 0 }), failOut);
});

test("rejects bad practitionerId shape", () => {
  assert.deepEqual(runFeature({ appointments: [], practitionerId: 42 }), failOut);
  assert.deepEqual(runFeature({ appointments: [], practitionerId: "prod-cardio" }), failOut);
  assert.deepEqual(runFeature({ appointments: [], practitionerId: "demo-" }), failOut);
  assert.deepEqual(runFeature({ appointments: [], practitionerId: "demo" }), failOut);
  assert.deepEqual(runFeature({ appointments: [], practitionerId: "demo-bad!" }), failOut);
  assert.deepEqual(runFeature({ appointments: [], practitionerId: "demo-bad space" }), failOut);
  const long65 = "demo-" + "a".repeat(60);
  assert.equal(long65.length, 65);
  assert.deepEqual(runFeature({ appointments: [], practitionerId: long65 }), failOut);
  const max64 = "demo-" + "a".repeat(59);
  assert.equal(max64.length, 64);
  assert.deepEqual(runFeature({ appointments: [], practitionerId: max64 }), { count: 0, ok: true, practitionerId: max64 });
});

test("rejects non-array appointments and bad entries", () => {
  assert.deepEqual(runFeature({ appointments: "x", practitionerId: "demo-cardio" }), failOut);
  assert.deepEqual(runFeature({ appointments: null, practitionerId: "demo-cardio" }), failOut);
  assert.deepEqual(runFeature({ appointments: [null], practitionerId: "demo-cardio" }), failOut);
  assert.deepEqual(runFeature({ appointments: [[]], practitionerId: "demo-cardio" }), failOut);
  assert.deepEqual(runFeature({ appointments: ["demo-cardio"], practitionerId: "demo-cardio" }), failOut);
  assert.deepEqual(runFeature({ appointments: [{}], practitionerId: "demo-cardio" }), failOut);
  assert.deepEqual(runFeature({ appointments: [{ practitionerId: 42 }], practitionerId: "demo-cardio" }), failOut);
  assert.deepEqual(runFeature({ appointments: [{ other: 1 }], practitionerId: "demo-cardio" }), failOut);
});

test("rejects mixed practitioner list and oversized list", () => {
  const out = runFeature({ appointments: [{ practitionerId: "demo-cardio" }, { practitionerId: "demo-clinica-geral" }], practitionerId: "demo-cardio" });
  assert.deepEqual(out, failOut);
  assert.deepEqual(Object.keys(out), ["error", "ok"]);
  assert.deepEqual(Object.keys(out.error), ["code", "message"]);
  const big = [];
  for (let n = 0; n < 51; n++) {
    big.push({ practitionerId: "demo-cardio" });
  }
  assert.deepEqual(runFeature({ appointments: big, practitionerId: "demo-cardio" }), failOut);
  const ok50 = [];
  for (let n = 0; n < 50; n++) {
    ok50.push({ practitionerId: "demo-cardio", note: n });
  }
  assert.deepEqual(runFeature({ appointments: ok50, practitionerId: "demo-cardio" }), { count: 50, ok: true, practitionerId: "demo-cardio" });
});

test("preserves input and stays deterministic with canonical keys", () => {
  const payload = { appointments: [{ practitionerId: "demo-cardio", note: "x" }], practitionerId: "demo-cardio" };
  const before = JSON.stringify(payload);
  const a = runFeature(payload);
  const b = runFeature(JSON.parse(before));
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(payload), before);
  assert.deepEqual(Object.keys(a), ["count", "ok", "practitionerId"]);
  const f1 = runFeature({ appointments: [{ practitionerId: "demo-a" }], practitionerId: "demo-b" });
  const f2 = runFeature({ appointments: [{ practitionerId: "demo-a" }], practitionerId: "demo-b" });
  assert.deepEqual(f1, failOut);
  assert.deepEqual(f1, f2);
  assert.deepEqual(Object.keys(f1), ["error", "ok"]);
});
