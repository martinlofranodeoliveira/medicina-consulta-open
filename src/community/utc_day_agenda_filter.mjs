function isDigitCode(c) {
  if (c >= 48 && c <= 57) {
    return true;
  }
  return false;
}
function isLeapYearNum(y) {
  if (y % 400 === 0) {
    return true;
  }
  if (y % 100 === 0) {
    return false;
  }
  if (y % 4 === 0) {
    return true;
  }
  return false;
}
function isDayNumOk(y, m, d) {
  if (m < 1) {
    return false;
  }
  if (m > 12) {
    return false;
  }
  if (d < 1) {
    return false;
  }
  if (m === 1 || m === 3 || m === 5 || m === 7 || m === 8 || m === 10 || m === 12) {
    if (d > 31) {
      return false;
    }
    return true;
  }
  if (m === 4 || m === 6 || m === 9 || m === 11) {
    if (d > 30) {
      return false;
    }
    return true;
  }
  const leap = isLeapYearNum(y);
  if (leap === true) {
    if (d > 29) {
      return false;
    }
    return true;
  }
  if (d > 28) {
    return false;
  }
  return true;
}
function isDayStr(s) {
  if (typeof s !== "string") {
    return false;
  }
  if (s.length !== 10) {
    return false;
  }
  if (s.charCodeAt(4) !== 45) {
    return false;
  }
  if (s.charCodeAt(7) !== 45) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(0)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(1)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(2)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(3)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(5)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(6)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(8)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(9)) === false) {
    return false;
  }
  const y0 = s.charCodeAt(0) - 48;
  const y1 = s.charCodeAt(1) - 48;
  const y2 = s.charCodeAt(2) - 48;
  const y3 = s.charCodeAt(3) - 48;
  const m0 = s.charCodeAt(5) - 48;
  const m1 = s.charCodeAt(6) - 48;
  const d0 = s.charCodeAt(8) - 48;
  const d1 = s.charCodeAt(9) - 48;
  const y = y0 * 1000 + y1 * 100 + y2 * 10 + y3;
  const m = m0 * 10 + m1;
  const d = d0 * 10 + d1;
  if (isDayNumOk(y, m, d) === false) {
    return false;
  }
  return true;
}
function isPractStr(s) {
  if (typeof s !== "string") {
    return false;
  }
  if (s.length < 6) {
    return false;
  }
  if (s.length > 64) {
    return false;
  }
  if (s.charCodeAt(0) !== 100) {
    return false;
  }
  if (s.charCodeAt(1) !== 101) {
    return false;
  }
  if (s.charCodeAt(2) !== 109) {
    return false;
  }
  if (s.charCodeAt(3) !== 111) {
    return false;
  }
  if (s.charCodeAt(4) !== 45) {
    return false;
  }
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    const okD = c >= 48 && c <= 57;
    const okU = c >= 65 && c <= 90;
    const okL = c >= 97 && c <= 122;
    const okH = c === 45;
    const okS = c === 95;
    if (okD === false && okU === false && okL === false && okH === false && okS === false) {
      return false;
    }
  }
  return true;
}
function isIdStr(s) {
  if (typeof s !== "string") {
    return false;
  }
  if (s.length < 1) {
    return false;
  }
  if (s.length > 64) {
    return false;
  }
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    const okD = c >= 48 && c <= 57;
    const okU = c >= 65 && c <= 90;
    const okL = c >= 97 && c <= 122;
    const okH = c === 45;
    const okS = c === 95;
    if (okD === false && okU === false && okL === false && okH === false && okS === false) {
      return false;
    }
  }
  return true;
}
function isStampStr(s) {
  if (typeof s !== "string") {
    return false;
  }
  if (s.length !== 24) {
    return false;
  }
  if (s.charCodeAt(4) !== 45) {
    return false;
  }
  if (s.charCodeAt(7) !== 45) {
    return false;
  }
  if (s.charCodeAt(10) !== 84) {
    return false;
  }
  if (s.charCodeAt(13) !== 58) {
    return false;
  }
  if (s.charCodeAt(16) !== 58) {
    return false;
  }
  if (s.charCodeAt(19) !== 46) {
    return false;
  }
  if (s.charCodeAt(23) !== 90) {
    return false;
  }
  if (s.charCodeAt(17) !== 48) {
    return false;
  }
  if (s.charCodeAt(18) !== 48) {
    return false;
  }
  if (s.charCodeAt(20) !== 48) {
    return false;
  }
  if (s.charCodeAt(21) !== 48) {
    return false;
  }
  if (s.charCodeAt(22) !== 48) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(0)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(1)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(2)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(3)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(5)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(6)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(8)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(9)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(11)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(12)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(14)) === false) {
    return false;
  }
  if (isDigitCode(s.charCodeAt(15)) === false) {
    return false;
  }
  const y0 = s.charCodeAt(0) - 48;
  const y1 = s.charCodeAt(1) - 48;
  const y2 = s.charCodeAt(2) - 48;
  const y3 = s.charCodeAt(3) - 48;
  const m0 = s.charCodeAt(5) - 48;
  const m1 = s.charCodeAt(6) - 48;
  const d0 = s.charCodeAt(8) - 48;
  const d1 = s.charCodeAt(9) - 48;
  const h0 = s.charCodeAt(11) - 48;
  const h1 = s.charCodeAt(12) - 48;
  const n0 = s.charCodeAt(14) - 48;
  const n1 = s.charCodeAt(15) - 48;
  const y = y0 * 1000 + y1 * 100 + y2 * 10 + y3;
  const m = m0 * 10 + m1;
  const d = d0 * 10 + d1;
  const h = h0 * 10 + h1;
  const n = n0 * 10 + n1;
  if (isDayNumOk(y, m, d) === false) {
    return false;
  }
  if (h < 0) {
    return false;
  }
  if (h > 23) {
    return false;
  }
  if (n === 0 || n === 15 || n === 30 || n === 45) {
    return true;
  }
  return false;
}
export function runFeature(payload) {
  if (payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
  }
  if (typeof payload !== "object") {
    return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
  }
  if (Array.isArray(payload) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
  }
  const seen = new Map();
  for (const pair of Object.entries(payload)) {
    const k = pair[0];
    if (k === "date" || k === "practitionerId" || k === "appointments") {
      seen.set(k, true);
    } else {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
  }
  if (seen.get("date") !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
  }
  if (seen.get("appointments") !== true) {
    return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
  }
  const dayVal = payload.date;
  const listVal = payload.appointments;
  let hasFilter = false;
  let filterVal = null;
  if (seen.get("practitionerId") === true) {
    hasFilter = true;
    filterVal = payload.practitionerId;
    if (isPractStr(filterVal) === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
  }
  if (isDayStr(dayVal) === false) {
    return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
  }
  if (Array.isArray(listVal) === false) {
    return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
  }
  if (listVal.length > 200) {
    return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
  }
  for (const item of listVal) {
    if (item === null) {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
    if (typeof item !== "object") {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
    if (Array.isArray(item) === true) {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
    const fseen = new Map();
    for (const pair of Object.entries(item)) {
      const k = pair[0];
      if (k === "id" || k === "practitionerId" || k === "startsAt") {
        fseen.set(k, true);
      } else {
        return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
      }
    }
    if (fseen.get("id") !== true) {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
    if (fseen.get("practitionerId") !== true) {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
    if (fseen.get("startsAt") !== true) {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
    if (isIdStr(item.id) === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
    if (isPractStr(item.practitionerId) === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
    if (isStampStr(item.startsAt) === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid day agenda filter." } };
    }
  }
  const kept = [];
  for (const item of listVal) {
    const stamp = item.startsAt;
    let same = true;
    if (stamp.charCodeAt(0) !== dayVal.charCodeAt(0)) {
      same = false;
    }
    if (stamp.charCodeAt(1) !== dayVal.charCodeAt(1)) {
      same = false;
    }
    if (stamp.charCodeAt(2) !== dayVal.charCodeAt(2)) {
      same = false;
    }
    if (stamp.charCodeAt(3) !== dayVal.charCodeAt(3)) {
      same = false;
    }
    if (stamp.charCodeAt(4) !== dayVal.charCodeAt(4)) {
      same = false;
    }
    if (stamp.charCodeAt(5) !== dayVal.charCodeAt(5)) {
      same = false;
    }
    if (stamp.charCodeAt(6) !== dayVal.charCodeAt(6)) {
      same = false;
    }
    if (stamp.charCodeAt(7) !== dayVal.charCodeAt(7)) {
      same = false;
    }
    if (stamp.charCodeAt(8) !== dayVal.charCodeAt(8)) {
      same = false;
    }
    if (stamp.charCodeAt(9) !== dayVal.charCodeAt(9)) {
      same = false;
    }
    if (same === true) {
      if (hasFilter === true) {
        if (item.practitionerId !== filterVal) {
          same = false;
        }
      }
    }
    if (same === true) {
      const copy = { id: item.id, practitionerId: item.practitionerId, startsAt: item.startsAt };
      kept.push(copy);
    }
  }
  let remaining = kept;
  const ordered = [];
  while (remaining.length !== 0) {
    let best = null;
    for (const cand of remaining) {
      if (best === null) {
        best = cand;
      } else {
        if (cand.startsAt < best.startsAt) {
          best = cand;
        } else {
          if (cand.startsAt === best.startsAt) {
            if (cand.id < best.id) {
              best = cand;
            }
          }
        }
      }
    }
    ordered.push(best);
    const nxt = [];
    let skipped = false;
    for (const cand of remaining) {
      if (skipped === false && cand === best) {
        skipped = true;
      } else {
        nxt.push(cand);
      }
    }
    remaining = nxt;
  }
  return { ok: true, date: dayVal, count: ordered.length, appointments: ordered };
}
