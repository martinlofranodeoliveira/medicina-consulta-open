import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/agenda_totals_audit.mjs";

describe("agenda totals audit", () => {
  it("mixed statuses total correctly and cancelled frees interval", () => {
    const out = runFeature({
      appointments: [
        { practitionerId: "demo-cardio", status: "scheduled", durationMinutes: 30 },
        { practitionerId: "demo-cardio", status: "completed", durationMinutes: 15 },
        { practitionerId: "demo-geral", status: "cancelled", durationMinutes: 30 }
      ]
    });
    assert.deepEqual(out, { ok: true, total: 3, scheduled: 1, completed: 1, cancelled: 1, occupiedMinutes: 45 });
  });
  it("empty array yields all zeros", () => {
    const out = runFeature({ appointments: [] });
    assert.deepEqual(out, { ok: true, total: 0, scheduled: 0, completed: 0, cancelled: 0, occupiedMinutes: 0 });
  });
  it("counts only scheduled plus completed in occupiedMinutes", () => {
    const out = runFeature({
      appointments: [
        { practitionerId: "demo-a1b2c3", status: "scheduled", durationMinutes: 60 },
        { practitionerId: "demo-a1b2c3", status: "cancelled", durationMinutes: 120 },
        { practitionerId: "demo-x_y-z9", status: "completed", durationMinutes: 15 }
      ]
    });
    assert.equal(out.ok, true);
    assert.equal(out.total, 3);
    assert.equal(out.scheduled, 1);
    assert.equal(out.completed, 1);
    assert.equal(out.cancelled, 1);
    assert.equal(out.occupiedMinutes, 75);
  });
  it("rejects invalid payloads with validation_error and no partial totals", () => {
    const bad = [];
    bad.push(null);
    bad.push([]);
    bad.push("nope");
    bad.push(42);
    bad.push({});
    bad.push({ appointments: [], extra: 1 });
    bad.push({ wrong: [] });
    bad.push({ appointments: "x" });
    bad.push({ appointments: [null] });
    bad.push({ appointments: [[]] });
    bad.push({ appointments: [{ practitionerId: "demo-cardio", status: "scheduled" }] });
    bad.push({ appointments: [{ practitionerId: "demo-cardio", status: "scheduled", durationMinutes: 30, extra: 1 }] });
    bad.push({ appointments: [{ practitionerId: 42, status: "scheduled", durationMinutes: 30 }] });
    bad.push({ appointments: [{ practitionerId: "demo-", status: "scheduled", durationMinutes: 30 }] });
    bad.push({ appointments: [{ practitionerId: "test-cardio", status: "scheduled", durationMinutes: 30 }] });
    bad.push({ appointments: [{ practitionerId: "demo-bad!", status: "scheduled", durationMinutes: 30 }] });
    bad.push({ appointments: [{ practitionerId: "demo-cardio", status: "pending", durationMinutes: 30 }] });
    bad.push({ appointments: [{ practitionerId: "demo-cardio", status: 1, durationMinutes: 30 }] });
    bad.push({ appointments: [{ practitionerId: "demo-cardio", status: "scheduled", durationMinutes: 20 }] });
    bad.push({ appointments: [{ practitionerId: "demo-cardio", status: "scheduled", durationMinutes: "30" }] });
    bad.push({ appointments: [{ practitionerId: "demo-cardio", status: "scheduled", durationMinutes: 30.5 }] });
    bad.push({ appointments: [{ practitionerId: "demo-cardio", status: "scheduled", durationMinutes: 10 }] });
    bad.push({ appointments: [{ practitionerId: "demo-cardio", status: "scheduled", durationMinutes: 135 }] });
    const many = [];
    for (let n = 0; n < 201; n = n + 1) {
      many.push({ practitionerId: "demo-cardio", status: "scheduled", durationMinutes: 15 });
    }
    bad.push({ appointments: many });
    for (const payload of bad) {
      const out = runFeature(payload);
      assert.deepEqual(out, { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } });
      assert.equal("total" in out, false);
      assert.equal("occupiedMinutes" in out, false);
    }
  });
  it("never mutates input and exposes only specified keys", () => {
    const payload = {
      appointments: [
        { practitionerId: "demo-cardio", status: "scheduled", durationMinutes: 30 },
        { practitionerId: "demo-geral", status: "cancelled", durationMinutes: 15 }
      ]
    };
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    assert.equal(JSON.stringify(payload), before);
    assert.deepEqual(Object.keys(out).sort(), ["cancelled", "completed", "occupiedMinutes", "ok", "scheduled", "total"]);
    for (const k of ["total", "scheduled", "completed", "cancelled", "occupiedMinutes"]) {
      assert.equal(Number.isSafeInteger(out[k]), true);
    }
    assert.equal(JSON.stringify(out), JSON.stringify(JSON.parse(JSON.stringify(out))));
  });
  it("is pure synchronous deterministic without Date or IO", () => {
    const payload = { appointments: [{ practitionerId: "demo-cardio", status: "completed", durationMinutes: 45 }] };
    const a = runFeature(payload);
    const b = runFeature(JSON.parse(JSON.stringify(payload)));
    assert.deepEqual(a, b);
    assert.equal(a instanceof Promise, false);
    assert.equal(typeof runFeature, "function");
    assert.equal(runFeature.length, 1);
    const src = runFeature.toString();
    assert.equal(src.includes("Date"), false);
    assert.equal(src.includes("process"), false);
    assert.equal(src.includes("require"), false);
    assert.equal(src.includes("fetch"), false);
    assert.ok(src.includes("for") && src.includes("of"));
    assert.ok(src.includes("Map") && src.includes("Object.entries"));
  });
});
