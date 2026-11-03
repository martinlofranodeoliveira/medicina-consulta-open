import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/startsat_utc_normalization_audit.mjs";

function invalidOut() {
  return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
}

describe("startsat utc normalization audit", () => {
  it("contract examples", () => {
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T09:00:00-03:00" }), { ok: true, utc: "2030-04-08T12:00:00.000Z" });
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00Z" }), { ok: true, utc: "2030-04-08T12:00:00.000Z" });
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T09:00:00+03:07" }), invalidOut());
  });
  it("rejects null array non-object missing extra keys", () => {
    assert.deepEqual(runFeature(null), invalidOut());
    assert.deepEqual(runFeature([]), invalidOut());
    assert.deepEqual(runFeature("x"), invalidOut());
    assert.deepEqual(runFeature(42), invalidOut());
    assert.deepEqual(runFeature({}), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00Z", extra: 1 }), invalidOut());
    assert.deepEqual(runFeature({ wrong: "2030-04-08T12:00:00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: 123 }), invalidOut());
  });
  it("accepts only exact shapes with fixed separators", () => {
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00ZZ" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030/04/08T12:00:00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08 12:00:00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12-00-00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00+03-00" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00+0300" }), invalidOut());
  });
  it("enforces calendar leap grid and offset bounds", () => {
    assert.deepEqual(runFeature({ startsAt: "2030-13-08T12:00:00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-00-08T12:00:00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2023-02-29T12:00:00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2024-02-29T12:00:00Z" }), { ok: true, utc: "2024-02-29T12:00:00.000Z" });
    assert.deepEqual(runFeature({ startsAt: "2000-02-29T12:00:00Z" }), { ok: true, utc: "2000-02-29T12:00:00.000Z" });
    assert.deepEqual(runFeature({ startsAt: "1900-02-29T12:00:00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "0000-02-29T12:00:00Z" }), { ok: true, utc: "0000-02-29T12:00:00.000Z" });
    assert.deepEqual(runFeature({ startsAt: "2030-04-31T12:00:00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T24:00:00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:07:00Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:01Z" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00+15:00" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00+03:07" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "2030-04-08T12:00:00+14:45" }), { ok: true, utc: "2030-04-07T21:15:00.000Z" });
  });
  it("normalizes with borrow and carry and rejects year overflow", () => {
    assert.deepEqual(runFeature({ startsAt: "2030-01-01T00:00:00+02:00" }), { ok: true, utc: "2029-12-31T22:00:00.000Z" });
    assert.deepEqual(runFeature({ startsAt: "2030-12-31T23:00:00-02:00" }), { ok: true, utc: "2031-01-01T01:00:00.000Z" });
    assert.deepEqual(runFeature({ startsAt: "2024-02-29T23:00:00-02:00" }), { ok: true, utc: "2024-03-01T01:00:00.000Z" });
    assert.deepEqual(runFeature({ startsAt: "0000-01-01T00:00:00+02:00" }), invalidOut());
    assert.deepEqual(runFeature({ startsAt: "9999-12-31T23:00:00-02:00" }), invalidOut());
  });
  it("returns canonical sorted keys and preserves input", () => {
    const p1 = { startsAt: "2030-04-08T12:00:00Z" };
    const r1 = runFeature(p1);
    assert.deepEqual(Object.keys(r1), ["ok", "utc"]);
    assert.deepEqual(p1, { startsAt: "2030-04-08T12:00:00Z" });
    const p2 = { startsAt: "bad" };
    const r2 = runFeature(p2);
    assert.deepEqual(Object.keys(r2), ["error", "ok"]);
    assert.deepEqual(Object.keys(r2.error), ["code", "message"]);
    assert.deepEqual(r2, invalidOut());
    assert.deepEqual(p2, { startsAt: "bad" });
    assert.equal(runFeature({ startsAt: "2030-04-08T09:15:00-03:00" }).utc, "2030-04-08T12:15:00.000Z");
  });
  it("pure static shape without Date", () => {
    const src = runFeature.toString();
    assert.equal(src.includes("Date"), false);
    assert.equal(src.includes("for"), true);
    assert.equal(src.includes("Map"), true);
    assert.equal(src.includes("push"), true);
  });
});
