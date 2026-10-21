import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/day_capacity_audit.mjs";

function bad() {
  return { ok: false, error: { code: "validation_error", message: "invalid day capacity request." } };
}

function validPayload(over) {
  const base = {
    date: "2030-04-08",
    practitionerId: "demo-cardio",
    capacity: 3,
    appointments: []
  };
  if (over !== undefined) {
    for (const kv of Object.entries(over)) {
      const k = kv[0];
      const v = kv[1];
      if (k === "date") {
        base.date = v;
      }
      if (k === "practitionerId") {
        base.practitionerId = v;
      }
      if (k === "capacity") {
        base.capacity = v;
      }
      if (k === "appointments") {
        base.appointments = v;
      }
    }
  }
  return base;
}

function entry(over) {
  const base = {
    startsAt: "2030-04-08T12:00:00.000Z",
    practitionerId: "demo-cardio",
    status: "scheduled"
  };
  if (over !== undefined) {
    for (const kv of Object.entries(over)) {
      const k = kv[0];
      const v = kv[1];
      if (k === "startsAt") {
        base.startsAt = v;
      }
      if (k === "practitionerId") {
        base.practitionerId = v;
      }
      if (k === "status") {
        base.status = v;
      }
    }
  }
  return base;
}

describe("day capacity audit contract examples", () => {
  it("counts scheduled plus completed and ignores cancelled when full", () => {
    const out = runFeature({
      date: "2030-04-08",
      practitionerId: "demo-clinica-geral",
      capacity: 2,
      appointments: [
        { startsAt: "2030-04-08T12:00:00.000Z", practitionerId: "demo-clinica-geral", status: "scheduled" },
        { startsAt: "2030-04-08T12:30:00.000Z", practitionerId: "demo-clinica-geral", status: "completed" },
        { startsAt: "2030-04-08T13:00:00.000Z", practitionerId: "demo-clinica-geral", status: "cancelled" }
      ]
    });
    assert.deepEqual(out, { ok: true, date: "2030-04-08", practitionerId: "demo-clinica-geral", capacity: 2, booked: 2, remaining: 0, isFull: true });
  });
  it("ignores other practitioners and other days", () => {
    const out = runFeature({
      date: "2030-04-08",
      practitionerId: "demo-cardio",
      capacity: 3,
      appointments: [
        { startsAt: "2030-04-08T12:00:00.000Z", practitionerId: "demo-cardio", status: "scheduled" },
        { startsAt: "2030-04-09T12:00:00.000Z", practitionerId: "demo-cardio", status: "scheduled" },
        { startsAt: "2030-04-08T12:15:00.000Z", practitionerId: "demo-clinica-geral", status: "scheduled" }
      ]
    });
    assert.deepEqual(out, { ok: true, date: "2030-04-08", practitionerId: "demo-cardio", capacity: 3, booked: 1, remaining: 2, isFull: false });
  });
  it("rejects impossible date", () => {
    assert.deepEqual(runFeature(validPayload({ date: "2030-02-30", appointments: [] })), bad());
  });
});

describe("payload shape", () => {
  it("rejects null array and non-object", () => {
    assert.deepEqual(runFeature(null), bad());
    assert.deepEqual(runFeature([]), bad());
    assert.deepEqual(runFeature("x"), bad());
    assert.deepEqual(runFeature(42), bad());
    assert.deepEqual(runFeature(undefined), bad());
  });
  it("rejects missing and extra keys", () => {
    assert.deepEqual(runFeature({ date: "2030-04-08", practitionerId: "demo-cardio", capacity: 2 }), bad());
    const extra = validPayload();
    extra.extra = 1;
    assert.deepEqual(runFeature(extra), bad());
  });
  it("handles empty matches", () => {
    const out = runFeature(validPayload());
    assert.deepEqual(out, { ok: true, date: "2030-04-08", practitionerId: "demo-cardio", capacity: 3, booked: 0, remaining: 3, isFull: false });
  });
  it("preserves input without mutation", () => {
    const p = validPayload({ appointments: [entry()] });
    const before = JSON.stringify(p);
    const out = runFeature(p);
    assert.equal(JSON.stringify(p), before);
    assert.equal(out.ok, true);
    assert.equal(out.booked, 1);
  });
  it("clamps remaining and flags full including over capacity", () => {
    const many = [entry(), entry({ startsAt: "2030-04-08T12:15:00.000Z" }), entry({ startsAt: "2030-04-08T12:30:00.000Z" })];
    const out = runFeature(validPayload({ capacity: 2, appointments: many }));
    assert.equal(out.booked, 3);
    assert.equal(out.remaining, 0);
    assert.equal(out.isFull, true);
  });
});

