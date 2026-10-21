export function runFeature(payload) {
  const invalid = { ok: false, error: { code: "validation_error", message: "invalid practitioner catalog." } };
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
    return invalid;
  }
  let topCount = 0;
  for (const pair of Object.entries(payload)) {
    topCount = topCount + 1;
    const topKey = pair.at(0);
    if (topKey !== "practitioners") {
      return invalid;
    }
  }
  if (topCount !== 1) {
    return invalid;
  }
  const list = payload.practitioners;
  if (Array.isArray(list) === false) {
    return invalid;
  }
  const total = list.length;
  if (total < 1 || total > 100) {
    return invalid;
  }
  const seen = new Map();
  const ids = [];
  for (const entry of list) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry) === true) {
      return invalid;
    }
    let hasId = false;
    let hasName = false;
    let hasSpecialty = false;
    for (const pair of Object.entries(entry)) {
      const k = pair.at(0);
      if (k === "id") {
        if (hasId === true) {
          return invalid;
        }
        hasId = true;
      } else if (k === "name") {
        if (hasName === true) {
          return invalid;
        }
        hasName = true;
      } else if (k === "specialty") {
        if (hasSpecialty === true) {
          return invalid;
        }
        hasSpecialty = true;
      } else {
        return invalid;
      }
    }
    if (hasId === false) {
      return invalid;
    }
    const id = entry.id;
    if (typeof id !== "string") {
      return invalid;
    }
    if (id.length < 6 || id.length > 64) {
      return invalid;
    }
    if (id.startsWith("demo-") === false) {
      return invalid;
    }
    for (const ch of id) {
      const code = ch.charCodeAt(0);
      const isDigit = code >= 48 && code <= 57;
      const isUpper = code >= 65 && code <= 90;
      const isLower = code >= 97 && code <= 122;
      const isHyphen = code === 45;
      const isUnderscore = code === 95;
      if (isDigit === false && isUpper === false && isLower === false && isHyphen === false && isUnderscore === false) {
        return invalid;
      }
    }
    if (seen.has(id) === true) {
      return invalid;
    }
    if (hasName === true) {
      const v = entry.name;
      if (typeof v !== "string") {
        return invalid;
      }
      if (v.length < 1 || v.length > 80) {
        return invalid;
      }
      if (v.startsWith(" ") === true || v.startsWith("\t") === true || v.startsWith("\n") === true || v.startsWith("\r") === true) {
        return invalid;
      }
      if (v.endsWith(" ") === true || v.endsWith("\t") === true || v.endsWith("\n") === true || v.endsWith("\r") === true) {
        return invalid;
      }
      for (const ch of v) {
        const code = ch.charCodeAt(0);
        if (code < 32) {
          return invalid;
        }
      }
    }
    if (hasSpecialty === true) {
      const w = entry.specialty;
      if (typeof w !== "string") {
        return invalid;
      }
      if (w.length < 1 || w.length > 80) {
        return invalid;
      }
      if (w.startsWith(" ") === true || w.startsWith("\t") === true || w.startsWith("\n") === true || w.startsWith("\r") === true) {
        return invalid;
      }
      if (w.endsWith(" ") === true || w.endsWith("\t") === true || w.endsWith("\n") === true || w.endsWith("\r") === true) {
        return invalid;
      }
      for (const ch of w) {
        const code = ch.charCodeAt(0);
        if (code < 32) {
          return invalid;
        }
      }
    }
    let copy = { id: id };
    if (hasName === true && hasSpecialty === true) {
      copy = { id: id, name: entry.name, specialty: entry.specialty };
    } else if (hasName === true) {
      copy = { id: id, name: entry.name };
    } else if (hasSpecialty === true) {
      copy = { id: id, specialty: entry.specialty };
    }
    seen.set(id, copy);
    ids.push(id);
  }
  ids.sort();
  const sorted = [];
  for (const sid of ids) {
    const item = seen.get(sid);
    sorted.push(item);
  }
  const count = sorted.length;
  if (count !== total) {
    return invalid;
  }
  return { ok: true, count: count, practitioners: sorted };
}
