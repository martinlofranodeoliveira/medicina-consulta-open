export function runFeature(payload) {
  const fail = { error: { code: "validation_error", message: "invalid practitioner-filtered slot input." }, ok: false };
  if (typeof payload !== "object") {
    return fail;
  }
  if (payload === null) {
    return fail;
  }
  if (Array.isArray(payload) === true) {
    return fail;
  }
  const topKeys = new Map();
  const topVals = new Map();
  for (const pair of Object.entries(payload)) {
    const k = pair[0];
    const v = pair[1];
    topKeys.set(k, true);
    topVals.set(k, v);
  }
  if (topKeys.size !== 2) {
    return fail;
  }
  if (topKeys.get("appointments") !== true) {
    return fail;
  }
  if (topKeys.get("practitionerId") !== true) {
    return fail;
  }
  const appointments = topVals.get("appointments");
  const requested = topVals.get("practitionerId");
  if (typeof requested !== "string") {
    return fail;
  }
  const reqMap = new Map();
  const reqList = [];
  for (const ch of requested) {
    reqList.push(ch);
    reqMap.set(reqMap.size, ch);
  }
  const reqLen = reqList.length;
  if (reqLen < 6) {
    return fail;
  }
  if (reqLen > 64) {
    return fail;
  }
  if (reqMap.get(0) !== "d") {
    return fail;
  }
  if (reqMap.get(1) !== "e") {
    return fail;
  }
  if (reqMap.get(2) !== "m") {
    return fail;
  }
  if (reqMap.get(3) !== "o") {
    return fail;
  }
  if (reqMap.get(4) !== "-") {
    return fail;
  }
  const allowedSrc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const allowed = new Map();
  for (const ch of allowedSrc) {
    allowed.set(ch, true);
  }
  for (const ch of requested) {
    if (allowed.get(ch) !== true) {
      return fail;
    }
  }
  if (Array.isArray(appointments) === false) {
    return fail;
  }
  const apLen = appointments.length;
  if (apLen > 50) {
    return fail;
  }
  for (const entry of appointments) {
    if (typeof entry !== "object") {
      return fail;
    }
    if (entry === null) {
      return fail;
    }
    if (Array.isArray(entry) === true) {
      return fail;
    }
    const eKeys = new Map();
    const eVals = new Map();
    for (const pair of Object.entries(entry)) {
      const k = pair[0];
      const v = pair[1];
      eKeys.set(k, true);
      eVals.set(k, v);
    }
    if (eKeys.get("practitionerId") !== true) {
      return fail;
    }
    const entryId = eVals.get("practitionerId");
    if (typeof entryId !== "string") {
      return fail;
    }
    const entryList = [];
    for (const ch of entryId) {
      entryList.push(ch);
    }
    const eLen = entryList.length;
    if (eLen !== reqLen) {
      return fail;
    }
    const pos = new Map();
    pos.set("i", 0);
    pos.set("bad", false);
    for (const ch of entryId) {
      const i = pos.get("i");
      const exp = reqMap.get(i);
      if (ch !== exp) {
        pos.set("bad", true);
      }
      pos.set("i", i + 1);
    }
    if (pos.get("bad") === true) {
      return fail;
    }
  }
  const count = appointments.length;
  const outId = topVals.get("practitionerId");
  return { count: count, ok: true, practitionerId: outId };
}
