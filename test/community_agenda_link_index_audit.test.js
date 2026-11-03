import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/agenda_link_index_audit.mjs";

function expectInvalid(payload) {
  const out = runFeature(payload);
  assert.equal(out.ok, false);
  assert.deepEqual(out.error, { code: "validation_error", message: "invalid agenda link index." });
  assert.deepEqual(Object.keys(out), ["error", "ok"]);
  assert.deepEqual(Object.keys(out.error), ["code", "message"]);
  assert.equal(out.count, undefined);
  assert.equal(out.links, undefined);
  return out;
}

describe("payload shape rejects", () => {
  it("rejects null, array and non-object", () => {
    expectInvalid(null);
    expectInvalid([]);
    expectInvalid("x");
    expectInvalid(42);
  });
  it("rejects missing and extra keys", () => {
    expectInvalid({ practitioners: ["demo-cardio"] });
    expectInvalid({ appointments: [] });
    expectInvalid({ practitioners: ["demo-cardio"], appointments: [], extra: 1 });
    expectInvalid({});
  });
  it("rejects non-array and out-of-range lengths", () => {
    expectInvalid({ practitioners: "demo-cardio", appointments: [] });
    expectInvalid({ practitioners: ["demo-cardio"], appointments: "x" });
    expectInvalid({ practitioners: [], appointments: [] });
    const many = [];
    for (let i = 0; i < 21; i++) many.push("demo-p" + i);
    expectInvalid({ practitioners: many, appointments: [] });
    const appts = [];
    for (let i = 0; i < 51; i++) appts.push({ id: "a" + i, practitionerId: "demo-cardio" });
    expectInvalid({ practitioners: ["demo-cardio"], appointments: appts });
  });
});

describe("entry shape rejects", () => {
  it("rejects bad practitioner prefix length chars and duplicates", () => {
    expectInvalid({ practitioners: ["cardio"], appointments: [] });
    expectInvalid({ practitioners: ["demo-"], appointments: [] });
    expectInvalid({ practitioners: ["demo-bad!"], appointments: [] });
    expectInvalid({ practitioners: [123], appointments: [] });
    expectInvalid({ practitioners: ["demo-cardio", "demo-cardio"], appointments: [] });
  });
  it("rejects bad appointment keys id shape duplicate ids orphan", () => {
    expectInvalid({ practitioners: ["demo-cardio"], appointments: [{ id: "a1", practitionerId: "demo-cardio", extra: 1 }] });
    expectInvalid({ practitioners: ["demo-cardio"], appointments: [{ id: "a1" }] });
    expectInvalid({ practitioners: ["demo-cardio"], appointments: [{ id: "bad id!", practitionerId: "demo-cardio" }] });
    expectInvalid({ practitioners: ["demo-cardio"], appointments: [{ id: "", practitionerId: "demo-cardio" }] });
    expectInvalid({ practitioners: ["demo-cardio"], appointments: [{ id: "a1", practitionerId: "demo-cardio" }, { id: "a1", practitionerId: "demo-cardio" }] });
    expectInvalid({ practitioners: ["demo-cardio"], appointments: [{ id: "a1", practitionerId: "demo-outro" }] });
    expectInvalid({ practitioners: ["demo-cardio"], appointments: [{ id: "a1", practitionerId: "bad" }] });
  });
});

describe("accepts valid link index", () => {
  it("matches contract example sorted output", () => {
    const out = runFeature({ practitioners: ["demo-cardio", "demo-clinica-geral"], appointments: [{ id: "appt_01", practitionerId: "demo-clinica-geral" }, { id: "appt_02", practitionerId: "demo-cardio" }] });
    assert.equal(out.ok, true);
    assert.equal(out.count, 2);
    assert.deepEqual(out, { count: 2, links: [{ appointmentIds: ["appt_02"], practitionerId: "demo-cardio" }, { appointmentIds: ["appt_01"], practitionerId: "demo-clinica-geral" }], ok: true });
    assert.deepEqual(Object.keys(out), ["count", "links", "ok"]);
  });
  it("accepts empty appointments with empty arrays", () => {
    const out = runFeature({ practitioners: ["demo-b"], appointments: [] });
    assert.deepEqual(out, { count: 0, links: [{ appointmentIds: [], practitionerId: "demo-b" }], ok: true });
  });
  it("sorts practitionerId and appointmentIds lexicographically", () => {
    const out = runFeature({ practitioners: ["demo-zulu", "demo-alpha"], appointments: [{ id: "b-2", practitionerId: "demo-alpha" }, { id: "a-1", practitionerId: "demo-alpha" }, { id: "c-3", practitionerId: "demo-zulu" }] });
    assert.equal(out.count, 3);
    assert.deepEqual(out.links, [{ appointmentIds: ["a-1", "b-2"], practitionerId: "demo-alpha" }, { appointmentIds: ["c-3"], practitionerId: "demo-zulu" }]);
    for (const link of out.links) assert.deepEqual(Object.keys(link), ["appointmentIds", "practitionerId"]);
  });
  it("does not mutate input and returns new arrays", () => {
    const input = { practitioners: ["demo-b", "demo-a"], appointments: [{ id: "b", practitionerId: "demo-a" }, { id: "a", practitionerId: "demo-a" }] };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.equal(JSON.stringify(input), before);
    assert.notEqual(out.links, input.practitioners);
    assert.equal(out.ok, true);
  });
  it("is deterministic synchronous JSON-to-JSON", () => {
    const input = { practitioners: ["demo-cardio"], appointments: [{ id: "x1", practitionerId: "demo-cardio" }] };
    const a = runFeature(input);
    const b = runFeature(JSON.parse(JSON.stringify(input)));
    assert.deepEqual(a, b);
    assert.equal(a instanceof Promise, false);
  });
});
