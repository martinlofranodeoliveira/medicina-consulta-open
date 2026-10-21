import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/appointment_deletion_audit.mjs";

function makeEntry(id, practitionerId, status) {
  return { id, practitionerId, status };
}

function checkSafeJson(value) {
  const text = JSON.stringify(value);
  assert.ok(text.length < 64 * 1024);
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code < 32 && ch !== "\n" && ch !== "\r" && ch !== "\t") {
      assert.fail("C0 control found");
    }
  }
}

function assertValidationError(out) {
  assert.deepStrictEqual(out, { ok: false, error: { code: "validation_error", message: "invalid deletion request." } });
}

function assertNotFound(out) {
  assert.deepStrictEqual(out, { ok: false, error: { code: "appointment_not_found", message: "appointment not found." } });
}

describe("appointment deletion audit examples", () => {
  it("valid deletion example", () => {
    const input = {
      appointments: [
        makeEntry("apt-001", "demo-clinica-geral", "scheduled"),
        makeEntry("apt-002", "demo-clinica-geral", "completed")
      ],
      id: "apt-001"
    };
    const out = runFeature(input);
    assert.deepStrictEqual(out, {
      ok: true,
      id: "apt-001",
      practitionerId: "demo-clinica-geral",
      status: "scheduled",
      remainingCount: 1,
      remaining: [makeEntry("apt-002", "demo-clinica-geral", "completed")]
    });
    checkSafeJson(input);
    checkSafeJson(out);
  });
  it("extra payload key is validation_error", () => {
    const out = runFeature({ appointments: [], extra: 1, id: "apt-001" });
    assertValidationError(out);
    checkSafeJson(out);
  });
  it("no match is appointment_not_found", () => {
    const out = runFeature({
      appointments: [makeEntry("apt-001", "demo-cardio", "cancelled")],
      id: "apt-999"
    });
    assertNotFound(out);
    checkSafeJson(out);
  });
});

describe("valid deletion core", () => {
  it("preserves order minus match and echoes fields", () => {
    const input = {
      appointments: [
        makeEntry("a-1", "demo-alpha", "scheduled"),
        makeEntry("a-2", "demo-beta", "completed"),
        makeEntry("a-3", "demo-gamma", "cancelled")
      ],
      id: "a-2"
    };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.strictEqual(out.ok, true);
    assert.strictEqual(out.id, "a-2");
    assert.strictEqual(out.practitionerId, "demo-beta");
    assert.strictEqual(out.status, "completed");
    assert.strictEqual(out.remainingCount, 2);
    assert.deepStrictEqual(out.remaining, [
      makeEntry("a-1", "demo-alpha", "scheduled"),
      makeEntry("a-3", "demo-gamma", "cancelled")
    ]);
    assert.strictEqual(out.remainingCount, out.remaining.length);
    assert.strictEqual(JSON.stringify(input), before);
    checkSafeJson(out);
  });
  it("single entry deletion leaves empty remaining", () => {
    const out = runFeature({
      appointments: [makeEntry("solo", "demo-solo12", "scheduled")],
      id: "solo"
    });
    assert.deepStrictEqual(out, {
      ok: true,
      id: "solo",
      practitionerId: "demo-solo12",
      status: "scheduled",
      remainingCount: 0,
      remaining: []
    });
  });
  it("remaining copies do not share entry objects", () => {
    const input = {
      appointments: [
        makeEntry("k-1", "demo-one11", "scheduled"),
        makeEntry("k-2", "demo-two22", "scheduled")
      ],
      id: "k-1"
    };
    const out = runFeature(input);
    assert.strictEqual(out.ok, true);
    assert.notStrictEqual(out.remaining[0], input.appointments[1]);
    assert.deepStrictEqual(Object.keys(out.remaining[0]).sort(), ["id", "practitionerId", "status"]);
    assert.strictEqual(input.appointments[1].status, "scheduled");
  });
  it("is deterministic", () => {
    const input = {
      appointments: [makeEntry("d-1", "demo-det11", "cancelled")],
      id: "d-1"
    };
    assert.deepStrictEqual(runFeature(input), runFeature(input));
    assert.deepStrictEqual(runFeature({ appointments: [], id: "x-1" }), runFeature({ appointments: [], id: "x-1" }));
  });
});

