import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runFeature } from "../src/community/appointment_transition_gate_audit.mjs";

const srcText = readFileSync(new URL("../src/community/appointment_transition_gate_audit.mjs", import.meta.url), "utf8");

function expectInvalid(payload) {
  const before = JSON.stringify(payload);
  const out = runFeature(payload);
  assert.equal(out.ok, false);
  assert.deepEqual(out.error, { code: "validation_error", message: "invalid status transition request." });
  assert.equal("allowed" in out, false);
  assert.equal("from" in out, false);
  assert.equal("to" in out, false);
  assert.equal(JSON.stringify(payload), before);
}

describe("appointment_transition_gate_audit", () => {
  it("rejects null, array and non-object", () => {
    expectInvalid(null);
    expectInvalid([]);
    expectInvalid([{ from: "scheduled", to: "completed" }]);
    expectInvalid("scheduled");
    expectInvalid(42);
    expectInvalid(undefined);
    expectInvalid(true);
  });
  it("rejects wrong key sets", () => {
    expectInvalid({});
    expectInvalid({ from: "scheduled" });
    expectInvalid({ to: "completed" });
    expectInvalid({ from: "scheduled", to: "completed", extra: "x" });
    expectInvalid({ from: "scheduled", foo: "completed" });
    expectInvalid({ a: "scheduled", b: "completed" });
  });
  it("rejects bad from and to values", () => {
    expectInvalid({ from: "SCHEDULED", to: "completed" });
    expectInvalid({ from: "scheduled ", to: "completed" });
    expectInvalid({ from: "", to: "completed" });
    expectInvalid({ from: "scheduled", to: "scheduled" });
    expectInvalid({ from: "scheduled", to: "pending" });
    expectInvalid({ from: "scheduled", to: "" });
    expectInvalid({ from: "completed", to: 123 });
    expectInvalid({ from: 123, to: "completed" });
    expectInvalid({ from: null, to: "completed" });
  });
  it("allows scheduled to completed", () => {
    const input = { from: "scheduled", to: "completed" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.equal(out.ok, true);
    assert.equal(out.allowed, true);
    assert.equal(out.from, "scheduled");
    assert.equal(out.to, "completed");
    assert.equal(JSON.stringify(input), before);
  });
  it("allows scheduled to cancelled", () => {
    const out = runFeature({ from: "scheduled", to: "cancelled" });
    assert.deepEqual(out, { ok: true, allowed: true, from: "scheduled", to: "cancelled" });
  });
  it("denies completed or cancelled from values", () => {
    assert.deepEqual(runFeature({ from: "completed", to: "cancelled" }), { ok: true, allowed: false, from: "completed", to: "cancelled" });
    assert.deepEqual(runFeature({ from: "cancelled", to: "completed" }), { ok: true, allowed: false, from: "cancelled", to: "completed" });
    assert.deepEqual(runFeature({ from: "completed", to: "completed" }), { ok: true, allowed: false, from: "completed", to: "completed" });
    assert.deepEqual(runFeature({ from: "cancelled", to: "cancelled" }), { ok: true, allowed: false, from: "cancelled", to: "cancelled" });
  });
  it("preserves input and stays pure", () => {
    const input = { from: "scheduled", to: "completed" };
    const snap = JSON.stringify(input);
    const a = runFeature(input);
    const b = runFeature({ from: "scheduled", to: "completed" });
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(input), snap);
    assert.equal(typeof a.from, "string");
    assert.equal(typeof a.to, "string");
    assert.equal(a instanceof Promise, false);
  });
  it("uses only allowed constructs and no Date imports", () => {
    assert.equal(srcText.includes("Date"), false);
    assert.equal(srcText.includes("Object.assign"), false);
    assert.equal(srcText.includes("Object.create"), false);
    assert.equal(/\bimport\b/.test(srcText), false);
    assert.equal(/\bclass\b/.test(srcText), false);
    assert.equal(/\basync\b/.test(srcText), false);
    assert.equal(/\bthis\b/.test(srcText), false);
    assert.equal(srcText.includes("prototype"), false);
    assert.equal(srcText.includes("constructor"), false);
    assert.ok(srcText.includes("for ("));
    assert.ok(srcText.includes(" of "));
    assert.ok(srcText.includes("Object.entries"));
    assert.ok(srcText.includes("new Map"));
    assert.ok(srcText.includes(".get("));
    assert.ok(srcText.includes(".set("));
    assert.ok(srcText.includes(".push("));
  });
});
