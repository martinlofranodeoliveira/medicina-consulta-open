import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/loopback_bind_audit.mjs";

describe("loopback bind audit", () => {
  it("accepts default 127.0.0.1:3334 as safe true with copy and no mutation", () => {
    const input = { host: "127.0.0.1", port: 3334 };
    const snapshot = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepStrictEqual(out, { ok: true, safe: true, host: "127.0.0.1", port: 3334 });
    assert.strictEqual(out.host, "127.0.0.1");
    assert.strictEqual(out.port, 3334);
    assert.strictEqual(JSON.stringify(input), snapshot);
    const again = runFeature({ host: "127.0.0.1", port: 3334 });
    assert.deepStrictEqual(again, out);
  });
  it("accepts 0.0.0.0 as well-formed but unsafe", () => {
    const out = runFeature({ host: "0.0.0.0", port: 3334 });
    assert.deepStrictEqual(out, { ok: true, safe: false, host: "0.0.0.0", port: 3334 });
  });
  it("accepts other valid hosts as unsafe without treating as malformed", () => {
    assert.deepStrictEqual(runFeature({ host: "localhost", port: 3000 }), { ok: true, safe: false, host: "localhost", port: 3000 });
    assert.deepStrictEqual(runFeature({ host: "127.0.0.2", port: 3334 }), { ok: true, safe: false, host: "127.0.0.2", port: 3334 });
    assert.deepStrictEqual(runFeature({ host: "my-demo-1.example", port: 1 }), { ok: true, safe: false, host: "my-demo-1.example", port: 1 });
    assert.deepStrictEqual(runFeature({ host: "a", port: 65535 }), { ok: true, safe: false, host: "a", port: 65535 });
  });
  it("rejects null array and non-object with no partial result", () => {
    for (const bad of [null, [], ["x"], "x", 42, undefined, true]) {
      const out = runFeature(bad);
      assert.deepStrictEqual(out, { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } });
      assert.strictEqual("host" in out, false);
      assert.strictEqual("port" in out, false);
      assert.strictEqual("safe" in out, false);
    }
  });
  it("rejects missing and extra keys", () => {
    const cases = [
      {},
      { host: "127.0.0.1" },
      { port: 3334 },
      { host: "127.0.0.1", port: 3334, extra: 1 },
      { host: "127.0.0.1", port: 3334, host2: "x" },
      { host: "127.0.0.1", other: 3334 },
      { a: 1, b: 2 }
    ];
    for (const c of cases) {
      const out = runFeature(c);
      assert.deepStrictEqual(out, { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } });
    }
  });
  it("rejects empty overlong and disallowed host characters", () => {
    const overlong = "a".repeat(254);
    const maxOk = "a".repeat(253);
    assert.deepStrictEqual(runFeature({ host: maxOk, port: 3334 }), { ok: true, safe: false, host: maxOk, port: 3334 });
    const badHosts = ["", overlong, "has space", " under", "over ", "with\ttab", "with\nlf", "with\rcr", "bad\u0001c0", "bad_under", "bad/slash", "bad:colon", "caf\u00e9", "127.0.0.1 "];
    for (const h of badHosts) {
      const out = runFeature({ host: h, port: 3334 });
      assert.deepStrictEqual(out, { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } });
    }
  });
  it("rejects wrong host and port types and out of range ports", () => {
    const badPorts = [0, -1, 65536, 99999, 3.14, Number.NaN, Number.POSITIVE_INFINITY, "3334", true, null, undefined];
    for (const p of badPorts) {
      const out = runFeature({ host: "127.0.0.1", port: p });
      assert.deepStrictEqual(out, { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } });
    }
    for (const h of [null, 123, {}, [], true]) {
      const out = runFeature({ host: h, port: 3334 });
      assert.deepStrictEqual(out, { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } });
    }
  });
  it("preserves example contracts", () => {
    assert.deepStrictEqual(runFeature({ host: "127.0.0.1", port: 3334 }), { ok: true, safe: true, host: "127.0.0.1", port: 3334 });
    assert.deepStrictEqual(runFeature({ host: "0.0.0.0", port: 3334 }), { ok: true, safe: false, host: "0.0.0.0", port: 3334 });
    assert.deepStrictEqual(runFeature({ host: "0.0.0.0", port: 99999 }), { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } });
  });
});
