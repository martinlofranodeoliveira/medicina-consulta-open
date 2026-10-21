export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  if (Array.isArray(payload)) {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  const entries = Object.entries(payload);
  if (entries.length !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  const seen = new Map();
  seen.set("host", false);
  seen.set("origin", false);
  const store = new Map();
  store.set("host", "");
  store.set("origin", "");
  const kinds = [];
  for (const entry of entries) {
    const k = entry[0];
    const v = entry[1];
    kinds.push(k);
    if (k === "host") {
      if (seen.get("host") !== false) {
        return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
      }
      seen.set("host", true);
      store.set("host", v);
    } else if (k === "origin") {
      if (seen.get("origin") !== false) {
        return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
      }
      seen.set("origin", true);
      store.set("origin", v);
    } else {
      return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
    }
  }
  if (seen.get("host") !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  if (seen.get("origin") !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  if (kinds.length !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  const host = store.get("host");
  const origin = store.get("origin");
  if (typeof host !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  if (typeof origin !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  if (host.length < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  if (host.length > 128) {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  if (origin.length > 256) {
    return { ok: false, error: { code: "validation_error", message: "invalid host gate request." } };
  }
  const hostAllow = new Map();
  hostAllow.set("127.0.0.1:3334", true);
  hostAllow.set("localhost:3334", true);
  const originAllow = new Map();
  originAllow.set("", true);
  originAllow.set("http://127.0.0.1:3334", true);
  originAllow.set("http://localhost:3334", true);
  const hostCopy = host + "";
  const originCopy = origin + "";
  if (hostAllow.get(host) !== true) {
    return { ok: true, allowed: false, reason: "host_rejected", host: hostCopy, origin: originCopy };
  }
  if (originAllow.get(origin) !== true) {
    return { ok: true, allowed: false, reason: "origin_rejected", host: hostCopy, origin: originCopy };
  }
  return { ok: true, allowed: true, reason: "loopback", host: hostCopy, origin: originCopy };
}
