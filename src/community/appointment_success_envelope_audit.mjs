export function runFeature(payload) {
  const invalid = { error: { code: "validation_error", message: "invalid success envelope." }, ok: false };
  if (typeof payload !== "object") {
    return invalid;
  }
  if (payload === null) {
    return invalid;
  }
  if (Array.isArray(payload) === true) {
    return invalid;
  }
  const topEntries = Object.entries(payload);
  const topMap = new Map();
  const topKeys = [];
  for (const entry of topEntries) {
    const k = entry[0];
    const v = entry[1];
    topMap.set(k, v);
    topKeys.push(k);
  }
  if (topKeys.length !== 1) {
    return invalid;
  }
  for (const k of topKeys) {
    if (k !== "data") {
      return invalid;
    }
  }
  const dataValue = topMap.get("data");
  if (typeof dataValue !== "object") {
    return invalid;
  }
  if (dataValue === null) {
    return invalid;
  }
  if (Array.isArray(dataValue) === true) {
    return invalid;
  }
  const dataEntries = Object.entries(dataValue);
  const dataMap = new Map();
  for (const entry of dataEntries) {
    const k = entry[0];
    const v = entry[1];
    dataMap.set(k, v);
  }
  const idValue = dataMap.get("id");
  if (typeof idValue !== "string") {
    return invalid;
  }
  if (idValue.length < 1) {
    return invalid;
  }
  if (idValue.length > 128) {
    return invalid;
  }
  if (idValue.startsWith(" ")) {
    return invalid;
  }
  if (idValue.endsWith(" ")) {
    return invalid;
  }
  for (const ch of idValue) {
    if (ch === "\n") {
      return invalid;
    }
    if (ch === "\r") {
      return invalid;
    }
    if (ch === "\t") {
      return invalid;
    }
  }
  return { id: idValue, ok: true };
}
