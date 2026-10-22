export function runFeature(payload) {
  const invalid = {
    ok: false,
    error: {
      code: "validation_error",
      message: "invalid icalendar export."
    }
  };
  if (typeof payload !== "object") {
    return invalid;
  }
  if (payload === null) {
    return invalid;
  }
  if (Array.isArray(payload) === true) {
    return invalid;
  }
  let topCount = 0;
  let foundEvents = false;
  for (const [topKey, topVal] of Object.entries(payload)) {
    topCount = topCount + 1;
    if (topKey === "events") {
      if (foundEvents === true) {
        return invalid;
      }
      foundEvents = true;
    } else {
      return invalid;
    }
  }
  if (topCount !== 1) {
    return invalid;
  }
  if (foundEvents === false) {
    return invalid;
  }
  const events = payload.events;
  if (Array.isArray(events) === false) {
    return invalid;
  }
  const total = events.length;
  if (total < 1) {
    return invalid;
  }
  if (total > 50) {
    return invalid;
  }
  const digitMap = new Map();
  let digitVal = 0;
  for (const digitCh of "0123456789") {
    digitMap.set(digitCh, digitVal);
    digitVal = digitVal + 1;
  }
  const charMap = new Map();
  for (const allowCh of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_") {
    charMap.set(allowCh, true);
  }
  const copies = [];
  for (const cur of events) {
    if (typeof cur !== "object") {
      return invalid;
    }
    if (cur === null) {
      return invalid;
    }
    if (Array.isArray(cur) === true) {
      return invalid;
    }
    const seen = new Map();
    seen.set("uid", false);
    seen.set("dtstart", false);
    seen.set("durationMinutes", false);
    seen.set("status", false);
    let keyCount = 0;
    for (const [entryKey, entryVal] of Object.entries(cur)) {
      keyCount = keyCount + 1;
      if (seen.get(entryKey) === false) {
        seen.set(entryKey, true);
      } else {
        return invalid;
      }
    }
    if (keyCount !== 4) {
      return invalid;
    }
    if (seen.get("uid") !== true) {
      return invalid;
    }
    if (seen.get("dtstart") !== true) {
      return invalid;
    }
    if (seen.get("durationMinutes") !== true) {
      return invalid;
    }
    if (seen.get("status") !== true) {
      return invalid;
    }
    const uid = cur.uid;
    const dtstart = cur.dtstart;
    const durationMinutes = cur.durationMinutes;
    const status = cur.status;
    if (typeof uid !== "string") {
      return invalid;
    }
    const uidLen = uid.length;
    if (uidLen < 8) {
      return invalid;
    }
    if (uidLen > 64) {
      return invalid;
    }
    let upos = 0;
    let prefixAcc = "";
    for (const uCh of uid) {
      if (upos < 10) {
        prefixAcc = prefixAcc + uCh;
      } else {
        if (charMap.get(uCh) !== true) {
          return invalid;
        }
      }
      upos = upos + 1;
    }
    if (upos !== uidLen) {
      return invalid;
    }
    if (prefixAcc !== "synthetic-") {
      return invalid;
    }
    if (typeof dtstart !== "string") {
      return invalid;
    }
    if (dtstart.length !== 16) {
      return invalid;
    }
    let dpos = 0;
    let monthAcc = "";
    let dayAcc = "";
    let hourAcc = "";
    let minuteAcc = "";
    let secondAcc = "";
    for (const dCh of dtstart) {
      if (dpos === 8) {
        if (dCh !== "T") {
          return invalid;
        }
      } else if (dpos === 15) {
        if (dCh !== "Z") {
          return invalid;
        }
      } else {
        if (digitMap.get(dCh) === undefined) {
          return invalid;
        }
        if (dpos < 4) {
          monthAcc = monthAcc + "";
        } else if (dpos < 6) {
          monthAcc = monthAcc + dCh;
        } else if (dpos < 8) {
          dayAcc = dayAcc + dCh;
        } else if (dpos < 11) {
          hourAcc = hourAcc + dCh;
        } else if (dpos < 13) {
          minuteAcc = minuteAcc + dCh;
        } else if (dpos < 15) {
          secondAcc = secondAcc + dCh;
        }
      }
      dpos = dpos + 1;
    }
    if (dpos !== 16) {
      return invalid;
    }
    let monthVal = 0;
    for (const mCh of monthAcc) {
      const mDig = digitMap.get(mCh);
      if (mDig === undefined) {
        return invalid;
      }
      monthVal = monthVal * 10 + mDig;
    }
    let dayVal = 0;
    for (const dayCh of dayAcc) {
      const dayDig = digitMap.get(dayCh);
      if (dayDig === undefined) {
        return invalid;
      }
      dayVal = dayVal * 10 + dayDig;
    }
    let hourVal = 0;
    for (const hCh of hourAcc) {
      const hDig = digitMap.get(hCh);
      if (hDig === undefined) {
        return invalid;
      }
      hourVal = hourVal * 10 + hDig;
    }
    let minuteVal = 0;
    for (const minCh of minuteAcc) {
      const minDig = digitMap.get(minCh);
      if (minDig === undefined) {
        return invalid;
      }
      minuteVal = minuteVal * 10 + minDig;
    }
    let secondVal = 0;
    for (const sCh of secondAcc) {
      const sDig = digitMap.get(sCh);
      if (sDig === undefined) {
        return invalid;
      }
      secondVal = secondVal * 10 + sDig;
    }
    if (monthVal < 1) {
      return invalid;
    }
    if (monthVal > 12) {
      return invalid;
    }
    if (dayVal < 1) {
      return invalid;
    }
    if (dayVal > 31) {
      return invalid;
    }
    if (hourVal < 0) {
      return invalid;
    }
    if (hourVal > 23) {
      return invalid;
    }
    if (minuteVal !== 0) {
      if (minuteVal !== 15) {
        if (minuteVal !== 30) {
          if (minuteVal !== 45) {
            return invalid;
          }
        }
      }
    }
    if (secondVal !== 0) {
      return invalid;
    }
    if (Number.isSafeInteger(durationMinutes) !== true) {
      return invalid;
    }
    if (Number.isFinite(durationMinutes) !== true) {
      return invalid;
    }
    if (durationMinutes < 15) {
      return invalid;
    }
    if (durationMinutes > 120) {
      return invalid;
    }
    if ((durationMinutes % 15) !== 0) {
      return invalid;
    }
    if (typeof status !== "string") {
      return invalid;
    }
    if (status !== "CONFIRMED") {
      if (status !== "CANCELLED") {
        return invalid;
      }
    }
    const uidCopy = "" + uid;
    const dtstartCopy = "" + dtstart;
    const statusCopy = "" + status;
    copies.push({
      uid: uidCopy,
      dtstart: dtstartCopy,
      durationMinutes: durationMinutes,
      status: statusCopy
    });
  }
  const used = new Map();
  for (const c of copies) {
    used.set(c, false);
  }
  const sorted = [];
  for (const round of copies) {
    let best = null;
    for (const item of copies) {
      if (used.get(item) === false) {
        if (best === null) {
          best = item;
        } else {
          if (item.dtstart < best.dtstart) {
            best = item;
          } else {
            if (item.dtstart === best.dtstart) {
              if (item.uid < best.uid) {
                best = item;
              }
            }
          }
        }
      }
    }
    if (best === null) {
      return invalid;
    }
    sorted.push(best);
    used.set(best, true);
  }
  return {
    ok: true,
    count: total,
    events: sorted
  };
}
