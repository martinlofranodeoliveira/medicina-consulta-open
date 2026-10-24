export function runFeature(payload) {
  function fail() {
    return { ok: false, error: { code: "validation_error", message: "invalid catalog membership check." } };
  }
  function isValidId(value) {
    if (typeof value !== "string") {
      return false;
    }
    const size = value.length;
    if (size < 6) {
      return false;
    }
    if (size > 64) {
      return false;
    }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const allowed = new Map();
    for (const c of chars) {
      allowed.set(c, true);
    }
    for (const ch of value) {
      if (allowed.get(ch) !== true) {
        return false;
      }
    }
    const head = [];
    for (const ch of value) {
      head.push(ch);
      if (head.length === 5) {
        break;
      }
    }
    if (head.length !== 5) {
      return false;
    }
    if (head[0] !== "d") {
      return false;
    }
    if (head[1] !== "e") {
      return false;
    }
    if (head[2] !== "m") {
      return false;
    }
    if (head[3] !== "o") {
      return false;
    }
    if (head[4] !== "-") {
      return false;
    }
    return true;
  }
  if (payload === null) {
    return fail();
  }
  if (typeof payload !== "object") {
    return fail();
  }
  if (Array.isArray(payload)) {
    return fail();
  }
  let total = 0;
  let catalog = null;
  let practitionerId = null;
  let seenCatalog = false;
  let seenPractitioner = false;
  for (const [key, value] of Object.entries(payload)) {
    total += 1;
    if (key === "catalog") {
      if (seenCatalog !== false) {
        return fail();
      }
      seenCatalog = true;
      catalog = value;
    } else if (key === "practitionerId") {
      if (seenPractitioner !== false) {
        return fail();
      }
      seenPractitioner = true;
      practitionerId = value;
    } else {
      return fail();
    }
  }
  if (total !== 2) {
    return fail();
  }
  if (seenCatalog !== true) {
    return fail();
  }
  if (seenPractitioner !== true) {
    return fail();
  }
  if (Array.isArray(catalog) === false) {
    return fail();
  }
  const count = catalog.length;
  if (count < 1) {
    return fail();
  }
  if (count > 50) {
    return fail();
  }
  const known = new Map();
  for (const entry of catalog) {
    if (isValidId(entry) === false) {
      return fail();
    }
    if (known.get(entry) === true) {
      return fail();
    }
    known.set(entry, true);
  }
  if (isValidId(practitionerId) === false) {
    return fail();
  }
  let member = false;
  if (known.get(practitionerId) === true) {
    member = true;
  }
  return { ok: true, member: member, count: count };
}
