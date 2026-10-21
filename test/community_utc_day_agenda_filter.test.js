import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/utc_day_agenda_filter.mjs";
function bad(res) {
  assert.equal(res.ok, false);
  assert.equal(res.error.code, "validation_error");
  assert.equal(res.error.message, "invalid day agenda filter.");
  assert.equal("appointments" in res, false);
  assert.equal("count" in res, false);
}
describe("payload shape", () => {
  it("rejects null array and non object", () => {
    bad(runFeature(null));
    bad(runFeature([]));
    bad(runFeature("x"));
    bad(runFeature(42));
    bad(runFeature(undefined));
  });
  it("rejects extra payload keys and missing keys", () => {
    bad(runFeature({ date: "2030-04-08", appointments: [], extra: 1 }));
    bad(runFeature({ appointments: [] }));
    bad(runFeature({ date: "2030-04-08" }));
    bad(runFeature({ date: "2030-04-08", appointments: "no" }));
    bad(runFeature({ date: 1, appointments: [] }));
  });
  it("rejects wrong practitioner filter type", () => {
    bad(runFeature({ date: "2030-04-08", practitionerId: 1, appointments: [] }));
  });
});
describe("day validation", () => {
  it("accepts leap day 2024-02-29 and rejects 2023-02-29", () => {
    const ok = runFeature({ date: "2024-02-29", appointments: [] });
    assert.equal(ok.ok, true);
    assert.equal(ok.date, "2024-02-29");
    assert.equal(ok.count, 0);
    bad(runFeature({ date: "2023-02-29", appointments: [] }));
  });
  it("rejects bad month day and format", () => {
    bad(runFeature({ date: "2030-13-08", appointments: [] }));
    bad(runFeature({ date: "2030-00-10", appointments: [] }));
    bad(runFeature({ date: "2030-04-31", appointments: [] }));
    bad(runFeature({ date: "2030-04-08T", appointments: [] }));
    bad(runFeature({ date: "2030-4-08", appointments: [] }));
    bad(runFeature({ date: "2030-04-08 ", appointments: [] }));
  });
  it("validates century leap rule", () => {
    const a = runFeature({ date: "2000-02-29", appointments: [] });
    assert.equal(a.ok, true);
    bad(runFeature({ date: "1900-02-29", appointments: [] }));
  });
});
describe("practitioner and entry validation", () => {
  it("validates practitioner prefix and charset", () => {
    bad(runFeature({ date: "2030-04-08", practitionerId: "bad", appointments: [] }));
    bad(runFeature({ date: "2030-04-08", practitionerId: "demo-", appointments: [] }));
    bad(runFeature({ date: "2030-04-08", practitionerId: "demo-bad!", appointments: [] }));
    const ok = runFeature({ date: "2030-04-08", practitionerId: "demo-clinica-geral", appointments: [] });
    assert.equal(ok.ok, true);
  });
  it("validates entry keys id charset and grid", () => {
    bad(runFeature({ date: "2030-04-08", appointments: [{ id: "a", practitionerId: "demo-x1", startsAt: "2030-04-08T12:00:00.000Z", extra: 1 }] }));
    bad(runFeature({ date: "2030-04-08", appointments: [{ practitionerId: "demo-x1", startsAt: "2030-04-08T12:00:00.000Z" }] }));
    bad(runFeature({ date: "2030-04-08", appointments: [{ id: "bad!", practitionerId: "demo-x1", startsAt: "2030-04-08T12:00:00.000Z" }] }));
    bad(runFeature({ date: "2030-04-08", appointments: [{ id: "a", practitionerId: "nope", startsAt: "2030-04-08T12:00:00.000Z" }] }));
    bad(runFeature({ date: "2030-04-08", appointments: [{ id: "a", practitionerId: "demo-x1", startsAt: "2030-04-08T12:07:00.000Z" }] }));
    bad(runFeature({ date: "2030-04-08", appointments: [{ id: "a", practitionerId: "demo-x1", startsAt: "2030-04-08T12:00:01.000Z" }] }));
    bad(runFeature({ date: "2030-04-08", appointments: [{ id: "a", practitionerId: "demo-x1", startsAt: "2030-02-30T12:00:00.000Z" }] }));
  });
  it("rejects too many entries", () => {
    const many = [];
    for (let i = 0; i < 201; i = i + 1) {
      many.push({ id: "a" + String(i), practitionerId: "demo-x1234", startsAt: "2030-04-08T12:00:00.000Z" });
    }
    bad(runFeature({ date: "2030-04-08", appointments: many }));
  });
});
describe("filter sort copy", () => {
  it("sorts by startsAt then id", () => {
    const res = runFeature({ date: "2030-04-08", appointments: [{ id: "appt-002", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:30:00.000Z" }, { id: "appt-001", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:00:00.000Z" }] });
    assert.equal(res.ok, true);
    assert.equal(res.count, 2);
    assert.deepEqual(res.appointments.map((x) => x.id), ["appt-001", "appt-002"]);
  });
  it("filters by day and practitioner", () => {
    const res = runFeature({ date: "2030-04-08", practitionerId: "demo-clinica-geral", appointments: [{ id: "appt-010", practitionerId: "demo-cardio", startsAt: "2030-04-08T09:00:00.000Z" }, { id: "appt-011", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T09:00:00.000Z" }, { id: "appt-012", practitionerId: "demo-clinica-geral", startsAt: "2030-04-09T09:00:00.000Z" }] });
    assert.equal(res.ok, true);
    assert.equal(res.count, 1);
    assert.deepEqual(res.appointments, [{ id: "appt-011", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T09:00:00.000Z" }]);
  });
  it("orders same stamp by id and preserves input", () => {
    const input = { date: "2030-04-08", appointments: [{ id: "b", practitionerId: "demo-x1234", startsAt: "2030-04-08T10:00:00.000Z" }, { id: "a", practitionerId: "demo-x1234", startsAt: "2030-04-08T10:00:00.000Z" }] };
    const snap = JSON.parse(JSON.stringify(input));
    const first = runFeature(input);
    const second = runFeature(JSON.parse(JSON.stringify(snap)));
    assert.deepEqual(first, second);
    assert.deepEqual(input, snap);
    assert.deepEqual(first.appointments.map((x) => x.id), ["a", "b"]);
    assert.notEqual(first.appointments[0], input.appointments[1]);
  });
  it("invalid example month 13", () => {
    const res = runFeature({ date: "2030-13-08", appointments: [{ id: "appt-001", practitionerId: "demo-clinica-geral", startsAt: "2030-04-08T12:00:00.000Z" }] });
    bad(res);
  });
});
