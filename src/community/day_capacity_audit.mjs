export function runFeature(payload) {
  function toInt(s) {
    let n = 0;
    for (const ch of s) {
      const code = ch.charCodeAt(0);
      const d = code - 48;
      n = n * 10 + d;
    }
    return n;
  }
  function isLeapYear(y) {
    if (y % 400 === 0) {
      return true;
    }
    if (y % 4 === 0) {
      if (y % 100 !== 0) {
        return true;
      }
    }
    return false;
  }
  function maxDayInMonth(y, m) {
    if (m === 2) {
      if (isLeapYear(y)) {
        return 29;
      }
      return 28;
    }
    if (m === 4) {
      return 30;
    }
    if (m === 6) {
      return 30;
    }
    if (m === 9) {
      return 30;
    }
    if (m === 11) {
      return 30;
    }
    return 31;
  }
  function isValidDayValue(year, month, day) {
    if (month < 1) {
      return false;
    }
    if (month > 12) {
      return false;
    }
    if (day < 1) {
      return false;
    }
    const max = maxDayInMonth(year, month);
    if (day > max) {
      return false;
    }
    return true;
  }
  function isValidDayString(s) {
    if (typeof s !== "string") {
      return false;
    }
    if (s.length !== 10) {
      return false;
    }
    if (s.slice(4, 5) !== "-") {
      return false;
    }
    if (s.slice(7, 8) !== "-") {
      return false;
    }
    const parts = [];
    parts.push(s.slice(0, 1));
    parts.push(s.slice(1, 2));
    parts.push(s.slice(2, 3));
    parts.push(s.slice(3, 4));
    parts.push(s.slice(5, 6));
    parts.push(s.slice(6, 7));
    parts.push(s.slice(8, 9));
    parts.push(s.slice(9, 10));
    for (const ch of parts) {
      const code = ch.charCodeAt(0);
      if (code < 48) {
        return false;
      }
      if (code > 57) {
        return false;
      }
    }
    const year = toInt(s.slice(0, 4));
    const month = toInt(s.slice(5, 7));
    const day = toInt(s.slice(8, 10));
    return isValidDayValue(year, month, day);
  }
  function isValidPractitionerId(s) {
    if (typeof s !== "string") {
      return false;
    }
    if (s.length < 6) {
      return false;
    }
    if (s.length > 64) {
      return false;
    }
    if (s.slice(0, 5) !== "demo-") {
      return false;
    }
    for (const ch of s) {
      const code = ch.charCodeAt(0);
      if (code >= 48) {
        if (code <= 57) {
          continue;
        }
      }
      if (code >= 65) {
        if (code <= 90) {
          continue;
        }
      }
      if (code >= 97) {
        if (code <= 122) {
          continue;
        }
      }
      if (code === 45) {
        continue;
      }
      if (code === 95) {
        continue;
      }
      return false;
    }
    return true;
  }
  function isValidStartsAt(s) {
    if (typeof s !== "string") {
      return false;
    }
    if (s.length !== 24) {
      return false;
    }
    if (s.slice(4, 5) !== "-") {
      return false;
    }
    if (s.slice(7, 8) !== "-") {
      return false;
    }
    if (s.slice(10, 11) !== "T") {
      return false;
    }
    if (s.slice(13, 14) !== ":") {
      return false;
    }
    if (s.slice(16, 17) !== ":") {
      return false;
    }
    if (s.slice(19, 20) !== ".") {
      return false;
    }
    if (s.slice(23, 24) !== "Z") {
      return false;
    }
    if (s.slice(17, 19) !== "00") {
      return false;
    }
    if (s.slice(20, 23) !== "000") {
      return false;
    }
    const minute = s.slice(14, 16);
    if (minute !== "00") {
      if (minute !== "15") {
        if (minute !== "30") {
          if (minute !== "45") {
            return false;
          }
        }
      }
    }
    const digitParts = [];
    digitParts.push(s.slice(0, 1));
    digitParts.push(s.slice(1, 2));
    digitParts.push(s.slice(2, 3));
    digitParts.push(s.slice(3, 4));
    digitParts.push(s.slice(5, 6));
    digitParts.push(s.slice(6, 7));
    digitParts.push(s.slice(8, 9));
    digitParts.push(s.slice(9, 10));
    digitParts.push(s.slice(11, 12));
    digitParts.push(s.slice(12, 13));
    digitParts.push(s.slice(14, 15));
    digitParts.push(s.slice(15, 16));
    digitParts.push(s.slice(17, 18));
    digitParts.push(s.slice(18, 19));
    digitParts.push(s.slice(20, 21));
    digitParts.push(s.slice(21, 22));
    digitParts.push(s.slice(22, 23));
    for (const ch of digitParts) {
      const code = ch.charCodeAt(0);
      if (code < 48) {
        return false;
      }
      if (code > 57) {
        return false;
      }
    }
    const year = toInt(s.slice(0, 4));
    const month = toInt(s.slice(5, 7));
    const day = toInt(s.slice(8, 10));
    if (isValidDayValue(year, month, day) === false) {
      return false;
    }
    const hour = toInt(s.slice(11, 13));
    if (hour < 0) {
      return false;
    }
    if (hour > 23) {
      return false;
    }
    return true;
  }
  function fail() {
    return { ok: false, error: { code: "validation_error", message: "invalid day capacity request." } };
  }
  if (typeof payload !== "object") {
    return fail();
  }
  if (payload === null) {
    return fail();
  }
  if (Array.isArray(payload) === true) {
    return fail();
  }
  const allowed = new Map();
  allowed.set("date", 1);
  allowed.set("practitionerId", 1);
  allowed.set("capacity", 1);
  allowed.set("appointments", 1);
  const seen = [];
  for (const kv of Object.entries(payload)) {
    const k = kv[0];
    if (allowed.get(k) !== 1) {
      return fail();
    }
    seen.push(k);
  }
  if (seen.length !== 4) {
    return fail();
  }
  if (seen.includes("date") === false) {
    return fail();
  }
  if (seen.includes("practitionerId") === false) {
    return fail();
  }
  if (seen.includes("capacity") === false) {
    return fail();
  }
  if (seen.includes("appointments") === false) {
    return fail();
  }
  const reqDay = payload.date;
  const reqPid = payload.practitionerId;
  const reqCap = payload.capacity;
  const reqAppts = payload.appointments;
  if (isValidDayString(reqDay) === false) {
    return fail();
  }
  if (isValidPractitionerId(reqPid) === false) {
    return fail();
  }
  if (typeof reqCap !== "number") {
    return fail();
  }
  if (Number.isInteger(reqCap) === false) {
    return fail();
  }
  if (reqCap < 1) {
    return fail();
  }
  if (reqCap > 32) {
    return fail();
  }
  if (Array.isArray(reqAppts) === false) {
    return fail();
  }
  if (reqAppts.length > 100) {
    return fail();
  }
  const entryAllowed = new Map();
  entryAllowed.set("startsAt", 1);
  entryAllowed.set("practitionerId", 1);
  entryAllowed.set("status", 1);
  for (const entry of reqAppts) {
    if (typeof entry !== "object") {
      return fail();
    }
    if (entry === null) {
      return fail();
    }
    if (Array.isArray(entry) === true) {
      return fail();
    }
    const entrySeen = [];
    for (const ekv of Object.entries(entry)) {
      const ek = ekv[0];
      if (entryAllowed.get(ek) !== 1) {
        return fail();
      }
      entrySeen.push(ek);
    }
    if (entrySeen.length !== 3) {
      return fail();
    }
    if (entrySeen.includes("startsAt") === false) {
      return fail();
    }
    if (entrySeen.includes("practitionerId") === false) {
      return fail();
    }
    if (entrySeen.includes("status") === false) {
      return fail();
    }
    const sAt = entry.startsAt;
    const ePid = entry.practitionerId;
    const eStatus = entry.status;
    if (isValidStartsAt(sAt) === false) {
      return fail();
    }
    if (isValidPractitionerId(ePid) === false) {
      return fail();
    }
    if (eStatus !== "scheduled") {
      if (eStatus !== "completed") {
        if (eStatus !== "cancelled") {
          return fail();
        }
      }
    }
  }
  const matches = [];
  for (const entry of reqAppts) {
    const sAt = entry.startsAt;
    const ePid = entry.practitionerId;
    const eStatus = entry.status;
    if (ePid !== reqPid) {
      continue;
    }
    if (eStatus !== "scheduled") {
      if (eStatus !== "completed") {
        continue;
      }
    }
    if (sAt.slice(0, 10) !== reqDay) {
      continue;
    }
    matches.push(entry);
  }
  const booked = matches.length;
  let remaining = 0;
  if (booked < reqCap) {
    remaining = reqCap - booked;
  }
  let full = false;
  if (booked >= reqCap) {
    full = true;
  }
  const dayCopy = reqDay.slice(0);
  const pidCopy = reqPid.slice(0);
  return { ok: true, date: dayCopy, practitionerId: pidCopy, capacity: reqCap, booked: booked, remaining: remaining, isFull: full };
}
