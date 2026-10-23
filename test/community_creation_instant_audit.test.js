import test from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/creation_instant_audit.mjs";
import { readFileSync } from "node:fs";

const good = "2030-04-08T12:00:00.000Z";

test("accepts valid instant with new copy", () => {
  const input = { createdAt: good };
  const out = runFeature(input);
  assert.equal(out.ok, true);
  assert.equal(out.valid, true);
  assert.equal(out.instant.createdAt, good);
  assert.notEqual(out.instant, input);
  assert.deepEqual(input, { createdAt: good });
});

test("rejects non-object null array missing extra non-string", () => {
  for (const bad of [null, undefined, 42, "x", [], [{ createdAt: good }]]) {
    const out = runFeature(bad);
    assert.equal(out.ok, false);
    assert.equal(out.error.code, "validation_error");
    assert.equal(out.error.message, "invalid creation instant.");
    assert.equal(out.instant, undefined);
  }
  assert.deepEqual(runFeature({}), { ok: false, error: { code: "validation_error", message: "invalid creation instant." } });
  assert.deepEqual(runFeature({ createdAt: good, extra: 1 }), { ok: false, error: { code: "validation_error", message: "invalid creation instant." } });
  assert.deepEqual(runFeature({ createdAt: 123 }), { ok: false, error: { code: "validation_error", message: "invalid creation instant." } });
  assert.deepEqual(runFeature({ createdAt: null }), { ok: false, error: { code: "validation_error", message: "invalid creation instant." } });
});

test("rejects bad length separators and non-digits", () => {
  assert.equal(runFeature({ createdAt: "2030-04-08T12:00:00.000" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-08T12:00:00.000ZZ" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030/04/08T12:00:00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-08 12:00:00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-08T12-00-00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-08T12:00:00,000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "203X-04-08T12:00:00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-08T12:00:00.00XZ" }).ok, false);
});

test("enforces month day hour minute second ranges", () => {
  assert.equal(runFeature({ createdAt: "2030-00-08T12:00:00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-13-08T12:00:00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-00T12:00:00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-31T12:00:00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-01-31T12:00:00.000Z" }).ok, true);
  assert.equal(runFeature({ createdAt: "2030-02-29T12:00:00.000Z" }).ok, true);
  assert.equal(runFeature({ createdAt: "2030-02-30T12:00:00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-08T24:00:00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-08T12:60:00.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-08T12:00:60.000Z" }).ok, false);
  assert.equal(runFeature({ createdAt: "2030-04-08T23:59:59.999Z" }).ok, true);
});

test("accepts year bounds and preserves input", () => {
  assert.equal(runFeature({ createdAt: "0000-01-01T00:00:00.000Z" }).ok, true);
  assert.equal(runFeature({ createdAt: "9999-12-31T23:59:59.999Z" }).ok, true);
  const input = { createdAt: good };
  const frozen = JSON.stringify(input);
  const out = runFeature(input);
  assert.equal(JSON.stringify(input), frozen);
  assert.equal(out.instant.createdAt, good);
});

test("remains pure deterministic without banned syntax", () => {
  const a = runFeature({ createdAt: good });
  const b = runFeature({ createdAt: good });
  assert.deepEqual(a, b);
  const src = readFileSync(new URL("../src/community/creation_instant_audit.mjs", import.meta.url), "utf8");
  assert.ok(src.includes("export function runFeature"));
  assert.ok(src.includes("for (const"));
  assert.ok(src.includes("Object.entries"));
  assert.ok(src.includes(".get("));
  assert.ok(src.includes(".set("));
  assert.ok(src.includes(".push("));
  assert.ok(!src.includes("import "));
  assert.ok(!src.includes("Date"));
});
