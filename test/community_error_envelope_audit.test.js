import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/error_envelope_audit.mjs";

const FAILURE = { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
const CODES = ["validation_error", "schedule_conflict", "invalid_transition", "practitioner_not_found", "appointment_not_found", "body_too_large", "json_required"];

describe("top level envelope rejects bad payload", () => {
  it("rejects null array and non object payload", () => {
    assert.deepEqual(runFeature(null), FAILURE);
    assert.deepEqual(runFeature([]), FAILURE);
    assert.deepEqual(runFeature(42), FAILURE);
    assert.deepEqual(runFeature("x"), FAILURE);
    assert.deepEqual(runFeature(true), FAILURE);
    assert.deepEqual(runFeature(undefined), FAILURE);
    assert.deepEqual(runFeature({}), FAILURE);
  });
  it("rejects missing error and extra top keys", () => {
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "Bad input." }, extra: 1 }), FAILURE);
    assert.deepEqual(runFeature({ wrong: { code: "validation_error", message: "Bad input." } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "Bad input." }, other: 2 }), FAILURE);
  });
  it("returns no partial result on invalid payload", () => {
    const badList = [null, [], {}, { error: 1 }, { nope: 1 }];
    for (const bad of badList) {
      const out = runFeature(bad);
      assert.equal(out.ok, false);
      assert.equal(out.valid, undefined);
      assert.equal(out.code, undefined);
      assert.equal(out.message, undefined);
      assert.deepEqual(out, FAILURE);
    }
  });
});

describe("inner envelope rejects bad error", () => {
  it("rejects non object error values", () => {
    const badErrors = [null, [], "x", 5, true];
    for (const bad of badErrors) {
      assert.deepEqual(runFeature({ error: bad }), FAILURE);
    }
  });
  it("rejects missing or extra code message keys", () => {
    assert.deepEqual(runFeature({ error: { code: "validation_error" } }), FAILURE);
    assert.deepEqual(runFeature({ error: { message: "Hi." } }), FAILURE);
    assert.deepEqual(runFeature({ error: {} }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "Hi.", extra: 1 } }), FAILURE);
  });
  it("rejects unknown code and wrong types", () => {
    assert.deepEqual(runFeature({ error: { code: "unknown_code", message: "Hello." } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "", message: "Hello." } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: 1, message: "Hello." } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: 1 } }), FAILURE);
  });
  it("rejects message length whitespace control violations", () => {
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "" } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: " Bad" } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "Bad " } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "\tBad" } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "Bad\n" } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "Bad\r" } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "a".repeat(201) } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "a\u0001b" } }), FAILURE);
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "a\u0000b" } }), FAILURE);
  });
});

describe("accepts documented codes", () => {
  it("accepts each code with copied fields", () => {
    for (const code of CODES) {
      const out = runFeature({ error: { code: code, message: "Busy interval." } });
      assert.equal(out.ok, true);
      assert.equal(out.valid, true);
      assert.equal(out.code, code);
      assert.equal(out.message, "Busy interval.");
    }
  });
  it("matches documented examples", () => {
    assert.deepEqual(runFeature({ error: { code: "schedule_conflict", message: "Busy interval." } }), { ok: true, valid: true, code: "schedule_conflict", message: "Busy interval." });
    assert.deepEqual(runFeature({ error: { code: "validation_error", message: "Bad input." } }), { ok: true, valid: true, code: "validation_error", message: "Bad input." });
    assert.deepEqual(runFeature({ error: { code: "unknown_code", message: "Hello." } }), FAILURE);
  });
  it("preserves input and stays deterministic", () => {
    const payload = { error: { code: "schedule_conflict", message: "Busy interval." } };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(JSON.parse(before));
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(payload), before);
  });
});
