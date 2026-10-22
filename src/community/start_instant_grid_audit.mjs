export function runFeature(payload) {
  if (payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (typeof payload !== "object") {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (Array.isArray(payload)) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  let count = 0;
  let hasStartsAt = false;
  for (const entry of Object.entries(payload)) {
    count = count + 1;
    const k = entry[0];
    if (k === "startsAt") {
      hasStartsAt = true;
    }
  }
  if (count !== 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (hasStartsAt !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  let raw = "";
  let rawSeen = false;
  for (const v of Object.values(payload)) {
    if (typeof v !== "string") {
      return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
    }
    raw = v;
    rawSeen = true;
  }
  if (rawSeen !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  const startsAt = raw;
  const chars = [];
  for (const ch of startsAt) {
    chars.push(ch);
  }
  const len = chars.length;
  if (len !== 20) {
    if (len !== 25) {
      return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
    }
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
  if (chars[4] !== "-") {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (chars[7] !== "-") {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (chars[10] !== "T") {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (chars[13] !== ":") {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (chars[16] !== ":") {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  const y0 = digitMap.get(chars[0]);
  const y1 = digitMap.get(chars[1]);
  const y2 = digitMap.get(chars[2]);
  const y3 = digitMap.get(chars[3]);
  const mo0 = digitMap.get(chars[5]);
  const mo1 = digitMap.get(chars[6]);
  const d0 = digitMap.get(chars[8]);
  const d1 = digitMap.get(chars[9]);
  const h0 = digitMap.get(chars[11]);
  const h1 = digitMap.get(chars[12]);
  const mi0 = digitMap.get(chars[14]);
  const mi1 = digitMap.get(chars[15]);
  const s0 = digitMap.get(chars[17]);
  const s1 = digitMap.get(chars[18]);
  if (y0 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (y1 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (y2 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (y3 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (mo0 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (mo1 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (d0 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (d1 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (h0 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (h1 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (mi0 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (mi1 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (s0 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (s1 === undefined) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  const year = y0 * 1000 + y1 * 100 + y2 * 10 + y3;
  const month = mo0 * 10 + mo1;
  const day = d0 * 10 + d1;
  const hour = h0 * 10 + h1;
  const minute = mi0 * 10 + mi1;
  const second = s0 * 10 + s1;
  if (month < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (month > 12) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (hour > 23) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (second !== 0) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (minute !== 0) {
    if (minute !== 15) {
      if (minute !== 30) {
        if (minute !== 45) {
          return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
        }
      }
    }
  }
  let maxDay = 31;
  if (month === 2) {
    maxDay = 28;
    const mod4 = year % 4;
    const mod100 = year % 100;
    const mod400 = year % 400;
    if (mod4 === 0) {
      if (mod100 !== 0) {
        maxDay = 29;
      } else {
        if (mod400 === 0) {
          maxDay = 29;
        }
      }
    }
  }
  if (month === 4) {
    maxDay = 30;
  }
  if (month === 6) {
    maxDay = 30;
  }
  if (month === 9) {
    maxDay = 30;
  }
  if (month === 11) {
    maxDay = 30;
  }
  if (day < 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (day > maxDay) {
    return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
  }
  if (len === 20) {
    if (chars[19] !== "Z") {
      return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
    }
  }
  if (len === 25) {
    const sign = chars[19];
    if (sign !== "+") {
      if (sign !== "-") {
        return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
      }
    }
    if (chars[22] !== ":") {
      return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
    }
    const o0 = digitMap.get(chars[20]);
    const o1 = digitMap.get(chars[21]);
    const q0 = digitMap.get(chars[23]);
    const q1 = digitMap.get(chars[24]);
    if (o0 === undefined) {
      return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
    }
    if (o1 === undefined) {
      return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
    }
    if (q0 === undefined) {
      return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
    }
    if (q1 === undefined) {
      return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
    }
    const offH = o0 * 10 + o1;
    const offM = q0 * 10 + q1;
    if (offH > 14) {
      return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
    }
    if (offM !== 0) {
      if (offM !== 15) {
        if (offM !== 30) {
          if (offM !== 45) {
            return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
          }
        }
      }
    }
    if (offH === 14) {
      if (offM !== 0) {
        return { ok: false, error: { code: "validation_error", message: "invalid start instant." } };
      }
    }
  }
  let copy = "";
  for (const ch of startsAt) {
    copy = copy + ch;
  }
  return { ok: true, startsAt: copy, valid: true };
}
