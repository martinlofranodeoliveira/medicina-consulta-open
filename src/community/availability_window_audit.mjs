export function runFeature(payload) {
  function isDigitChar(ch) {
    if (ch < "0") {
      return false;
    }
    if (ch > "9") {
      return false;
    }
    return true;
  }
  function isValidStamp(value) {
    if (typeof value !== "string") {
      return false;
    }
    if (value.length !== 24) {
      return false;
    }
    if (value[4] !== "-") {
      return false;
    }
    if (value[7] !== "-") {
      return false;
    }
    if (value[10] !== "T") {
      return false;
    }
    if (value[13] !== ":") {
      return false;
    }
    if (value[16] !== ":") {
      return false;
    }
    if (value[19] !== ".") {
      return false;
    }
    if (value[23] !== "Z") {
      return false;
    }
    if (value[17] !== "0") {
      return false;
    }
    if (value[18] !== "0") {
      return false;
    }
    if (value[20] !== "0") {
      return false;
    }
    if (value[21] !== "0") {
      return false;
    }
    if (value[22] !== "0") {
      return false;
    }
    if (isDigitChar(value[0]) === false) {
      return false;
    }
    if (isDigitChar(value[1]) === false) {
      return false;
    }
    if (isDigitChar(value[2]) === false) {
      return false;
    }
    if (isDigitChar(value[3]) === false) {
      return false;
    }
    if (isDigitChar(value[5]) === false) {
      return false;
    }
    if (isDigitChar(value[6]) === false) {
      return false;
    }
    if (isDigitChar(value[8]) === false) {
      return false;
    }
    if (isDigitChar(value[9]) === false) {
      return false;
    }
    if (isDigitChar(value[11]) === false) {
      return false;
    }
    if (isDigitChar(value[12]) === false) {
      return false;
    }
    if (isDigitChar(value[14]) === false) {
      return false;
    }
    if (isDigitChar(value[15]) === false) {
      return false;
    }
    const yearText = value[0] + value[1] + value[2] + value[3];
    const monthText = value[5] + value[6];
    const dayText = value[8] + value[9];
    const hourText = value[11] + value[12];
    const minuteText = value[14] + value[15];
    const yearNum = Number(yearText);
    const monthNum = Number(monthText);
    const dayNum = Number(dayText);
    const hourNum = Number(hourText);
    const minuteNum = Number(minuteText);
    if (monthNum < 1) {
      return false;
    }
    if (monthNum > 12) {
      return false;
    }
    if (hourNum < 0) {
      return false;
    }
    if (hourNum > 23) {
      return false;
    }
    if (minuteNum === 0) {
    } else {
      if (minuteNum === 15) {
      } else {
        if (minuteNum === 30) {
        } else {
          if (minuteNum === 45) {
          } else {
            return false;
          }
        }
      }
    }
    if (dayNum < 1) {
      return false;
    }
    const monthDays = new Map();
    monthDays.set(1, 31);
    monthDays.set(3, 31);
    monthDays.set(4, 30);
    monthDays.set(5, 31);
    monthDays.set(6, 30);
    monthDays.set(7, 31);
    monthDays.set(8, 31);
    monthDays.set(9, 30);
    monthDays.set(10, 31);
    monthDays.set(11, 30);
    monthDays.set(12, 31);
    if (monthNum === 2) {
      const div400 = yearNum % 400 === 0;
      const div100 = yearNum % 100 === 0;
      const div4 = yearNum % 4 === 0;
      if (div400) {
        if (dayNum > 29) {
          return false;
        }
      } else {
        if (div4) {
          if (!div100) {
            if (dayNum > 29) {
              return false;
            }
          } else {
            if (dayNum > 28) {
              return false;
            }
          }
        } else {
          if (dayNum > 28) {
            return false;
          }
        }
      }
    } else {
      const maxDay = monthDays.get(monthNum);
      if (dayNum > maxDay) {
        return false;
      }
    }
    return true;
  }
  function invalid() {
    return { ok: false, error: { code: "validation_error", message: "invalid availability window." } };
  }
  if (payload === null) {
    return invalid();
  }
  if (typeof payload !== "object") {
    return invalid();
  }
  if (Array.isArray(payload)) {
    return invalid();
  }
  const topEntries = Object.entries(payload);
  if (topEntries.length !== 3) {
    return invalid();
  }
  const allowed = new Map();
  allowed.set("windowStart", true);
  allowed.set("windowEnd", true);
  allowed.set("durationMinutes", true);
  const seen = new Map();
  const names = [];
  for (const entry of Object.entries(payload)) {
    const keyName = entry[0];
    const keyValue = entry[1];
    if (keyValue === undefined) {
      if (allowed.get(keyName) !== true) {
        return invalid();
      }
    } else {
      if (allowed.get(keyName) !== true) {
        return invalid();
      }
    }
    if (seen.get(keyName) === true) {
      return invalid();
    }
    seen.set(keyName, true);
    names.push(keyName);
  }
  for (const name of names) {
    if (allowed.get(name) !== true) {
      return invalid();
    }
  }
  if (seen.get("windowStart") !== true) {
    return invalid();
  }
  if (seen.get("windowEnd") !== true) {
    return invalid();
  }
  if (seen.get("durationMinutes") !== true) {
    return invalid();
  }
  const windowStart = payload.windowStart;
  const windowEnd = payload.windowEnd;
  const durationMinutes = payload.durationMinutes;
  if (isValidStamp(windowStart) === false) {
    return invalid();
  }
  if (isValidStamp(windowEnd) === false) {
    return invalid();
  }
  if (typeof durationMinutes !== "number") {
    return invalid();
  }
  if (Number.isInteger(durationMinutes) === false) {
    return invalid();
  }
  if (durationMinutes < 15) {
    return invalid();
  }
  if (durationMinutes > 120) {
    return invalid();
  }
  if (durationMinutes % 15 !== 0) {
    return invalid();
  }
  if (windowEnd > windowStart) {
  } else {
    return invalid();
  }
  const startCopy = windowStart + "";
  const endCopy = windowEnd + "";
  return { ok: true, windowStart: startCopy, windowEnd: endCopy, durationMinutes: durationMinutes };
}
