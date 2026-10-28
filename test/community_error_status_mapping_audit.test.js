import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/error_status_mapping_audit.mjs";

const pairs = [
  ["validation_error", 400],
  ["practitioner_not_found", 404],
  ["appointment_not_found", 404],
  ["schedule_conflict", 409],
  ["invalid_transition", 409],
  ["body_too_large", 413],
  ["json_required", 415]
];

function assertInvalid(result) {
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result).sort(), ["error", "ok"]);
  assert.deepEqual(result.error, { code: "validation_error", message: "invalid error status mapping." });
  assert.equal("code" in result, false);
  assert.equal("status" in result, false);
}

describe("error status mapping audit", () => {
  it("accepts each documented pair with canonical sorted keys", () => {
    for (const pair of pairs) {
      const code = pair[0];
      const status = pair[1];
      const out = runFeature({ code, status });
      assert.equal(out.ok, true);
      assert.equal(out.code, code);
      assert.equal(out.status, status);
      assert.deepEqual(Object.keys(out), ["code", "ok", "status"]);
    }
  });
  it("matches documented examples", () => {
    assert.deepEqual(runFeature({ code: "schedule_conflict", status: 409 }), { code: "schedule_conflict", ok: true, status: 409 });
    assert.deepEqual(runFeature({ code: "validation_error", status: 400 }), { code: "validation_error", ok: true, status: 400 });
    assert.deepEqual(runFeature({ code: "schedule_conflict", status: 400 }), { error: { code: "validation_error", message: "invalid error status mapping." }, ok: false });
  });
  it("rejects mismatched code and status", () => {
    assertInvalid(runFeature({ code: "schedule_conflict", status: 400 }));
    assertInvalid(runFeature({ code: "validation_error", status: 404 }));
    assertInvalid(runFeature({ code: "json_required", status: 413 }));
    assertInvalid(runFeature({ code: "body_too_large", status: 409 }));
    assertInvalid(runFeature({ code: "practitioner_not_found", status: 409 }));
  });
  it("rejects unknown code and unknown status", () => {
    assertInvalid(runFeature({ code: "unknown_thing", status: 400 }));
    assertInvalid(runFeature({ code: "schedule_conflict", status: 500 }));
    assertInvalid(runFeature({ code: "nope", status: 999 }));
    assertInvalid(runFeature({ code: "", status: 400 }));
    assertInvalid(runFeature({ code: "validation_error", status: 401 }));
  });
  it("rejects wrong types non-integer and unsafe status", () => {
    assertInvalid(runFeature({ code: 400, status: 400 }));
    assertInvalid(runFeature({ code: "validation_error", status: "400" }));
    assertInvalid(runFeature({ code: null, status: 400 }));
    assertInvalid(runFeature({ code: "validation_error", status: null }));
    assertInvalid(runFeature({ code: "validation_error", status: 400.5 }));
    assertInvalid(runFeature({ code: "validation_error", status: NaN }));
    assertInvalid(runFeature({ code: "validation_error", status: Infinity }));
    assertInvalid(runFeature({ code: "validation_error", status: 9007199254740991 }));
    assertInvalid(runFeature({ code: true, status: 400 }));
  });
  it("rejects null array non-object missing and extra keys", () => {
    assertInvalid(runFeature(null));
    assertInvalid(runFeature(undefined));
    assertInvalid(runFeature([]));
    assertInvalid(runFeature([{ code: "validation_error", status: 400 }]));
    assertInvalid(runFeature("validation_error"));
    assertInvalid(runFeature(400));
    assertInvalid(runFeature({}));
    assertInvalid(runFeature({ code: "validation_error" }));
    assertInvalid(runFeature({ status: 400 }));
    assertInvalid(runFeature({ code: "validation_error", status: 400, extra: 1 }));
    assertInvalid(runFeature({ code: "validation_error", status: 400, message: "x" }));
    assertInvalid(runFeature({ code: "validation_error", status: 400, ok: true }));
  });
  it("is deterministic pure preserves input and uses sorted order", () => {
    const input = { code: "schedule_conflict", status: 409 };
    const snapshot = JSON.parse(JSON.stringify(input));
    const first = runFeature(input);
    const second = runFeature({ code: "schedule_conflict", status: 409 });
    assert.deepEqual(first, second);
    assert.deepEqual(input, snapshot);
    assert.deepEqual(Object.keys(first), ["code", "ok", "status"]);
    const bad = runFeature({ code: "schedule_conflict", status: 400 });
    assert.deepEqual(Object.keys(bad), ["error", "ok"]);
    assert.deepEqual(Object.keys(bad.error), ["code", "message"]);
  });
});
