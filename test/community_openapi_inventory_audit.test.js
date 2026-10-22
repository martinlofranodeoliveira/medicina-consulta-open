import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/openapi_inventory_audit.mjs";

const SORTED = [
  { method: "DELETE", path: "/api/appointments/:id" },
  { method: "GET", path: "/" },
  { method: "GET", path: "/api/appointments" },
  { method: "GET", path: "/api/practitioners" },
  { method: "GET", path: "/health" },
  { method: "PATCH", path: "/api/appointments/:id" },
  { method: "POST", path: "/api/appointments" },
  { method: "POST", path: "/api/appointments/:id/reschedule" }
];

function shuffledInput() {
  return {
    operations: [
      { method: "POST", path: "/api/appointments" },
      { method: "GET", path: "/health" },
      { method: "DELETE", path: "/api/appointments/:id" },
      { method: "GET", path: "/" },
      { method: "POST", path: "/api/appointments/:id/reschedule" },
      { method: "GET", path: "/api/practitioners" },
      { method: "PATCH", path: "/api/appointments/:id" },
      { method: "GET", path: "/api/appointments" }
    ]
  };
}

function expectInvalid(result) {
  assert.deepEqual(result, {
    ok: false,
    error: { code: "validation_error", message: "invalid openapi inventory." }
  });
}

describe("openapi inventory audit", () => {
  it("accepts exact eight in any order with sorted output", () => {
    const out = runFeature(shuffledInput());
    assert.equal(out.ok, true);
    assert.equal(out.count, 8);
    assert.deepEqual(out.operations, SORTED);
  });

  it("accepts already sorted input", () => {
    const payload = { operations: SORTED.map((e) => ({ method: e.method, path: e.path })) };
    const out = runFeature(payload);
    assert.deepEqual(out, { ok: true, count: 8, operations: SORTED });
  });

  it("rejects null, array and non-object payloads", () => {
    expectInvalid(runFeature(null));
    expectInvalid(runFeature([]));
    expectInvalid(runFeature("x"));
    expectInvalid(runFeature(8));
    expectInvalid(runFeature(undefined));
  });

  it("rejects missing or extra top-level keys", () => {
    expectInvalid(runFeature({}));
    expectInvalid(runFeature({ operations: SORTED, extra: 1 }));
    expectInvalid(runFeature({ wrong: SORTED }));
  });

  it("rejects wrong length and non-array operations", () => {
    expectInvalid(runFeature({ operations: [] }));
    expectInvalid(runFeature({ operations: SORTED.slice(0, 7) }));
    expectInvalid(runFeature({ operations: "nope" }));
  });

  it("rejects entries with bad shape or extra keys", () => {
    const badExtra = shuffledInput();
    badExtra.operations[0] = { method: "POST", path: "/api/appointments", extra: 1 };
    expectInvalid(runFeature(badExtra));
    expectInvalid(runFeature({ operations: [null, ...SORTED.slice(1)] }));
    expectInvalid(runFeature({ operations: [{ method: "GET" }, ...SORTED.slice(1)] }));
    expectInvalid(runFeature({ operations: [{ method: "GET", path: "/", other: 1 }, ...SORTED.slice(1)] }));
  });

  it("rejects unknown method or path values", () => {
    const badMethod = { operations: SORTED.map((e) => ({ method: e.method, path: e.path })) };
    badMethod.operations[1] = { method: "PUT", path: "/" };
    expectInvalid(runFeature(badMethod));
    const badPath = { operations: SORTED.map((e) => ({ method: e.method, path: e.path })) };
    badPath.operations[1] = { method: "GET", path: "/unknown" };
    expectInvalid(runFeature(badPath));
  });

  it("rejects availability route and duplicate or missing pairs", () => {
    const avail = { operations: SORTED.map((e) => ({ method: e.method, path: e.path })) };
    avail.operations[7] = { method: "GET", path: "/api/availability" };
    expectInvalid(runFeature(avail));
    const dup = { operations: SORTED.map((e) => ({ method: e.method, path: e.path })) };
    dup.operations[7] = { method: "GET", path: "/" };
    expectInvalid(runFeature(dup));
    const seven = { operations: SORTED.slice(0, 7) };
    expectInvalid(runFeature(seven));
  });

  it("preserves input and returns new sorted copies", () => {
    const payload = shuffledInput();
    const before = JSON.stringify(payload);
    const out = runFeature(payload);
    assert.equal(out.ok, true);
    assert.equal(JSON.stringify(payload), before);
    assert.notEqual(out.operations, payload.operations);
    for (const entry of out.operations) {
      assert.deepEqual(Object.keys(entry).sort(), ["method", "path"]);
    }
    out.operations[0].method = "MUT";
    assert.equal(JSON.stringify(payload), before);
  });

  it("is deterministic synchronous JSON-to-JSON", () => {
    const a = runFeature(shuffledInput());
    const b = runFeature(shuffledInput());
    assert.deepEqual(a, b);
    assert.equal(typeof a, "object");
  });
});
