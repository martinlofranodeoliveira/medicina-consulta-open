import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/schedule_conflict_audit.mjs";

function basePayload() {
  return {
    practitionerId: "demo-clinica-geral",
    candidate: { startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30 },
    appointments: []
  };
}

function invalidCheck(result) {
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "validation_error");
  assert.equal(result.error.message, "invalid schedule conflict check.");
  assert.equal(result.conflict, undefined);
  assert.equal(result.code, undefined);
}

describe("schedule conflict audit validation", () => {
  it("rejects null, array and non-object payload", () => {
    invalidCheck(runFeature(null));
    invalidCheck(runFeature([]));
    invalidCheck(runFeature("x"));
    invalidCheck(runFeature(42));
  });
  it("rejects extra payload keys and missing keys", () => {
    const p = basePayload();
    p.extra = 1;
    invalidCheck(runFeature(p));
    invalidCheck(runFeature({ practitionerId: "demo-abc123", candidate: { startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30 } }));
  });
  it("rejects non demo practitioner ids and bad characters", () => {
    const p1 = basePayload();
    p1.practitionerId = "prod-cardio";
    invalidCheck(runFeature(p1));
    const p2 = basePayload();
    p2.practitionerId = "demo-a!";
    invalidCheck(runFeature(p2));
    const p3 = basePayload();
    p3.practitionerId = "demo-";
    invalidCheck(runFeature(p3));
  });
  it("rejects off-grid startsAt and bad seconds millis", () => {
    const p1 = basePayload();
    p1.candidate.startsAt = "2030-04-08T12:07:00.000Z";
    invalidCheck(runFeature(p1));
    const p2 = basePayload();
    p2.candidate.startsAt = "2030-04-08T12:00:01.000Z";
    invalidCheck(runFeature(p2));
    const p3 = basePayload();
    p3.candidate.startsAt = "2030-04-08T12:00:00.001Z";
    invalidCheck(runFeature(p3));
    const p4 = basePayload();
    p4.candidate.startsAt = "2030-13-08T12:00:00.000Z";
    invalidCheck(runFeature(p4));
  });
  it("rejects invalid durations", () => {
    const p1 = basePayload();
    p1.candidate.durationMinutes = 20;
    invalidCheck(runFeature(p1));
    const p2 = basePayload();
    p2.candidate.durationMinutes = 10;
    invalidCheck(runFeature(p2));
    const p3 = basePayload();
    p3.candidate.durationMinutes = 135;
    invalidCheck(runFeature(p3));
  });
  it("validates leap-year February days", () => {
    const okLeap = basePayload();
    okLeap.candidate.startsAt = "2024-02-29T12:00:00.000Z";
    assert.equal(runFeature(okLeap).ok, true);
    const badLeap = basePayload();
    badLeap.candidate.startsAt = "2023-02-29T12:00:00.000Z";
    invalidCheck(runFeature(badLeap));
    const ok400 = basePayload();
    ok400.candidate.startsAt = "2000-02-29T12:00:00.000Z";
    assert.equal(runFeature(ok400).ok, true);
    const bad100 = basePayload();
    bad100.candidate.startsAt = "1900-02-29T12:00:00.000Z";
    invalidCheck(runFeature(bad100));
  });
  it("rejects appointment field violations", () => {
    const p1 = basePayload();
    p1.appointments = [{ id: "a1", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30, status: "unknown", extra: 1 }];
    invalidCheck(runFeature(p1));
    const p2 = basePayload();
    p2.appointments = [{ id: "a1", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30, status: "unknown" }];
    invalidCheck(runFeature(p2));
    const p3 = basePayload();
    p3.appointments = [{ id: "a1", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30 }];
    invalidCheck(runFeature(p3));
  });
});

describe("schedule conflict audit behavior", () => {
  it("matches contract examples", () => {
    const free = {
      practitionerId: "demo-clinica-geral",
      candidate: { startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30 },
      appointments: [{ id: "a1", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:30:00.000Z", status: "scheduled", durationMinutes: 30 }]
    };
    assert.deepEqual(runFeature(free), { ok: true, conflict: false, code: "ok", practitionerId: "demo-clinica-geral" });
    const busy = {
      practitionerId: "demo-clinica-geral",
      candidate: { startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30 },
      appointments: [{ id: "a1", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:15:00.000Z", status: "scheduled", durationMinutes: 30 }]
    };
    assert.deepEqual(runFeature(busy), { ok: true, conflict: true, code: "schedule_conflict", practitionerId: "demo-clinica-geral" });
    invalidCheck(runFeature({ practitionerId: "prod-cardio", candidate: { startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30 }, appointments: [] }));
  });
  it("allows adjacency where end equals start", () => {
    const after = basePayload();
    after.appointments = [{ id: "a1", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:30:00.000Z", durationMinutes: 30, status: "scheduled" }];
    assert.equal(runFeature(after).conflict, false);
    const before = basePayload();
    before.candidate = { startsAt: "2030-04-08T12:30:00.000Z", durationMinutes: 30 };
    before.appointments = [{ id: "a1", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30, status: "scheduled" }];
    assert.equal(runFeature(before).conflict, false);
  });
  it("ignores cancelled and other practitioners but keeps completed", () => {
    const p = basePayload();
    p.appointments = [
      { id: "c1", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30, status: "cancelled" },
      { id: "o1", practitionerId: "demo-outra", startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30, status: "scheduled" }
    ];
    assert.equal(runFeature(p).conflict, false);
    const p2 = basePayload();
    p2.appointments = [{ id: "c2", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30, status: "completed" }];
    assert.equal(runFeature(p2).conflict, true);
    assert.equal(runFeature(p2).code, "schedule_conflict");
  });
  it("echoes practitionerId and preserves input", () => {
    const p = basePayload();
    p.appointments = [{ id: "a1", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:15:00.000Z", durationMinutes: 30, status: "scheduled" }];
    const before = JSON.stringify(p);
    const result = runFeature(p);
    assert.equal(result.practitionerId, "demo-clinica-geral");
    assert.equal(JSON.stringify(p), before);
    assert.deepEqual(JSON.parse(before), p);
  });
});
