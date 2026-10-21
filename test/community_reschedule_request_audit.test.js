import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/reschedule_request_audit.mjs";

const validStartsAt = "2030-04-08T12:00:00.000Z";

function expectInvalid(payload) {
  const result = runFeature(payload);
  assert.equal(result.ok, false);
  assert.deepEqual(result.error, { code: "validation_error", message: "invalid reschedule request." });
  assert.equal("startsAt" in result, false);
  assert.equal("durationMinutes" in result, false);
  assert.equal("error" in result, true);
}

describe("reschedule request audit", () => {
  it("accepts canonical valid payloads", () => {
    const cases = [
      { startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 45 },
      { startsAt: "2030-04-08T12:15:00.000Z", durationMinutes: 15 },
      { startsAt: "2030-04-08T12:30:00.000Z", durationMinutes: 30 },
      { startsAt: "2030-04-08T12:45:00.000Z", durationMinutes: 120 },
      { startsAt: "2024-02-29T00:00:00.000Z", durationMinutes: 60 },
      { startsAt: "2000-02-29T23:45:00.000Z", durationMinutes: 90 },
      { startsAt: "2023-02-28T00:00:00.000Z", durationMinutes: 105 },
      { startsAt: "2030-01-31T00:00:00.000Z", durationMinutes: 75 },
      { startsAt: "2030-04-30T23:30:00.000Z", durationMinutes: 15 },
      { startsAt: "0000-01-01T00:00:00.000Z", durationMinutes: 15 },
      { startsAt: "9999-12-31T23:45:00.000Z", durationMinutes: 120 }
    ];
    for (const payload of cases) {
      const result = runFeature(payload);
      assert.equal(result.ok, true);
      assert.equal(result.startsAt, payload.startsAt);
      assert.equal(result.durationMinutes, payload.durationMinutes);
      assert.equal("error" in result, false);
    }
  });
  it("matches contract examples", () => {
    const okResult = runFeature({ startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 45 });
    assert.deepEqual(okResult, { ok: true, startsAt: "2030-04-08T12:00:00.000Z", durationMinutes: 45 });
    expectInvalid({ startsAt: "2030-04-08T12:07:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-08T12:00:00.000Z" });
  });
  it("rejects shape violations", () => {
    expectInvalid(null);
    expectInvalid(undefined);
    expectInvalid([]);
    expectInvalid("2030-04-08T12:00:00.000Z");
    expectInvalid(42);
    expectInvalid(true);
    expectInvalid({});
    expectInvalid({ startsAt: validStartsAt });
    expectInvalid({ durationMinutes: 30 });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: 30, extra: 1 });
  });
  it("rejects startsAt violations", () => {
    expectInvalid({ startsAt: "2030-04-08T12:00:00.000Zx", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-08T12:00:00.00Z", durationMinutes: 30 });
    expectInvalid({ startsAt: 123, durationMinutes: 30 });
    expectInvalid({ startsAt: null, durationMinutes: 30 });
    expectInvalid({ startsAt: "2030/04/08T12:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-08 12:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-08T12-00-00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "20A0-04-08T12:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-13-08T12:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-00-08T12:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-00T12:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-31T12:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-02-30T12:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2023-02-29T12:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "1900-02-29T12:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-08T24:00:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-08T12:07:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-08T12:01:00.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-08T12:00:01.000Z", durationMinutes: 30 });
    expectInvalid({ startsAt: "2030-04-08T12:00:00.001Z", durationMinutes: 30 });
  });
  it("rejects durationMinutes violations", () => {
    expectInvalid({ startsAt: validStartsAt, durationMinutes: "30" });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: null });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: 30.5 });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: 0 });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: 10 });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: 14 });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: 121 });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: 135 });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: 20 });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: 25 });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: NaN });
    expectInvalid({ startsAt: validStartsAt, durationMinutes: Infinity });
  });
  it("is deterministic synchronous without mutation", () => {
    const payload = { startsAt: validStartsAt, durationMinutes: 45 };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature({ startsAt: validStartsAt, durationMinutes: 45 });
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(payload), before);
    assert.equal(first.ok, true);
    assert.equal(first.startsAt, validStartsAt);
    assert.equal(typeof first.startsAt, "string");
    assert.equal(first instanceof Promise, false);
    assert.equal(runFeature.constructor.name, "Function");
    const bad = { startsAt: "2030-04-08T12:07:00.000Z", durationMinutes: 30 };
    const badBefore = JSON.stringify(bad);
    const badResult = runFeature(bad);
    assert.equal(JSON.stringify(bad), badBefore);
    assert.equal(badResult.ok, false);
  });
  it("is pure module with required constructs", () => {
    const src = runFeature.toString();
    assert.ok(src.includes("Object.entries"));
    assert.ok(src.includes(".push"));
    assert.ok(src.includes("new Map"));
    assert.ok(src.includes(".get("));
    assert.ok(src.includes(".set("));
    assert.ok(src.includes("for ("));
    assert.ok(src.includes(" of "));
    assert.equal(src.includes("import"), false);
    assert.equal(src.includes("Date"), false);
    assert.equal(src.includes("Reflect"), false);
    assert.equal(src.includes("Proxy"), false);
    assert.equal(src.includes("prototype"), false);
    assert.equal(src.includes("constructor"), false);
    assert.equal(src.includes("process"), false);
    assert.equal(src.includes("require"), false);
    assert.equal(src.includes("Object.assign"), false);
    assert.equal(src.includes("Object.create"), false);
  });
});
