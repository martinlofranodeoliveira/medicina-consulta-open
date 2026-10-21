export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid reschedule identity." } };
  }
  const topEntries = Object.entries(payload);
  if (topEntries.length !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid reschedule identity." } };
  }
  const topSeen = new Map();
  topSeen.set("before", false);
  topSeen.set("after", false);
  const topList = [];
  for (const entry of topEntries) {
    const k = entry[0];
    const v = entry[1];
    if (topSeen.get(k) !== false) {
      return { ok: false, error: { code: "validation_error", message: "invalid reschedule identity." } };
    }
    if (typeof v !== "object" || v === null || Array.isArray(v) === true) {
      return { ok: false, error: { code: "validation_error", message: "invalid reschedule identity." } };
    }
    topSeen.set(k, true);
    topList.push(k);
  }
  if (topSeen.get("before") !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid reschedule identity." } };
  }
  if (topSeen.get("after") !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid reschedule identity." } };
  }
  if (topList.length !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid reschedule identity." } };
  }
  const before = payload.before;
  const after = payload.after;
  if (checkEntry(before) === false) {
    return { ok: false, error: { code: "validation_error", message: "invalid reschedule identity." } };
  }
  if (checkEntry(after) === false) {
    return { ok: false, error: { code: "validation_error", message: "invalid reschedule identity." } };
  }
  const sameId = before.id === after.id;
  const samePract = before.practitionerId === after.practitionerId;
  const sameRef = before.patientRef === after.patientRef;
  const sameStatus = before.status === after.status;
  const sameCreated = before.createdAt === after.createdAt;
  const preserved = sameId === true && samePract === true && sameRef === true && sameStatus === true && sameCreated === true ? true : false;
  const timeChanged = before.startsAt !== after.startsAt || before.durationMinutes !== after.durationMinutes ? true : false;
  const beforeId = before.id.slice(0);
  const afterId = after.id.slice(0);
  return { ok: true, preserved: preserved, timeChanged: timeChanged, beforeId: beforeId, afterId: afterId };
}
function checkEntry(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value) === true) {
    return false;
  }
  const entries = Object.entries(value);
  if (entries.length !== 7) {
    return false;
  }
  const wanted = new Map();
  wanted.set("id", false);
  wanted.set("practitionerId", false);
  wanted.set("patientRef", false);
  wanted.set("startsAt", false);
  wanted.set("durationMinutes", false);
  wanted.set("status", false);
  wanted.set("createdAt", false);
  const seenKeys = [];
  for (const entry of entries) {
    const k = entry[0];
    if (wanted.get(k) !== false) {
      return false;
    }
    wanted.set(k, true);
    seenKeys.push(k);
  }
  if (seenKeys.length !== 7) {
    return false;
  }
  if (wanted.get("id") !== true) {
    return false;
  }
  if (wanted.get("practitionerId") !== true) {
    return false;
  }
  if (wanted.get("patientRef") !== true) {
    return false;
  }
  if (wanted.get("startsAt") !== true) {
    return false;
  }
  if (wanted.get("durationMinutes") !== true) {
    return false;
  }
  if (wanted.get("status") !== true) {
    return false;
  }
  if (wanted.get("createdAt") !== true) {
    return false;
  }
  if (isValidId(value.id) === false) {
    return false;
  }
  if (isValidPractitioner(value.practitionerId) === false) {
    return false;
  }
  if (isValidPatientRef(value.patientRef) === false) {
    return false;
  }
  if (isValidStartsAt(value.startsAt) === false) {
    return false;
  }
  if (isValidDuration(value.durationMinutes) === false) {
    return false;
  }
  if (value.status !== "scheduled") {
    return false;
  }
  if (isValidCreatedAt(value.createdAt) === false) {
    return false;
  }
  return true;
}
function isAllowedChar(ch) {
  if (ch === "-") {
    return true;
  }
  if (ch === "_") {
    return true;
  }
  if (ch >= "a" && ch <= "z") {
    return true;
  }
  if (ch >= "A" && ch <= "Z") {
    return true;
  }
  if (ch >= "0" && ch <= "9") {
    return true;
  }
  return false;
}
function isAllAllowed(text) {
  for (const ch of text) {
    if (isAllowedChar(ch) === false) {
      return false;
    }
  }
  return true;
}
function isAllDigits(text) {
  for (const ch of text) {
    if (ch < "0" || ch > "9") {
      return false;
    }
  }
  return true;
}
function isValidId(value) {
  if (typeof value !== "string") {
    return false;
  }
  if (value.length < 1 || value.length > 64) {
    return false;
  }
  if (isAllAllowed(value) === false) {
    return false;
  }
  return true;
}
function isValidPractitioner(value) {
  if (typeof value !== "string") {
    return false;
  }
  if (value.length < 6 || value.length > 64) {
    return false;
  }
  if (value.slice(0, 5) !== "demo-") {
    return false;
  }
  if (isAllAllowed(value) === false) {
    return false;
  }
  return true;
}
function isValidPatientRef(value) {
  if (typeof value !== "string") {
    return false;
  }
  if (value.length < 1 || value.length > 48) {
    return false;
  }
  if (isAllAllowed(value) === false) {
    return false;
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
  if (value < 15 || value > 120) {
    return false;
  }
  if (value % 15 !== 0) {
    return false;
  }
  return true;
}
function isValidStamp(value, isStart) {
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
  const yearNum = Number(yearStr);
  const monthNum = Number(monthStr);
  const dayNum = Number(dayStr);
  const hourNum = Number(hourStr);
  const minuteNum = Number(minuteStr);
  if (monthNum < 1 || monthNum > 12) {
    return false;
  }
  if (hourNum < 0 || hourNum > 23) {
    return false;
  }
  if (isStart === true) {
    const grid = new Map();
    grid.set("00", true);
    grid.set("15", true);
    grid.set("30", true);
    grid.set("45", true);
    if (grid.get(minuteStr) !== true) {
      return false;
    }
  } else {
    if (minuteNum < 0 || minuteNum > 59) {
      return false;
    }
  }
  const div400 = yearNum % 400 === 0;
  const div4 = yearNum % 4 === 0;
  const div100 = yearNum % 100 === 0;
  const isLeap = div400 === true ? true : (div4 === true && div100 === false ? true : false);
  const daysMap = new Map();
  daysMap.set(1, 31);
  daysMap.set(2, 28);
  daysMap.set(3, 31);
  daysMap.set(4, 30);
  daysMap.set(5, 31);
  daysMap.set(6, 30);
  daysMap.set(7, 31);
  daysMap.set(8, 31);
  daysMap.set(9, 30);
  daysMap.set(10, 31);
  daysMap.set(11, 30);
  daysMap.set(12, 31);
  const baseMax = daysMap.get(monthNum);
  const useLeap = monthNum === 2 && isLeap === true;
  const maxDay = useLeap === true ? 29 : baseMax;
  if (dayNum < 1 || dayNum > maxDay) {
    return false;
  }
  return true;
}
function isValidStartsAt(value) {
  return isValidStamp(value, true);
}
function isValidCreatedAt(value) {
  return isValidStamp(value, false);
}
