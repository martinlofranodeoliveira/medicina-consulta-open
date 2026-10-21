import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/reschedule_identity_audit.mjs";

function baseEntry(over = {}) {
  return {
    id: "appt_01",
    practitionerId: "demo-clinica-geral",
    patientRef: "exemplo_001",
    startsAt: "2030-04-08T12:00:00.000Z",
    durationMinutes: 30,
    status: "scheduled",
    createdAt: "2030-04-01T12:00:00.000Z",
    ...over
  };
}
function payload(beforeOver = {}, afterOver = {}) {
  return { before: baseEntry(beforeOver), after: baseEntry(afterOver) };
}
function expectInvalid(result) {
  assert.equal(result.ok, false);
  assert.deepEqual(result, { ok: false, error: { code: "validation_error", message: "invalid reschedule identity." } });
}

describe("top payload shape", () => {
  it("rejects null, array and non-object", () => {
    expectInvalid(runFeature(null));
    expectInvalid(runFeature([]));
    expectInvalid(runFeature("x"));
    expectInvalid(runFeature(42));
  });
  it("rejects missing and extra top keys", () => {
    expectInvalid(runFeature({ before: baseEntry() }));
    expectInvalid(runFeature({ after: baseEntry() }));
    expectInvalid(runFeature({ before: baseEntry(), after: baseEntry(), extra: 1 }));
    expectInvalid(runFeature({}));
  });
  it("rejects non-object before/after", () => {
    expectInvalid(runFeature({ before: null, after: baseEntry() }));
    expectInvalid(runFeature({ before: baseEntry(), after: [] }));
    expectInvalid(runFeature({ before: "s", after: baseEntry() }));
  });
});

describe("entry validation", () => {
  it("rejects entry with missing or extra keys", () => {
    const b = baseEntry();
    delete b.status;
    expectInvalid(runFeature({ before: b, after: baseEntry() }));
    expectInvalid(runFeature({ before: baseEntry(), after: { ...baseEntry(), extra: 1 } }));
  });
  it("rejects bad id, practitioner and patientRef", () => {
    expectInvalid(runFeature(payload({ id: "" }, {})));
    expectInvalid(runFeature(payload({}, { id: "bad!" })));
    expectInvalid(runFeature(payload({ practitionerId: "prod-cardio" }, {})));
    expectInvalid(runFeature(payload({}, { practitionerId: "demo-" })));
    expectInvalid(runFeature(payload({ patientRef: "" }, {})));
    expectInvalid(runFeature(payload({}, { patientRef: "a b" })));
  });
  it("rejects bad startsAt grid and calendar", () => {
    expectInvalid(runFeature(payload({ startsAt: "2030-04-08T12:07:00.000Z" }, {})));
    expectInvalid(runFeature(payload({}, { startsAt: "2030-02-30T12:00:00.000Z" })));
    expectInvalid(runFeature(payload({ startsAt: "2023-02-29T12:00:00.000Z" }, {})));
    expectInvalid(runFeature(payload({}, { startsAt: "2030-13-01T12:00:00.000Z" })));
    expectInvalid(runFeature(payload({}, { startsAt: "2030-04-08T24:00:00.000Z" })));
    expectInvalid(runFeature(payload({}, { startsAt: "2030-04-08T12:00:01.000Z" })));
  });
  it("accepts leap day and rejects non-leap", () => {
    const okLeap = payload({ startsAt: "2024-02-29T12:00:00.000Z" }, { startsAt: "2024-02-29T12:00:00.000Z" });
    const r = runFeature(okLeap);
    assert.equal(r.ok, true);
    expectInvalid(runFeature(payload({ createdAt: "2023-02-29T12:00:00.000Z" }, {})));
  });
  it("rejects bad createdAt and duration and status", () => {
    expectInvalid(runFeature(payload({ createdAt: "2030-04-08T12:07:00.001Z" }, {})));
    expectInvalid(runFeature(payload({}, { durationMinutes: 20 })));
    expectInvalid(runFeature(payload({}, { durationMinutes: 10 })));
    expectInvalid(runFeature(payload({}, { durationMinutes: "30" })));
    expectInvalid(runFeature(payload({}, { status: "cancelled" })));
  });
});

describe("identity comparison", () => {
  it("identical time returns preserved true timeChanged false", () => {
    const r = runFeature(payload());
    assert.deepEqual(r, { ok: true, preserved: true, timeChanged: false, beforeId: "appt_01", afterId: "appt_01" });
  });
  it("different startsAt returns preserved true timeChanged true", () => {
    const r = runFeature(payload({}, { startsAt: "2030-04-08T13:00:00.000Z" }));
    assert.equal(r.ok, true);
    assert.equal(r.preserved, true);
    assert.equal(r.timeChanged, true);
  });
  it("different duration returns preserved true timeChanged true", () => {
    const r = runFeature(payload({}, { durationMinutes: 45 }));
    assert.equal(r.preserved, true);
    assert.equal(r.timeChanged, true);
  });
  it("changed id, practitioner, patientRef, createdAt return preserved false", () => {
    const a = runFeature(payload({}, { id: "appt_02" }));
    assert.equal(a.preserved, false);
    assert.equal(a.timeChanged, false);
    assert.equal(a.beforeId, "appt_01");
    assert.equal(a.afterId, "appt_02");
    const b = runFeature(payload({}, { practitionerId: "demo-outra" }));
    assert.equal(b.preserved, false);
    const c = runFeature(payload({}, { patientRef: "outro_9" }));
    assert.equal(c.preserved, false);
    const d = runFeature(payload({}, { createdAt: "2030-04-02T12:00:00.000Z", startsAt: "2030-04-08T13:00:00.000Z" }));
    assert.equal(d.preserved, false);
    assert.equal(d.timeChanged, true);
  });
  it("never mutates input and is deterministic", () => {
    const p = payload({}, { durationMinutes: 45 });
    const snap = JSON.stringify(p);
    const r1 = runFeature(p);
    const r2 = runFeature(p);
    assert.deepEqual(r1, r2);
    assert.equal(JSON.stringify(p), snap);
    assert.equal(typeof r1.beforeId, "string");
    assert.equal(typeof r1.afterId, "string");
  });
});
