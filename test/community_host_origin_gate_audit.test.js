import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/host_origin_gate_audit.mjs";

function expectValidationError(payload) {
  const out = runFeature(payload);
  assert.equal(out.ok, false);
  assert.deepEqual(out.error, { code: "validation_error", message: "invalid host gate request." });
  assert.equal("allowed" in out, false);
  assert.equal("reason" in out, false);
  assert.equal("host" in out, false);
  assert.equal("origin" in out, false);
}

describe("host origin gate audit validation", () => {
  it("rejects null array and non-object payloads", () => {
    expectValidationError(null);
    expectValidationError(undefined);
    expectValidationError([]);
    expectValidationError([{ host: "127.0.0.1:3334", origin: "" }]);
    expectValidationError("127.0.0.1:3334");
    expectValidationError(42);
    expectValidationError(true);
  });
  it("rejects missing and extra keys", () => {
    expectValidationError({});
    expectValidationError({ host: "127.0.0.1:3334" });
    expectValidationError({ origin: "" });
    expectValidationError({ host: "127.0.0.1:3334", origin: "", extra: "x" });
    expectValidationError({ host: "127.0.0.1:3334", origin: "", HOST: "x" });
    expectValidationError({ host: "127.0.0.1:3334", Origin: "" });
  });
  it("rejects wrong types and lengths", () => {
    expectValidationError({ host: 123, origin: "" });
    expectValidationError({ host: "127.0.0.1:3334", origin: 123 });
    expectValidationError({ host: null, origin: "" });
    expectValidationError({ host: "", origin: "" });
    expectValidationError({ host: "a".repeat(129), origin: "" });
    expectValidationError({ host: "127.0.0.1:3334", origin: "x".repeat(257) });
  });
  it("accepts boundary lengths for further gating", () => {
    const out = runFeature({ host: "127.0.0.1:3334", origin: "x".repeat(256) });
    assert.equal(out.ok, true);
    assert.equal(out.allowed, false);
    assert.equal(out.reason, "origin_rejected");
  });
});

describe("host origin gate audit decisions", () => {
  it("rejects non-allowlisted host even when origin is allowlisted", () => {
    const out = runFeature({ host: "example.com", origin: "" });
    assert.deepEqual(out, { ok: true, allowed: false, reason: "host_rejected", host: "example.com", origin: "" });
    const out2 = runFeature({ host: "example.com", origin: "http://127.0.0.1:3334" });
    assert.equal(out2.reason, "host_rejected");
    assert.equal(out2.allowed, false);
    assert.equal(runFeature({ host: "127.0.0.1:3333", origin: "" }).reason, "host_rejected");
    assert.equal(runFeature({ host: "127.0.0.1", origin: "" }).reason, "host_rejected");
  });
  it("rejects non-allowlisted origin when host is allowlisted", () => {
    const out = runFeature({ host: "127.0.0.1:3334", origin: "http://evil.example" });
    assert.deepEqual(out, { ok: true, allowed: false, reason: "origin_rejected", host: "127.0.0.1:3334", origin: "http://evil.example" });
    const out2 = runFeature({ host: "localhost:3334", origin: "https://localhost:3334" });
    assert.equal(out2.reason, "origin_rejected");
    assert.equal(out2.allowed, false);
  });
  it("allows exact loopback hosts with empty or loopback http origin", () => {
    assert.deepEqual(runFeature({ host: "127.0.0.1:3334", origin: "" }), { ok: true, allowed: true, reason: "loopback", host: "127.0.0.1:3334", origin: "" });
    assert.deepEqual(runFeature({ host: "localhost:3334", origin: "" }), { ok: true, allowed: true, reason: "loopback", host: "localhost:3334", origin: "" });
    assert.deepEqual(runFeature({ host: "127.0.0.1:3334", origin: "http://127.0.0.1:3334" }), { ok: true, allowed: true, reason: "loopback", host: "127.0.0.1:3334", origin: "http://127.0.0.1:3334" });
    assert.deepEqual(runFeature({ host: "localhost:3334", origin: "http://localhost:3334" }), { ok: true, allowed: true, reason: "loopback", host: "localhost:3334", origin: "http://localhost:3334" });
    assert.deepEqual(runFeature({ host: "127.0.0.1:3334", origin: "http://localhost:3334" }), { ok: true, allowed: true, reason: "loopback", host: "127.0.0.1:3334", origin: "http://localhost:3334" });
    assert.deepEqual(runFeature({ host: "localhost:3334", origin: "http://127.0.0.1:3334" }), { ok: true, allowed: true, reason: "loopback", host: "localhost:3334", origin: "http://127.0.0.1:3334" });
  });
  it("treats empty origin as absent and requires port 3334", () => {
    assert.equal(runFeature({ host: "127.0.0.1:3334", origin: "" }).allowed, true);
    assert.equal(runFeature({ host: "127.0.0.1:3333", origin: "" }).reason, "host_rejected");
    assert.equal(runFeature({ host: "localhost:3333", origin: "" }).reason, "host_rejected");
    assert.equal(runFeature({ host: "localhost:3334", origin: "http://localhost:3333" }).reason, "origin_rejected");
  });
});

describe("host origin gate audit purity", () => {
  it("never mutates input and is deterministic", () => {
    const payload = { host: "127.0.0.1:3334", origin: "http://localhost:3334" };
    const snap = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature({ host: "127.0.0.1:3334", origin: "http://localhost:3334" });
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(payload), snap);
    assert.deepEqual(payload, { host: "127.0.0.1:3334", origin: "http://localhost:3334" });
  });
  it("builds with literals push and Map via for-of and Object.entries without Date or IO", () => {
    const src = runFeature.toString();
    assert.match(src, /Object\.entries/);
    assert.match(src, /for\s*\(/);
    assert.match(src, /\bof\b/);
    assert.match(src, /\.push\(/);
    assert.match(src, /\.set\(/);
    assert.match(src, /\.get\(/);
    assert.match(src, /new Map/);
    assert.doesNotMatch(src, /\bDate\b/);
    assert.doesNotMatch(src, /process\./);
    assert.doesNotMatch(src, /Reflect|Proxy/);
    assert.doesNotMatch(src, /\.prototype|\.constructor|__proto__/);
    assert.doesNotMatch(src, /Object\.assign|Object\.create/);
  });
});
