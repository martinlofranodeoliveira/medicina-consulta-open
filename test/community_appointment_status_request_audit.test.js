import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/appointment_status_request_audit.mjs";

describe("appointment status request audit", function () {
  it("accepts completed", function () {
    const input = { status: "completed" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { ok: true, status: "completed" });
    assert.deepEqual(Object.keys(out), ["ok", "status"]);
    assert.equal(JSON.stringify(input), before);
  });
  it("accepts cancelled", function () {
    const input = { status: "cancelled" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { ok: true, status: "cancelled" });
    assert.deepEqual(Object.keys(out), ["ok", "status"]);
    assert.equal(JSON.stringify(input), before);
  });
  it("rejects scheduled", function () {
    const out = runFeature({ status: "scheduled" });
    assert.deepEqual(out, { error: { code: "validation_error", message: "invalid status request." }, ok: false });
    assert.deepEqual(Object.keys(out), ["error", "ok"]);
    assert.deepEqual(Object.keys(out.error), ["code", "message"]);
  });
  it("rejects null array and non-objects", function () {
    const bad = { error: { code: "validation_error", message: "invalid status request." }, ok: false };
    assert.deepEqual(runFeature(null), bad);
    assert.deepEqual(runFeature([]), bad);
    assert.deepEqual(runFeature("completed"), bad);
    assert.deepEqual(runFeature(42), bad);
    assert.deepEqual(runFeature(true), bad);
    assert.deepEqual(runFeature(undefined), bad);
  });
  it("rejects missing and extra keys", function () {
    const bad = { error: { code: "validation_error", message: "invalid status request." }, ok: false };
    assert.deepEqual(runFeature({}), bad);
    assert.deepEqual(runFeature({ status: "completed", extra: 1 }), bad);
    assert.deepEqual(runFeature({ wrong: "completed" }), bad);
  });
  it("rejects non-string and bad values", function () {
    const bad = { error: { code: "validation_error", message: "invalid status request." }, ok: false };
    assert.deepEqual(runFeature({ status: 1 }), bad);
    assert.deepEqual(runFeature({ status: null }), bad);
    assert.deepEqual(runFeature({ status: true }), bad);
    assert.deepEqual(runFeature({ status: "" }), bad);
    assert.deepEqual(runFeature({ status: "Completed" }), bad);
    assert.deepEqual(runFeature({ status: "CANCELLED" }), bad);
    assert.deepEqual(runFeature({ status: "cancel" }), bad);
    assert.deepEqual(runFeature({ status: "completed " }), bad);
    assert.deepEqual(runFeature({ status: " canceled" }), bad);
  });
  it("has no partial data and preserves input", function () {
    const input = { status: "scheduled" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.equal(out.ok, false);
    assert.equal("status" in out, false);
    assert.equal(JSON.stringify(input), before);
  });
});
