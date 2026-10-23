import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/server_info_envelope_audit.mjs";

describe("server info envelope audit", () => {
  it("valid local envelope returns ok true with equal copy", () => {
    const payload = { version: "1.0.0", mode: "local", status: "ok" };
    const before = JSON.stringify(payload);
    const result = runFeature(payload);
    assert.equal(result.ok, true);
    assert.deepEqual(result.info, { version: "1.0.0", mode: "local", status: "ok" });
    assert.equal(JSON.stringify(payload), before);
  });
  it("valid demo and test modes pass", () => {
    assert.deepEqual(runFeature({ version: "2", mode: "demo", status: "ok" }), { ok: true, info: { version: "2", mode: "demo", status: "ok" } });
    assert.deepEqual(runFeature({ version: "1-2.3", mode: "test", status: "ok" }), { ok: true, info: { version: "1-2.3", mode: "test", status: "ok" } });
  });
  it("invalid version charset, empty, or over 32 chars fails with no partial", () => {
    const badCharset = runFeature({ version: "v!", mode: "local", status: "ok" });
    assert.equal(badCharset.ok, false);
    assert.deepEqual(badCharset.error, { code: "validation_error", message: "invalid server info envelope." });
    assert.equal(badCharset.info, undefined);
    const empty = runFeature({ version: "", mode: "local", status: "ok" });
    assert.equal(empty.ok, false);
    assert.equal(empty.error.code, "validation_error");
    assert.equal(empty.info, undefined);
    const over = runFeature({ version: "123456789012345678901234567890123", mode: "local", status: "ok" });
    assert.equal(over.ok, false);
    assert.equal(over.error.code, "validation_error");
    assert.equal(over.info, undefined);
    const leadingLetter = runFeature({ version: "v1.0.0", mode: "local", status: "ok" });
    assert.equal(leadingLetter.ok, false);
    assert.equal(leadingLetter.error.code, "validation_error");
  });
  it("invalid mode other than local demo test fails", () => {
    const prod = runFeature({ version: "1.0.0", mode: "prod", status: "ok" });
    assert.equal(prod.ok, false);
    assert.deepEqual(prod.error, { code: "validation_error", message: "invalid server info envelope." });
    assert.equal(prod.info, undefined);
    const emptyMode = runFeature({ version: "1.0.0", mode: "", status: "ok" });
    assert.equal(emptyMode.ok, false);
    assert.equal(emptyMode.error.code, "validation_error");
    const upper = runFeature({ version: "1.0.0", mode: "LOCAL", status: "ok" });
    assert.equal(upper.ok, false);
    assert.equal(upper.error.code, "validation_error");
  });
  it("extra or missing key or null array non-object fails", () => {
    const extra = runFeature({ version: "1.0.0", mode: "local", status: "ok", extra: "x" });
    assert.equal(extra.ok, false);
    assert.equal(extra.error.code, "validation_error");
    assert.equal(extra.info, undefined);
    const missing = runFeature({ version: "1.0.0", mode: "local" });
    assert.equal(missing.ok, false);
    assert.equal(missing.error.code, "validation_error");
    const nul = runFeature(null);
    assert.equal(nul.ok, false);
    assert.equal(nul.error.code, "validation_error");
    const arr = runFeature([]);
    assert.equal(arr.ok, false);
    assert.equal(arr.error.code, "validation_error");
    const str = runFeature("1.0.0");
    assert.equal(str.ok, false);
    assert.equal(str.error.code, "validation_error");
    const num = runFeature(42);
    assert.equal(num.ok, false);
    assert.equal(num.error.code, "validation_error");
    const wrongStatus = runFeature({ version: "1.0.0", mode: "local", status: "bad" });
    assert.equal(wrongStatus.ok, false);
    assert.equal(wrongStatus.error.code, "validation_error");
  });
  it("input is never mutated and success uses new object", () => {
    const payload = { version: "1.0.0", mode: "local", status: "ok" };
    const snapshot = JSON.stringify(payload);
    const result = runFeature(payload);
    assert.equal(result.ok, true);
    assert.notStrictEqual(result.info, payload);
    assert.equal(result.info.version, payload.version);
    assert.equal(result.info.mode, payload.mode);
    assert.equal(result.info.status, payload.status);
    result.info.version = "9.9.9";
    assert.equal(payload.version, "1.0.0");
    assert.equal(JSON.stringify({ version: payload.version, mode: payload.mode, status: payload.status }), snapshot);
  });
});
