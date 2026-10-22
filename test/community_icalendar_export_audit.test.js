import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/icalendar_export_audit.mjs";

function validEvent(overrides = {}) {
  return {
    uid: "synthetic-001",
    dtstart: "20300408T120000Z",
    durationMinutes: 15,
    status: "CONFIRMED",
    ...overrides
  };
}

function expectInvalid(payload) {
  const out = runFeature(payload);
  assert.deepStrictEqual(out, {
    ok: false,
    error: { code: "validation_error", message: "invalid icalendar export." }
  });
}

describe("top payload shape", () => {
  it("rejects non-object, null and array payloads", () => {
    expectInvalid(null);
    expectInvalid("x");
    expectInvalid(42);
    expectInvalid([]);
    expectInvalid(undefined);
  });
  it("rejects missing events, extra top key, empty and oversized lists", () => {
    expectInvalid({});
    expectInvalid({ events: validEvent([]) });
    expectInvalid({ events: [] });
    expectInvalid({ events: [validEvent()], extra: 1 });
    const many = [];
    for (let i = 0; i < 51; i++) {
      many.push(validEvent({ uid: "synthetic-" + String(1000 + i), dtstart: "20300408T120000Z" }));
    }
    expectInvalid({ events: many });
  });
});

describe("entry shape", () => {
  it("rejects non-object entries, missing keys and wrong types", () => {
    expectInvalid({ events: [null] });
    expectInvalid({ events: ["x"] });
    expectInvalid({ events: [[]] });
    expectInvalid({ events: [{ uid: "synthetic-001", dtstart: "20300408T120000Z", durationMinutes: 15 }] });
    expectInvalid({ events: [{ uid: "synthetic-001", dtstart: "20300408T120000Z", durationMinutes: "15", status: "CONFIRMED" }] });
  });
  it("rejects any extra key including identifiable fields", () => {
    expectInvalid({ events: [{ ...validEvent(), patientRef: "exemplo_001" }] });
    expectInvalid({ events: [{ ...validEvent(), summary: "x" }] });
    expectInvalid({ events: [{ ...validEvent(), description: "x" }] });
    expectInvalid({ events: [{ ...validEvent(), extra: 1 }] });
  });
});

describe("uid rules", () => {
  it("rejects short, long, missing prefix and bad chars", () => {
    expectInvalid({ events: [validEvent({ uid: "short" })] });
    expectInvalid({ events: [validEvent({ uid: "other-001234" })] });
    expectInvalid({ events: [validEvent({ uid: "synthetic-bad!char" })] });
    expectInvalid({ events: [validEvent({ uid: "synthetic- space" })] });
    expectInvalid({ events: [validEvent({ uid: "x".repeat(65) })] });
    expectInvalid({ events: [validEvent({ uid: 123 })] });
  });
});

describe("dtstart rules", () => {
  it("rejects bad length, T/Z placement and non-digits", () => {
    expectInvalid({ events: [validEvent({ dtstart: "20300408T12000Z" })] });
    expectInvalid({ events: [validEvent({ dtstart: "20300408 120000Z" })] });
    expectInvalid({ events: [validEvent({ dtstart: "20300408T120000X" })] });
    expectInvalid({ events: [validEvent({ dtstart: "2030AB08T120000Z" })] });
  });
  it("rejects out of range month day hour minute second", () => {
    expectInvalid({ events: [validEvent({ dtstart: "20300008T120000Z" })] });
    expectInvalid({ events: [validEvent({ dtstart: "20301308T120000Z" })] });
    expectInvalid({ events: [validEvent({ dtstart: "20300400T120000Z" })] });
    expectInvalid({ events: [validEvent({ dtstart: "20300432T120000Z" })] });
    expectInvalid({ events: [validEvent({ dtstart: "20300408T240000Z" })] });
    expectInvalid({ events: [validEvent({ dtstart: "20300408T120700Z" })] });
    expectInvalid({ events: [validEvent({ dtstart: "20300408T120001Z" })] });
  });
  it("accepts quarter-hour minutes", () => {
    for (const m of ["20300408T120000Z", "20300408T121500Z", "20300408T123000Z", "20300408T124500Z"]) {
      const out = runFeature({ events: [validEvent({ dtstart: m })] });
      assert.equal(out.ok, true);
    }
  });
});

describe("duration and status", () => {
  it("rejects bad durations and statuses", () => {
    expectInvalid({ events: [validEvent({ durationMinutes: 10 })] });
    expectInvalid({ events: [validEvent({ durationMinutes: 20 })] });
    expectInvalid({ events: [validEvent({ durationMinutes: 121 })] });
    expectInvalid({ events: [validEvent({ durationMinutes: 30.5 })] });
    expectInvalid({ events: [validEvent({ durationMinutes: "30" })] });
    expectInvalid({ events: [validEvent({ status: "PENDING" })] });
    expectInvalid({ events: [validEvent({ status: "confirmed" })] });
  });
});

describe("valid behaviour", () => {
  it("sorts by dtstart then uid and returns contract examples", () => {
    const payload = {
      events: [
        { uid: "synthetic-002", dtstart: "20300408T121500Z", durationMinutes: 30, status: "CONFIRMED" },
        { uid: "synthetic-001", dtstart: "20300408T120000Z", durationMinutes: 15, status: "CONFIRMED" }
      ]
    };
    const out = runFeature(payload);
    assert.deepStrictEqual(out, {
      ok: true,
      count: 2,
      events: [
        { uid: "synthetic-001", dtstart: "20300408T120000Z", durationMinutes: 15, status: "CONFIRMED" },
        { uid: "synthetic-002", dtstart: "20300408T121500Z", durationMinutes: 30, status: "CONFIRMED" }
      ]
    });
    const tie = runFeature({
      events: [
        validEvent({ uid: "synthetic-b", dtstart: "20300408T120000Z" }),
        validEvent({ uid: "synthetic-a", dtstart: "20300408T120000Z" })
      ]
    });
    assert.equal(tie.events[0].uid, "synthetic-a");
    assert.equal(tie.count, 2);
  });
  it("returns only copies, never mutates and is deterministic", () => {
    const payload = {
      events: [
        validEvent({ uid: "synthetic-002", dtstart: "20300408T121500Z", durationMinutes: 30, status: "CANCELLED" }),
        validEvent({ uid: "synthetic-001", dtstart: "20300408T120000Z" })
      ]
    };
    const before = JSON.parse(JSON.stringify(payload));
    const a = runFeature(payload);
    const b = runFeature(JSON.parse(JSON.stringify(before)));
    assert.deepStrictEqual(a, b);
    assert.deepStrictEqual(payload, before);
    assert.notStrictEqual(a.events, payload.events);
    assert.notStrictEqual(a.events[0], payload.events[0]);
    a.events[0].uid = "mutated";
    assert.equal(payload.events[0].uid.includes("synthetic-"), true);
    assert.deepStrictEqual(Object.keys(a.events[0]).sort(), ["dtstart", "durationMinutes", "status", "uid"]);
  });
  it("uses no Date", () => {
    assert.equal(runFeature.toString().includes("Date"), false);
  });
});
