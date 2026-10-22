import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/ordered_agenda_audit.mjs";

const bad = { ok: false, error: { code: "validation_error", message: "invalid ordered agenda." } };

test("accepts empty agenda with count 0 without mutation", () => {
  const input = { appointments: [] };
  const before = JSON.stringify(input);
  const out = runFeature(input);
  assert.deepEqual(out, { ok: true, count: 0, appointments: [] });
  assert.equal(JSON.stringify(input), before);
  assert.notStrictEqual(out.appointments, input.appointments);
});

test("accepts sorted agenda and returns canonical copies", () => {
  const input = { appointments: [{ id: "a1", startsAt: "2030-04-08T12:00:00.000Z" }, { id: "a2", startsAt: "2030-04-08T12:15:00.000Z" }] };
  const before = JSON.stringify(input);
  const out = runFeature(input);
  assert.equal(out.ok, true);
  assert.equal(out.count, 2);
  assert.deepEqual(out.appointments, input.appointments);
  assert.notStrictEqual(out.appointments, input.appointments);
  assert.notStrictEqual(out.appointments[0], input.appointments[0]);
  assert.equal(JSON.stringify(input), before);
});

test("accepts equal startsAt values", () => {
  const input = { appointments: [{ id: "a", startsAt: "2030-01-01T00:00:00.000Z" }, { id: "b", startsAt: "2030-01-01T00:00:00.000Z" }] };
  const out = runFeature(input);
  assert.equal(out.ok, true);
  assert.equal(out.count, 2);
  assert.deepEqual(out.appointments, input.appointments);
});

test("rejects unsorted agenda with no partial list", () => {
  const input = { appointments: [{ id: "a2", startsAt: "2030-04-08T12:15:00.000Z" }, { id: "a1", startsAt: "2030-04-08T12:00:00.000Z" }] };
  const out = runFeature(input);
  assert.deepEqual(out, bad);
  assert.equal("appointments" in out, false);
  assert.equal("count" in out, false);
});

test("rejects non-object payloads", () => {
  assert.deepEqual(runFeature(null), bad);
  assert.deepEqual(runFeature([]), bad);
  assert.deepEqual(runFeature("x"), bad);
  assert.deepEqual(runFeature(42), bad);
  assert.deepEqual(runFeature(undefined), bad);
});

test("rejects missing or extra top keys", () => {
  assert.deepEqual(runFeature({}), bad);
  assert.deepEqual(runFeature({ appointments: [], extra: 1 }), bad);
  assert.deepEqual(runFeature({ other: [] }), bad);
});

test("rejects non-array appointments and over 200 entries", () => {
  assert.deepEqual(runFeature({ appointments: "no" }), bad);
  assert.deepEqual(runFeature({ appointments: null }), bad);
  assert.deepEqual(runFeature({ appointments: {} }), bad);
  const big = [];
  for (let i = 0; i < 201; i++) {
    big.push({ id: "x" + i, startsAt: "2030-01-01T00:00:00.000Z" });
  }
  assert.deepEqual(runFeature({ appointments: big }), bad);
});

test("rejects entry with missing, extra or wrong-type keys", () => {
  assert.deepEqual(runFeature({ appointments: [{ id: "a1", startsAt: "2030-04-08T12:00:00.000Z", practitionerId: "demo" }] }), bad);
  assert.deepEqual(runFeature({ appointments: [{ id: "a1" }] }), bad);
  assert.deepEqual(runFeature({ appointments: [{ startsAt: "2030-04-08T12:00:00.000Z" }] }), bad);
  assert.deepEqual(runFeature({ appointments: [{ id: 1, startsAt: "2030-04-08T12:00:00.000Z" }] }), bad);
  assert.deepEqual(runFeature({ appointments: [{ id: "a1", startsAt: 5 }] }), bad);
  assert.deepEqual(runFeature({ appointments: [null] }), bad);
  assert.deepEqual(runFeature({ appointments: ["x"] }), bad);
});

test("rejects length violations", () => {
  assert.deepEqual(runFeature({ appointments: [{ id: "", startsAt: "2030-04-08T12:00:00.000Z" }] }), bad);
  assert.deepEqual(runFeature({ appointments: [{ id: "a1", startsAt: "" }] }), bad);
  assert.deepEqual(runFeature({ appointments: [{ id: "a".repeat(65), startsAt: "2030-04-08T12:00:00.000Z" }] }), bad);
  assert.deepEqual(runFeature({ appointments: [{ id: "a1", startsAt: "a".repeat(65) }] }), bad);
});

test("is pure deterministic synchronous and preserves input", () => {
  const input = { appointments: [{ id: "a1", startsAt: "2030-04-08T12:00:00.000Z" }] };
  const snap = JSON.stringify(input);
  const first = runFeature(input);
  const second = runFeature(JSON.parse(snap));
  assert.deepEqual(first, second);
  assert.equal(first instanceof Promise, false);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.equal(JSON.stringify(input), snap);
  assert.equal(runFeature.constructor.name, "Function");
  assert.equal(/\bDate\b/.test(runFeature.toString()), false);
});
