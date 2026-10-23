import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/storage_snapshot_audit.mjs";

const BAD = { ok: false, error: { code: "validation_error", message: "invalid storage snapshot." } };

function checkInvalid(result) {
  assert.deepStrictEqual(result, BAD);
  assert.equal("count" in result, false);
  assert.equal("snapshot" in result, false);
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

describe("rejects bad payload envelope", () => {
  it("rejects null, array and non-object", () => {
    checkInvalid(runFeature(null));
    checkInvalid(runFeature([]));
    checkInvalid(runFeature("x"));
    checkInvalid(runFeature(1));
    checkInvalid(runFeature(undefined));
  });
  it("rejects missing or extra keys", () => {
    checkInvalid(runFeature({}));
    checkInvalid(runFeature({ version: 1 }));
    checkInvalid(runFeature({ appointments: [] }));
    checkInvalid(runFeature({ version: 1, appointments: [], extra: 1 }));
    checkInvalid(runFeature({ version: 1, wrong: [] }));
  });
  it("matches duplicate-id example envelope", () => {
    const input = { version: 1, appointments: [{ id: "x-1", practitionerId: "demo-cardio", status: "scheduled" }, { id: "x-1", practitionerId: "demo-cardio", status: "scheduled" }] };
    checkInvalid(runFeature(input));
  });
});

describe("rejects bad version and appointments", () => {
  it("rejects version not exactly 1", () => {
    checkInvalid(runFeature({ version: 2, appointments: [] }));
    checkInvalid(runFeature({ version: 0, appointments: [] }));
    checkInvalid(runFeature({ version: "1", appointments: [] }));
    checkInvalid(runFeature({ version: 1.5, appointments: [] }));
    checkInvalid(runFeature({ version: null, appointments: [] }));
  });
  it("rejects appointments not array 0..200", () => {
    checkInvalid(runFeature({ version: 1, appointments: "no" }));
    checkInvalid(runFeature({ version: 1, appointments: null }));
    const big = [];
    for (let i = 0; i < 201; i++) {
      big.push({ id: "id-" + i, practitionerId: "demo-cardio", status: "scheduled" });
    }
    checkInvalid(runFeature({ version: 1, appointments: big }));
  });
});

describe("rejects bad entries", () => {
  it("rejects non-object entries and wrong keys", () => {
    checkInvalid(runFeature({ version: 1, appointments: [null] }));
    checkInvalid(runFeature({ version: 1, appointments: [[]] }));
    checkInvalid(runFeature({ version: 1, appointments: [{ id: "a", practitionerId: "demo-cardio" }] }));
    checkInvalid(runFeature({ version: 1, appointments: [{ id: "a", practitionerId: "demo-cardio", status: "scheduled", extra: 1 }] }));
  });
  it("rejects bad id, practitionerId and status", () => {
    checkInvalid(runFeature({ version: 1, appointments: [{ id: "", practitionerId: "demo-cardio", status: "scheduled" }] }));
    checkInvalid(runFeature({ version: 1, appointments: [{ id: "bad id", practitionerId: "demo-cardio", status: "scheduled" }] }));
    checkInvalid(runFeature({ version: 1, appointments: [{ id: "a", practitionerId: "short", status: "scheduled" }] }));
    checkInvalid(runFeature({ version: 1, appointments: [{ id: "a", practitionerId: "other-cardio", status: "scheduled" }] }));
    checkInvalid(runFeature({ version: 1, appointments: [{ id: "a", practitionerId: "demo-cardio", status: "waiting" }] }));
  });
  it("rejects duplicate id", () => {
    const input = { version: 1, appointments: [{ id: "dup", practitionerId: "demo-cardio", status: "scheduled" }, { id: "dup", practitionerId: "demo-cardio", status: "completed" }] };
    checkInvalid(runFeature(input));
  });
});

describe("accepts empty snapshot", () => {
  it("returns count 0 and new empty snapshot without mutation", () => {
    const input = { version: 1, appointments: [] };
    const before = clone(input);
    const out = runFeature(input);
    assert.equal(out.ok, true);
    assert.equal(out.count, 0);
    assert.deepStrictEqual(out.snapshot, { version: 1, appointments: [] });
    assert.deepStrictEqual(input, before);
    assert.notStrictEqual(out.snapshot, input);
    assert.notStrictEqual(out.snapshot.appointments, input.appointments);
  });
});

describe("accepts unsorted entries sorted", () => {
  it("returns sorted snapshot with new copies preserving input", () => {
    const input = { version: 1, appointments: [{ id: "b-001", practitionerId: "demo-cardio", status: "scheduled" }, { id: "a-001", practitionerId: "demo-clinica-geral", status: "completed" }] };
    const before = clone(input);
    const out = runFeature(input);
    assert.equal(out.ok, true);
    assert.equal(out.count, 2);
    assert.deepStrictEqual(out.snapshot, { version: 1, appointments: [{ id: "a-001", practitionerId: "demo-clinica-geral", status: "completed" }, { id: "b-001", practitionerId: "demo-cardio", status: "scheduled" }] });
    assert.deepStrictEqual(input, before);
    assert.equal(input.appointments[0].id, "b-001");
    assert.notStrictEqual(out.snapshot.appointments, input.appointments);
    assert.notStrictEqual(out.snapshot.appointments[0], input.appointments[1]);
  });
});

describe("pure deterministic sync core", () => {
  it("is sync and deterministic", () => {
    const input = { version: 1, appointments: [{ id: "b-1", practitionerId: "demo-a1", status: "cancelled" }, { id: "a-1", practitionerId: "demo-a1", status: "scheduled" }] };
    const a = runFeature(input);
    const b = runFeature(clone(input));
    assert.deepStrictEqual(a, b);
    assert.equal(a instanceof Promise, false);
    assert.notStrictEqual(a.snapshot, b.snapshot);
  });
  it("builds with required helpers and no Date use", () => {
    const src = runFeature.toString();
    assert.match(src, /for\s*\(.*of/);
    assert.ok(src.includes("Object.entries"));
    assert.ok(src.includes("new Map"));
    assert.ok(src.includes(".get("));
    assert.ok(src.includes(".set("));
    assert.ok(src.includes(".push("));
    assert.equal(/\bDate\b/.test(src), false);
    assert.equal(/\bprocess\b/.test(src), false);
  });
});
