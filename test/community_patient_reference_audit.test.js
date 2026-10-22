import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/patient_reference_audit.mjs";

describe("patient reference audit rejects invalid envelopes", () => {
  it("rejects null payload", () => {
    assert.deepStrictEqual(runFeature(null), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
  });
  it("rejects array payload", () => {
    assert.deepStrictEqual(runFeature([]), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    assert.deepStrictEqual(runFeature([{ patientRef: "abc" }]), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
  });
  it("rejects non-object payloads", () => {
    const bad = ["abc", 123, 0, true, false, undefined, 3.14];
    for (const v of bad) {
      assert.deepStrictEqual(runFeature(v), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    }
  });
  it("rejects missing patientRef", () => {
    assert.deepStrictEqual(runFeature({}), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    assert.deepStrictEqual(runFeature({ other: "abc" }), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
  });
  it("rejects extra keys", () => {
    assert.deepStrictEqual(runFeature({ patientRef: "abc", extra: "x" }), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    assert.deepStrictEqual(runFeature({ patientRef: "abc", a: "1", b: "2" }), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
  });
  it("returns no partial data on failure", () => {
    const out = runFeature({ patientRef: "bad ref!" });
    assert.deepStrictEqual(out, { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    assert.equal(out.valid, undefined);
    assert.equal(out.patientRef, undefined);
  });
  it("rejects wrong patientRef types", () => {
    const badVals = [null, 123, true, [], {}, undefined];
    for (const v of badVals) {
      assert.deepStrictEqual(runFeature({ patientRef: v }), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    }
  });
});

describe("patient reference audit accepts valid charset", () => {
  it("accepts documented example", () => {
    assert.deepStrictEqual(runFeature({ patientRef: "exemplo_001" }), { ok: true, valid: true, patientRef: "exemplo_001" });
  });
  it("accepts single chars and edges", () => {
    for (const v of ["a", "Z", "0", "9", "-", "_", "A", "z"]) {
      assert.deepStrictEqual(runFeature({ patientRef: v }), { ok: true, valid: true, patientRef: v });
    }
  });
  it("accepts mixed valid string", () => {
    const v = "Abc-XYZ_012";
    assert.deepStrictEqual(runFeature({ patientRef: v }), { ok: true, valid: true, patientRef: v });
  });
  it("rejects empty and overlong", () => {
    assert.deepStrictEqual(runFeature({ patientRef: "" }), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    assert.deepStrictEqual(runFeature({ patientRef: "bad ref!" }), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    assert.deepStrictEqual(runFeature({ patientRef: "a".repeat(49) }), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    assert.deepStrictEqual(runFeature({ patientRef: "a".repeat(100) }), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
  });
  it("rejects space dot slash and unicode", () => {
    for (const v of ["a b", "a.b", "a/b", "caf\u00e9", "a\u2603b", "bad ref!", "a+b", "a:b"]) {
      assert.deepStrictEqual(runFeature({ patientRef: v }), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    }
  });
});

describe("patient reference audit boundaries", () => {
  it("handles lengths 1 48 and 49", () => {
    const one = "x";
    const full = "a".repeat(48);
    const over = "a".repeat(49);
    assert.deepStrictEqual(runFeature({ patientRef: one }), { ok: true, valid: true, patientRef: one });
    assert.deepStrictEqual(runFeature({ patientRef: full }), { ok: true, valid: true, patientRef: full });
    assert.deepStrictEqual(runFeature({ patientRef: over }), { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
  });
  it("handles 48 mixed charset", () => {
    const v = ("Aa0-_Bb1").repeat(6);
    assert.equal(v.length, 48);
    assert.deepStrictEqual(runFeature({ patientRef: v }), { ok: true, valid: true, patientRef: v });
  });
});

describe("patient reference audit purity", () => {
  it("preserves input object and string", () => {
    const payload = { patientRef: "Keep_01" };
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    assert.deepStrictEqual(out, { ok: true, valid: true, patientRef: "Keep_01" });
    assert.equal(JSON.stringify(payload), before);
    assert.deepStrictEqual(payload, { patientRef: "Keep_01" });
    assert.notStrictEqual(out, payload);
  });
  it("preserves input across failed calls", () => {
    const payload = { patientRef: "bad ref!" };
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    assert.deepStrictEqual(out, { ok: false, error: { code: "validation_error", message: "invalid patient reference." } });
    assert.equal(JSON.stringify(payload), before);
  });
  it("is synchronous deterministic JSON", () => {
    const payload = { patientRef: "Det_123" };
    const a = runFeature(payload);
    const b = runFeature({ patientRef: "Det_123" });
    assert.deepStrictEqual(a, b);
    assert.equal(a instanceof Promise, false);
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });
});
