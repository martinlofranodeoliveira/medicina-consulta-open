function isLeapYear(yearVal) {
  if (yearVal % 400 === 0) return true;
  if (yearVal % 100 === 0) return false;
  if (yearVal % 4 === 0) return true;
  return false;
}
function daysInMonth(yearVal, monthVal) {
  if (monthVal === 1) return 31;
  if (monthVal === 2) {
    if (isLeapYear(yearVal) === true) return 29;
    return 28;
  }
  if (monthVal === 3) return 31;
  if (monthVal === 4) return 30;
  if (monthVal === 5) return 31;
  if (monthVal === 6) return 30;
  if (monthVal === 7) return 31;
  if (monthVal === 8) return 31;
  if (monthVal === 9) return 30;
  if (monthVal === 10) return 31;
  if (monthVal === 11) return 30;
  if (monthVal === 12) return 31;
  return 0;
}
function isAllDigits(text) {
  if (typeof text !== "string") return false;
  if (text.length === 0) return false;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 48) return false;
    if (code > 57) return false;
  }
  return true;
}
function parse2(text) {
  const a = text.charCodeAt(0);
  const b = text.charCodeAt(1);
  const d0 = a - 48;
  const d1 = b - 48;
  const val = d0 * 10 + d1;
  return val;
}
function parse4(text) {
  const a = text.charCodeAt(0);
  const b = text.charCodeAt(1);
  const c = text.charCodeAt(2);
  const d = text.charCodeAt(3);
  const d0 = a - 48;
  const d1 = b - 48;
  const d2 = c - 48;
  const d3 = d - 48;
  const v01 = d0 * 10 + d1;
  const v012 = v01 * 10 + d2;
  const val = v012 * 10 + d3;
  return val;
}
function pad2(numVal) {
  const text = "" + numVal;
  if (text.length === 2) return text;
  if (text.length === 1) return "0" + text;
  return text;
}
function pad4(numVal) {
  const text = "" + numVal;
  if (text.length === 4) return text;
  if (text.length === 3) return "0" + text;
  if (text.length === 2) return "00" + text;
  if (text.length === 1) return "000" + text;
  return text;
}
function isValidPractitionerId(value) {
  if (typeof value !== "string") return false;
  const len = value.length;
  if (len < 6) return false;
  if (len > 64) return false;
  if (value.slice(0, 5) !== "demo-") return false;
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code === 45) continue;
    if (code === 95) continue;
    if (code >= 48 && code <= 57) continue;
    if (code >= 65 && code <= 90) continue;
    if (code >= 97 && code <= 122) continue;
    return false;
  }
  return true;
}
function isValidPatientRef(value) {
  if (typeof value !== "string") return false;
  const len = value.length;
  if (len < 1) return false;
  if (len > 48) return false;
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code === 45) continue;
    if (code === 95) continue;
    if (code >= 48 && code <= 57) continue;
    if (code >= 65 && code <= 90) continue;
    if (code >= 97 && code <= 122) continue;
    return false;
  }
  return true;
}
function isValidDurationMinutes(value) {
  if (typeof value !== "number") return false;
  if (value % 1 !== 0) return false;
  if (value < 15) return false;
  if (value > 120) return false;
  if (value % 15 !== 0) return false;
  return true;
}
function invalidDraft() {
  return { ok: false, error: { code: "validation_error", message: "invalid appointment draft." } };
}
export function runFeature(payload) {
  if (payload === null) {
    return invalidDraft();
  }
  if (typeof payload !== "object") {
    return invalidDraft();
  }
  if (Array.isArray(payload) === true) {
    return invalidDraft();
  }
  const seen = new Map();
  const stored = new Map();
  const names = [];
  for (const [keyName, valueItem] of Object.entries(payload)) {
    names.push(keyName);
    if (keyName === "practitionerId") {
      if (seen.get(keyName) === 1) {
        return invalidDraft();
      }
      seen.set(keyName, 1);
      stored.set(keyName, valueItem);
    } else if (keyName === "patientRef") {
      if (seen.get(keyName) === 1) {
        return invalidDraft();
      }
      seen.set(keyName, 1);
      stored.set(keyName, valueItem);
    } else if (keyName === "startsAt") {
      if (seen.get(keyName) === 1) {
        return invalidDraft();
      }
      seen.set(keyName, 1);
      stored.set(keyName, valueItem);
    } else if (keyName === "durationMinutes") {
      if (seen.get(keyName) === 1) {
        return invalidDraft();
      }
      seen.set(keyName, 1);
      stored.set(keyName, valueItem);
    } else {
      return invalidDraft();
    }
  }
  if (names.length !== 4) {
    return invalidDraft();
  }
  if (seen.get("practitionerId") !== 1) {
    return invalidDraft();
  }
  if (seen.get("patientRef") !== 1) {
    return invalidDraft();
  }
  if (seen.get("startsAt") !== 1) {
    return invalidDraft();
  }
  if (seen.get("durationMinutes") !== 1) {
    return invalidDraft();
  }
  const practitionerId = stored.get("practitionerId");
  const patientRef = stored.get("patientRef");
  const startsAt = stored.get("startsAt");
  const durationMinutes = stored.get("durationMinutes");
  if (isValidPractitionerId(practitionerId) === false) {
    return invalidDraft();
  }
  if (isValidPatientRef(patientRef) === false) {
    return invalidDraft();
  }
  if (isValidDurationMinutes(durationMinutes) === false) {
    return invalidDraft();
  }
  if (typeof startsAt !== "string") {
    return invalidDraft();
  }
  const sLen = startsAt.length;
  if (sLen !== 20 && sLen !== 25) {
    return invalidDraft();
  }
  if (startsAt.slice(4, 5) !== "-") {
    return invalidDraft();
  }
  if (startsAt.slice(7, 8) !== "-") {
    return invalidDraft();
  }
  if (startsAt.slice(10, 11) !== "T") {
    return invalidDraft();
  }
  if (startsAt.slice(13, 14) !== ":") {
    return invalidDraft();
  }
  if (startsAt.slice(16, 17) !== ":") {
    return invalidDraft();
  }
  const yearText = startsAt.slice(0, 4);
  const monthText = startsAt.slice(5, 7);
  const dayText = startsAt.slice(8, 10);
  const hourText = startsAt.slice(11, 13);
  const minuteText = startsAt.slice(14, 16);
  const secondText = startsAt.slice(17, 19);
  if (isAllDigits(yearText) === false) {
    return invalidDraft();
  }
  if (isAllDigits(monthText) === false) {
    return invalidDraft();
  }
  if (isAllDigits(dayText) === false) {
    return invalidDraft();
  }
  if (isAllDigits(hourText) === false) {
    return invalidDraft();
  }
  if (isAllDigits(minuteText) === false) {
    return invalidDraft();
  }
  if (isAllDigits(secondText) === false) {
    return invalidDraft();
  }
  if (secondText !== "00") {
    return invalidDraft();
  }
  const yearVal = parse4(yearText);
  const monthVal = parse2(monthText);
  const dayVal = parse2(dayText);
  const hourVal = parse2(hourText);
  const minuteVal = parse2(minuteText);
  const secondVal = parse2(secondText);
  if (monthVal < 1) {
    return invalidDraft();
  }
  if (monthVal > 12) {
    return invalidDraft();
  }
  if (hourVal > 23) {
    return invalidDraft();
  }
  if (secondVal !== 0) {
    return invalidDraft();
  }
  if (minuteVal !== 0 && minuteVal !== 15 && minuteVal !== 30 && minuteVal !== 45) {
    return invalidDraft();
  }
  const dim = daysInMonth(yearVal, monthVal);
  if (dayVal < 1) {
    return invalidDraft();
  }
  if (dayVal > dim) {
    return invalidDraft();
  }
  const isZulu = sLen === 20;
  if (isZulu === true) {
    if (startsAt.slice(19, 20) !== "Z") {
      return invalidDraft();
    }
  }
  const signText = isZulu === true ? "Z" : startsAt.slice(19, 20);
  const offHourText = isZulu === true ? "00" : startsAt.slice(20, 22);
  const offMinuteText = isZulu === true ? "00" : startsAt.slice(23, 25);
  const colonText = isZulu === true ? ":" : startsAt.slice(22, 23);
  if (isZulu === false) {
    if (signText !== "+" && signText !== "-") {
      return invalidDraft();
    }
    if (colonText !== ":") {
      return invalidDraft();
    }
    if (isAllDigits(offHourText) === false) {
      return invalidDraft();
    }
    if (isAllDigits(offMinuteText) === false) {
      return invalidDraft();
    }
  }
  const offHourVal = isZulu === true ? 0 : parse2(offHourText);
  const offMinuteVal = isZulu === true ? 0 : parse2(offMinuteText);
  if (isZulu === false) {
    if (offHourVal > 14) {
      return invalidDraft();
    }
    if (offMinuteVal !== 0 && offMinuteVal !== 15 && offMinuteVal !== 30 && offMinuteVal !== 45) {
      return invalidDraft();
    }
    if (offHourVal === 14 && offMinuteVal !== 0) {
      return invalidDraft();
    }
  }
  const offTotal = offHourVal * 60 + offMinuteVal;
  const offsetMinutes = isZulu === true ? 0 : (signText === "+" ? offTotal : 0 - offTotal);
  const localTotal = hourVal * 60 + minuteVal;
  const utcTotal = localTotal - offsetMinutes;
  const dayShift = utcTotal < 0 ? -1 : (utcTotal >= 1440 ? 1 : 0);
  const rem = utcTotal < 0 ? utcTotal + 1440 : (utcTotal >= 1440 ? utcTotal - 1440 : utcTotal);
  const utcMinuteVal = rem % 60;
  const utcHourVal = (rem - utcMinuteVal) / 60;
  if (utcMinuteVal !== 0 && utcMinuteVal !== 15 && utcMinuteVal !== 30 && utcMinuteVal !== 45) {
    return invalidDraft();
  }
  const curDim = daysInMonth(yearVal, monthVal);
  const prevMonth = monthVal === 1 ? 12 : monthVal - 1;
  const prevYear = monthVal === 1 ? yearVal - 1 : yearVal;
  const prevDim = daysInMonth(prevYear, prevMonth);
  const utcYear = dayShift === 1 ? (dayVal < curDim ? yearVal : (monthVal === 12 ? yearVal + 1 : yearVal)) : (dayShift === -1 ? (dayVal > 1 ? yearVal : yearVal - 1) : yearVal);
  const utcMonth = dayShift === 1 ? (dayVal < curDim ? monthVal : (monthVal === 12 ? 1 : monthVal + 1)) : (dayShift === -1 ? (dayVal > 1 ? monthVal : prevMonth) : monthVal);
  const utcDay = dayShift === 1 ? (dayVal < curDim ? dayVal + 1 : 1) : (dayShift === -1 ? (dayVal > 1 ? dayVal - 1 : prevDim) : dayVal);
  if (utcYear < 0) {
    return invalidDraft();
  }
  if (utcYear > 9999) {
    return invalidDraft();
  }
  const startsAtUtc = pad4(utcYear) + "-" + pad2(utcMonth) + "-" + pad2(utcDay) + "T" + pad2(utcHourVal) + ":" + pad2(utcMinuteVal) + ":00.000Z";
  return { ok: true, practitionerId: practitionerId, patientRef: patientRef, startsAt: startsAt, startsAtUtc: startsAtUtc, durationMinutes: durationMinutes };
}
