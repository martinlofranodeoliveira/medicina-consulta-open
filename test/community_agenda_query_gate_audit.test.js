import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/agenda_query_gate_audit.mjs";

const INVALID = { ok: false, error: { code: "validation_error", message: "invalid appointment query." } };

function checkPreserved(input, before) {
  assert.strictEqual(JSON.stringify(input), before);
}

describe("agenda query gate audit", () => {
  it("empty object returns empty query and preserves input", () => {
    const input = {};
    const before = JSON.stringify(input);
    const res = runFeature(input);
    assert.deepStrictEqual(res, { ok: true, valid: true, query: {} });
    checkPreserved(input, before);
    assert.notStrictEqual(res.query, input);
  });
  it("valid date-only query", () => {
    const input = { date: "2030-04-08" };
    const before = JSON.stringify(input);
    const res = runFeature(input);
    assert.deepStrictEqual(res, { ok: true, valid: true, query: { date: "2030-04-08" } });
    checkPreserved(input, before);
    assert.notStrictEqual(res.query, input);
  });
  it("valid practitionerId-only query", () => {
    const input = { practitionerId: "demo-clinica-geral" };
    const before = JSON.stringify(input);
    const res = runFeature(input);
    assert.deepStrictEqual(res, { ok: true, valid: true, query: { practitionerId: "demo-clinica-geral" } });
    checkPreserved(input, before);
  });
  it("valid combined query", () => {
    const input = { date: "2030-04-08", practitionerId: "demo-clinica-geral" };
    const before = JSON.stringify(input);
    const res = runFeature(input);
    assert.deepStrictEqual(res, { ok: true, valid: true, query: { date: "2030-04-08", practitionerId: "demo-clinica-geral" } });
    checkPreserved(input, before);
    assert.notStrictEqual(res.query, input);
  });
  it("valid leap February 29 passes", () => {
    assert.deepStrictEqual(runFeature({ date: "2024-02-29" }), { ok: true, valid: true, query: { date: "2024-02-29" } });
    assert.deepStrictEqual(runFeature({ date: "2000-02-29" }), { ok: true, valid: true, query: { date: "2000-02-29" } });
  });
  it("unknown or extra keys are invalid with no partial query", () => {
    const a = { date: "2030-04-08", unknown: "x" };
    const ra = runFeature(a);
    assert.deepStrictEqual(ra, INVALID);
    assert.strictEqual(ra.query, undefined);
    assert.deepStrictEqual(runFeature({ unknown: "x" }), INVALID);
    assert.deepStrictEqual(runFeature({ date: "2030-04-08", practitionerId: "demo-a", extra: "y" }), INVALID);
  });
  it("invalid date shape month day", () => {
    assert.deepStrictEqual(runFeature({ date: "2030-02-30" }), INVALID);
    assert.deepStrictEqual(runFeature({ date: "2030-13-01" }), INVALID);
    assert.deepStrictEqual(runFeature({ date: "2030-00-10" }), INVALID);
    assert.deepStrictEqual(runFeature({ date: "2030-04-31" }), INVALID);
    assert.deepStrictEqual(runFeature({ date: "2030-4-08" }), INVALID);
    assert.deepStrictEqual(runFeature({ date: "2030/04/08" }), INVALID);
    assert.deepStrictEqual(runFeature({ date: "abcd-ef-gh" }), INVALID);
  });
  it("non-leap February 29 is invalid", () => {
    assert.deepStrictEqual(runFeature({ date: "2023-02-29" }), INVALID);
    assert.deepStrictEqual(runFeature({ date: "1900-02-29" }), INVALID);
    assert.deepStrictEqual(runFeature({ date: "2030-02-29" }), INVALID);
  });
  it("invalid practitionerId prefix length characters", () => {
    assert.deepStrictEqual(runFeature({ practitionerId: "test-abc" }), INVALID);
    assert.deepStrictEqual(runFeature({ practitionerId: "demo-" }), INVALID);
    assert.deepStrictEqual(runFeature({ practitionerId: "demo" }), INVALID);
    assert.deepStrictEqual(runFeature({ practitionerId: "demo-hello!" }), INVALID);
    assert.deepStrictEqual(runFeature({ practitionerId: "demo-hello world" }), INVALID);
    assert.deepStrictEqual(runFeature({ practitionerId: "demo-" + "a".repeat(60) }), INVALID);
  });
  it("null array non-object wrong types preserve input", () => {
    for (const v of [null, [], "x", 123, true, undefined]) {
      const res = runFeature(v);
      assert.deepStrictEqual(res, INVALID);
    }
    const n1 = { date: 123 };
    const b1 = JSON.stringify(n1);
    assert.deepStrictEqual(runFeature(n1), INVALID);
    checkPreserved(n1, b1);
    const n2 = { practitionerId: 123 };
    const b2 = JSON.stringify(n2);
    assert.deepStrictEqual(runFeature(n2), INVALID);
    checkPreserved(n2, b2);
    const n3 = { date: null };
    assert.deepStrictEqual(runFeature(n3), INVALID);
    const n4 = { date: "2030-04-08", practitionerId: null };
    assert.deepStrictEqual(runFeature(n4), INVALID);
  });
});
