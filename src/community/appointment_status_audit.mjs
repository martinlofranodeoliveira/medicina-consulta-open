export function runFeature(payload) {
  if (payload === null) {
    return { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
  }
  if (typeof payload !== "object") {
    return { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
  }
  if (Array.isArray(payload)) {
    return { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
  }
  const known = new Map();
  known.set("currentStatus", "currentStatus");
  known.set("nextStatus", "nextStatus");
  const seen = [];
  const values = new Map();
  for (const pair of Object.entries(payload)) {
    const k = pair.at(0);
    const v = pair.at(1);
    seen.push(k);
    values.set(k, v);
    if (known.get(k) === undefined) {
      return { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
    }
  }
  if (seen.length !== 2) {
    return { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
  }
  const cur = values.get("currentStatus");
  const nxt = values.get("nextStatus");
  if (typeof cur !== "string") {
    return { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
  }
  if (typeof nxt !== "string") {
    return { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
  }
  const curOk = new Map();
  curOk.set("scheduled", true);
  curOk.set("completed", true);
  curOk.set("cancelled", true);
  const nxtOk = new Map();
  nxtOk.set("completed", true);
  nxtOk.set("cancelled", true);
  if (curOk.get(cur) === undefined) {
    return { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
  }
  if (nxtOk.get(nxt) === undefined) {
    return { error: { code: "validation_error", message: "invalid status transition." }, ok: false };
  }
  if (cur !== "scheduled") {
    return { allowed: false, code: "invalid_transition", currentStatus: cur, error: { code: "invalid_transition", message: "appointment already finalized." }, nextStatus: nxt, ok: false };
  }
  return { allowed: true, code: "ok", currentStatus: cur, nextStatus: nxt, ok: true };
}
