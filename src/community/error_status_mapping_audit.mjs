export function runFeature(payload) {
  const invalid = { error: { code: "validation_error", message: "invalid error status mapping." }, ok: false };
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
  const keys = [];
  for (const entry of entries) {
    const key = entry[0];
    keys.push(key);
  }
  if (keys.length !== 2) {
    return invalid;
  }
  const present = new Map();
  present.set("code", false);
  present.set("status", false);
  for (const key of keys) {
    if (key === "code") {
      if (present.get("code") === true) {
        return invalid;
      }
      present.set("code", true);
    } else {
      if (key === "status") {
        if (present.get("status") === true) {
          return invalid;
        }
        present.set("status", true);
      } else {
        return invalid;
      }
    }
  }
  if (present.get("code") !== true) {
    return invalid;
  }
  if (present.get("status") !== true) {
    return invalid;
  }
  const codeValue = payload.code;
  const statusValue = payload.status;
  if (typeof codeValue !== "string") {
    return invalid;
  }
  if (typeof statusValue !== "number") {
    return invalid;
  }
  if (Number.isFinite(statusValue) !== true) {
    return invalid;
  }
  if (Number.isSafeInteger(statusValue) !== true) {
    return invalid;
  }
  const codeList = ["validation_error", "practitioner_not_found", "appointment_not_found", "schedule_conflict", "invalid_transition", "body_too_large", "json_required"];
  const codeStore = new Map();
  for (const item of codeList) {
    codeStore.set(item, true);
  }
  if (codeStore.get(codeValue) !== true) {
    return invalid;
  }
  const statusList = [400, 404, 409, 413, 415];
  const statusStore = new Map();
  for (const item of statusList) {
    statusStore.set(item, true);
  }
  if (statusStore.get(statusValue) !== true) {
    return invalid;
  }
  const pairs = [["validation_error", 400], ["practitioner_not_found", 404], ["appointment_not_found", 404], ["schedule_conflict", 409], ["invalid_transition", 409], ["body_too_large", 413], ["json_required", 415]];
  const mapping = new Map();
  for (const pair of pairs) {
    const pairCode = pair[0];
    const pairStatus = pair[1];
    mapping.set(pairCode, pairStatus);
  }
  if (mapping.get(codeValue) !== statusValue) {
    return invalid;
  }
  const result = { code: codeValue, ok: true, status: statusValue };
  return result;
}
