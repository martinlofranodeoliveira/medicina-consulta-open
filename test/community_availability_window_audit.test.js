import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/availability_window_audit.mjs";

function validPayload() {
  return {
    windowStart: "2030-04-08T12:00:00.000Z",
    windowEnd: "2030-04-08T14:00:00.000Z",
    durationMinutes: 30
  };
}

function expectInvalid(result) {
  assert.equal(result.ok, false);
  assert.deepEqual(result, {
    ok: false,
    error: { code: "validation_error", message: "invalid availability window." }
  });
  assert.equal("windowStart" in result, false);
  assert.equal("windowEnd" in result, false);
  assert.equal("durationMinutes" in result, false);
}

test("valid canonical window returns ok true with echoed window", () => {
  const out = runFeature(validPayload());
  assert.deepEqual(out, {
    ok: true,
    windowStart: "2030-04-08T12:00:00.000Z",
    windowEnd: "2030-04-08T14:00:00.000Z",
    durationMinutes: 30
  });
});

test("valid 15-minute window and all durations", () => {
  for (const d of [15, 30, 45, 60, 75, 90, 105, 120]) {
    const out = runFeature({
      windowStart: "2030-01-01T00:00:00.000Z",
      windowEnd: "2030-01-01T00:15:00.000Z",
      durationMinutes: d
    });
    assert.equal(out.ok, true);
    assert.equal(out.durationMinutes, d);
  }
  const grid = runFeature({
    windowStart: "2030-01-01T00:15:00.000Z",
    windowEnd: "2030-01-01T00:45:00.000Z",
    durationMinutes: 15
  });
  assert.equal(grid.ok, true);
});

test("leap year february accepted and non-leap rejected", () => {
  const leap = runFeature({
    windowStart: "2024-02-29T10:00:00.000Z",
    windowEnd: "2024-02-29T11:00:00.000Z",
    durationMinutes: 15
  });
  assert.equal(leap.ok, true);
  expectInvalid(runFeature({
    windowStart: "2023-02-29T10:00:00.000Z",
    windowEnd: "2023-02-29T11:00:00.000Z",
    durationMinutes: 15
  }));
  expectInvalid(runFeature({
    windowStart: "1900-02-29T10:00:00.000Z",
    windowEnd: "1900-02-29T11:00:00.000Z",
    durationMinutes: 15
  }));
  const y2000 = runFeature({
    windowStart: "2000-02-29T10:00:00.000Z",
    windowEnd: "2000-02-29T11:00:00.000Z",
    durationMinutes: 15
  });
  assert.equal(y2000.ok, true);
});

test("non-object payload returns validation_error", () => {
  expectInvalid(runFeature(null));
  expectInvalid(runFeature(undefined));
  expectInvalid(runFeature("x"));
  expectInvalid(runFeature(42));
  expectInvalid(runFeature([1, 2, 3]));
  expectInvalid(runFeature([]));
});

test("extra or missing keys return validation_error", () => {
  expectInvalid(runFeature({ windowStart: "2030-04-08T12:00:00.000Z", windowEnd: "2030-04-08T14:00:00.000Z" }));
  expectInvalid(runFeature({ windowStart: "2030-04-08T12:00:00.000Z", windowEnd: "2030-04-08T14:00:00.000Z", durationMinutes: 30, extra: 1 }));
  expectInvalid(runFeature({ windowStart: "2030-04-08T12:00:00.000Z", windowEnd: "2030-04-08T14:00:00.000Z", durationMinutes: 30, windowstart: "x" }));
  expectInvalid(runFeature({}));
});

test("shape calendar hour grid seconds millis violations rejected", () => {
  const base = validPayload;
  const cases = [
    { windowStart: "2030-04-08 12:00:00.000Z", windowEnd: "2030-04-08T14:00:00.000Z" },
    { windowStart: "2030-04-08T12:07:00.000Z", windowEnd: "2030-04-08T14:00:00.000Z" },
    { windowStart: "2030-04-08T12:00:01.000Z", windowEnd: "2030-04-08T14:00:00.000Z" },
    { windowStart: "2030-04-08T12:00:00.001Z", windowEnd: "2030-04-08T14:00:00.000Z" },
    { windowStart: "2030-13-08T12:00:00.000Z", windowEnd: "2030-04-08T14:00:00.000Z" },
    { windowStart: "2030-04-31T12:00:00.000Z", windowEnd: "2030-05-01T12:00:00.000Z" },
    { windowStart: "2030-04-08T24:00:00.000Z", windowEnd: "2030-04-09T01:00:00.000Z" },
    { windowStart: "2030-04-08T12:00:00.000Z", windowEnd: "2030-04-08T12:00:00.000" },
    { windowStart: 42, windowEnd: "2030-04-08T14:00:00.000Z" }
  ];
  for (const c of cases) {
    const p = base();
    p.windowStart = c.windowStart;
    p.windowEnd = c.windowEnd;
    expectInvalid(runFeature(p));
  }
  expectInvalid(runFeature({ windowStart: "2030-04-08T12:00:00.000Z", windowEnd: "2030-04-08T14:00:00.000+00:00", durationMinutes: 30 }));
});

test("duration violations rejected", () => {
  for (const d of [14, 16, 20, 0, 121, 150, 30.5, NaN, Infinity]) {
    expectInvalid(runFeature({
      windowStart: "2030-04-08T12:00:00.000Z",
      windowEnd: "2030-04-08T14:00:00.000Z",
      durationMinutes: d
    }));
  }
  expectInvalid(runFeature({
    windowStart: "2030-04-08T12:00:00.000Z",
    windowEnd: "2030-04-08T14:00:00.000Z",
    durationMinutes: "30"
  }));
});

test("windowEnd equal or before windowStart rejected", () => {
  expectInvalid(runFeature({
    windowStart: "2030-04-08T14:00:00.000Z",
    windowEnd: "2030-04-08T12:00:00.000Z",
    durationMinutes: 30
  }));
  expectInvalid(runFeature({
    windowStart: "2030-04-08T12:00:00.000Z",
    windowEnd: "2030-04-08T12:00:00.000Z",
    durationMinutes: 30
  }));
});

test("synchronous deterministic no mutation and no Date use", () => {
  const payload = validPayload();
  const before = JSON.parse(JSON.stringify(payload));
  const a = runFeature(payload);
  const b = runFeature(JSON.parse(JSON.stringify(before)));
  assert.deepEqual(a, b);
  assert.deepEqual(payload, before);
  assert.equal(a instanceof Promise, false);
  assert.equal(typeof a.then, "undefined");
  assert.equal(runFeature.toString().includes("Date"), false);
});
