export function runFeature(payload) {
  const invalidResult = { ok: false, error: { code: "validation_error", message: "invalid appointment query." } };
  if (payload === null) {
    return invalidResult;
  }
  if (typeof payload !== "object") {
    return invalidResult;
  }
  if (Array.isArray(payload) === true) {
    return invalidResult;
  }
  const allowed = new Map();
  allowed.set("date", 1);
  allowed.set("practitionerId", 1);
  const seen = new Map();
  const vals = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    if (allowed.get(k) !== 1) {
      return invalidResult;
    }
    if (seen.get(k) === 1) {
      return invalidResult;
    }
    seen.set(k, 1);
    vals.set(k, v);
  }
  if (seen.size > 2) {
    return invalidResult;
  }
  if (seen.get("date") === 1) {
    const sourcedate = vals.get("date");
    if (typeof sourcedate !== "string") {
      return invalidResult;
    }
    if (sourcedate.length !== 10) {
      return invalidResult;
    }
    const digitMap = new Map();
    digitMap.set("0", 0);
    digitMap.set("1", 1);
    digitMap.set("2", 2);
    digitMap.set("3", 3);
    digitMap.set("4", 4);
    digitMap.set("5", 5);
    digitMap.set("6", 6);
    digitMap.set("7", 7);
    digitMap.set("8", 8);
    digitMap.set("9", 9);
    const chars = [];
    const posMap = new Map();
    for (const ch of sourcedate) {
      posMap.set(chars.length, ch);
      chars.push(ch);
    }
    if (chars.length !== 10) {
      return invalidResult;
    }
    if (chars[4] !== "-") {
      return invalidResult;
    }
    if (chars[7] !== "-") {
      return invalidResult;
    }
    if (digitMap.get(chars[0]) === undefined) {
      return invalidResult;
    }
    if (digitMap.get(chars[1]) === undefined) {
      return invalidResult;
    }
    if (digitMap.get(chars[2]) === undefined) {
      return invalidResult;
    }
    if (digitMap.get(chars[3]) === undefined) {
      return invalidResult;
    }
    if (digitMap.get(chars[5]) === undefined) {
      return invalidResult;
    }
    if (digitMap.get(chars[6]) === undefined) {
      return invalidResult;
    }
    if (digitMap.get(chars[8]) === undefined) {
      return invalidResult;
    }
    if (digitMap.get(chars[9]) === undefined) {
      return invalidResult;
    }
    const y0 = digitMap.get(chars[0]);
    const y1 = digitMap.get(chars[1]);
    const y2 = digitMap.get(chars[2]);
    const y3 = digitMap.get(chars[3]);
    const m0 = digitMap.get(chars[5]);
    const m1 = digitMap.get(chars[6]);
    const d0 = digitMap.get(chars[8]);
    const d1 = digitMap.get(chars[9]);
    const year = y0 * 1000 + y1 * 100 + y2 * 10 + y3;
    const month = m0 * 10 + m1;
    const day = d0 * 10 + d1;
    if (month < 1) {
      return invalidResult;
    }
    if (month > 12) {
      return invalidResult;
    }
    if (day < 1) {
      return invalidResult;
    }
    if (day > 31) {
      return invalidResult;
    }
    const mod400 = year % 400;
    const mod100 = year % 100;
    const mod4 = year % 4;
    const leap = mod400 === 0 ? true : mod4 === 0 ? mod100 === 0 ? false : true : false;
    if (month === 2) {
      if (leap === false) {
        if (day > 28) {
          return invalidResult;
        }
      }
      if (leap === true) {
        if (day > 29) {
          return invalidResult;
        }
      }
    }
    if (month === 4) {
      if (day > 30) {
        return invalidResult;
      }
    }
    if (month === 6) {
      if (day > 30) {
        return invalidResult;
      }
    }
    if (month === 9) {
      if (day > 30) {
        return invalidResult;
      }
    }
    if (month === 11) {
      if (day > 30) {
        return invalidResult;
      }
    }
  }
  if (seen.get("practitionerId") === 1) {
    const sourcepract = vals.get("practitionerId");
    if (typeof sourcepract !== "string") {
      return invalidResult;
    }
    if (sourcepract.length < 6) {
      return invalidResult;
    }
    if (sourcepract.length > 64) {
      return invalidResult;
    }
    const pchars = [];
    const pmap = new Map();
    for (const ch of sourcepract) {
      pmap.set(pchars.length, ch);
      pchars.push(ch);
    }
    if (pchars.length < 6) {
      return invalidResult;
    }
    if (pchars.length > 64) {
      return invalidResult;
    }
    if (pchars[0] !== "d") {
      return invalidResult;
    }
    if (pchars[1] !== "e") {
      return invalidResult;
    }
    if (pchars[2] !== "m") {
      return invalidResult;
    }
    if (pchars[3] !== "o") {
      return invalidResult;
    }
    if (pchars[4] !== "-") {
      return invalidResult;
    }
    const okMap = new Map();
    for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_") {
      okMap.set(c, 1);
    }
    for (const ch of sourcepract) {
      if (okMap.get(ch) !== 1) {
        return invalidResult;
      }
    }
  }
  const parts = [];
  if (seen.get("date") === 1) {
    const sourcedateb = vals.get("date");
    let datecopy = "";
    for (const ch of sourcedateb) {
      datecopy = datecopy + ch;
    }
    const one = [];
    one.push("date");
    one.push(datecopy);
    parts.push(one);
  }
  if (seen.get("practitionerId") === 1) {
    const sourcepractb = vals.get("practitionerId");
    let practcopy = "";
    for (const ch of sourcepractb) {
      practcopy = practcopy + ch;
    }
    const two = [];
    two.push("practitionerId");
    two.push(practcopy);
    parts.push(two);
  }
  const query = Object.fromEntries(parts);
  return { ok: true, valid: true, query: query };
}
