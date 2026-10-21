export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
  }
  if (Object.entries(payload).length !== 2) {
    return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
  }
  for (const pair of Object.entries(payload)) {
    const k = pair[0];
    if (k !== "appointments" && k !== "id") {
      return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
    }
  }
  const appointments = payload.appointments;
  const requestId = payload.id;
  if (Array.isArray(appointments) === false) {
    return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
  }
  if (appointments.length > 50) {
    return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
  }
  if (typeof requestId !== "string" || requestId.length < 1 || requestId.length > 64) {
    return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
  }
  for (const ch of requestId) {
    const code = ch.codePointAt(0);
    const isDigit = code >= 48 && code <= 57;
    const isUpper = code >= 65 && code <= 90;
    const isLower = code >= 97 && code <= 122;
    const isHyphen = code === 45;
    const isUnder = code === 95;
    if (isDigit === false && isUpper === false && isLower === false && isHyphen === false && isUnder === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
    }
  }
  const seen = new Map();
  for (const entry of appointments) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry) === true) {
      return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
    }
    if (Object.entries(entry).length !== 3) {
      return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
    }
    for (const ePair of Object.entries(entry)) {
      const ek = ePair[0];
      if (ek !== "id" && ek !== "practitionerId" && ek !== "status") {
        return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
      }
    }
    const entryId = entry.id;
    const pracId = entry.practitionerId;
    const st = entry.status;
    if (typeof entryId !== "string" || entryId.length < 1 || entryId.length > 64) {
      return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
    }
    for (const ch of entryId) {
      const code = ch.codePointAt(0);
      const isDigit = code >= 48 && code <= 57;
      const isUpper = code >= 65 && code <= 90;
      const isLower = code >= 97 && code <= 122;
      const isHyphen = code === 45;
      const isUnder = code === 95;
      if (isDigit === false && isUpper === false && isLower === false && isHyphen === false && isUnder === false) {
        return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
      }
    }
    if (typeof pracId !== "string" || pracId.length < 6 || pracId.length > 64) {
      return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
    }
    if (pracId.startsWith("demo-") === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
    }
    for (const ch of pracId) {
      const code = ch.codePointAt(0);
      const isDigit = code >= 48 && code <= 57;
      const isUpper = code >= 65 && code <= 90;
      const isLower = code >= 97 && code <= 122;
      const isHyphen = code === 45;
      const isUnder = code === 95;
      if (isDigit === false && isUpper === false && isLower === false && isHyphen === false && isUnder === false) {
        return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
      }
    }
    if (st !== "scheduled" && st !== "completed" && st !== "cancelled") {
      return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
    }
    if (seen.get(entryId) !== undefined) {
      return { ok: false, error: { code: "validation_error", message: "invalid deletion request." } };
    }
    seen.set(entryId, true);
  }
  let matchedId = null;
  let matchedPrac = null;
  let matchedStatus = null;
  let found = false;
  for (const entry of appointments) {
    if (entry.id === requestId) {
      matchedId = entry.id;
      matchedPrac = entry.practitionerId;
      matchedStatus = entry.status;
      found = true;
    }
  }
  if (found === false) {
    return { ok: false, error: { code: "appointment_not_found", message: "appointment not found." } };
  }
  const remaining = [];
  for (const entry of appointments) {
    if (entry.id !== requestId) {
      const copy = { id: "" + entry.id, practitionerId: "" + entry.practitionerId, status: "" + entry.status };
      remaining.push(copy);
    }
  }
  const idCopy = "" + matchedId;
  const pracCopy = "" + matchedPrac;
  const statusCopy = "" + matchedStatus;
  return { ok: true, id: idCopy, practitionerId: pracCopy, status: statusCopy, remainingCount: remaining.length, remaining: remaining };
}
