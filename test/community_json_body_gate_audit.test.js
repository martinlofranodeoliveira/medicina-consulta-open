import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/json_body_gate_audit.mjs";

describe("json body gate audit", () => {
  it("accepts application/json with small length", () => {
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: 123 }), {
      ok: true,
      accepted: true,
      contentType: "application/json",
      bodyByteLength: 123,
      limit: 8192
    });
  });
  it("accepts boundaries 0 and 8192", () => {
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: 0 }), {
      ok: true,
      accepted: true,
      contentType: "application/json",
      bodyByteLength: 0,
      limit: 8192
    });
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: 8192 }), {
      ok: true,
      accepted: true,
      contentType: "application/json",
      bodyByteLength: 8192,
      limit: 8192
    });
  });
  it("returns json_required for well-formed non-json content type", () => {
    assert.deepEqual(runFeature({ contentType: "text/plain", bodyByteLength: 100 }), {
      ok: false,
      error: { code: "json_required", message: "json required." }
    });
  });
  it("returns body_too_large for 8193 and large valid lengths", () => {
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: 8193 }), {
      ok: false,
      error: { code: "body_too_large", message: "body too large." }
    });
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: 65535 }), {
      ok: false,
      error: { code: "body_too_large", message: "body too large." }
    });
  });
  it("rejects null, array and non-object payloads", () => {
    const expected = { ok: false, error: { code: "validation_error", message: "invalid body gate request." } };
    assert.deepEqual(runFeature(null), expected);
    assert.deepEqual(runFeature([1, 2]), expected);
    assert.deepEqual(runFeature("application/json"), expected);
    assert.deepEqual(runFeature(42), expected);
    assert.deepEqual(runFeature(undefined), expected);
    assert.deepEqual(runFeature(true), expected);
  });
  it("rejects missing and extra keys with no partial data", () => {
    const expected = { ok: false, error: { code: "validation_error", message: "invalid body gate request." } };
    assert.deepEqual(runFeature({ contentType: "application/json" }), expected);
    assert.deepEqual(runFeature({ bodyByteLength: 10 }), expected);
    assert.deepEqual(runFeature({}), expected);
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: 10, extra: 1 }), expected);
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: 10, limit: 8192 }), expected);
    for (const bad of [{ contentType: "application/json" }, {}, { contentType: "application/json", bodyByteLength: 10, extra: 1 }]) {
      const out = runFeature(bad);
      assert.equal(out.ok, false);
      assert.equal("accepted" in out, false);
      assert.equal("limit" in out, false);
      assert.deepEqual(Object.keys(out).sort(), ["error", "ok"]);
    }
  });
  it("rejects wrong types and out-of-range values", () => {
    const expected = { ok: false, error: { code: "validation_error", message: "invalid body gate request." } };
    assert.deepEqual(runFeature({ contentType: 42, bodyByteLength: 10 }), expected);
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: "10" }), expected);
    assert.deepEqual(runFeature({ contentType: "", bodyByteLength: 10 }), expected);
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: -1 }), expected);
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: 65536 }), expected);
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: 3.5 }), expected);
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: Number.NaN }), expected);
    assert.deepEqual(runFeature({ contentType: "x".repeat(129), bodyByteLength: 10 }), expected);
  });
  it("treats empty contentType and length above 65535 as validation_error", () => {
    assert.deepEqual(runFeature({ contentType: "", bodyByteLength: 0 }), {
      ok: false,
      error: { code: "validation_error", message: "invalid body gate request." }
    });
    assert.deepEqual(runFeature({ contentType: "application/json", bodyByteLength: 65536 }), {
      ok: false,
      error: { code: "validation_error", message: "invalid body gate request." }
    });
  });
  it("never mutates input", () => {
    const input = { contentType: "application/json", bodyByteLength: 123 };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(input, { contentType: "application/json", bodyByteLength: 123 });
    assert.equal(out.ok, true);
    const bad = { contentType: "text/plain", bodyByteLength: 5 };
    const badBefore = JSON.stringify(bad);
    runFeature(bad);
    assert.equal(JSON.stringify(bad), badBefore);
  });
});
