export function runFeature(payload) {
  if (payload === null) {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (typeof payload !== "object") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (Array.isArray(payload) === true) {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  const entries = Object.entries(payload);
  if (entries.length !== 1) {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  const store = new Map();
  for (const entry of entries) {
    const k = entry[0];
    const v = entry[1];
    store.set(k, v);
  }
  if (store.size !== 1) {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  const dateValue = store.get("date");
  if (typeof dateValue !== "string") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (dateValue.length !== 10) {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  const chars = [];
  for (const ch of dateValue) {
    chars.push(ch);
  }
  if (chars.length !== 10) {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  const posMap = new Map();
  for (const pair of Object.entries(chars)) {
    const idx = pair[0];
    const c = pair[1];
    posMap.set(idx, c);
  }
  const h1 = posMap.get("4");
  const h2 = posMap.get("7");
  if (h1 !== "-") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (h2 !== "-") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  const digitValues = new Map();
  digitValues.set("0", 0);
  digitValues.set("1", 1);
  digitValues.set("2", 2);
  digitValues.set("3", 3);
  digitValues.set("4", 4);
  digitValues.set("5", 5);
  digitValues.set("6", 6);
  digitValues.set("7", 7);
  digitValues.set("8", 8);
  digitValues.set("9", 9);
  const n0 = digitValues.get(posMap.get("0"));
  const n1 = digitValues.get(posMap.get("1"));
  const n2 = digitValues.get(posMap.get("2"));
  const n3 = digitValues.get(posMap.get("3"));
  const n5 = digitValues.get(posMap.get("5"));
  const n6 = digitValues.get(posMap.get("6"));
  const n8 = digitValues.get(posMap.get("8"));
  const n9 = digitValues.get(posMap.get("9"));
  if (typeof n0 !== "number") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (typeof n1 !== "number") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (typeof n2 !== "number") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (typeof n3 !== "number") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (typeof n5 !== "number") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (typeof n6 !== "number") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (typeof n8 !== "number") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (typeof n9 !== "number") {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  const year = n0 * 1000 + n1 * 100 + n2 * 10 + n3;
  const month = n5 * 10 + n6;
  const day = n8 * 10 + n9;
  if (month < 1) {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (month > 12) {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  if (day < 1) {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  const mod4 = year % 4;
  const mod100 = year % 100;
  const mod400 = year % 400;
  const isLeap = mod400 === 0 || (mod4 === 0 && mod100 !== 0);
  const isFeb = month === 2;
  const isThirty = month === 4 || month === 6 || month === 9 || month === 11;
  const febMax = isLeap === true ? 29 : 28;
  const nonFebMax = isThirty === true ? 30 : 31;
  const maxDay = isFeb === true ? febMax : nonFebMax;
  if (day > maxDay) {
    return { error: { code: "validation_error", message: "invalid calendar date." }, ok: false };
  }
  return { date: dateValue, ok: true };
}
