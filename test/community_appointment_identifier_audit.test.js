import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/appointment_identifier_audit.mjs";

const VALID = "123e4567-e89b-12d3-a456-426614174000";
const INVALID_OUT = { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };

describe("appointment identifier audit", () => {
  it("accepts canonical lowercase uuid shape", () => {
    const input = { id: VALID };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { ok: true, valid: true, id: VALID });
    assert.equal(out.id, VALID);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(input, { id: VALID });
  });
  it("is deterministic and synchronous", () => {
    const a = runFeature({ id: VALID });
    const b = runFeature({ id: VALID });
    assert.deepEqual(a, b);
    assert.equal(a instanceof Promise, false);
    assert.equal(typeof runFeature, "function");
  });
  it("rejects null array and non-object payloads", () => {
    assert.deepEqual(runFeature(null), INVALID_OUT);
    assert.deepEqual(runFeature([VALID]), INVALID_OUT);
    assert.deepEqual(runFeature("x"), INVALID_OUT);
    assert.deepEqual(runFeature(42), INVALID_OUT);
    assert.deepEqual(runFeature(undefined), INVALID_OUT);
    assert.deepEqual(runFeature(true), INVALID_OUT);
  });
  it("rejects missing id and extra keys", () => {
    assert.deepEqual(runFeature({}), INVALID_OUT);
    assert.deepEqual(runFeature({ id: VALID, extra: 1 }), INVALID_OUT);
    assert.deepEqual(runFeature({ idd: VALID }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: VALID, other: VALID }), INVALID_OUT);
  });
  it("rejects non-string id", () => {
    assert.deepEqual(runFeature({ id: null }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: 123 }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: [VALID] }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: { id: VALID } }), INVALID_OUT);
  });
  it("rejects wrong length", () => {
    assert.deepEqual(runFeature({ id: "" }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: "123e4567-e89b-12d3-a456-42661417400" }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: VALID + "0" }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: "123e4567e89b12d3a45642661417400000" }), INVALID_OUT);
  });
  it("rejects missing or misplaced hyphens", () => {
    assert.deepEqual(runFeature({ id: "123e4567e89b-12d3-a456-426614174000" }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: "123e4567-e89b12d3-a456-426614174000" }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: "-23e4567-e89b-12d3-a456-426614174000" }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: "123e4567-e89b-12d3-a456-42661417400-" }), INVALID_OUT);
  });
  it("rejects uppercase and non-hex characters", () => {
    assert.deepEqual(runFeature({ id: "123E4567-E89B-12D3-A456-426614174000" }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: "123e4567-e89b-12d3-a456-42661417400G" }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: "123e4567-e89b-12d3-a456-42661417400z" }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: "123e4567-e89b-12d3-a456-42661417400 " }), INVALID_OUT);
    assert.deepEqual(runFeature({ id: "123e4567_e89b_12d3_a456_426614174000" }), INVALID_OUT);
  });
  it("preserves input and returns no partial result on error", () => {
    const bad = { id: "XYZ", extra: 1 };
    const snap = JSON.stringify(bad);
    const out = runFeature(bad);
    assert.deepEqual(out, INVALID_OUT);
    assert.equal(JSON.stringify(bad), snap);
    assert.equal("valid" in out, false);
    assert.equal("id" in out, false);
  });
});
