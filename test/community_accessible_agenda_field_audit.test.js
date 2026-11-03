import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/accessible_agenda_field_audit.mjs";

function checkInvalid(result) {
  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(Object.keys(result), ["error", "ok"]);
  assert.deepStrictEqual(Object.keys(result.error), ["code", "message"]);
  assert.strictEqual(result.error.code, "validation_error");
  assert.strictEqual(result.error.message, "invalid accessible field list.");
  assert.strictEqual(result.count, undefined);
  assert.strictEqual(result.fields, undefined);
}

describe("accessible agenda field audit valid cases", () => {
  it("valid creation-style list returns count 4 sorted", () => {
    const input = {
      fields: [
        { key: "startsAt", label: "Start time", required: true },
        { key: "durationMinutes", label: "Duration", required: true },
        { key: "patientRef", label: "Patient", required: true },
        { key: "practitionerId", label: "Practitioner", required: true }
      ]
    };
    const before = JSON.stringify(input);
    const result = runFeature(input);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.count, 4);
    assert.deepStrictEqual(Object.keys(result), ["count", "fields", "ok"]);
    assert.deepStrictEqual(result.fields.map((f) => f.key), ["durationMinutes", "patientRef", "practitionerId", "startsAt"]);
    assert.deepStrictEqual(result.fields[0], { key: "durationMinutes", label: "Duration", required: true });
    assert.deepStrictEqual(result.fields[1], { key: "patientRef", label: "Patient", required: true });
    assert.deepStrictEqual(result.fields[2], { key: "practitionerId", label: "Practitioner", required: true });
    assert.deepStrictEqual(result.fields[3], { key: "startsAt", label: "Start time", required: true });
    assert.strictEqual(JSON.stringify(input), before);
  });

  it("two-field example sorts lexicographically", () => {
    const result = runFeature({
      fields: [
        { key: "startsAt", label: "Start time", required: true },
        { key: "practitionerId", label: "Practitioner", required: true }
      ]
    });
    assert.deepStrictEqual(result, {
      count: 2,
      fields: [
        { key: "practitionerId", label: "Practitioner", required: true },
        { key: "startsAt", label: "Start time", required: true }
      ],
      ok: true
    });
  });

  it("missing label returns invalid example", () => {
    const result = runFeature({ fields: [{ key: "startsAt", required: true }] });
    checkInvalid(result);
  });

  it("duplicate key returns invalid example", () => {
    const result = runFeature({
      fields: [
        { key: "date", label: "Day filter", required: false },
        { key: "date", label: "Day filter", required: false }
      ]
    });
    checkInvalid(result);
  });
});

describe("accessible agenda field audit shape errors", () => {
  it("unknown key, extra top, empty, over 6, non-object entry are invalid", () => {
    checkInvalid(runFeature({ fields: [{ key: "unknown", label: "Nope", required: true }] }));
    checkInvalid(runFeature({
      fields: [
        { key: "date", label: "Day filter", required: false },
        { key: "date", label: "Day filter", required: false }
      ]
    }));
    checkInvalid(runFeature({
      fields: [{ key: "date", label: "Day filter", required: false }],
      extra: 1
    }));
    checkInvalid(runFeature({ fields: [] }));
    checkInvalid(runFeature({
      fields: [
        { key: "date", label: "AA", required: false },
        { key: "durationMinutes", label: "BB", required: false },
        { key: "patientRef", label: "CC", required: false },
        { key: "practitionerId", label: "DD", required: false },
        { key: "startsAt", label: "EE", required: false },
        { key: "status", label: "FF", required: false },
        { key: "date", label: "GG", required: false }
      ]
    }));
    checkInvalid(runFeature({ fields: [null] }));
    checkInvalid(runFeature({ fields: ["date"] }));
    checkInvalid(runFeature({ fields: [[1]] }));
    checkInvalid(runFeature(null));
    checkInvalid(runFeature([1]));
    checkInvalid(runFeature("fields"));
    checkInvalid(runFeature({}));
    checkInvalid(runFeature({ fields: "date" }));
  });

  it("missing keys and wrong types are invalid", () => {
    checkInvalid(runFeature({ fields: [{ label: "Start time", required: true }] }));
    checkInvalid(runFeature({ fields: [{ key: "startsAt", required: true }] }));
    checkInvalid(runFeature({ fields: [{ key: "startsAt", label: "Start time" }] }));
    checkInvalid(runFeature({ fields: [{ key: 1, label: "Start time", required: true }] }));
    checkInvalid(runFeature({ fields: [{ key: "startsAt", label: 1, required: true }] }));
    checkInvalid(runFeature({ fields: [{ key: "startsAt", label: "Start time", required: "yes" }] }));
    checkInvalid(runFeature({ fields: [{ key: "startsAt", label: "Start time", required: 1 }] }));
    checkInvalid(runFeature({
      fields: [{ key: "startsAt", label: "Start time", required: true, extra: 1 }]
    }));
    checkInvalid(runFeature({
      fields: [{ key: "startsAt", label: "Start time", required: true, key2: "x" }]
    }));
  });

  it("label length and spacing and controls are invalid", () => {
    checkInvalid(runFeature({ fields: [{ key: "date", label: "A", required: false }] }));
    checkInvalid(runFeature({ fields: [{ key: "date", label: "", required: false }] }));
    checkInvalid(runFeature({ fields: [{ key: "date", label: "A".repeat(81), required: false }] }));
    checkInvalid(runFeature({ fields: [{ key: "date", label: " Day", required: false }] }));
    checkInvalid(runFeature({ fields: [{ key: "date", label: "Day ", required: false }] }));
    checkInvalid(runFeature({ fields: [{ key: "date", label: "Da\ty", required: false }] }));
    checkInvalid(runFeature({ fields: [{ key: "date", label: "Da\ny", required: false }] }));
    checkInvalid(runFeature({ fields: [{ key: "date", label: "Da\ry", required: false }] }));
  });

  it("canonical keys, new objects, no mutation, deterministic sync", () => {
    const input = {
      fields: [
        { key: "status", label: "Status", required: false },
        { key: "date", label: "Day filter", required: false }
      ]
    };
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(JSON.parse(before));
    assert.deepStrictEqual(first, second);
    assert.strictEqual(first instanceof Promise, false);
    assert.deepStrictEqual(Object.keys(first), ["count", "fields", "ok"]);
    for (const f of first.fields) {
      assert.deepStrictEqual(Object.keys(f), ["key", "label", "required"]);
    }
    assert.deepStrictEqual(first.fields.map((f) => f.key), ["date", "status"]);
    assert.notStrictEqual(first.fields, input.fields);
    assert.notStrictEqual(first.fields[0], input.fields[0]);
    assert.strictEqual(JSON.stringify(input), before);
    const again = runFeature(JSON.parse(before));
    assert.deepStrictEqual(again, first);
  });
});
