import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as mod from "../src/community/utc_calendar_date_audit.mjs";

const runFeature = mod.runFeature;

function expectInvalid(payload) {
  const res = runFeature(payload);
  assert.deepEqual(res, { error: { code: "validation_error", message: "invalid calendar date." }, ok: false });
  assert.deepEqual(Object.keys(res), ["error", "ok"]);
  assert.deepEqual(Object.keys(res.error), ["code", "message"]);
  assert.equal("date" in res, false);
}

function expectValid(dateStr) {
  const payload = { date: dateStr };
  const before = JSON.stringify(payload);
  const res = runFeature(payload);
  assert.deepEqual(res, { date: dateStr, ok: true });
  assert.deepEqual(Object.keys(res), ["date", "ok"]);
  assert.equal(JSON.stringify(payload), before);
  assert.equal(res.date, dateStr);
}

describe("utc calendar date audit", () => {
  it("exposes only runFeature as pure sync function", () => {
    assert.deepEqual(Object.keys(mod), ["runFeature"]);
    assert.equal(typeof runFeature, "function");
    const res = runFeature({ date: "2030-04-08" });
    assert.equal(res instanceof Promise, false);
    assert.deepEqual(res, JSON.parse(JSON.stringify(res)));
  });
  it("rejects null array and non-object payloads", () => {
    expectInvalid(null);
    expectInvalid(undefined);
    expectInvalid([]);
    expectInvalid([{ date: "2030-04-08" }]);
    expectInvalid("2030-04-08");
    expectInvalid(123);
    expectInvalid(true);
  });
  it("rejects missing extra and non-string date", () => {
    expectInvalid({});
    expectInvalid({ date: "2030-04-08", extra: "x" });
    expectInvalid({ day: "2030-04-08" });
    expectInvalid({ date: null });
    expectInvalid({ date: 20300408 });
    expectInvalid({ date: ["2030-04-08"] });
    expectInvalid({ date: undefined });
  });
  it("accepts boundary and example dates", () => {
    expectValid("0000-01-01");
    expectValid("9999-12-31");
    expectValid("2030-04-08");
    expectValid("2032-02-29");
  });
  it("rejects non-leap feb and out of range month day", () => {
    expectInvalid({ date: "2023-02-29" });
    expectInvalid({ date: "2030-02-30" });
    expectInvalid({ date: "2030-00-10" });
    expectInvalid({ date: "2030-13-10" });
    expectInvalid({ date: "2030-04-00" });
    expectInvalid({ date: "2030-04-32" });
  });
  it("enforces Gregorian leap rule with 0000 leap", () => {
    expectValid("2000-02-29");
    expectValid("0000-02-29");
    expectValid("2004-02-29");
    expectValid("2032-02-29");
    expectInvalid({ date: "1900-02-29" });
    expectInvalid({ date: "2100-02-29" });
    expectInvalid({ date: "2001-02-29" });
    expectInvalid({ date: "2023-02-29" });
    expectValid("2000-02-28");
    expectValid("1900-02-28");
  });
  it("enforces 30-day months", () => {
    expectValid("2030-04-30");
    expectInvalid({ date: "2030-04-31" });
    expectValid("2030-06-30");
    expectInvalid({ date: "2030-06-31" });
    expectValid("2030-09-30");
    expectInvalid({ date: "2030-09-31" });
    expectValid("2030-11-30");
    expectInvalid({ date: "2030-11-31" });
    expectValid("2030-01-31");
    expectValid("2030-03-31");
    expectValid("2030-05-31");
    expectValid("2030-07-31");
    expectValid("2030-08-31");
    expectValid("2030-10-31");
    expectValid("2030-12-31");
    expectInvalid({ date: "2030-01-32" });
  });
  it("rejects wrong length shape and non-digit", () => {
    expectInvalid({ date: "2030-4-08" });
    expectInvalid({ date: "2030-04-8" });
    expectInvalid({ date: "2030/04/08" });
    expectInvalid({ date: "2030-04-08 " });
    expectInvalid({ date: "abcd-ef-gh" });
    expectInvalid({ date: "2030-0A-08" });
    expectInvalid({ date: "20A0-04-08" });
    expectInvalid({ date: "20300408XX" });
  });
  it("returns canonical sorted keys with no partial data", () => {
    const okRes = runFeature({ date: "2030-04-08" });
    assert.equal(JSON.stringify(okRes), "{\"date\":\"2030-04-08\",\"ok\":true}");
    const badRes = runFeature({ date: "2023-02-29" });
    assert.equal(JSON.stringify(badRes), "{\"error\":{\"code\":\"validation_error\",\"message\":\"invalid calendar date.\"},\"ok\":false}");
  });
  it("preserves input and stays deterministic", () => {
    const payload = { date: "2032-02-29" };
    const snapshot = JSON.stringify(payload);
    const a = runFeature(payload);
    const b = runFeature({ date: "2032-02-29" });
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(payload), snapshot);
    assert.deepEqual(Object.keys(payload), ["date"]);
  });
  it("uses required pure constructs without Date use", () => {
    const src = runFeature.toString();
    assert.ok(src.includes("for"));
    assert.ok(src.includes("of"));
    assert.ok(src.includes("Map"));
    assert.ok(src.includes("get"));
    assert.ok(src.includes("set"));
    assert.ok(src.includes("Object.entries"));
    assert.ok(src.includes("push"));
    assert.equal(src.includes("Date"), false);
  });
});
