export function runFeature(payload) {
  const fail = { ok: false, error: { code: "validation_error", message: "invalid reschedule request." } };
  if (payload === null) {
    return fail;
  }
  if (typeof payload !== "object") {
    return fail;
  }
  if (Array.isArray(payload) === true) {
    return fail;
  }
  const seen = new Map();
  const keys = [];
  for (const entry of Object.entries(payload)) {
    keys.push(entry[0]);
    seen.set(entry[0], entry[1]);
  }
  if (keys.length !== 2) {
    return fail;
  }
  if (seen.size !== 2) {
    return fail;
  }
  const startsAtValue = seen.get("startsAt");
  const durationValue = seen.get("durationMinutes");
  if (startsAtValue === undefined) {
    return fail;
  }
  if (durationValue === undefined) {
    return fail;
  }
  if (typeof durationValue !== "number") {
    return fail;
  }
  if (durationValue % 1 !== 0) {
    return fail;
  }
  if (durationValue < 15) {
    return fail;
  }
  if (durationValue > 120) {
    return fail;
  }
  if (durationValue % 15 !== 0) {
    return fail;
  }
  if (typeof startsAtValue !== "string") {
    return fail;
  }
  if (startsAtValue.length !== 24) {
    return fail;
  }
  const chars = [];
  for (const ch of startsAtValue) {
    chars.push(ch);
  }
  if (chars.length !== 24) {
    return fail;
  }
  if (chars[4] !== "-") {
    return fail;
  }
  if (chars[7] !== "-") {
    return fail;
  }
  if (chars[10] !== "T") {
    return fail;
  }
  if (chars[13] !== ":") {
    return fail;
  }
  if (chars[16] !== ":") {
    return fail;
  }
  if (chars[19] !== ".") {
    return fail;
  }
  if (chars[23] !== "Z") {
    return fail;
  }
  if (chars[17] !== "0") {
    return fail;
  }
  if (chars[18] !== "0") {
    return fail;
  }
  if (chars[20] !== "0") {
    return fail;
  }
  if (chars[21] !== "0") {
    return fail;
  }
  if (chars[22] !== "0") {
    return fail;
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
  if (digitValues.get(chars[0]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[1]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[2]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[3]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[5]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[6]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[8]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[9]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[11]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[12]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[14]) === undefined) {
    return fail;
  }
  if (digitValues.get(chars[15]) === undefined) {
    return fail;
  }
  const year = digitValues.get(chars[0]) * 1000 + digitValues.get(chars[1]) * 100 + digitValues.get(chars[2]) * 10 + digitValues.get(chars[3]);
  const month = digitValues.get(chars[5]) * 10 + digitValues.get(chars[6]);
  const day = digitValues.get(chars[8]) * 10 + digitValues.get(chars[9]);
  const hour = digitValues.get(chars[11]) * 10 + digitValues.get(chars[12]);
  const minute = digitValues.get(chars[14]) * 10 + digitValues.get(chars[15]);
  if (month < 1) {
    return fail;
  }
  if (month > 12) {
    return fail;
  }
  if (year < 0) {
    return fail;
  }
  if (year > 9999) {
    return fail;
  }
  if (hour < 0) {
    return fail;
  }
  if (hour > 23) {
    return fail;
  }
  const minuteOk = minute === 0 || minute === 15 || minute === 30 || minute === 45;
  if (minuteOk === false) {
    return fail;
  }
  const isLeap = year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
  const maxDay = month === 2 ? (isLeap === true ? 29 : 28) : (month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31);
  if (day < 1) {
    return fail;
  }
  if (day > maxDay) {
    return fail;
  }
  const copy = chars.join("");
  return { ok: true, startsAt: copy, durationMinutes: durationValue };
}
