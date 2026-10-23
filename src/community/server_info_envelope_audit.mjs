export function runFeature(payload) {
  if (typeof payload !== "object") {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  if (payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  if (Array.isArray(payload) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  const entries = Object.entries(payload);
  if (entries.length !== 3) {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  const keyMap = new Map();
  keyMap.set("version", true);
  keyMap.set("mode", true);
  keyMap.set("status", true);
  const valueMap = new Map();
  for (const entry of entries) {
    const k = entry[0];
    const v = entry[1];
    if (keyMap.get(k) !== true) {
      return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
    }
    valueMap.set(k, v);
  }
  const versionValue = valueMap.get("version");
  const modeValue = valueMap.get("mode");
  const statusValue = valueMap.get("status");
  if (typeof versionValue !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  if (typeof modeValue !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  if (typeof statusValue !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  if (versionValue.length < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  if (versionValue.length > 32) {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  const digitMap = new Map();
  for (const ch of "0123456789") {
    digitMap.set(ch, true);
  }
  const allowedMap = new Map();
  for (const ch of "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-") {
    allowedMap.set(ch, true);
  }
  const vChars = [];
  for (const ch of versionValue) {
    vChars.push(ch);
  }
  if (vChars.length < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  if (vChars.length > 32) {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  for (const ch of vChars) {
    if (allowedMap.get(ch) !== true) {
      return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
    }
  }
  const firstChar = vChars[0];
  if (digitMap.get(firstChar) !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  const modeChars = [];
  for (const ch of modeValue) {
    modeChars.push(ch);
  }
  const localMap = new Map();
  localMap.set(0, "l");
  localMap.set(1, "o");
  localMap.set(2, "c");
  localMap.set(3, "a");
  localMap.set(4, "l");
  const demoMap = new Map();
  demoMap.set(0, "d");
  demoMap.set(1, "e");
  demoMap.set(2, "m");
  demoMap.set(3, "o");
  const testMap = new Map();
  testMap.set(0, "t");
  testMap.set(1, "e");
  testMap.set(2, "s");
  testMap.set(3, "t");
  const modeIsLocal = modeChars.length === 5 && modeChars[0] === localMap.get(0) && modeChars[1] === localMap.get(1) && modeChars[2] === localMap.get(2) && modeChars[3] === localMap.get(3) && modeChars[4] === localMap.get(4);
  const modeIsDemo = modeChars.length === 4 && modeChars[0] === demoMap.get(0) && modeChars[1] === demoMap.get(1) && modeChars[2] === demoMap.get(2) && modeChars[3] === demoMap.get(3);
  const modeIsTest = modeChars.length === 4 && modeChars[0] === testMap.get(0) && modeChars[1] === testMap.get(1) && modeChars[2] === testMap.get(2) && modeChars[3] === testMap.get(3);
  if (modeIsLocal !== true && modeIsDemo !== true && modeIsTest !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  const statusChars = [];
  for (const ch of statusValue) {
    statusChars.push(ch);
  }
  const statusMap = new Map();
  statusMap.set(0, "o");
  statusMap.set(1, "k");
  const statusIsOk = statusChars.length === 2 && statusChars[0] === statusMap.get(0) && statusChars[1] === statusMap.get(1);
  if (statusIsOk !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid server info envelope." } };
  }
  const versionCopy = "" + versionValue;
  const modeCopy = "" + modeValue;
  const statusCopy = "" + statusValue;
  return { ok: true, info: { version: versionCopy, mode: modeCopy, status: statusCopy } };
}
