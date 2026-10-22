import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/utc_year_bounds_audit.mjs";

const invalidEnvelope = { ok: false, error: { code: "validation_error", message: "invalid year bounds." } };

test("accepts typical years 2030", () => {
  const out = runFeature({ localYear: "2030", utcYear: "2030" });
  assert.deepEqual(out, { ok: true, valid: true, years: { localYear: "2030", utcYear: "2030" } });
});

test("accepts boundary 0000 and 9999", () => {
  const out = runFeature({ localYear: "0000", utcYear: "9999" });
  assert.deepEqual(out, { ok: true, valid: true, years: { localYear: "0000", utcYear: "9999" } });
});

test("accepts swapped boundaries", () => {
  const out = runFeature({ localYear: "9999", utcYear: "0000" });
  assert.deepEqual(out, { ok: true, valid: true, years: { localYear: "9999", utcYear: "0000" } });
});

test("rejects 3-character year", () => {
  const out = runFeature({ localYear: "999", utcYear: "2030" });
  assert.deepEqual(out, invalidEnvelope);
});

test("rejects 5-character 10000", () => {
  const out = runFeature({ localYear: "9999", utcYear: "10000" });
  assert.deepEqual(out, invalidEnvelope);
});

test("rejects empty string", () => {
  const out = runFeature({ localYear: "", utcYear: "2030" });
  assert.deepEqual(out, invalidEnvelope);
});

test("rejects letters, sign and separator", () => {
  assert.deepEqual(runFeature({ localYear: "20a0", utcYear: "2030" }), invalidEnvelope);
  assert.deepEqual(runFeature({ localYear: "-030", utcYear: "2030" }), invalidEnvelope);
  assert.deepEqual(runFeature({ localYear: "20-0", utcYear: "2030" }), invalidEnvelope);
  assert.deepEqual(runFeature({ localYear: "20.0", utcYear: "2030" }), invalidEnvelope);
  assert.deepEqual(runFeature({ localYear: " 230", utcYear: "2030" }), invalidEnvelope);
});

test("rejects null, array and non-object payloads", () => {
  assert.deepEqual(runFeature(null), invalidEnvelope);
  assert.deepEqual(runFeature([]), invalidEnvelope);
  assert.deepEqual(runFeature([{ localYear: "2030", utcYear: "2030" }]), invalidEnvelope);
  assert.deepEqual(runFeature("2030"), invalidEnvelope);
  assert.deepEqual(runFeature(2030), invalidEnvelope);
  assert.deepEqual(runFeature(undefined), invalidEnvelope);
});

test("rejects missing and extra keys", () => {
  assert.deepEqual(runFeature({ localYear: "2030" }), invalidEnvelope);
  assert.deepEqual(runFeature({ utcYear: "2030" }), invalidEnvelope);
  assert.deepEqual(runFeature({}), invalidEnvelope);
  assert.deepEqual(runFeature({ localYear: "2030", utcYear: "2030", extra: "2030" }), invalidEnvelope);
  assert.deepEqual(runFeature({ localYear: "2030", wrong: "2030" }), invalidEnvelope);
});

test("rejects mistyped values with exact envelope and no partial years", () => {
  const bad = [
    { localYear: 2030, utcYear: "2030" },
    { localYear: "2030", utcYear: 2030 },
    { localYear: null, utcYear: "2030" },
    { localYear: "2030", utcYear: null }
  ];
  for (const payload of bad) {
    const out = runFeature(payload);
    assert.deepEqual(out, invalidEnvelope);
    assert.equal("years" in out, false);
    assert.equal("valid" in out, false);
  }
});

test("never mutates input and returns new years object", () => {
  const payload = { localYear: "2030", utcYear: "9999" };
  const snapshot = JSON.parse(JSON.stringify(payload));
  const out = runFeature(payload);
  assert.deepEqual(payload, snapshot);
  assert.equal(out.ok, true);
  assert.notEqual(out.years, payload);
  assert.deepEqual(out.years, { localYear: "2030", utcYear: "9999" });
});

test("deterministic pure JSON output", () => {
  const payload = { localYear: "0000", utcYear: "9999" };
  const a = runFeature(payload);
  const b = runFeature({ localYear: "0000", utcYear: "9999" });
  assert.deepEqual(a, b);
  assert.notEqual(a, b);
  assert.notEqual(a.years, b.years);
  const round = JSON.parse(JSON.stringify(a));
  assert.deepEqual(round, a);
});
