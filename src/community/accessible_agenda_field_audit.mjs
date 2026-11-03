export function runFeature(payload) {
  if (payload === null) {
    return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
  }
  if (typeof payload !== "object") {
    return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
  }
  if (Array.isArray(payload)) {
    return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
  }
  const topEntries = Object.entries(payload);
  if (topEntries.length !== 1) {
    return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
  }
  let fieldsValue = null;
  let topOk = false;
  for (const pair of Object.entries(payload)) {
    const pk = pair[0];
    const pv = pair[1];
    if (pk === "fields") {
      fieldsValue = pv;
      topOk = true;
    } else {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
  }
  if (topOk === false) {
    return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
  }
  if (Array.isArray(fieldsValue) === false) {
    return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
  }
  if (fieldsValue.length < 1) {
    return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
  }
  if (fieldsValue.length > 6) {
    return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
  }
  const allowed = new Map();
  allowed.set("date", true);
  allowed.set("durationMinutes", true);
  allowed.set("patientRef", true);
  allowed.set("practitionerId", true);
  allowed.set("startsAt", true);
  allowed.set("status", true);
  const byKey = new Map();
  for (const entry of fieldsValue) {
    if (entry === null) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (typeof entry !== "object") {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (Array.isArray(entry)) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    const entryEntries = Object.entries(entry);
    if (entryEntries.length !== 3) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    let keyVal = "";
    let labelVal = "";
    let requiredVal = false;
    let hasKey = false;
    let hasLabel = false;
    let hasRequired = false;
    for (const entryPair of Object.entries(entry)) {
      const ek = entryPair[0];
      const ev = entryPair[1];
      if (ek === "key") {
        if (hasKey) {
          return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
        }
        hasKey = true;
        keyVal = ev;
      } else if (ek === "label") {
        if (hasLabel) {
          return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
        }
        hasLabel = true;
        labelVal = ev;
      } else if (ek === "required") {
        if (hasRequired) {
          return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
        }
        hasRequired = true;
        requiredVal = ev;
      } else {
        return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
      }
    }
    if (hasKey === false) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (hasLabel === false) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (hasRequired === false) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (typeof keyVal !== "string") {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    const keyChars = [];
    for (const ch of keyVal) {
      keyChars.push(ch);
    }
    const keyJoined = keyChars.join("");
    if (allowed.get(keyJoined) !== true) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (byKey.get(keyJoined) !== undefined) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (typeof labelVal !== "string") {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (labelVal.length < 2) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (labelVal.length > 80) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    let firstCh = "";
    let lastCh = "";
    let isFirst = true;
    for (const ch of labelVal) {
      if (ch === "\t") {
        return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
      }
      if (ch === "\n") {
        return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
      }
      if (ch === "\r") {
        return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
      }
      if (isFirst) {
        firstCh = ch;
        isFirst = false;
      }
      lastCh = ch;
    }
    if (firstCh === " ") {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (lastCh === " ") {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (typeof requiredVal !== "boolean") {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    if (requiredVal !== true && requiredVal !== false) {
      return { error: { code: "validation_error", message: "invalid accessible field list." }, ok: false };
    }
    const copy = { key: keyJoined, label: labelVal, required: requiredVal };
    byKey.set(keyJoined, copy);
  }
  const order = [];
  order.push("date");
  order.push("durationMinutes");
  order.push("patientRef");
  order.push("practitionerId");
  order.push("startsAt");
  order.push("status");
  const sorted = [];
  for (const canon of order) {
    const hit = byKey.get(canon);
    if (hit !== undefined) {
      sorted.push(hit);
    }
  }
  return { count: fieldsValue.length, fields: sorted, ok: true };
}
