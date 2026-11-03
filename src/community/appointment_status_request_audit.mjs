export function runFeature(payload) {
  const bad = { error: { code: "validation_error", message: "invalid status request." }, ok: false };
  if (payload === null) {
    return bad;
  }
  if (typeof payload !== "object") {
    return bad;
  }
  if (Array.isArray(payload)) {
    return bad;
  }
  const entries = Object.entries(payload);
  const keys = [];
  const vals = [];
  for (const entry of entries) {
    keys.push(entry[0]);
    vals.push(entry[1]);
  }
  if (keys.length !== 1) {
    return bad;
  }
  if (keys[0] !== "status") {
    return bad;
  }
  const statusValue = vals[0];
  if (typeof statusValue !== "string") {
    return bad;
  }
  const inputChars = [];
  for (const ch of statusValue) {
    inputChars.push(ch);
  }
  if (inputChars.length !== 9) {
    return bad;
  }
  const wantCompleted = new Map();
  wantCompleted.set(0, "c");
  wantCompleted.set(1, "o");
  wantCompleted.set(2, "m");
  wantCompleted.set(3, "p");
  wantCompleted.set(4, "l");
  wantCompleted.set(5, "e");
  wantCompleted.set(6, "t");
  wantCompleted.set(7, "e");
  wantCompleted.set(8, "d");
  const wantCancelled = new Map();
  wantCancelled.set(0, "c");
  wantCancelled.set(1, "a");
  wantCancelled.set(2, "n");
  wantCancelled.set(3, "c");
  wantCancelled.set(4, "e");
  wantCancelled.set(5, "l");
  wantCancelled.set(6, "l");
  wantCancelled.set(7, "e");
  wantCancelled.set(8, "d");
  const posBox = new Map();
  posBox.set("p", 0);
  const flagBox = new Map();
  flagBox.set("a", true);
  flagBox.set("b", true);
  for (const ch of inputChars) {
    const at = posBox.get("p");
    const w1 = wantCompleted.get(at);
    const w2 = wantCancelled.get(at);
    if (ch !== w1) {
      flagBox.set("a", false);
    }
    if (ch !== w2) {
      flagBox.set("b", false);
    }
    posBox.set("p", at + 1);
  }
  const okA = flagBox.get("a");
  const okB = flagBox.get("b");
  if (okA === true) {
    return { ok: true, status: statusValue };
  }
  if (okB === true) {
    return { ok: true, status: statusValue };
  }
  return bad;
}
