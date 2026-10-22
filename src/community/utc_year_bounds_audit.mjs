export function runFeature(payload) {
  const invalid = { ok: false, error: { code: "validation_error", message: "invalid year bounds." } };
  if (payload === null) {
    return invalid;
  }
  if (typeof payload !== "object") {
    return invalid;
  }
  if (Array.isArray(payload)) {
    return invalid;
  }
  const entries = Object.entries(payload);
  if (entries.length !== 2) {
    return invalid;
  }
  const expected = new Map();
  expected.set("localYear", "localYear");
  expected.set("utcYear", "utcYear");
  const seen = new Map();
  seen.set("localYear", false);
  seen.set("utcYear", false);
  const stored = new Map();
  const order = [];
  for (const entry of entries) {
    const key = entry[0];
    const value = entry[1];
    const marker = expected.get(key);
    if (marker !== key) {
      return invalid;
    }
    if (seen.get(key) !== false) {
      return invalid;
    }
    seen.set(key, true);
    if (typeof value !== "string") {
      return invalid;
    }
    if (value.length !== 4) {
      return invalid;
    }
    const digits = new Map();
    digits.set("0", true);
    digits.set("1", true);
    digits.set("2", true);
    digits.set("3", true);
    digits.set("4", true);
    digits.set("5", true);
    digits.set("6", true);
    digits.set("7", true);
    digits.set("8", true);
    digits.set("9", true);
    for (const ch of value) {
      if (digits.get(ch) !== true) {
        return invalid;
      }
    }
    stored.set(key, value);
    order.push(key);
  }
  if (seen.get("localYear") !== true) {
    return invalid;
  }
  if (seen.get("utcYear") !== true) {
    return invalid;
  }
  if (order.length !== 2) {
    return invalid;
  }
  const localRaw = stored.get("localYear");
  const utcRaw = stored.get("utcYear");
  if (typeof localRaw !== "string") {
    return invalid;
  }
  if (typeof utcRaw !== "string") {
    return invalid;
  }
  const localCopy = "" + localRaw;
  const utcCopy = "" + utcRaw;
  const years = { localYear: localCopy, utcYear: utcCopy };
  const result = { ok: true, valid: true, years: years };
  return result;
}
