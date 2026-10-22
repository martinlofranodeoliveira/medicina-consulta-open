import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runFeature } from "../src/community/duration_minutes_audit.mjs";

const src = readFileSync(new URL("../src/community/duration_minutes_audit.mjs", import.meta.url), "utf8");

describe("duration minutes audit transport gate", () => {
  it("rejects null, array and non-object without partial result", () => {
    const expected = { ok: false, error: { code: "validation_error", message: "invalid duration request." } };
    assert.deepEqual(runFeature(null), expected);
    assert.deepEqual(runFeature([]), expected);
    assert.deepEqual(runFeature([30]), expected);
    assert.deepEqual(runFeature("30"), expected);
    assert.deepEqual(runFeature(30), expected);
    assert.deepEqual(runFeature(undefined), expected);
    assert.deepEqual(runFeature(true), expected);
  });
  it("rejects missing key and extra keys", () => {
    const expected = { ok: false, error: { code: "validation_error", message: "invalid duration request." } };
    assert.deepEqual(runFeature({}), expected);
    assert.deepEqual(runFeature({ durationMinutes: 30, extra: 1 }), expected);
    assert.deepEqual(runFeature({ other: 30 }), expected);
    assert.deepEqual(runFeature({ durationMinutes: 30, durationminutes: 30 }), expected);
  });
  it("rejects non-number or non-integer numbers", () => {
    const expected = { ok: false, error: { code: "validation_error", message: "invalid duration request." } };
    assert.deepEqual(runFeature({ durationMinutes: "30" }), expected);
    assert.deepEqual(runFeature({ durationMinutes: null }), expected);
    assert.deepEqual(runFeature({ durationMinutes: true }), expected);
    assert.deepEqual(runFeature({ durationMinutes: 30.5 }), expected);
    assert.deepEqual(runFeature({ durationMinutes: 45.2 }), expected);
    assert.deepEqual(runFeature({ durationMinutes: Number.NaN }), expected);
    assert.deepEqual(runFeature({ durationMinutes: Number.POSITIVE_INFINITY }), expected);
  });
  it("does not mutate input and preserves it", () => {
    const input = { durationMinutes: 45 };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { ok: true, valid: true, durationMinutes: 45 });
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(input, { durationMinutes: 45 });
    const bad = { durationMinutes: "30" };
    const badBefore = JSON.stringify(bad);
    assert.deepEqual(runFeature(bad), { ok: false, error: { code: "validation_error", message: "invalid duration request." } });
    assert.equal(JSON.stringify(bad), badBefore);
  });
});

describe("duration minutes audit valid grid", () => {
  it("accepts exactly the quarter-hour grid", () => {
    const grid = [15, 30, 45, 60, 75, 90, 105, 120];
    for (const v of grid) {
      assert.deepEqual(runFeature({ durationMinutes: v }), { ok: true, valid: true, durationMinutes: v });
    }
  });
});

describe("duration minutes audit range gate", () => {
  it("returns range_error below 15 or above 120", () => {
    for (const v of [0, 1, 14, -15, 121, 122, 200, 1000]) {
      assert.deepEqual(runFeature({ durationMinutes: v }), { ok: true, valid: false, reason: "range_error", durationMinutes: v });
    }
  });
});

describe("duration minutes audit grid gate", () => {
  it("returns grid_error inside range but off grid", () => {
    for (const v of [16, 20, 29, 31, 44, 46, 59, 61, 74, 76, 89, 91, 104, 106, 119]) {
      assert.deepEqual(runFeature({ durationMinutes: v }), { ok: true, valid: false, reason: "grid_error", durationMinutes: v });
    }
  });
});

describe("duration minutes audit purity", () => {
  it("is synchronous deterministic function", () => {
    assert.equal(typeof runFeature, "function");
    assert.equal(runFeature.length, 1);
    const a = runFeature({ durationMinutes: 45 });
    const b = runFeature({ durationMinutes: 45 });
    assert.deepEqual(a, b);
    assert.equal(a instanceof Promise, false);
  });
  it("uses only allowed pure building blocks", () => {
    assert.match(src, /export function runFeature/);
    assert.match(src, /Object\.entries/);
    assert.match(src, /for \(.* of /);
    assert.match(src, /new Map/);
    assert.match(src, /\.set\(/);
    assert.match(src, /\.get\(/);
    assert.match(src, /\.push\(/);
    assert.doesNotMatch(src, /import\s+.*from/);
    assert.doesNotMatch(src, /\bDate\b/);
    assert.doesNotMatch(src, /\bprototype\b/);
    assert.doesNotMatch(src, /\bconstructor\b/);
  });
});
