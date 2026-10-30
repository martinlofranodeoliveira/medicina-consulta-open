export function runFeature(payload) {
  function isValidInstant(value) {
    if (typeof value !== "string") {
      return false;
    }
    if (value.length !== 24) {
      return false;
    }
    const digits = new Map();
    digits.set("0", 0);
    digits.set("1", 1);
    digits.set("2", 2);
    digits.set("3", 3);
    digits.set("4", 4);
    digits.set("5", 5);
    digits.set("6", 6);
    digits.set("7", 7);
    digits.set("8", 8);
    digits.set("9", 9);
    const nums = new Map();
    nums.set("year", 0);
    nums.set("month", 0);
    nums.set("day", 0);
    nums.set("hour", 0);
    nums.set("minute", 0);
    const posBox = new Map();
    posBox.set("pos", 0);
    for (const ch of value) {
      const cur = posBox.get("pos");
      if (cur === 4) {
        if (ch !== "-") {
          return false;
        }
      } else if (cur === 7) {
        if (ch !== "-") {
          return false;
        }
      } else if (cur === 10) {
        if (ch !== "T") {
          return false;
        }
      } else if (cur === 13) {
        if (ch !== ":") {
          return false;
        }
      } else if (cur === 16) {
        if (ch !== ":") {
          return false;
        }
      } else if (cur === 19) {
        if (ch !== ".") {
          return false;
        }
      } else if (cur === 23) {
        if (ch !== "Z") {
          return false;
        }
      } else if (cur === 17) {
        if (ch !== "0") {
          return false;
        }
      } else if (cur === 18) {
        if (ch !== "0") {
          return false;
        }
      } else if (cur === 20) {
        if (ch !== "0") {
          return false;
        }
      } else if (cur === 21) {
        if (ch !== "0") {
          return false;
        }
      } else if (cur === 22) {
        if (ch !== "0") {
          return false;
        }
      } else {
        const d = digits.get(ch);
        if (typeof d !== "number") {
          return false;
        }
        if (cur === 0) {
          nums.set("year", d);
        } else if (cur === 1) {
          const prev = nums.get("year");
          nums.set("year", prev * 10 + d);
        } else if (cur === 2) {
          const prev = nums.get("year");
          nums.set("year", prev * 10 + d);
        } else if (cur === 3) {
          const prev = nums.get("year");
          nums.set("year", prev * 10 + d);
        } else if (cur === 5) {
          nums.set("month", d);
        } else if (cur === 6) {
          const prev = nums.get("month");
          nums.set("month", prev * 10 + d);
        } else if (cur === 8) {
          nums.set("day", d);
        } else if (cur === 9) {
          const prev = nums.get("day");
          nums.set("day", prev * 10 + d);
        } else if (cur === 11) {
          nums.set("hour", d);
        } else if (cur === 12) {
          const prev = nums.get("hour");
          nums.set("hour", prev * 10 + d);
        } else if (cur === 14) {
          nums.set("minute", d);
        } else if (cur === 15) {
          const prev = nums.get("minute");
          nums.set("minute", prev * 10 + d);
        } else {
          return false;
        }
      }
      posBox.set("pos", cur + 1);
    }
    const month = nums.get("month");
    const day = nums.get("day");
    const hour = nums.get("hour");
    const minute = nums.get("minute");
    const year = nums.get("year");
    if (month < 1) {
      return false;
    }
    if (month > 12) {
      return false;
    }
    if (hour > 23) {
      return false;
    }
    if (minute === 0) {
    } else if (minute === 15) {
    } else if (minute === 30) {
    } else if (minute === 45) {
    } else {
      return false;
    }
    const mod400 = year % 400;
    const mod100 = year % 100;
    const mod4 = year % 4;
    const leap400 = mod400 === 0;
    const leap4 = mod4 === 0;
    const cent = mod100 === 0;
    const isLeap = leap400 === true || (leap4 === true && cent === false);
    if (month === 2) {
      const febMap = new Map();
      febMap.set(true, 29);
      febMap.set(false, 28);
      const febMax = febMap.get(isLeap);
      if (day < 1) {
        return false;
      }
      if (day > febMax) {
        return false;
      }
      return true;
    }
    if (month === 4 || month === 6 || month === 9 || month === 11) {
      if (day < 1) {
        return false;
      }
      if (day > 30) {
        return false;
      }
      return true;
    }
    if (day < 1) {
      return false;
    }
    if (day > 31) {
      return false;
    }
    return true;
  }
  if (payload === null) {
    return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
  }
  if (typeof payload !== "object") {
    return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
  }
  if (Array.isArray(payload)) {
    return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
  }
  const entries = Object.entries(payload);
  if (entries.length !== 2) {
    return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
  }
  const values = new Map();
  values.set("hasNow", false);
  values.set("hasStarts", false);
  values.set("nowUtc", "");
  values.set("startsAt", "");
  const seen = [];
  for (const entry of entries) {
    const k = entry[0];
    const v = entry[1];
    seen.push(k);
    if (k === "nowUtc") {
      if (values.get("hasNow") === true) {
        return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
      }
      values.set("hasNow", true);
      values.set("nowUtc", v);
    } else if (k === "startsAt") {
      if (values.get("hasStarts") === true) {
        return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
      }
      values.set("hasStarts", true);
      values.set("startsAt", v);
    } else {
      return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
    }
  }
  if (values.get("hasNow") !== true) {
    return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
  }
  if (values.get("hasStarts") !== true) {
    return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
  }
  const nowUtc = values.get("nowUtc");
  const startsAt = values.get("startsAt");
  if (isValidInstant(nowUtc) === false) {
    return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
  }
  if (isValidInstant(startsAt) === false) {
    return { error: { code: "validation_error", message: "invalid past allowance claim." }, ok: false };
  }
  if (startsAt < nowUtc) {
    return { isPast: true, nowUtc: nowUtc, ok: true, startsAt: startsAt };
  }
  return { isPast: false, nowUtc: nowUtc, ok: true, startsAt: startsAt };
}
