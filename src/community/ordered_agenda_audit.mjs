export function runFeature(payload) {
  const invalid = { ok: false, error: { code: "validation_error", message: "invalid ordered agenda." } };
  if (typeof payload !== "object") {
    return invalid;
  }
  if (payload === null) {
    return invalid;
  }
  if (Array.isArray(payload) === true) {
    return invalid;
  }
  const topKeys = Object.keys(payload);
  if (topKeys.length !== 1) {
    return invalid;
  }
  const topSeen = new Map();
  topSeen.set("ok", false);
  for (const pair of Object.entries(payload)) {
    const key = pair[0];
    if (key === "appointments") {
      topSeen.set("ok", true);
    }
  }
  if (topSeen.get("ok") === false) {
    return invalid;
  }
  const list = payload.appointments;
  if (Array.isArray(list) === false) {
    return invalid;
  }
  const total = list.length;
  if (total > 200) {
    return invalid;
  }
  const out = [];
  const state = new Map();
  state.set("hasPrev", false);
  state.set("prev", "");
  for (const item of list) {
    if (typeof item !== "object") {
      return invalid;
    }
    if (item === null) {
      return invalid;
    }
    if (Array.isArray(item) === true) {
      return invalid;
    }
    const keys = Object.keys(item);
    if (keys.length !== 2) {
      return invalid;
    }
    const flag = new Map();
    flag.set("id", false);
    flag.set("startsAt", false);
    flag.set("extra", false);
    for (const pair of Object.entries(item)) {
      const k = pair[0];
      if (k === "id") {
        flag.set("id", true);
      } else {
        if (k === "startsAt") {
          flag.set("startsAt", true);
        } else {
          flag.set("extra", true);
        }
      }
    }
    if (flag.get("id") === false) {
      return invalid;
    }
    if (flag.get("startsAt") === false) {
      return invalid;
    }
    if (flag.get("extra") === true) {
      return invalid;
    }
    const curId = item.id;
    const curStart = item.startsAt;
    if (typeof curId !== "string") {
      return invalid;
    }
    if (typeof curStart !== "string") {
      return invalid;
    }
    if (curId.length < 1) {
      return invalid;
    }
    if (curId.length > 64) {
      return invalid;
    }
    if (curStart.length < 1) {
      return invalid;
    }
    if (curStart.length > 64) {
      return invalid;
    }
    if (state.get("hasPrev") === true) {
      const prev = state.get("prev");
      if (curStart < prev) {
        return invalid;
      }
    }
    state.set("prev", "" + curStart);
    state.set("hasPrev", true);
    const copyId = "" + curId;
    const copyStart = "" + curStart;
    out.push({ id: copyId, startsAt: copyStart });
  }
  return { ok: true, count: total, appointments: out };
}
