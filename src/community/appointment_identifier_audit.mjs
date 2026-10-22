export function runFeature(payload) {
  if (payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
  }
  if (typeof payload !== "object") {
    return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
  }
  if (Array.isArray(payload) === true) {
    return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
  }
  const collected = [];
  for (const pair of Object.entries(payload)) {
    const k = pair[0];
    collected.push(k);
  }
  if (collected.length !== 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
  }
  if (collected[0] !== "id") {
    return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
  }
  const given = payload.id;
  if (typeof given !== "string") {
    return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
  }
  if (given.length !== 36) {
    return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
  }
  const hex = new Map();
  hex.set("0", true);
  hex.set("1", true);
  hex.set("2", true);
  hex.set("3", true);
  hex.set("4", true);
  hex.set("5", true);
  hex.set("6", true);
  hex.set("7", true);
  hex.set("8", true);
  hex.set("9", true);
  hex.set("a", true);
  hex.set("b", true);
  hex.set("c", true);
  hex.set("d", true);
  hex.set("e", true);
  hex.set("f", true);
  const hyph = new Map();
  hyph.set(8, true);
  hyph.set(13, true);
  hyph.set(18, true);
  hyph.set(23, true);
  let pos = 0;
  let copy = "";
  for (const ch of given) {
    const need = hyph.get(pos);
    if (need === true) {
      if (ch !== "-") {
        return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
      }
    } else {
      if (ch === "-") {
        return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
      }
      const good = hex.get(ch);
      if (good !== true) {
        return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
      }
    }
    copy = copy + ch;
    pos = pos + 1;
  }
  if (pos !== 36) {
    return { ok: false, error: { code: "validation_error", message: "invalid appointment identifier." } };
  }
  return { ok: true, valid: true, id: copy };
}
