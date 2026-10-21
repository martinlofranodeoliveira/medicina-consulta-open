export function runFeature(payload) {
  const allowed = new Map();
  const seeds = [];
  seeds.push("validation_error");
  seeds.push("schedule_conflict");
  seeds.push("invalid_transition");
  seeds.push("practitioner_not_found");
  seeds.push("appointment_not_found");
  seeds.push("body_too_large");
  seeds.push("json_required");
  for (const seed of seeds) {
    allowed.set(seed, true);
  }
  if (typeof payload !== "object") {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (Array.isArray(payload) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  const topStore = new Map();
  const topKeys = [];
  for (const [topKey, topValue] of Object.entries(payload)) {
    topKeys.push(topKey);
    topStore.set(topKey, topValue);
  }
  if (topKeys.length !== 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  const topGuard = new Map();
  topGuard.set("error", true);
  for (const [topKey, topValue] of Object.entries(payload)) {
    if (topGuard.get(topKey) !== true) {
      return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
    }
  }
  const inner = topStore.get("error");
  if (typeof inner !== "object") {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (inner === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (Array.isArray(inner) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  const innerStore = new Map();
  const innerKeys = [];
  for (const [innerKey, innerValue] of Object.entries(inner)) {
    innerKeys.push(innerKey);
    innerStore.set(innerKey, innerValue);
  }
  if (innerKeys.length !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  const keyGuard = new Map();
  keyGuard.set("code", true);
  keyGuard.set("message", true);
  for (const [innerKey, innerValue] of Object.entries(inner)) {
    if (keyGuard.get(innerKey) !== true) {
      return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
    }
  }
  const codeValue = innerStore.get("code");
  const messageValue = innerStore.get("message");
  if (typeof codeValue !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (typeof messageValue !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (allowed.get(codeValue) !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (messageValue.length < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (messageValue.length > 200) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (messageValue.startsWith(" ") === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (messageValue.endsWith(" ") === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (messageValue.startsWith("\t") === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (messageValue.endsWith("\t") === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (messageValue.startsWith("\n") === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (messageValue.endsWith("\n") === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (messageValue.startsWith("\r") === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  if (messageValue.endsWith("\r") === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
  }
  for (const ch of messageValue) {
    const cp = ch.codePointAt(0);
    if (cp < 32) {
      return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
    }
    if (cp === 127) {
      return { ok: false, error: { code: "validation_error", message: "invalid error envelope." } };
    }
  }
  const codeCopy = "" + codeValue;
  const messageCopy = "" + messageValue;
  return { ok: true, valid: true, code: codeCopy, message: messageCopy };
}
