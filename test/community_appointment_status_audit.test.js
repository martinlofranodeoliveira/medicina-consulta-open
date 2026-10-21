import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/appointment_status_audit.mjs";

describe("appointment status audit", () => {
  it("accepts scheduled to completed", () => {
    assert.deepEqual(runFeature({ currentStatus: "scheduled", nextStatus: "completed" }), {
      allowed: true,
      code: "ok",
      currentStatus: "scheduled",
      nextStatus: "completed",
      ok: true
    });
  });

  it("accepts scheduled to cancelled", () => {
    assert.deepEqual(runFeature({ currentStatus: "scheduled", nextStatus: "cancelled" }), {
      allowed: true,
      code: "ok",
      currentStatus: "scheduled",
      nextStatus: "cancelled",
      ok: true
    });
  });

  it("rejects null payload", () => {
    assert.deepEqual(runFeature(null), {
      error: { code: "validation_error", message: "invalid status transition." },
      ok: false
    });
  });

  it("rejects array and non-object payloads", () => {
    const expected = { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
    assert.deepEqual(runFeature([]), expected);
    assert.deepEqual(runFeature("scheduled"), expected);
    assert.deepEqual(runFeature(42), expected);
    assert.deepEqual(runFeature(true), expected);
    assert.deepEqual(runFeature(undefined), expected);
  });

  it("rejects missing keys and extra keys", () => {
    const expected = { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
    assert.deepEqual(runFeature({}), expected);
    assert.deepEqual(runFeature({ currentStatus: "scheduled" }), expected);
    assert.deepEqual(runFeature({ nextStatus: "completed" }), expected);
    assert.deepEqual(runFeature({ currentStatus: "scheduled", nextStatus: "completed", extra: 1 }), expected);
    assert.deepEqual(runFeature({ currentStatus: "scheduled", nextStatus: "completed", ok: true }), expected);
  });

  it("rejects non-string statuses", () => {
    const expected = { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
    assert.deepEqual(runFeature({ currentStatus: 1, nextStatus: "completed" }), expected);
    assert.deepEqual(runFeature({ currentStatus: "scheduled", nextStatus: null }), expected);
    assert.deepEqual(runFeature({ currentStatus: null, nextStatus: null }), expected);
    assert.deepEqual(runFeature({ currentStatus: true, nextStatus: "cancelled" }), expected);
  });

  it("rejects currentStatus outside enum", () => {
    const expected = { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
    assert.deepEqual(runFeature({ currentStatus: "pending", nextStatus: "completed" }), expected);
    assert.deepEqual(runFeature({ currentStatus: "SCHEDULED", nextStatus: "completed" }), expected);
    assert.deepEqual(runFeature({ currentStatus: "", nextStatus: "completed" }), expected);
  });

  it("rejects nextStatus outside enum", () => {
    const expected = { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
    assert.deepEqual(runFeature({ currentStatus: "scheduled", nextStatus: "scheduled" }), expected);
    assert.deepEqual(runFeature({ currentStatus: "scheduled", nextStatus: "pending" }), expected);
    assert.deepEqual(runFeature({ currentStatus: "scheduled", nextStatus: "COMPLETED" }), expected);
    assert.deepEqual(runFeature({ currentStatus: "scheduled", nextStatus: "" }), expected);
  });

  it("returns invalid_transition when already finalized", () => {
    assert.deepEqual(runFeature({ currentStatus: "completed", nextStatus: "cancelled" }), {
      allowed: false,
      code: "invalid_transition",
      currentStatus: "completed",
      error: { code: "invalid_transition", message: "appointment already finalized." },
      nextStatus: "cancelled",
      ok: false
    });
    assert.deepEqual(runFeature({ currentStatus: "cancelled", nextStatus: "completed" }), {
      allowed: false,
      code: "invalid_transition",
      currentStatus: "cancelled",
      error: { code: "invalid_transition", message: "appointment already finalized." },
      nextStatus: "completed",
      ok: false
    });
    assert.deepEqual(runFeature({ currentStatus: "completed", nextStatus: "completed" }), {
      allowed: false,
      code: "invalid_transition",
      currentStatus: "completed",
      error: { code: "invalid_transition", message: "appointment already finalized." },
      nextStatus: "completed",
      ok: false
    });
    assert.deepEqual(runFeature({ currentStatus: "cancelled", nextStatus: "cancelled" }), {
      allowed: false,
      code: "invalid_transition",
      currentStatus: "cancelled",
      error: { code: "invalid_transition", message: "appointment already finalized." },
      nextStatus: "cancelled",
      ok: false
    });
  });

  it("preserves input without mutation and is deterministic", () => {
    const input = { currentStatus: "scheduled", nextStatus: "completed" };
    const snapshot = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    assert.equal(JSON.stringify(input), snapshot);
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(first), JSON.stringify(second));
    const frozen = Object.freeze({ currentStatus: "cancelled", nextStatus: "completed" });
    const out = runFeature(frozen);
    assert.equal(out.ok, false);
    assert.equal(out.code, "invalid_transition");
  });

  it("is synchronous JSON-to-JSON with expected source properties", () => {
    const out = runFeature({ currentStatus: "scheduled", nextStatus: "cancelled" });
    assert.equal(typeof out, "object");
    assert.equal(out instanceof Promise, false);
    assert.equal(JSON.stringify(JSON.parse(JSON.stringify(out))), JSON.stringify(out));
    const text = runFeature.toString();
    assert.equal(text.includes("Object.entries"), true);
    assert.equal(text.includes("push"), true);
    assert.equal(text.includes(".get("), true);
    assert.equal(text.includes(".set("), true);
    assert.equal(text.includes("Date"), false);
    assert.equal(text.includes("async"), false);
  });
});
