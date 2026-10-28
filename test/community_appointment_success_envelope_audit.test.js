import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/appointment_success_envelope_audit.mjs";

describe("appointment success envelope audit", () => {
  it("accepts minimal valid envelope with canonical sorted keys", () => {
    const input = { data: { id: "550e8400-e29b-41d4-a716-446655440000" } };
    const before = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepEqual(result, { id: "550e8400-e29b-41d4-a716-446655440000", ok: true });
    assert.deepEqual(Object.keys(result), ["id", "ok"]);
    assert.equal(JSON.stringify(input), before);
  });

  it("accepts extra nested keys inside data without validating semantics", () => {
    const input = { data: { extra: 12, id: "synthetic_001", status: "scheduled" } };
    const before = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepEqual(result, { id: "synthetic_001", ok: true });
    assert.deepEqual(Object.keys(result), ["id", "ok"]);
    assert.equal(JSON.stringify(input), before);
  });

  it("is deterministic and preserves input", () => {
    const input = { data: { id: "abc", practitioner: "x", duration: 30 } };
    const first = runFeature(input);
    const second = runFeature(input);
    assert.deepEqual(first, second);
    assert.deepEqual(first, { id: "abc", ok: true });
    assert.equal(JSON.stringify(input), JSON.stringify({ data: { id: "abc", practitioner: "x", duration: 30 } }));
  });

  it("leaves strict identifier pattern and appointment semantics out of scope", () => {
    assert.deepEqual(runFeature({ data: { id: "!!!" } }), { id: "!!!", ok: true });
    assert.deepEqual(runFeature({ data: { id: "a b", duration: "bad", practitioner: 1 } }), { id: "a b", ok: true });
  });

  it("rejects non-object and top-level shape problems", () => {
    const cases = [
      null,
      ["x"],
      "data",
      42,
      {},
      { data: { id: "a" }, extra: 1 },
      { wrong: { id: "a" } },
      { data: { id: "a" }, error: { code: "validation_error", message: "invalid success envelope." } },
    ];
    for (const payload of cases) {
      const result = runFeature(payload);
      assert.deepEqual(result, { error: { code: "validation_error", message: "invalid success envelope." }, ok: false });
      assert.deepEqual(Object.keys(result), ["error", "ok"]);
      assert.deepEqual(Object.keys(result.error), ["code", "message"]);
      assert.equal("id" in result, false);
    }
  });

  it("rejects non-object data and missing or wrong-type id", () => {
    const cases = [
      { data: null },
      { data: ["a"] },
      { data: "x" },
      { data: {} },
      { data: { id: null } },
      { data: { id: 42 } },
      { data: { id: ["a"] } },
      { data: { id: { v: 1 } } },
      { data: { id: "" } },
    ];
    for (const payload of cases) {
      const result = runFeature(payload);
      assert.deepEqual(result, { error: { code: "validation_error", message: "invalid success envelope." }, ok: false });
      assert.equal("id" in result, false);
    }
  });

  it("rejects overlong and whitespace-padded or control-char ids", () => {
    const overlong = "a".repeat(129);
    const exact = "a".repeat(128);
    assert.deepEqual(runFeature({ data: { id: exact } }), { id: exact, ok: true });
    const bad = [
      { data: { id: overlong } },
      { data: { id: " leading" } },
      { data: { id: "trailing " } },
      { data: { id: "a\tb" } },
      { data: { id: "a\nb" } },
      { data: { id: "a\rb" } },
    ];
    for (const payload of bad) {
      const result = runFeature(payload);
      assert.deepEqual(result, { error: { code: "validation_error", message: "invalid success envelope." }, ok: false });
      assert.equal("id" in result, false);
    }
  });
});
