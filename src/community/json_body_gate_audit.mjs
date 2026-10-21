export function runFeature(payload) {
  const invalidRequest = { ok: false, error: { code: "validation_error", message: "invalid body gate request." } };
  const notJson = { ok: false, error: { code: "json_required", message: "json required." } };
  const tooLarge = { ok: false, error: { code: "body_too_large", message: "body too large." } };
  if (typeof payload !== "object") {
    return invalidRequest;
  }
  if (payload === null) {
    return invalidRequest;
  }
  if (Array.isArray(payload) === true) {
    return invalidRequest;
  }
  const collected = new Map();
  const seenKeys = [];
  for (const [key, value] of Object.entries(payload)) {
    seenKeys.push(key);
    collected.set(key, value);
  }
  if (collected.size !== 2) {
    return invalidRequest;
  }
  if (seenKeys.length !== 2) {
    return invalidRequest;
  }
  const contentTypeValue = collected.get("contentType");
  const bodyByteLengthValue = collected.get("bodyByteLength");
  if (typeof contentTypeValue === "undefined") {
    return invalidRequest;
  }
  if (typeof bodyByteLengthValue === "undefined") {
    return invalidRequest;
  }
  if (typeof contentTypeValue !== "string") {
    return invalidRequest;
  }
  if (contentTypeValue.length < 1) {
    return invalidRequest;
  }
  if (contentTypeValue.length > 128) {
    return invalidRequest;
  }
  if (typeof bodyByteLengthValue !== "number") {
    return invalidRequest;
  }
  if (Number.isInteger(bodyByteLengthValue) === false) {
    return invalidRequest;
  }
  if (bodyByteLengthValue < 0) {
    return invalidRequest;
  }
  if (bodyByteLengthValue > 65535) {
    return invalidRequest;
  }
  if (contentTypeValue !== "application/json") {
    return notJson;
  }
  if (bodyByteLengthValue > 8192) {
    return tooLarge;
  }
  return { ok: true, accepted: true, contentType: "application/json", bodyByteLength: bodyByteLengthValue, limit: 8192 };
}
