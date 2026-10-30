import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/past_instant_allowance_audit.mjs";

const ERR = { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };

function expectInvalid(payload) {
  const before = JSON.stringify(payload);
  const res = runFeature(payload);
  assert.deepStrictEqual(res, ERR);
  assert.deepStrictEqual(Object.keys(res), ["error", "ok"]);
  assert.deepStrictEqual(Object.keys(res.error), ["code", "message"]);
  assert.strictEqual(JSON.stringify(payload), before);
}

function expectValid(payload, isPast) {
  const copy = JSON.parse(JSON.stringify(payload));
  const res = runFeature(payload);
  const expected = { isPast, nowUtc: copy.nowUtc, ok: true, startsAt: copy.startsAt };
  assert.deepStrictEqual(res, expected);
  assert.deepStrictEqual(Object.keys(res), ["isPast", "nowUtc", "ok", "startsAt"]);
  assert.deepStrictEqual(payload, copy);
}

describe("rejects malformed payload shape", () => {
  it("null array and non-object are invalid", () => {
    expectInvalid(null);
    expectInvalid([]);
    expectInvalid("x");
    expectInvalid(42);
    expectInvalid(undefined);
    expectInvalid(true);
  });
  it("missing or extra keys are invalid", () => {
    expectInvalid({});
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.000Z" });
    expectInvalid({ startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.000Z", startsAt: "2030-04-08T11:00:00.000Z", extra: "x" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.000Z", wrong: "2030-04-08T11:00:00.000Z" });
  });
  it("non-string or badly shaped instants are invalid", () => {
    expectInvalid({ nowUtc: 1, startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.000Z", startsAt: null });
    expectInvalid({ nowUtc: "2030-04-08 12:00:00.000Z", startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.000Z", startsAt: "short" });
    expectInvalid({ nowUtc: "2030/04/08T12:00:00.000Z", startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.000Z", startsAt: "2030-04-08t11:00:00.000Z" });
  });
});

describe("rejects calendar and grid violations", () => {
  it("out of range month and day", () => {
    expectInvalid({ nowUtc: "2030-00-08T12:00:00.000Z", startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-13-08T12:00:00.000Z", startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-00T12:00:00.000Z", startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.000Z", startsAt: "2030-04-31T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.000Z", startsAt: "2030-02-30T11:00:00.000Z" });
  });
  it("non-leap Feb 29 rejected", () => {
    expectInvalid({ nowUtc: "2023-03-01T12:00:00.000Z", startsAt: "2023-02-29T11:00:00.000Z" });
    expectInvalid({ nowUtc: "1900-03-01T12:00:00.000Z", startsAt: "1900-02-29T11:00:00.000Z" });
  });
  it("bad hour minute second millis rejected", () => {
    expectInvalid({ nowUtc: "2030-04-08T24:00:00.000Z", startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:07:00.000Z", startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.000Z", startsAt: "2030-04-08T11:07:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:01.000Z", startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.001Z", startsAt: "2030-04-08T11:00:00.000Z" });
    expectInvalid({ nowUtc: "2030-04-08T12:00:00.000Z", startsAt: "2030-04-08T11:00:00.010Z" });
  });
});

describe("accepts past future and equal", () => {
  it("past remains allowed with isPast true", () => {
    expectValid({ nowUtc: "2030-04-08T12:00:00.000Z", startsAt: "2030-04-08T11:00:00.000Z" }, true);
  });
  it("future and equal return isPast false", () => {
    expectValid({ nowUtc: "2030-04-08T11:00:00.000Z", startsAt: "2030-04-08T12:00:00.000Z" }, false);
    expectValid({ nowUtc: "2030-04-08T12:00:00.000Z", startsAt: "2030-04-08T12:00:00.000Z" }, false);
  });
  it("leap and grid edges accepted", () => {
    expectValid({ nowUtc: "2024-03-01T12:00:00.000Z", startsAt: "2024-02-29T11:00:00.000Z" }, true);
    expectValid({ nowUtc: "2000-03-01T00:00:00.000Z", startsAt: "2000-02-29T00:00:00.000Z" }, true);
    expectValid({ nowUtc: "0000-03-01T00:00:00.000Z", startsAt: "0000-02-29T00:00:00.000Z" }, true);
    expectValid({ nowUtc: "2030-04-08T11:15:00.000Z", startsAt: "2030-04-08T11:30:00.000Z" }, false);
    expectValid({ nowUtc: "2030-04-08T11:45:00.000Z", startsAt: "2030-04-08T11:00:00.000Z" }, true);
  });
});