describe("validation errors", () => {
  it("rejects null array and non-object payload", () => {
    assertValidationError(runFeature(null));
    assertValidationError(runFeature([]));
    assertValidationError(runFeature("x"));
    assertValidationError(runFeature(42));
  });
  it("rejects missing and extra payload keys", () => {
    assertValidationError(runFeature({ appointments: [] }));
    assertValidationError(runFeature({ id: "a" }));
    assertValidationError(runFeature({ appointments: [], id: "a", extra: 1 }));
    assertValidationError(runFeature({}));
  });
  it("rejects wrong payload types", () => {
    assertValidationError(runFeature({ appointments: {}, id: "a" }));
    assertValidationError(runFeature({ appointments: [], id: 5 }));
  });
  it("rejects duplicate entry ids", () => {
    assertValidationError(runFeature({
      appointments: [
        makeEntry("dup", "demo-dup111", "scheduled"),
        makeEntry("dup", "demo-dup111", "scheduled")
      ],
      id: "dup"
    }));
  });
  it("rejects entry missing or extra keys", () => {
    assertValidationError(runFeature({
      appointments: [{ id: "e1", practitionerId: "demo-e11111" }],
      id: "e1"
    }));
    assertValidationError(runFeature({
      appointments: [{ id: "e1", practitionerId: "demo-e11111", status: "scheduled", extra: 1 }],
      id: "e1"
    }));
    assertValidationError(runFeature({
      appointments: [null],
      id: "e1"
    }));
  });
  it("rejects bad id charset and length", () => {
    assertValidationError(runFeature({ appointments: [], id: "" }));
    assertValidationError(runFeature({ appointments: [], id: "has space" }));
    assertValidationError(runFeature({ appointments: [], id: "bad!" }));
    assertValidationError(runFeature({ appointments: [], id: "x".repeat(65) }));
    assertValidationError(runFeature({
      appointments: [makeEntry("bad!", "demo-ok1111", "scheduled")],
      id: "bad!"
    }));
    assertValidationError(runFeature({
      appointments: [makeEntry("", "demo-ok1111", "scheduled")],
      id: ""
    }));
  });
  it("rejects bad practitioner prefix and charset", () => {
    assertValidationError(runFeature({
      appointments: [makeEntry("p1", "other-one", "scheduled")],
      id: "p1"
    }));
    assertValidationError(runFeature({
      appointments: [makeEntry("p1", "demo-bad!", "scheduled")],
      id: "p1"
    }));
    assertValidationError(runFeature({
      appointments: [makeEntry("p1", "demo-", "scheduled")],
      id: "p1"
    }));
    assertValidationError(runFeature({
      appointments: [makeEntry("p1", "demo", "scheduled")],
      id: "p1"
    }));
  });
  it("rejects bad status", () => {
    assertValidationError(runFeature({
      appointments: [makeEntry("s1", "demo-ok1111", "pending")],
      id: "s1"
    }));
    assertValidationError(runFeature({
      appointments: [makeEntry("s1", "demo-ok1111", "SCHEDULED")],
      id: "s1"
    }));
  });
  it("rejects over 50 entries", () => {
    const many = [];
    for (let i = 0; i < 51; i = i + 1) {
      many.push(makeEntry("id-" + i, "demo-prac11", "scheduled"));
    }
    assertValidationError(runFeature({ appointments: many, id: "id-0" }));
  });
  it("accepts exactly 50 entries", () => {
    const many = [];
    for (let i = 0; i < 50; i = i + 1) {
      many.push(makeEntry("bid-" + i, "demo-prac11", "scheduled"));
    }
    const out = runFeature({ appointments: many, id: "bid-0" });
    assert.strictEqual(out.ok, true);
    assert.strictEqual(out.remainingCount, 49);
  });
  it("error has no partial result", () => {
    const out = runFeature({ appointments: [], extra: 1, id: "a" });
    assert.strictEqual(out.ok, false);
    assert.ok(!("remaining" in out));
    assert.ok(!("remainingCount" in out));
    assert.ok(!("practitionerId" in out));
    const nf = runFeature({ appointments: [], id: "zzz" });
    assert.ok(!("remaining" in nf));
  });
});

describe("not found and statuses", () => {
  it("empty appointments yields not-found", () => {
    assertNotFound(runFeature({ appointments: [], id: "apt-001" }));
  });
  it("well-formed no match yields not-found", () => {
    assertNotFound(runFeature({
      appointments: [
        makeEntry("n-1", "demo-n11111", "scheduled"),
        makeEntry("n-2", "demo-n22222", "completed")
      ],
      id: "missing"
    }));
  });
  it("all statuses are deletable", () => {
    for (const status of ["scheduled", "completed", "cancelled"]) {
      const out = runFeature({
        appointments: [makeEntry("st-1", "demo-st1111", status)],
        id: "st-1"
      });
      assert.strictEqual(out.ok, true);
      assert.strictEqual(out.status, status);
      assert.strictEqual(out.remainingCount, 0);
    }
  });
});
