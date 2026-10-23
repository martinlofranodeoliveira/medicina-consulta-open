export function runFeature(payload) {
  if (payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  if (typeof payload !== "object") {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  if (Array.isArray(payload) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  const entries = Object.entries(payload);
  if (entries.length !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  const seenKeys = [];
  for (const entry of entries) {
    const k = entry[0];
    seenKeys.push(k);
  }
  const seen = new Map();
  for (const entry of entries) {
    const k = entry[0];
    const v = entry[1];
    seen.set(k, v);
  }
  let hostCount = 0;
  let portCount = 0;
  for (const k of seenKeys) {
    if (k === "host") {
      hostCount = hostCount + 1;
    }
    if (k === "port") {
      portCount = portCount + 1;
    }
  }
  if (hostCount !== 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  if (portCount !== 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  if (seenKeys.length !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  const totalKnown = hostCount + portCount;
  if (totalKnown !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  const host = payload.host;
  const port = payload.port;
  if (typeof host !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  if (host.length < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  if (host.length > 253) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  const allowed = new Map();
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-") {
    allowed.set(ch, true);
  }
  for (const ch of host) {
    const okChar = allowed.get(ch);
    if (okChar !== true) {
      return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
    }
  }
  if (typeof port !== "number") {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  if (Number.isSafeInteger(port) !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  if (port < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  if (port > 65535) {
    return { ok: false, error: { code: "validation_error", message: "invalid loopback bind config." } };
  }
  let copied = "";
  for (const ch of host) {
    copied = copied + ch;
  }
  const target = "127.0.0.1";
  let safe = false;
  if (copied.length === target.length) {
    const expected = new Map();
    let pos = 0;
    for (const ch of target) {
      expected.set(pos, ch);
      pos = pos + 1;
    }
    let idx = 0;
    let same = true;
    for (const ch of copied) {
      const want = expected.get(idx);
      if (ch !== want) {
        same = false;
      }
      idx = idx + 1;
    }
    if (same === true) {
      safe = true;
    }
  }
  if (safe === true) {
    return { ok: true, safe: true, host: copied, port: port };
  }
  return { ok: true, safe: false, host: copied, port: port };
}
