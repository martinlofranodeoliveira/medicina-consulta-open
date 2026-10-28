export function runFeature(payload) {
  const invalid = { error: { code: "validation_error", message: "invalid server lock." }, ok: false };
  if (typeof payload !== "object") {
    return invalid;
  }
  if (payload === null) {
    return invalid;
  }
  if (Array.isArray(payload) === true) {
    return invalid;
  }
  const collected = [];
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const entryKey = entry[0];
    const entryVal = entry[1];
    collected.push(entryKey);
    store.set(entryKey, entryVal);
  }
  if (collected.length !== 2) {
    return invalid;
  }
  const allowed = new Map();
  allowed.set("currentPid", 1);
  allowed.set("requestPid", 1);
  for (const seenKey of collected) {
    const mark = allowed.get(seenKey);
    if (mark !== 1) {
      return invalid;
    }
  }
  const currentPid = store.get("currentPid");
  const requestPid = store.get("requestPid");
  if (typeof currentPid !== "number") {
    return invalid;
  }
  if (typeof requestPid !== "number") {
    return invalid;
  }
  if (Number.isFinite(currentPid) === false) {
    return invalid;
  }
  if (Number.isFinite(requestPid) === false) {
    return invalid;
  }
  if (Number.isSafeInteger(currentPid) === false) {
    return invalid;
  }
  if (Number.isSafeInteger(requestPid) === false) {
    return invalid;
  }
  if (currentPid < 1) {
    return invalid;
  }
  if (requestPid < 1) {
    return invalid;
  }
  if (currentPid > 2147483647) {
    return invalid;
  }
  if (requestPid > 2147483647) {
    return invalid;
  }
  if (currentPid === requestPid) {
    return { canStart: true, currentPid, ok: true, requestPid };
  }
  return { canStart: false, currentPid, ok: true, requestPid };
}
