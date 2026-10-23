export function runFeature(payload) {
  const digitVals = new Map();
  digitVals.set("0", 0);
  digitVals.set("1", 1);
  digitVals.set("2", 2);
  digitVals.set("3", 3);
  digitVals.set("4", 4);
  digitVals.set("5", 5);
  digitVals.set("6", 6);
  digitVals.set("7", 7);
  digitVals.set("8", 8);
  digitVals.set("9", 9);
  const letterSet = new Map();
  for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") {
    letterSet.set(c, 1);
  }
  const symSet = new Map();
  symSet.set("-", 1);
  symSet.set("_", 1);
  const maxMap = new Map();
  maxMap.set(1, 31);
  maxMap.set(2, 29);
  maxMap.set(3, 31);
  maxMap.set(4, 30);
  maxMap.set(5, 31);
  maxMap.set(6, 30);
  maxMap.set(7, 31);
  maxMap.set(8, 31);
  maxMap.set(9, 30);
  maxMap.set(10, 31);
  maxMap.set(11, 30);
  maxMap.set(12, 31);
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (Array.isArray(payload) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  const allEntries = Object.entries(payload);
  let totalEntries = 0;
  for (const entry of allEntries) {
    totalEntries = totalEntries + 1;
  }
  if (totalEntries !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    store.set(k, v);
  }
  let seenDate = 0;
  let seenZone = 0;
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    if (k === "date") {
      seenDate = seenDate + 1;
    } else {
      if (k === "timeZone") {
        seenZone = seenZone + 1;
      } else {
        return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
      }
    }
  }
  if (seenDate !== 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (seenZone !== 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  const dateValue = store.get("date");
  const zoneValue = store.get("timeZone");
  if (typeof dateValue !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (dateValue.length !== 10) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  const dateChars = [];
  let pos = 0;
  for (const ch of dateValue) {
    if (pos === 4) {
      if (ch !== "-") {
        return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
      }
    } else {
      if (pos === 7) {
        if (ch !== "-") {
          return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
        }
      } else {
        if (digitVals.get(ch) === undefined) {
          return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
        }
      }
    }
    dateChars.push(ch);
    pos = pos + 1;
  }
  if (pos !== 10) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  const mA = dateChars[5];
  const mB = dateChars[6];
  const dA = dateChars[8];
  const dB = dateChars[9];
  const mAv = digitVals.get(mA);
  const mBv = digitVals.get(mB);
  const dAv = digitVals.get(dA);
  const dBv = digitVals.get(dB);
  if (mAv === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (mBv === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (dAv === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (dBv === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  const monthNum = mAv * 10 + mBv;
  const dayNum = dAv * 10 + dBv;
  if (monthNum < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (monthNum > 12) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  const maxDay = maxMap.get(monthNum);
  if (maxDay === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (dayNum < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (dayNum > maxDay) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (typeof zoneValue !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  const zLen = zoneValue.length;
  if (zLen < 3) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (zLen > 64) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  let compLen = 0;
  let slashCount = 0;
  let prevSlash = 0;
  let atStart = 1;
  let zTotal = 0;
  for (const ch of zoneValue) {
    zTotal = zTotal + 1;
    if (ch === "/") {
      if (zTotal === 1) {
        return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
      }
      if (prevSlash === 1) {
        return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
      }
      if (compLen < 1) {
        return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
      }
      if (compLen > 32) {
        return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
      }
      slashCount = slashCount + 1;
      compLen = 0;
      prevSlash = 1;
      atStart = 1;
    } else {
      if (letterSet.get(ch) === undefined) {
        if (digitVals.get(ch) === undefined) {
          if (symSet.get(ch) === undefined) {
            return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
          }
        }
      }
      if (atStart === 1) {
        if (letterSet.get(ch) === undefined) {
          return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
        }
      }
      compLen = compLen + 1;
      if (compLen > 32) {
        return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
      }
      prevSlash = 0;
      atStart = 0;
    }
  }
  if (slashCount < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (prevSlash === 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (compLen < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  if (compLen > 32) {
    return { ok: false, error: { code: "validation_error", message: "invalid IANA day query." } };
  }
  let dateCopy = "";
  for (const ch of dateValue) {
    dateCopy = dateCopy + ch;
  }
  let zoneCopy = "";
  for (const ch of zoneValue) {
    zoneCopy = zoneCopy + ch;
  }
  return { ok: true, valid: true, query: { date: dateCopy, timeZone: zoneCopy } };
}
