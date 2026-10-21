import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/appointment_draft_audit.mjs";
function expectInvalid(result) {
  assert.equal(result.ok, false);
  assert.deepEqual(result.error, { code: "validation_error", message: "invalid appointment draft." });
  assert.equal("startsAtUtc" in result, false);
  assert.equal("practitionerId" in result, false);
  assert.equal(Object.keys(result).length, 2);
}
test("valid offset draft normalizes to UTC", () => {
  const out = runFeature({ practitionerId: "demo-clinica-geral", patientRef: "exemplo_001", startsAt: "2030-04-08T09:00:00-03:00", durationMinutes: 30 });
  assert.equal(out.ok, true);
  assert.equal(out.startsAtUtc, "2030-04-08T12:00:00.000Z");
  assert.equal(out.practitionerId, "demo-clinica-geral");
  assert.equal(out.patientRef, "exemplo_001");
  assert.equal(out.startsAt, "2030-04-08T09:00:00-03:00");
  assert.equal(out.durationMinutes, 30);
});
test("valid Zulu draft normalizes with suffix", () => {
  const out = runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 15 });
  assert.equal(out.ok, true);
  assert.equal(out.startsAtUtc, "2030-04-08T12:00:00.000Z");
});
test("rejects bad offset minute 07", () => {
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T09:00:00+03:07", durationMinutes: 30 }));
});
test("rejects non-grid local minute", () => {
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T09:07:00Z", durationMinutes: 30 }));
});
test("rejects missing timezone", () => {
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T09:00:00", durationMinutes: 30 }));
});
test("rejects bad practitioner", () => {
  expectInvalid(runFeature({ practitionerId: "bad-one", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 15 }));
  expectInvalid(runFeature({ practitionerId: "demo-bad!", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 15 }));
});
test("rejects bad patient reference", () => {
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "bad ref!", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 15 }));
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 15 }));
});
test("rejects bad duration", () => {
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 20 }));
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 10 }));
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 15.5 }));
});
test("rejects invalid calendar day and bad offset hour", () => {
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-02-29T12:00:00Z", durationMinutes: 15 }));
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00+15:00", durationMinutes: 15 }));
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00+14:15", durationMinutes: 15 }));
});
test("rejects extra and missing keys and non-objects", () => {
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "a", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 15, extra: 1 }));
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "a", startsAt: "2030-04-08T12:00:00Z" }));
  expectInvalid(runFeature(null));
  expectInvalid(runFeature([]));
  expectInvalid(runFeature("x"));
});
test("rejects normalized year outside range", () => {
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "a", startsAt: "0000-01-01T00:00:00+14:00", durationMinutes: 15 }));
  expectInvalid(runFeature({ practitionerId: "demo-cardio", patientRef: "a", startsAt: "9999-12-31T23:45:00-14:00", durationMinutes: 15 }));
});
test("day carry across month boundary", () => {
  const out = runFeature({ practitionerId: "demo-cardio", patientRef: "a", startsAt: "2030-01-01T00:00:00+02:00", durationMinutes: 15 });
  assert.equal(out.ok, true);
  assert.equal(out.startsAtUtc, "2029-12-31T22:00:00.000Z");
});
test("leap day accepted on leap year", () => {
  const out = runFeature({ practitionerId: "demo-cardio", patientRef: "a", startsAt: "2028-02-29T12:00:00Z", durationMinutes: 15 });
  assert.equal(out.ok, true);
  assert.equal(out.startsAtUtc, "2028-02-29T12:00:00.000Z");
});
test("forward carry across year boundary", () => {
  const out = runFeature({ practitionerId: "demo-cardio", patientRef: "a", startsAt: "2030-12-31T23:30:00-02:00", durationMinutes: 15 });
  assert.equal(out.ok, true);
  assert.equal(out.startsAtUtc, "2031-01-01T01:30:00.000Z");
});
test("new objects only, no mutation, deterministic", () => {
  const payload = { practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 15 };
  const snapshot = { practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 15 };
  const a = runFeature(payload);
  const b = runFeature({ practitionerId: "demo-cardio", patientRef: "synthetic_001", startsAt: "2030-04-08T12:00:00Z", durationMinutes: 15 });
  assert.deepEqual(a, b);
  assert.notEqual(a, b);
  assert.deepEqual(payload, snapshot);
  assert.notEqual(a, payload);
});
test("pure module shape uses required constructs without Date", () => {
  const text = runFeature.toString();
  assert.ok(text.includes("Object.entries"));
  assert.ok(text.includes("push"));
  assert.ok(text.includes("Map"));
  assert.ok(text.includes("for"));
  assert.equal(text.includes("Date"), false);
});
