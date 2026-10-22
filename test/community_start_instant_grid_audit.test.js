import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/start_instant_grid_audit.mjs";

function assertInvalid(payload) {
  const out = runFeature(payload);
  assert.equal(out.ok, false);
  assert.equal(out.error.code, "validation_error");
  assert.equal(out.error.message, "invalid start instant.");
  assert.equal("startsAt" in out, false);
  assert.equal("valid" in out, false);
}

function assertValid(startsAt) {
  const out = runFeature({ startsAt });
  assert.equal(out.ok, true);
  assert.equal(out.valid, true);
  assert.equal(out.startsAt, startsAt);
}

describe("start instant grid audit: payload shape", () => {
  it("rejects null, array and non-object payloads", () => {
    assertInvalid(null);
    assertInvalid(["2030-04-08T12:00:00Z"]);
    assertInvalid("2030-04-08T12:00:00Z");
    assertInvalid(42);
    assertInvalid(true);
    assertInvalid(undefined);
  });
  it("rejects missing, extra and non-string startsAt", () => {
    assertInvalid({});
    assertInvalid({ other: "2030-04-08T12:00:00Z" });
    assertInvalid({ startsAt: "2030-04-08T12:00:00Z", extra: 1 });
    assertInvalid({ startsAt: 123 });
    assertInvalid({ startsAt: null });
    assertInvalid({ startsAt: ["2030-04-08T12:00:00Z"] });
  });
  it("rejects example off-grid minute", () => {
    assertInvalid({ startsAt: "2030-04-08T09:07:00-03:00" });
  });
});

describe("start instant grid audit: date and time shape", () => {
  it("rejects wrong lengths, separators and non-digits", () => {
    assertInvalid({ startsAt: "2030-04-08T12:00:00" });
    assertInvalid({ startsAt: "2030-04-08T12:00:00ZZ" });
    assertInvalid({ startsAt: "2030/04/08T12:00:00Z" });
    assertInvalid({ startsAt: "2030-04-08 12:00:00Z" });
    assertInvalid({ startsAt: "2030-04-08T12-00-00Z" });
    assertInvalid({ startsAt: "2030-04-08T12:00:00z" });
    assertInvalid({ startsAt: "20X0-04-08T12:00:00Z" });
    assertInvalid({ startsAt: "2030-04-08T12:00:00+03-00" });
  });
  it("rejects invalid month, day and leap rule", () => {
    assertInvalid({ startsAt: "2030-00-08T12:00:00Z" });
    assertInvalid({ startsAt: "2030-13-08T12:00:00Z" });
    assertInvalid({ startsAt: "2030-04-00T12:00:00Z" });
    assertInvalid({ startsAt: "2030-04-31T12:00:00Z" });
    assertInvalid({ startsAt: "2023-02-29T10:15:00Z" });
    assertInvalid({ startsAt: "1900-02-29T10:15:00Z" });
    assertInvalid({ startsAt: "2030-02-30T10:15:00Z" });
    assertValid("2024-02-29T10:15:00Z");
    assertValid("2000-02-29T10:15:00Z");
  });
  it("rejects hour outside 00-23", () => {
    assertInvalid({ startsAt: "2030-04-08T24:00:00Z" });
    assertInvalid({ startsAt: "2030-04-08T99:00:00Z" });
    assertValid("2030-04-08T00:00:00Z");
    assertValid("2030-04-08T23:45:00Z");
  });
});

describe("start instant grid audit: grid and zone", () => {
  it("rejects minute outside quarter hour and bad seconds", () => {
    assertInvalid({ startsAt: "2030-04-08T12:01:00Z" });
    assertInvalid({ startsAt: "2030-04-08T12:07:00Z" });
    assertInvalid({ startsAt: "2030-04-08T12:00:01Z" });
    assertInvalid({ startsAt: "2030-04-08T12:00:30Z" });
    assertValid("2030-04-08T12:00:00Z");
    assertValid("2030-04-08T12:15:00Z");
    assertValid("2030-04-08T12:30:00Z");
    assertValid("2030-04-08T12:45:00Z");
  });
  it("rejects bad offset grid including +03:07 and 14 overflow", () => {
    assertInvalid({ startsAt: "2030-04-08T09:00:00-03:07" });
    assertInvalid({ startsAt: "2030-04-08T09:00:00+03:07" });
    assertInvalid({ startsAt: "2030-04-08T09:00:00+05:07" });
    assertInvalid({ startsAt: "2030-04-08T09:00:00+14:15" });
    assertInvalid({ startsAt: "2030-04-08T09:00:00+14:30" });
    assertInvalid({ startsAt: "2030-04-08T09:00:00+15:00" });
    assertInvalid({ startsAt: "2030-04-08T09:00:00+03:00X" });
  });
  it("accepts contract examples and quarter-hour offsets", () => {
    assertValid("2030-04-08T09:00:00-03:00");
    assertValid("2030-04-08T12:00:00Z");
    assertValid("2030-04-08T09:15:00+05:45");
    assertValid("2030-04-08T09:30:00-03:30");
    assertValid("2030-04-08T09:45:00+00:00");
    assertValid("2030-04-08T09:00:00+14:00");
    assertValid("2030-04-08T09:00:00-14:00");
  });
});

describe("start instant grid audit: purity", () => {
  it("never mutates input and returns fresh objects deterministically", () => {
    const input = { startsAt: "2030-04-08T09:00:00-03:00" };
    const snapshot = { startsAt: "2030-04-08T09:00:00-03:00" };
    const a = runFeature(input);
    const b = runFeature({ startsAt: "2030-04-08T09:00:00-03:00" });
    assert.deepEqual(input, snapshot);
    assert.deepEqual(a, b);
    assert.notStrictEqual(a, b);
    assert.equal(a.startsAt, "2030-04-08T09:00:00-03:00");
    const badA = runFeature({ startsAt: "2030-04-08T09:07:00-03:00" });
    const badB = runFeature({ startsAt: "2030-04-08T09:07:00-03:00" });
    assert.deepEqual(badA, badB);
    assert.notStrictEqual(badA, badB);
    assert.notStrictEqual(badA.error, badB.error);
  });
});
