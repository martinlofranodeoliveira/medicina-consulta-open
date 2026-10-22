export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid duration request." } };
  }
  const badKeys = [];
  const pickedValues = [];
  for (const entry of Object.entries(payload)) {
    const ek = entry[0];
    const ev = entry[1];
    if (ek === "durationMinutes") {
      pickedValues.push(ev);
    } else {
      badKeys.push(ek);
    }
  }
  if (badKeys.length !== 0 || pickedValues.length !== 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid duration request." } };
  }
  const chosen = pickedValues[0];
  if (typeof chosen !== "number" || Number.isInteger(chosen) === false) {
    return { ok: false, error: { code: "validation_error", message: "invalid duration request." } };
  }
  const grid = new Map();
  grid.set(15, true);
  grid.set(30, true);
  grid.set(45, true);
  grid.set(60, true);
  grid.set(75, true);
  grid.set(90, true);
  grid.set(105, true);
  grid.set(120, true);
  const hit = grid.get(chosen);
  if (hit === true) {
    return { ok: true, valid: true, durationMinutes: chosen };
  }
  if (chosen < 15 || chosen > 120) {
    return { ok: true, valid: false, reason: "range_error", durationMinutes: chosen };
  }
  return { ok: true, valid: false, reason: "grid_error", durationMinutes: chosen };
}
