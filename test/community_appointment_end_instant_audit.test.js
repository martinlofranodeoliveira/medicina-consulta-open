import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/appointment_end_instant_audit.mjs";

const invalid = { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };

describe("appointment end instant audit: invalid shapes", () => {
  it("rejects null, array and non-object", () => {
    assert.deepEqual(runFeature(null), invalid);
    assert.deepEqual(runFeature([]), invalid);
    assert.deepEqual(runFeature("x"), invalid);
    assert.deepEqual(runFeature(42), invalid);
    assert.deepEqual(runFeature(undefined), invalid);
  });
  it("rejects missing or extra keys", () => {
    assert.deepEqual(runFeature({}), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.000Z" }), invalid);
    assert.deepEqual(runFeature({ durationMinutes: 30 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30, extra: 1 }), invalid);
  });
  it("returns no partial data on invalid", () => {
    const out = runFeature(null);
    assert.deepEqual(Object.keys(out).sort(), ["error", "ok"]);
    assert.ok(!("endsAt" in out));
    assert.ok(!("startsAt" in out));
  });
});

describe("appointment end instant audit: startsAt grid", () => {
  it("rejects bad length and separators", () => {
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.000", durationMinutes: 15 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030/04/08T12:00:00.000Z", durationMinutes: 15 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08 12:00:00.000Z", durationMinutes: 15 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12-00-00.000Z", durationMinutes: 15 }), invalid);
  });
  it("rejects month, hour, minute, second, millis", () => {
    assert.deepEqual(runFeature({ startsAt: "2030-00-08T12:00:00.000Z", durationMinutes: 15 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-13-08T12:00:00.000Z", durationMinutes: 15 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T24:00:00.000Z", durationMinutes: 15 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:07:00.000Z", durationMinutes: 30 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:01.000Z", durationMinutes: 15 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.001Z", durationMinutes: 15 }), invalid);
  });
  it("rejects bad day including Feb 29 leap rule", () => {
    assert.deepEqual(runFeature({ startsAt: "2030-02-29T12:00:00.000Z", durationMinutes: 15 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2024-02-29T12:00:00.000Z", durationMinutes: 15 }).ok, true);
    assert.deepEqual(runFeature({ startsAt: "1900-02-29T12:00:00.000Z", durationMinutes: 15 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2000-02-29T12:00:00.000Z", durationMinutes: 15 }).ok, true);
    assert.deepEqual(runFeature({ startsAt: "2030-04-31T12:00:00.000Z", durationMinutes: 15 }), invalid);
  });
});

describe("appointment end instant audit: duration", () => {
  it("rejects non-integer, fractional, range and step", () => {
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: "30" }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30.5 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 0 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 135 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 20 }), invalid);
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: Number.NaN }), invalid);
  });
});

describe("appointment end instant audit: success arithmetic", () => {
  it("computes simple end", () => {
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30 }), {
      durationMinutes: 30,
      endsAt: "2030-04-08T12:30:00.000Z",
      ok: true,
      startsAt: "2030-04-08T12:00:00.000Z"
    });
  });
  it("rolls over midnight and month end", () => {
    assert.deepEqual(runFeature({ startsAt: "2030-01-31T23:45:00.000Z", durationMinutes: 30 }).endsAt, "2030-02-01T00:15:00.000Z");
    assert.deepEqual(runFeature({ startsAt: "2030-12-31T23:45:00.000Z", durationMinutes: 30 }).endsAt, "2031-01-01T00:15:00.000Z");
    assert.deepEqual(runFeature({ startsAt: "2024-02-28T23:45:00.000Z", durationMinutes: 30 }).endsAt, "2024-02-29T00:15:00.000Z");
    assert.deepEqual(runFeature({ startsAt: "2024-02-29T23:45:00.000Z", durationMinutes: 30 }).endsAt, "2024-03-01T00:15:00.000Z");
  });
  it("preserves input without mutation", () => {
    const payload = { startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 30 };
    const frozen = JSON.stringify(payload);
    const out = runFeature(payload);
    assert.equal(out.ok, true);
    assert.equal(JSON.stringify(payload), frozen);
    assert.deepEqual(Object.keys(out).sort(), ["durationMinutes", "endsAt", "ok", "startsAt"]);
  });
  it("rejects end overflowing year 9999", () => {
    assert.deepEqual(runFeature({ startsAt: "9999-12-31T23:45:00.000Z", durationMinutes: 30 }), invalid);
  });
});
