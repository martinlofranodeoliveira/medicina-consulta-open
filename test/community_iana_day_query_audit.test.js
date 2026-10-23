import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../src/community/iana_day_query_audit.mjs";

function invalidResult(res) {
  assert.equal(res.ok, false);
  assert.equal(res.query, undefined);
  assert.equal(res.error.code, "validation_error");
  assert.equal(res.error.message, "invalid IANA day query.");
}

describe("iana day query audit payload shape", () => {
  it("rejects null", () => {
    invalidResult(runFeature(null));
  });
  it("rejects array", () => {
    invalidResult(runFeature([]));
  });
  it("rejects non-object", () => {
    invalidResult(runFeature("x"));
    invalidResult(runFeature(42));
  });
  it("rejects missing keys", () => {
    invalidResult(runFeature({}));
    invalidResult(runFeature({ date: "2030-04-08" }));
    invalidResult(runFeature({ timeZone: "America/Sao_Paulo" }));
  });
  it("rejects extra keys", () => {
    invalidResult(runFeature({ date: "2030-04-08", timeZone: "America/Sao_Paulo", extra: "x" }));
  });
});

describe("iana day query audit date", () => {
  it("rejects wrong length", () => {
    invalidResult(runFeature({ date: "2030-4-08", timeZone: "America/Sao_Paulo" }));
    invalidResult(runFeature({ date: "2030-04-08X", timeZone: "America/Sao_Paulo" }));
  });
  it("rejects misplaced hyphens", () => {
    invalidResult(runFeature({ date: "2030/04/08", timeZone: "America/Sao_Paulo" }));
    invalidResult(runFeature({ date: "2030040808", timeZone: "America/Sao_Paulo" }));
  });
  it("rejects non-digits", () => {
    invalidResult(runFeature({ date: "203a-04-08", timeZone: "America/Sao_Paulo" }));
    invalidResult(runFeature({ date: "2030-0A-08", timeZone: "America/Sao_Paulo" }));
  });
  it("rejects month outside 01-12", () => {
    invalidResult(runFeature({ date: "2030-00-10", timeZone: "America/Sao_Paulo" }));
    invalidResult(runFeature({ date: "2030-13-08", timeZone: "America/Sao_Paulo" }));
  });
  it("rejects day outside month limits", () => {
    invalidResult(runFeature({ date: "2030-04-00", timeZone: "America/Sao_Paulo" }));
    invalidResult(runFeature({ date: "2030-01-32", timeZone: "America/Sao_Paulo" }));
    invalidResult(runFeature({ date: "2030-04-31", timeZone: "America/Sao_Paulo" }));
    invalidResult(runFeature({ date: "2030-02-30", timeZone: "America/Sao_Paulo" }));
  });
  it("accepts february 29 without leap check", () => {
    const res = runFeature({ date: "2030-02-29", timeZone: "America/New_York" });
    assert.equal(res.ok, true);
    assert.equal(res.valid, true);
  });
});

describe("iana day query audit timeZone", () => {
  it("rejects wrong type and length", () => {
    invalidResult(runFeature({ date: "2030-04-08", timeZone: 42 }));
    invalidResult(runFeature({ date: "2030-04-08", timeZone: "ab" }));
  });
  it("rejects disallowed characters and missing slash", () => {
    invalidResult(runFeature({ date: "2030-04-08", timeZone: "Invalid_Zone!" }));
    invalidResult(runFeature({ date: "2030-04-08", timeZone: "America" }));
  });
  it("rejects leading trailing and double slash", () => {
    invalidResult(runFeature({ date: "2030-04-08", timeZone: "/America/Sao_Paulo" }));
    invalidResult(runFeature({ date: "2030-04-08", timeZone: "America/Sao_Paulo/" }));
    invalidResult(runFeature({ date: "2030-04-08", timeZone: "America//Sao_Paulo" }));
  });
  it("rejects component not starting with letter", () => {
    invalidResult(runFeature({ date: "2030-04-08", timeZone: "America/1Sao" }));
    invalidResult(runFeature({ date: "2030-04-08", timeZone: "America/-Foo" }));
    invalidResult(runFeature({ date: "2030-04-08", timeZone: "1America/Sao" }));
  });
});

describe("iana day query audit accept", () => {
  it("accepts valid query with new copies and preserves input", () => {
    const payload = { date: "2030-04-08", timeZone: "America/Sao_Paulo" };
    const before = JSON.stringify(payload);
    const res = runFeature(payload);
    assert.equal(res.ok, true);
    assert.equal(res.valid, true);
    assert.equal(res.query.date, "2030-04-08");
    assert.equal(res.query.timeZone, "America/Sao_Paulo");
    assert.equal(JSON.stringify(payload), before);
    assert.equal(JSON.stringify(res), JSON.stringify(JSON.parse(JSON.stringify(res))));
    const again = runFeature({ date: "2030-04-08", timeZone: "America/Sao_Paulo" });
    assert.deepEqual(res, again);
  });
  it("accepts minimal slash query", () => {
    const res = runFeature({ date: "2030-01-31", timeZone: "a/b" });
    assert.equal(res.ok, true);
    assert.equal(res.valid, true);
  });
});
