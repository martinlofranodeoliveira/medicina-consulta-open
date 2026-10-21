export function runFeature(payload) {
  function isPlainObject(value) {
    if (typeof value !== "object") {
      return false;
    }
    if (value === null) {
      return false;
    }
    if (Array.isArray(value) === true) {
      return false;
    }
    return true;
  }
  function isDigitChar(ch) {
    if (ch >= "0") {
      if (ch <= "9") {
        return true;
      }
    }
    return false;
  }
  function isAsciiIdChar(ch) {
    if (ch >= "a") {
      if (ch <= "z") {
        return true;
      }
    }
    if (ch >= "A") {
      if (ch <= "Z") {
        return true;
      }
    }
    if (ch >= "0") {
      if (ch <= "9") {
        return true;
      }
    }
    if (ch === "-") {
      return true;
    }
    if (ch === "_") {
      return true;
    }
    return false;
  }
  function isAllDigits(text) {
    for (const ch of text) {
      if (isDigitChar(ch) === false) {
        return false;
      }
    }
    return true;
  }
  function isLeapYear(year) {
    if (year % 400 === 0) {
      return true;
    }
    if (year % 100 === 0) {
      return false;
    }
    if (year % 4 === 0) {
      return true;
    }
    return false;
  }
  function daysInMonth(year, month) {
    const table = new Map();
    table.set(1, 31);
    table.set(2, 28);
    table.set(3, 31);
    table.set(4, 30);
    table.set(5, 31);
    table.set(6, 30);
    table.set(7, 31);
    table.set(8, 31);
    table.set(9, 30);
    table.set(10, 31);
    table.set(11, 30);
    table.set(12, 31);
    if (month === 2) {
      if (isLeapYear(year) === true) {
        return 29;
      }
      return 28;
    }
    return table.get(month);
  }
  function isValidPractitionerId(value) {
    if (typeof value !== "string") {
      return false;
    }
    if (value.length < 6) {
      return false;
    }
    if (value.length > 64) {
      return false;
    }
    if (value.startsWith("demo-") === false) {
      return false;
    }
    for (const ch of value) {
      if (isAsciiIdChar(ch) === false) {
        return false;
      }
    }
    return true;
  }
  function isValidDuration(value) {
    if (typeof value !== "number") {
      return false;
    }
    if (Number.isInteger(value) === false) {
      return false;
    }
    if (value < 15) {
      return false;
    }
    if (value > 120) {
      return false;
    }
    if (value % 15 !== 0) {
      return false;
    }
    return true;
  }
  function isValidStartsAt(value) {
    if (typeof value !== "string") {
      return false;
    }
    if (value.length !== 24) {
      return false;
    }
    if (value.slice(4, 5) !== "-") {
      return false;
    }
    if (value.slice(7, 8) !== "-") {
      return false;
    }
    if (value.slice(10, 11) !== "T") {
      return false;
    }
    if (value.slice(13, 14) !== ":") {
      return false;
    }
    if (value.slice(16, 17) !== ":") {
      return false;
    }
    if (value.slice(19, 20) !== ".") {
      return false;
    }
    if (value.slice(23, 24) !== "Z") {
      return false;
    }
    if (value.slice(17, 19) !== "00") {
      return false;
    }
    if (value.slice(20, 23) !== "000") {
      return false;
    }
    const yearStr = value.slice(0, 4);
    const monthStr = value.slice(5, 7);
    const dayStr = value.slice(8, 10);
    const hourStr = value.slice(11, 13);
    const minuteStr = value.slice(14, 16);
    if (isAllDigits(yearStr) === false) {
      return false;
    }
    if (isAllDigits(monthStr) === false) {
      return false;
    }
    if (isAllDigits(dayStr) === false) {
      return false;
    }
    if (isAllDigits(hourStr) === false) {
      return false;
    }
    if (isAllDigits(minuteStr) === false) {
      return false;
    }
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const hour = Number(hourStr);
    if (month < 1) {
      return false;
    }
    if (month > 12) {
      return false;
    }
    if (hour < 0) {
      return false;
    }
    if (hour > 23) {
      return false;
    }
    if (minuteStr !== "00") {
      if (minuteStr !== "15") {
        if (minuteStr !== "30") {
          if (minuteStr !== "45") {
            return false;
          }
        }
      }
    }
    if (day < 1) {
      return false;
    }
    const maxDay = daysInMonth(year, month);
    if (day > maxDay) {
      return false;
    }
    return true;
  }
  function isValidEntryId(value) {
    if (typeof value !== "string") {
      return false;
    }
    if (value.length < 1) {
      return false;
    }
    if (value.length > 64) {
      return false;
    }
    for (const ch of value) {
      if (isAsciiIdChar(ch) === false) {
        return false;
      }
    }
    return true;
  }
  function countDivisible(divisor, year) {
    if (year <= 0) {
      return 0;
    }
    const t = year - 1;
    const rem = t % divisor;
    const base = (t - rem) / divisor;
    return base + 1;
  }
  function daysBeforeYear(year) {
    const c4 = countDivisible(4, year);
    const c100 = countDivisible(100, year);
    const c400 = countDivisible(400, year);
    return year * 365 + c4 - c100 + c400;
  }
  function daysBeforeMonth(year, month) {
    const table = new Map();
    table.set(1, 31);
    table.set(2, 28);
    table.set(3, 31);
    table.set(4, 30);
    table.set(5, 31);
    table.set(6, 30);
    table.set(7, 31);
    table.set(8, 31);
    table.set(9, 30);
    table.set(10, 31);
    table.set(11, 30);
    table.set(12, 31);
    const order = [];
    order.push(1);
    order.push(2);
    order.push(3);
    order.push(4);
    order.push(5);
    order.push(6);
    order.push(7);
    order.push(8);
    order.push(9);
    order.push(10);
    order.push(11);
    order.push(12);
    let total = 0;
    for (const m of order) {
      if (m < month) {
        if (m === 2) {
          if (isLeapYear(year) === true) {
            total = total + 29;
          } else {
            total = total + 28;
          }
        } else {
          const v = table.get(m);
          total = total + v;
        }
      }
    }
    return total;
  }
  function toAbsoluteMinutes(value) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    const hour = Number(value.slice(11, 13));
    const minute = Number(value.slice(14, 16));
    const days = daysBeforeYear(year) + daysBeforeMonth(year, month) + (day - 1);
    return (days * 24 + hour) * 60 + minute;
  }
  function invalidResult() {
    return { ok: false, error: { code: "validation_error", message: "invalid schedule conflict check." } };
  }
  if (isPlainObject(payload) === false) {
    return invalidResult();
  }
  const allowedPayload = new Map();
  allowedPayload.set("practitionerId", true);
  allowedPayload.set("candidate", true);
  allowedPayload.set("appointments", true);
  let payloadCount = 0;
  for (const pair of Object.entries(payload)) {
    const k = pair[0];
    if (allowedPayload.get(k) !== true) {
      return invalidResult();
    }
    payloadCount = payloadCount + 1;
  }
  if (payloadCount !== 3) {
    return invalidResult();
  }
  if (isValidPractitionerId(payload.practitionerId) === false) {
    return invalidResult();
  }
  const candidate = payload.candidate;
  if (isPlainObject(candidate) === false) {
    return invalidResult();
  }
  const allowedCandidate = new Map();
  allowedCandidate.set("startsAt", true);
  allowedCandidate.set("durationMinutes", true);
  let candidateCount = 0;
  for (const pair of Object.entries(candidate)) {
    const k = pair[0];
    if (allowedCandidate.get(k) !== true) {
      return invalidResult();
    }
    candidateCount = candidateCount + 1;
  }
  if (candidateCount !== 2) {
    return invalidResult();
  }
  if (isValidStartsAt(candidate.startsAt) === false) {
    return invalidResult();
  }
  if (isValidDuration(candidate.durationMinutes) === false) {
    return invalidResult();
  }
  const appointments = payload.appointments;
  if (Array.isArray(appointments) === false) {
    return invalidResult();
  }
  if (appointments.length > 200) {
    return invalidResult();
  }
  for (const entry of appointments) {
    if (isPlainObject(entry) === false) {
      return invalidResult();
    }
    const allowedEntry = new Map();
    allowedEntry.set("id", true);
    allowedEntry.set("practitionerId", true);
    allowedEntry.set("startsAt", true);
    allowedEntry.set("durationMinutes", true);
    allowedEntry.set("status", true);
    let entryCount = 0;
    for (const pair of Object.entries(entry)) {
      const ek = pair[0];
      if (allowedEntry.get(ek) !== true) {
        return invalidResult();
      }
      entryCount = entryCount + 1;
    }
    if (entryCount !== 5) {
      return invalidResult();
    }
    if (isValidEntryId(entry.id) === false) {
      return invalidResult();
    }
    if (isValidPractitionerId(entry.practitionerId) === false) {
      return invalidResult();
    }
    if (isValidStartsAt(entry.startsAt) === false) {
      return invalidResult();
    }
    if (isValidDuration(entry.durationMinutes) === false) {
      return invalidResult();
    }
    if (entry.status !== "scheduled") {
      if (entry.status !== "completed") {
        if (entry.status !== "cancelled") {
          return invalidResult();
        }
      }
    }
  }
  const candidateStart = toAbsoluteMinutes(candidate.startsAt);
  const candidateEnd = candidateStart + candidate.durationMinutes;
  let conflictFound = false;
  for (const entry of appointments) {
    if (entry.practitionerId === payload.practitionerId) {
      if (entry.status === "scheduled" || entry.status === "completed") {
        const entryStart = toAbsoluteMinutes(entry.startsAt);
        const entryEnd = entryStart + entry.durationMinutes;
        if (candidateStart < entryEnd) {
          if (entryStart < candidateEnd) {
            conflictFound = true;
          }
        }
      }
    }
  }
  if (conflictFound === true) {
    return { ok: true, conflict: true, code: "schedule_conflict", practitionerId: payload.practitionerId };
  }
  return { ok: true, conflict: false, code: "ok", practitionerId: payload.practitionerId };
}
