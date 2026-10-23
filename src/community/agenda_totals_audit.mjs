export function runFeature(payload) {
  if (payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
  }
  if (typeof payload !== "object") {
    return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
  }
  if (Array.isArray(payload) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
  }
  const topList = Object.entries(payload);
  let topNum = 0;
  for (const pair of topList) {
    topNum = topNum + 1;
  }
  if (topNum !== 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
  }
  let topKeyOk = false;
  for (const pair of topList) {
    const k = pair[0];
    if (k === "appointments") {
      topKeyOk = true;
    }
  }
  if (topKeyOk === false) {
    return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
  }
  const appts = payload.appointments;
  if (Array.isArray(appts) === false) {
    return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
  }
  let apptNum = 0;
  for (const item of appts) {
    apptNum = apptNum + 1;
  }
  if (apptNum > 200) {
    return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
  }
  const allowMap = new Map();
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_") {
    allowMap.set(ch, true);
  }
  const preMap = new Map();
  preMap.set(0, "d");
  preMap.set(1, "e");
  preMap.set(2, "m");
  preMap.set(3, "o");
  preMap.set(4, "-");
  const kindList = [];
  kindList.push("scheduled");
  kindList.push("completed");
  kindList.push("cancelled");
  const tally = new Map();
  tally.set("scheduled", 0);
  tally.set("completed", 0);
  tally.set("cancelled", 0);
  let busy = 0;
  for (const item of appts) {
    if (item === null) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (typeof item !== "object") {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (Array.isArray(item) === true) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    const eList = Object.entries(item);
    let eNum = 0;
    for (const pair of eList) {
      eNum = eNum + 1;
    }
    if (eNum !== 3) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    let hasA = false;
    let hasB = false;
    let hasC = false;
    for (const pair of eList) {
      const k = pair[0];
      if (k === "practitionerId") {
        hasA = true;
      }
      if (k === "status") {
        hasB = true;
      }
      if (k === "durationMinutes") {
        hasC = true;
      }
      if (k !== "practitionerId") {
        if (k !== "status") {
          if (k !== "durationMinutes") {
            return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
          }
        }
      }
    }
    if (hasA === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (hasB === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (hasC === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    const pid = item.practitionerId;
    const st = item.status;
    const dur = item.durationMinutes;
    if (typeof pid !== "string") {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (pid.length < 6) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (pid.length > 64) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    let pos = 0;
    let preOk = true;
    for (const ch of pid) {
      if (pos < 5) {
        const want = preMap.get(pos);
        if (ch !== want) {
          preOk = false;
        }
      }
      pos = pos + 1;
    }
    if (preOk === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    for (const ch of pid) {
      const okCh = allowMap.get(ch);
      if (okCh !== true) {
        return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
      }
    }
    if (typeof st !== "string") {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    let statusOk = false;
    let isSched = false;
    let isComp = false;
    let isCanc = false;
    let kindPos = 0;
    for (const cand of kindList) {
      const tmpMap = new Map();
      let tmpLen = 0;
      for (const ch of cand) {
        tmpMap.set(tmpLen, ch);
        tmpLen = tmpLen + 1;
      }
      let same = true;
      if (st.length !== tmpLen) {
        same = false;
      } else {
        let q = 0;
        for (const ch of st) {
          const want = tmpMap.get(q);
          if (ch !== want) {
            same = false;
          }
          q = q + 1;
        }
      }
      if (same === true) {
        statusOk = true;
        if (kindPos === 0) {
          isSched = true;
        }
        if (kindPos === 1) {
          isComp = true;
        }
        if (kindPos === 2) {
          isCanc = true;
        }
      }
      kindPos = kindPos + 1;
    }
    if (statusOk === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (typeof dur !== "number") {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (Number.isSafeInteger(dur) === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (dur < 15) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (dur > 120) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if ((dur % 15) !== 0) {
      return { ok: false, error: { code: "validation_error", message: "invalid agenda totals request." } };
    }
    if (isSched === true) {
      const cur = tally.get("scheduled");
      tally.set("scheduled", cur + 1);
      busy = busy + dur;
    }
    if (isComp === true) {
      const cur = tally.get("completed");
      tally.set("completed", cur + 1);
      busy = busy + dur;
    }
    if (isCanc === true) {
      const cur = tally.get("cancelled");
      tally.set("cancelled", cur + 1);
    }
  }
  const numSched = tally.get("scheduled");
  const numComp = tally.get("completed");
  const numCanc = tally.get("cancelled");
  return { ok: true, total: apptNum, scheduled: numSched, completed: numComp, cancelled: numCanc, occupiedMinutes: busy };
}
