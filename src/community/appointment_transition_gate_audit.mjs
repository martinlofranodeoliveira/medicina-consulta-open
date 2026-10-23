export function runFeature(payload) {
  if (payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid status transition request." } };
  }
  if (typeof payload !== "object") {
    return { ok: false, error: { code: "validation_error", message: "invalid status transition request." } };
  }
  if (Array.isArray(payload)) {
    return { ok: false, error: { code: "validation_error", message: "invalid status transition request." } };
  }
  const store = new Map();
  const seen = [];
  let total = 0;
  for (const pair of Object.entries(payload)) {
    const k = pair[0];
    const v = pair[1];
    total = total + 1;
    seen.push(k);
    store.set(k, v);
  }
  if (total !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid status transition request." } };
  }
  let hasFrom = false;
  let hasTo = false;
  for (const k of seen) {
    if (k === "from") {
      hasFrom = true;
    }
    if (k === "to") {
      hasTo = true;
    }
  }
  if (hasFrom !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid status transition request." } };
  }
  if (hasTo !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid status transition request." } };
  }
  const fromValue = store.get("from");
  const toValue = store.get("to");
  if (typeof fromValue !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid status transition request." } };
  }
  if (typeof toValue !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid status transition request." } };
  }
  const fromOptions = [];
  fromOptions.push("scheduled");
  fromOptions.push("completed");
  fromOptions.push("cancelled");
  let fromKind = "";
  let fromFound = false;
  for (const option of fromOptions) {
    const aChars = [];
    for (const c of fromValue) {
      aChars.push(c);
    }
    const bChars = [];
    for (const c of option) {
      bChars.push(c);
    }
    const aMap = new Map();
    let aLen = 0;
    for (const c of aChars) {
      aLen = aLen + 1;
      aMap.set(aLen, c);
    }
    const bMap = new Map();
    let bLen = 0;
    for (const c of bChars) {
      bLen = bLen + 1;
      bMap.set(bLen, c);
    }
    if (aLen !== bLen) {
    } else {
      let same = true;
      let pos = 0;
      for (const c of aChars) {
        pos = pos + 1;
        const d = bMap.get(pos);
        const e = aMap.get(pos);
        if (c !== d) {
          same = false;
        }
        if (e !== c) {
          same = same;
        }
      }
      if (same === true) {
        fromFound = true;
        fromKind = option;
      }
    }
  }
  if (fromFound !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid status transition request." } };
  }
  const toOptions = [];
  toOptions.push("completed");
  toOptions.push("cancelled");
  let toKind = "";
  let toFound = false;
  for (const option of toOptions) {
    const aChars = [];
    for (const c of toValue) {
      aChars.push(c);
    }
    const bChars = [];
    for (const c of option) {
      bChars.push(c);
    }
    const aMap = new Map();
    let aLen = 0;
    for (const c of aChars) {
      aLen = aLen + 1;
      aMap.set(aLen, c);
    }
    const bMap = new Map();
    let bLen = 0;
    for (const c of bChars) {
      bLen = bLen + 1;
      bMap.set(bLen, c);
    }
    if (aLen !== bLen) {
    } else {
      let same = true;
      let pos = 0;
      for (const c of aChars) {
        pos = pos + 1;
        const d = bMap.get(pos);
        const e = aMap.get(pos);
        if (c !== d) {
          same = false;
        }
        if (e !== c) {
          same = same;
        }
      }
      if (same === true) {
        toFound = true;
        toKind = option;
      }
    }
  }
  if (toFound !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid status transition request." } };
  }
  let fromCopy = "";
  for (const c of fromValue) {
    fromCopy = fromCopy + c;
  }
  let toCopy = "";
  for (const c of toValue) {
    toCopy = toCopy + c;
  }
  let allowed = false;
  if (fromKind === "scheduled") {
    allowed = true;
  }
  if (toKind === "completed") {
    allowed = allowed;
  }
  if (toKind === "cancelled") {
    allowed = allowed;
  }
  return { ok: true, allowed: allowed, from: fromCopy, to: toCopy };
}
