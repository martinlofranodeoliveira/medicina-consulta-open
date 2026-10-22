export function runFeature(payload) {
  const failure = { ok: false, error: { code: "validation_error", message: "invalid patient reference." } };
  if (payload === null) {
    return failure;
  }
  if (typeof payload !== "object") {
    return failure;
  }
  if (Array.isArray(payload)) {
    return failure;
  }
  const entries = Object.entries(payload);
  if (entries.length !== 1) {
    return failure;
  }
  const first = entries[0];
  const key = first[0];
  const value = first[1];
  if (key !== "patientRef") {
    return failure;
  }
  if (typeof value !== "string") {
    return failure;
  }
  if (value.length < 1) {
    return failure;
  }
  if (value.length > 48) {
    return failure;
  }
  const allowed = new Map();
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  for (const ch of lowers) {
    allowed.set(ch, true);
  }
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const ch of uppers) {
    allowed.set(ch, true);
  }
  const digits = "0123456789";
  for (const ch of digits) {
    allowed.set(ch, true);
  }
  allowed.set("-", true);
  allowed.set("_", true);
  const seen = [];
  for (const ch of value) {
    seen.push(ch);
    if (allowed.get(ch) !== true) {
      return failure;
    }
  }
  let copy = "";
  for (const ch of seen) {
    copy = copy + ch;
  }
  return { ok: true, valid: true, patientRef: copy };
}
