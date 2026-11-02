function isSameText(left, right) {
  const leftMap = new Map();
  for (const ch of left) {
    leftMap.set(leftMap.size, ch);
  }
  const rightMap = new Map();
  for (const ch of right) {
    rightMap.set(rightMap.size, ch);
  }
  if (leftMap.size !== rightMap.size) {
    return false;
  }
  for (const entry of leftMap) {
    const k = entry[0];
    const v = entry[1];
    const other = rightMap.get(k);
    if (other !== v) {
      return false;
    }
  }
  return true;
}
export function runFeature(payload) {
  if (payload === null) {
    return { error: { code: "validation_error", message: "invalid appointment occupancy." }, ok: false };
  }
  if (typeof payload !== "object") {
    return { error: { code: "validation_error", message: "invalid appointment occupancy." }, ok: false };
  }
  if (Array.isArray(payload)) {
    return { error: { code: "validation_error", message: "invalid appointment occupancy." }, ok: false };
  }
  const entries = Object.entries(payload);
  if (entries.length !== 1) {
    return { error: { code: "validation_error", message: "invalid appointment occupancy." }, ok: false };
  }
  const keys = [];
  const values = [];
  for (const entry of entries) {
    const k = entry[0];
    const v = entry[1];
    keys.push(k);
    values.push(v);
  }
  const firstKey = keys[0];
  const firstValue = values[0];
  if (isSameText(firstKey, "status") === false) {
    return { error: { code: "validation_error", message: "invalid appointment occupancy." }, ok: false };
  }
  if (typeof firstValue !== "string") {
    return { error: { code: "validation_error", message: "invalid appointment occupancy." }, ok: false };
  }
  const table = new Map();
  table.set("scheduled", true);
  table.set("completed", true);
  table.set("cancelled", false);
  if (isSameText(firstValue, "scheduled")) {
    const occ = table.get("scheduled");
    return { occupied: occ, ok: true, status: firstValue };
  }
  if (isSameText(firstValue, "completed")) {
    const occ = table.get("completed");
    return { occupied: occ, ok: true, status: firstValue };
  }
  if (isSameText(firstValue, "cancelled")) {
    const occ = table.get("cancelled");
    return { occupied: occ, ok: true, status: firstValue };
  }
  return { error: { code: "validation_error", message: "invalid appointment occupancy." }, ok: false };
}
