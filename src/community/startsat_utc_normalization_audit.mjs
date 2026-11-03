export function runFeature(payload) {
  const fail = [];
  if (payload === null) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (typeof payload !== "object") {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (Array.isArray(payload)) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  const entries = Object.entries(payload);
  if (entries.length !== 1) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  const keys = [];
  const vals = [];
  for (const entry of entries) {
    const k = entry[0];
    const v = entry[1];
    keys.push(k);
    vals.push(v);
  }
  const onlyKey = keys[0];
  if (onlyKey !== "startsAt") {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  const startsAt = vals[0];
  if (typeof startsAt !== "string") {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  const slen = startsAt.length;
  if (slen !== 20) {
    if (slen !== 25) {
      return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
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
  const gridMap = new Map();
  gridMap.set(0, 1);
  gridMap.set(15, 1);
  gridMap.set(30, 1);
  gridMap.set(45, 1);
  const monthLenMap = new Map();
  monthLenMap.set(1, 31);
  monthLenMap.set(2, 28);
  monthLenMap.set(3, 31);
  monthLenMap.set(4, 30);
  monthLenMap.set(5, 31);
  monthLenMap.set(6, 30);
  monthLenMap.set(7, 31);
  monthLenMap.set(8, 31);
  monthLenMap.set(9, 30);
  monthLenMap.set(10, 31);
  monthLenMap.set(11, 30);
  monthLenMap.set(12, 31);
  const charMap = new Map();
  charMap.set(0, "0");
  charMap.set(1, "1");
  charMap.set(2, "2");
  charMap.set(3, "3");
  charMap.set(4, "4");
  charMap.set(5, "5");
  charMap.set(6, "6");
  charMap.set(7, "7");
  charMap.set(8, "8");
  charMap.set(9, "9");
  const seen = [];
  const yD = [];
  const moD = [];
  const dD = [];
  const hD = [];
  const miD = [];
  const sD = [];
  const oHD = [];
  const oMD = [];
  const signStore = [];
  for (const ch of startsAt) {
    const pos = seen.length;
    if (pos === 4) {
      if (ch !== "-") {
        fail.push(1);
      }
    } else if (pos === 7) {
      if (ch !== "-") {
        fail.push(1);
      }
    } else if (pos === 10) {
      if (ch !== "T") {
        fail.push(1);
      }
    } else if (pos === 13) {
      if (ch !== ":") {
        fail.push(1);
      }
    } else if (pos === 16) {
      if (ch !== ":") {
        fail.push(1);
      }
    } else if (pos === 19) {
      if (slen === 20) {
        if (ch !== "Z") {
          fail.push(1);
        }
      } else {
        if (ch !== "+") {
          if (ch !== "-") {
            fail.push(1);
          } else {
            signStore.push(ch);
          }
        } else {
          signStore.push(ch);
        }
      }
    } else if (pos === 22) {
      if (slen === 20) {
        fail.push(1);
      } else {
        if (ch !== ":") {
          fail.push(1);
        }
      }
    } else {
      const dv = digitMap.get(ch);
      if (dv === undefined) {
        fail.push(1);
      } else {
        if (pos === 0) {
          yD.push(dv);
        } else if (pos === 1) {
          yD.push(dv);
        } else if (pos === 2) {
          yD.push(dv);
        } else if (pos === 3) {
          yD.push(dv);
        } else if (pos === 5) {
          moD.push(dv);
        } else if (pos === 6) {
          moD.push(dv);
        } else if (pos === 8) {
          dD.push(dv);
        } else if (pos === 9) {
          dD.push(dv);
        } else if (pos === 11) {
          hD.push(dv);
        } else if (pos === 12) {
          hD.push(dv);
        } else if (pos === 14) {
          miD.push(dv);
        } else if (pos === 15) {
          miD.push(dv);
        } else if (pos === 17) {
          sD.push(dv);
        } else if (pos === 18) {
          sD.push(dv);
        } else if (pos === 20) {
          oHD.push(dv);
        } else if (pos === 21) {
          oHD.push(dv);
        } else if (pos === 23) {
          oMD.push(dv);
        } else if (pos === 24) {
          oMD.push(dv);
        } else {
          fail.push(1);
        }
      }
    }
    seen.push(ch);
  }
  if (fail.length !== 0) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (yD.length !== 4) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (moD.length !== 2) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (dD.length !== 2) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (hD.length !== 2) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (miD.length !== 2) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (sD.length !== 2) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (slen === 20) {
    if (oHD.length !== 0) {
      return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
    }
    if (oMD.length !== 0) {
      return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
    }
    if (signStore.length !== 0) {
      return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
    }
  } else {
    if (oHD.length !== 2) {
      return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
    }
    if (oMD.length !== 2) {
      return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
    }
    if (signStore.length !== 1) {
      return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
    }
  }
  const year = yD[0] * 1000 + yD[1] * 100 + yD[2] * 10 + yD[3];
  const month = moD[0] * 10 + moD[1];
  const day = dD[0] * 10 + dD[1];
  const hour = hD[0] * 10 + hD[1];
  const minute = miD[0] * 10 + miD[1];
  const second = sD[0] * 10 + sD[1];
  const offHour = slen === 20 ? 0 : oHD[0] * 10 + oHD[1];
  const offMin = slen === 20 ? 0 : oMD[0] * 10 + oMD[1];
  const signIsNeg = slen === 20 ? false : signStore[0] === "-";
  if (month < 1) {
    fail.push(1);
  }
  if (month > 12) {
    fail.push(1);
  }
  if (hour > 23) {
    fail.push(1);
  }
  if (second !== 0) {
    fail.push(1);
  }
  if (gridMap.get(minute) === undefined) {
    fail.push(1);
  }
  if (offHour > 14) {
    fail.push(1);
  }
  if (gridMap.get(offMin) === undefined) {
    fail.push(1);
  }
  const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const febMax = isLeap ? 29 : 28;
  const mapMax = monthLenMap.get(month);
  const maxDay = month === 2 ? febMax : mapMax;
  if (maxDay === undefined) {
    fail.push(1);
  } else {
    if (day < 1) {
      fail.push(1);
    }
    if (day > maxDay) {
      fail.push(1);
    }
  }
  if (fail.length !== 0) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  const offPos = offHour * 60 + offMin;
  const offTotal = signIsNeg ? 0 - offPos : offPos;
  const wallTotal = hour * 60 + minute;
  const utcRaw = wallTotal - offTotal;
  const needBorrow = utcRaw < 0;
  const needCarry = utcRaw >= 1440;
  const utcTotal = needBorrow ? utcRaw + 1440 : (needCarry ? utcRaw - 1440 : utcRaw);
  const dayShift = needBorrow ? 0 - 1 : (needCarry ? 1 : 0);
  const utcRem = utcTotal % 60;
  const utcHour = (utcTotal - utcRem) / 60;
  const utcMinute = utcRem;
  const prevMonthRaw = month - 1;
  const prevMonth = prevMonthRaw < 1 ? 12 : prevMonthRaw;
  const prevYear = month === 1 ? year - 1 : year;
  const isPrevLeap = prevYear % 4 === 0 && (prevYear % 100 !== 0 || prevYear % 400 === 0);
  const febPrevMax = isPrevLeap ? 29 : 28;
  const mapPrevMax = monthLenMap.get(prevMonth);
  const prevMax = prevMonth === 2 ? febPrevMax : mapPrevMax;
  const nextMonthRaw = month + 1;
  const nextMonth = nextMonthRaw > 12 ? 1 : nextMonthRaw;
  const nextYear = month === 12 ? year + 1 : year;
  const borrowDayVal = day > 1 ? day - 1 : prevMax;
  const borrowMonthVal = day > 1 ? month : prevMonth;
  const borrowYearVal = day > 1 ? year : prevYear;
  const carryDayVal = day < maxDay ? day + 1 : 1;
  const carryMonthVal = day < maxDay ? month : nextMonth;
  const carryYearVal = day < maxDay ? year : nextYear;
  const utcYear = dayShift === 0 ? year : (dayShift < 0 ? borrowYearVal : carryYearVal);
  const utcMonth = dayShift === 0 ? month : (dayShift < 0 ? borrowMonthVal : carryMonthVal);
  const utcDay = dayShift === 0 ? day : (dayShift < 0 ? borrowDayVal : carryDayVal);
  if (utcYear < 0) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (utcYear > 9999) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  if (gridMap.get(utcMinute) === undefined) {
    return { error: { code: "validation_error", message: "invalid startsAt." }, ok: false };
  }
  const yRem1000 = utcYear % 1000;
  const yTh = (utcYear - yRem1000) / 1000;
  const yRem100 = yRem1000 % 100;
  const yHu = (yRem1000 - yRem100) / 100;
  const yRem10 = yRem100 % 10;
  const yTe = (yRem100 - yRem10) / 10;
  const yOn = yRem10;
  const moRem = utcMonth % 10;
  const moTe = (utcMonth - moRem) / 10;
  const moOn = moRem;
  const dRem = utcDay % 10;
  const dTe = (utcDay - dRem) / 10;
  const dOn = dRem;
  const hRem = utcHour % 10;
  const hTe = (utcHour - hRem) / 10;
  const hOn = hRem;
  const miRem = utcMinute % 10;
  const miTe = (utcMinute - miRem) / 10;
  const miOn = miRem;
  const yThCh = charMap.get(yTh);
  const yHuCh = charMap.get(yHu);
  const yTeCh = charMap.get(yTe);
  const yOnCh = charMap.get(yOn);
  const moTeCh = charMap.get(moTe);
  const moOnCh = charMap.get(moOn);
  const dTeCh = charMap.get(dTe);
  const dOnCh = charMap.get(dOn);
  const hTeCh = charMap.get(hTe);
  const hOnCh = charMap.get(hOn);
  const miTeCh = charMap.get(miTe);
  const miOnCh = charMap.get(miOn);
  const utc = yThCh + yHuCh + yTeCh + yOnCh + "-" + moTeCh + moOnCh + "-" + dTeCh + dOnCh + "T" + hTeCh + hOnCh + ":" + miTeCh + miOnCh + ":00.000Z";
  return { ok: true, utc: utc };
}
