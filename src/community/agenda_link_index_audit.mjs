export function runFeature(payload) {
  function stringsEqual(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    const mapA = new Map();
    const mapB = new Map();
    let pa = 0;
    for (const ch of a) {
      mapA.set(pa, ch);
      pa = pa + 1;
    }
    let pb = 0;
    for (const ch of b) {
      mapB.set(pb, ch);
      pb = pb + 1;
    }
    for (const entry of mapA) {
      const k = entry[0];
      const va = entry[1];
      const vb = mapB.get(k);
      if (va !== vb) {
        return false;
      }
    }
    return true;
  }
  function isLess(a, b) {
    if (stringsEqual(a, b) === true) {
      return false;
    }
    const mapA = new Map();
    const mapB = new Map();
    let pa = 0;
    for (const ch of a) {
      mapA.set(pa, ch);
      pa = pa + 1;
    }
    let pb = 0;
    for (const ch of b) {
      mapB.set(pb, ch);
      pb = pb + 1;
    }
    for (const entry of mapA) {
      const k = entry[0];
      const ca = entry[1];
      const cb = mapB.get(k);
      if (cb === undefined) {
        return false;
      }
      if (ca !== cb) {
        if (ca < cb) {
          return true;
        } else {
          return false;
        }
      }
    }
    if (a.length < b.length) {
      return true;
    } else {
      return false;
    }
  }
  function sortedStrings(items) {
    let result = [];
    for (const v of items) {
      let nxt = [];
      let done = false;
      for (const cur of result) {
        if (done === true) {
          nxt.push(cur);
        } else {
          if (isLess(v, cur) === true) {
            nxt.push(v);
            nxt.push(cur);
            done = true;
          } else {
            nxt.push(cur);
          }
        }
      }
      if (done === false) {
        nxt.push(v);
      }
      result = nxt;
    }
    return result;
  }
  function sortedLinks(items) {
    let result = [];
    for (const v of items) {
      let nxt = [];
      let done = false;
      for (const cur of result) {
        if (done === true) {
          nxt.push(cur);
        } else {
          const curId = cur.practitionerId;
          const vId = v.practitionerId;
          if (isLess(vId, curId) === true) {
            nxt.push(v);
            nxt.push(cur);
            done = true;
          } else {
            nxt.push(cur);
          }
        }
      }
      if (done === false) {
        nxt.push(v);
      }
      result = nxt;
    }
    return result;
  }
  function isDemoShape(value, allowed) {
    if (typeof value !== "string") {
      return false;
    }
    if (value.length < 6) {
      return false;
    }
    if (value.length > 64) {
      return false;
    }
    const posMap = new Map();
    let p = 0;
    for (const ch of value) {
      posMap.set(p, ch);
      p = p + 1;
    }
    if (posMap.get(0) !== "d") {
      return false;
    }
    if (posMap.get(1) !== "e") {
      return false;
    }
    if (posMap.get(2) !== "m") {
      return false;
    }
    if (posMap.get(3) !== "o") {
      return false;
    }
    if (posMap.get(4) !== "-") {
      return false;
    }
    for (const ch of value) {
      if (allowed.get(ch) !== true) {
        return false;
      }
    }
    return true;
  }
  function isIdShape(value, allowed) {
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
      if (allowed.get(ch) !== true) {
        return false;
      }
    }
    return true;
  }
  if (typeof payload !== "object") {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  if (payload === null) {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  if (Array.isArray(payload) === true) {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  const allowedMap = new Map();
  const allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  for (const c of allowedChars) {
    allowedMap.set(c, true);
  }
  let hasPract = false;
  let hasAppts = false;
  let badKeys = false;
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    if (stringsEqual(k, "practitioners") === true) {
      if (hasPract === true) {
        badKeys = true;
      }
      hasPract = true;
    } else {
      if (stringsEqual(k, "appointments") === true) {
        if (hasAppts === true) {
          badKeys = true;
        }
        hasAppts = true;
      } else {
        badKeys = true;
      }
    }
  }
  if (hasPract !== true) {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  if (hasAppts !== true) {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  if (badKeys === true) {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  const practitioners = payload.practitioners;
  const appointments = payload.appointments;
  if (Array.isArray(practitioners) !== true) {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  if (Array.isArray(appointments) !== true) {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  if (practitioners.length < 1) {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  if (practitioners.length > 20) {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  if (appointments.length > 50) {
    return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
  }
  const seenPract = new Map();
  for (const item of practitioners) {
    if (isDemoShape(item, allowedMap) !== true) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    if (seenPract.get(item) === true) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    seenPract.set(item, true);
  }
  const seenIds = new Map();
  for (const appt of appointments) {
    if (typeof appt !== "object") {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    if (appt === null) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    if (Array.isArray(appt) === true) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    let hasId = false;
    let hasPid = false;
    let extra = false;
    for (const entry of Object.entries(appt)) {
      const k = entry[0];
      if (stringsEqual(k, "id") === true) {
        if (hasId === true) {
          extra = true;
        }
        hasId = true;
      } else {
        if (stringsEqual(k, "practitionerId") === true) {
          if (hasPid === true) {
            extra = true;
          }
          hasPid = true;
        } else {
          extra = true;
        }
      }
    }
    if (hasId !== true) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    if (hasPid !== true) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    if (extra === true) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    const aid = appt.id;
    const pid = appt.practitionerId;
    if (isIdShape(aid, allowedMap) !== true) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    if (isDemoShape(pid, allowedMap) !== true) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    if (seenIds.get(aid) === true) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    seenIds.set(aid, true);
    let found = false;
    for (const p of practitioners) {
      if (stringsEqual(p, pid) === true) {
        found = true;
      }
    }
    if (found !== true) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
  }
  const linkMap = new Map();
  for (const p of practitioners) {
    const empty = [];
    linkMap.set(p, empty);
  }
  for (const appt of appointments) {
    const pid = appt.practitionerId;
    const aid = appt.id;
    const lst = linkMap.get(pid);
    if (lst === undefined) {
      return { error: { code: "validation_error", message: "invalid agenda link index." }, ok: false };
    }
    lst.push(aid);
  }
  const unsorted = [];
  for (const entry of linkMap) {
    const pid = entry[0];
    const ids = entry[1];
    const sortedIds = sortedStrings(ids);
    const linkEntry = { appointmentIds: sortedIds, practitionerId: pid };
    unsorted.push(linkEntry);
  }
  const links = sortedLinks(unsorted);
  const count = appointments.length;
  return { count: count, links: links, ok: true };
}
