import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/appointment_catalog_membership_audit.mjs";

describe("appointment catalog membership audit", () => {
  it("returns member true on exact match", () => {
    const out = runFeature({ catalog: ["demo-cardio", "demo-clinica-geral"], practitionerId: "demo-cardio" });
    assert.deepEqual(out, { ok: true, member: true, count: 2 });
  });
  it("returns member false when absent", () => {
    const out = runFeature({ catalog: ["demo-cardio", "demo-clinica-geral"], practitionerId: "demo-dieta" });
    assert.deepEqual(out, { ok: true, member: false, count: 2 });
  });
  it("rejects invalid prefix", () => {
    const out = runFeature({ catalog: ["prod-cardio"], practitionerId: "prod-cardio" });
    assert.deepEqual(out, { ok: false, error: { code: "validation_error", message: "invalid catalog membership check." } });
  });
  it("rejects null, array and non-object payloads", () => {
    assert.equal(runFeature(null).ok, false);
    assert.equal(runFeature(["demo-cardio"]).ok, false);
    assert.equal(runFeature("demo-cardio").ok, false);
    assert.equal(runFeature(42).ok, false);
  });
  it("rejects missing or extra keys", () => {
    assert.deepEqual(runFeature({ catalog: ["demo-cardio"] }).error.code, "validation_error");
    assert.deepEqual(runFeature({ practitionerId: "demo-cardio" }).error.code, "validation_error");
    assert.deepEqual(runFeature({ catalog: ["demo-cardio"], practitionerId: "demo-cardio", extra: 1 }).error.code, "validation_error");
  });
  it("rejects empty catalog and over 50 entries", () => {
    assert.equal(runFeature({ catalog: [], practitionerId: "demo-cardio" }).ok, false);
    const big = [];
    for (let n = 0; n < 51; n = n + 1) {
      big.push("demo-id-" + String(n).padStart(4, "0"));
    }
    const out = runFeature({ catalog: big, practitionerId: "demo-id-0000" });
    assert.equal(out.ok, false);
    assert.equal(out.member, undefined);
    assert.equal(out.count, undefined);
  });
  it("rejects non-string entries, bad charset and duplicates", () => {
    assert.equal(runFeature({ catalog: [42], practitionerId: "demo-cardio" }).ok, false);
    assert.equal(runFeature({ catalog: ["demo-car dio"], practitionerId: "demo-car dio" }).ok, false);
    assert.equal(runFeature({ catalog: ["demo-a", "demo-a"], practitionerId: "demo-a" }).ok, false);
    assert.equal(runFeature({ catalog: ["demo-cardio"], practitionerId: 99 }).ok, false);
  });
  it("requires exact full-string equality", () => {
    const out = runFeature({ catalog: ["demo-cardio"], practitionerId: "demo-cardio-extra" });
    assert.deepEqual(out, { ok: true, member: false, count: 1 });
  });
  it("does not mutate input and is deterministic", () => {
    const payload = { catalog: ["demo-one", "demo-two"], practitionerId: "demo-two" };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(JSON.parse(before));
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(payload), before);
  });
});