describe("date calendar", () => {
  it("accepts leap February", () => {
    assert.equal(runFeature(validPayload({ date: "2024-02-29" })).ok, true);
    assert.equal(runFeature(validPayload({ date: "2000-02-29" })).ok, true);
  });
  it("rejects non-leap February and 30-day months", () => {
    assert.deepEqual(runFeature(validPayload({ date: "2023-02-29" })), bad());
    assert.deepEqual(runFeature(validPayload({ date: "1900-02-29" })), bad());
    assert.deepEqual(runFeature(validPayload({ date: "2030-04-31" })), bad());
    assert.deepEqual(runFeature(validPayload({ date: "2030-06-31" })), bad());
    assert.deepEqual(runFeature(validPayload({ date: "2030-09-31" })), bad());
    assert.deepEqual(runFeature(validPayload({ date: "2030-11-31" })), bad());
    assert.deepEqual(runFeature(validPayload({ date: "2030-13-01" })), bad());
    assert.deepEqual(runFeature(validPayload({ date: "2030-00-10" })), bad());
  });
});

describe("practitioner and capacity", () => {
  it("validates practitionerId", () => {
    assert.deepEqual(runFeature(validPayload({ practitionerId: "cardio" })), bad());
    assert.deepEqual(runFeature(validPayload({ practitionerId: "demo-" })), bad());
    assert.deepEqual(runFeature(validPayload({ practitionerId: "demo-bad!" })), bad());
    assert.deepEqual(runFeature(validPayload({ practitionerId: "demo-ok_1-2" })).ok, true);
  });
  it("validates capacity range and integer", () => {
    assert.deepEqual(runFeature(validPayload({ capacity: 0 })), bad());
    assert.deepEqual(runFeature(validPayload({ capacity: 33 })), bad());
    assert.deepEqual(runFeature(validPayload({ capacity: 1.5 })), bad());
    assert.deepEqual(runFeature(validPayload({ capacity: "2" })), bad());
  });
});

describe("appointment entries", () => {
  it("validates entry shape and status", () => {
    assert.deepEqual(runFeature(validPayload({ appointments: [{ startsAt: "2030-04-08T12:00:00.000Z", practitionerId: "demo-cardio" }] })), bad());
    const withExtra = entry();
    withExtra.extra = 1;
    assert.deepEqual(runFeature(validPayload({ appointments: [withExtra] })), bad());
    assert.deepEqual(runFeature(validPayload({ appointments: [entry({ status: "pending" })] })), bad());
  });
  it("validates startsAt grid and calendar", () => {
    assert.deepEqual(runFeature(validPayload({ appointments: [entry({ startsAt: "2030-04-08T12:01:00.000Z" })] })), bad());
    assert.deepEqual(runFeature(validPayload({ appointments: [entry({ startsAt: "2030-04-08T12:00:01.000Z" })] })), bad());
    assert.deepEqual(runFeature(validPayload({ appointments: [entry({ startsAt: "2030-04-08T24:00:00.000Z" })] })), bad());
    assert.deepEqual(runFeature(validPayload({ appointments: [entry({ startsAt: "2023-02-29T12:00:00.000Z" })] })), bad());
    assert.equal(runFeature(validPayload({ appointments: [entry({ startsAt: "2030-04-08T12:15:00.000Z" })] })).ok, true);
  });
  it("rejects over 100 entries", () => {
    const many = [];
    for (let i = 0; i < 101; i++) {
      many.push(entry());
    }
    assert.deepEqual(runFeature(validPayload({ appointments: many })), bad());
  });
  it("counts only same day same practitioner scheduled or completed", () => {
    const out = runFeature(validPayload({
      capacity: 5,
      appointments: [
        entry({ status: "scheduled" }),
        entry({ startsAt: "2030-04-08T13:00:00.000Z", status: "completed" }),
        entry({ startsAt: "2030-04-08T14:00:00.000Z", status: "cancelled" }),
        entry({ startsAt: "2030-04-09T12:00:00.000Z", status: "scheduled" }),
        entry({ practitionerId: "demo-other", status: "scheduled" })
      ]
    }));
    assert.equal(out.booked, 2);
    assert.equal(out.remaining, 3);
    assert.equal(out.isFull, false);
  });
});
