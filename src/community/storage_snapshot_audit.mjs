export function runFeature(payload) {
  const bad = { ok: false, error: { code: "validation_error", message: "invalid storage snapshot." } };
  if (payload === null) {
    return bad;
  }
  if (typeof payload !== "object") {
    return bad;
  }
  if (Array.isArray(payload) === true) {
    return bad;
  }
  const topList = Object.entries(payload);
  if (topList.length !== 2) {
    return bad;
  }
  let seenA = false;
  let seenB = false;
  let ver = 0;
  let appts = null;
  let verGot = false;
  for (const pair of topList) {
    const k = pair[0];
    const v = pair[1];
    if (k === "version") {
      if (seenA === true) {
        return bad;
      }
      seenA = true;
      ver = v;
      verGot = true;
    } else {
      if (k === "appointments") {
        if (seenB === true) {
          return bad;
        }
        seenB = true;
        appts = v;
      } else {
        return bad;
      }
    }
  }
  if (seenA === false) {
    return bad;
  }
  if (seenB === false) {
    return bad;
  }
  if (verGot === false) {
    return bad;
  }
  if (typeof ver !== "number") {
    return bad;
  }
  if (Number.isSafeInteger(ver) === false) {
    return bad;
  }
  if (ver !== 1) {
    return bad;
  }
  if (Array.isArray(appts) === false) {
    return bad;
  }
  if (appts.length > 200) {
    return bad;
  }
  const okChars = new Map();
  for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_") {
    okChars.set(c, true);
  }
  const preMap = new Map();
  preMap.set(0, "d");
  preMap.set(1, "e");
  preMap.set(2, "m");
  preMap.set(3, "o");
  preMap.set(4, "-");
  const schedMap = new Map();
  let schedN = 0;
  for (const c of "scheduled") {
    schedMap.set(schedN, c);
    schedN = schedN + 1;
  }
  const compMap = new Map();
  let compN = 0;
  for (const c of "completed") {
    compMap.set(compN, c);
    compN = compN + 1;
  }
  const cancMap = new Map();
  let cancN = 0;
  for (const c of "cancelled") {
    cancMap.set(cancN, c);
    cancN = cancN + 1;
  }
  const seenIds = new Map();
  const kept = [];
  for (const entry of appts) {
    if (entry === null) {
      return bad;
    }
    if (typeof entry !== "object") {
      return bad;
    }
    if (Array.isArray(entry) === true) {
      return bad;
    }
    const entryList = Object.entries(entry);
    if (entryList.length !== 3) {
      return bad;
    }
    let fId = false;
    let fPr = false;
    let fSt = false;
    let idVal = "";
    let prVal = "";
    let stVal = "";
    for (const pair of entryList) {
      const ek = pair[0];
      const ev = pair[1];
      if (ek === "id") {
        if (fId === true) {
          return bad;
        }
        fId = true;
        idVal = ev;
      } else {
        if (ek === "practitionerId") {
          if (fPr === true) {
            return bad;
          }
          fPr = true;
          prVal = ev;
        } else {
          if (ek === "status") {
            if (fSt === true) {
              return bad;
            }
            fSt = true;
            stVal = ev;
          } else {
            return bad;
          }
        }
      }
    }
    if (fId === false) {
      return bad;
    }
    if (fPr === false) {
      return bad;
    }
    if (fSt === false) {
      return bad;
    }
    if (typeof idVal !== "string") {
      return bad;
    }
    if (idVal.length < 1) {
      return bad;
    }
    if (idVal.length > 64) {
      return bad;
    }
    for (const ch of idVal) {
      if (okChars.get(ch) !== true) {
        return bad;
      }
    }
    if (seenIds.get(idVal) === true) {
      return bad;
    }
    seenIds.set(idVal, true);
    if (typeof prVal !== "string") {
      return bad;
    }
    if (prVal.length < 6) {
      return bad;
    }
    if (prVal.length > 64) {
      return bad;
    }
    let pPos = 0;
    for (const ch of prVal) {
      if (okChars.get(ch) !== true) {
        return bad;
      }
      if (pPos < 5) {
        if (ch !== preMap.get(pPos)) {
          return bad;
        }
      }
      pPos = pPos + 1;
    }
    if (pPos < 6) {
      return bad;
    }
    if (typeof stVal !== "string") {
      return bad;
    }
    if (stVal.length !== 9) {
      return bad;
    }
    let mS = true;
    let sp = 0;
    for (const ch of stVal) {
      if (ch !== schedMap.get(sp)) {
        mS = false;
      }
      sp = sp + 1;
    }
    let mC = true;
    let cp = 0;
    for (const ch of stVal) {
      if (ch !== compMap.get(cp)) {
        mC = false;
      }
      cp = cp + 1;
    }
    let mN = true;
    let np = 0;
    for (const ch of stVal) {
      if (ch !== cancMap.get(np)) {
        mN = false;
      }
      np = np + 1;
    }
    if (mS === false && mC === false && mN === false) {
      return bad;
    }
    const keepObj = { id: idVal, practitionerId: prVal, status: stVal };
    kept.push(keepObj);
  }
  const sorted = [];
  let rest = [];
  for (const it of kept) {
    rest.push(it);
  }
  while (rest.length > 0) {
    let best = null;
    let first = true;
    for (const cand of rest) {
      if (first === true) {
        best = cand;
        first = false;
      } else {
        const aStr = cand.id;
        const bStr = best.id;
        const aLen = aStr.length;
        const bLen = bStr.length;
        let mLen = aLen;
        if (bLen < mLen) {
          mLen = bLen;
        }
        let k = 0;
        let done = false;
        let less = false;
        while (k < mLen && done === false) {
          const ca = aStr.charCodeAt(k);
          const cb = bStr.charCodeAt(k);
          if (ca < cb) {
            less = true;
            done = true;
          } else {
            if (ca > cb) {
              less = false;
              done = true;
            } else {
              k = k + 1;
            }
          }
        }
        if (done === false) {
          if (aLen < bLen) {
            less = true;
          } else {
            less = false;
          }
        }
        if (less === true) {
          best = cand;
        }
      }
    }
    sorted.push(best);
    const nxt = [];
    let skip = false;
    for (const cand of rest) {
      if (skip === false && cand.id === best.id) {
        skip = true;
      } else {
        nxt.push(cand);
      }
    }
    rest = nxt;
  }
  const outList = [];
  for (const item of sorted) {
    const idCopy = "" + item.id;
    const prCopy = "" + item.practitionerId;
    const stCopy = "" + item.status;
    const nObj = { id: idCopy, practitionerId: prCopy, status: stCopy };
    outList.push(nObj);
  }
  const verCopy = 0 + ver;
  const snap = { version: verCopy, appointments: outList };
  const total = appts.length;
  const good = { ok: true, count: total, snapshot: snap };
  return good;
}
