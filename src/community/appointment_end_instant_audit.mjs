export function runFeature(payload) {
  if (payload === null) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (typeof payload !== "object") {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (Array.isArray(payload) === true) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  const entries = Object.entries(payload);
  const store = new Map();
  for (const entry of entries) {
    store.set(entry[0], entry[1]);
  }
  if (store.size !== 2) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  const startsAt = store.get("startsAt");
  const durationMinutes = store.get("durationMinutes");
  if (startsAt === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (durationMinutes === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (typeof startsAt !== "string") {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (startsAt.length !== 24) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  const chars = [];
  for (const ch of startsAt) {
    chars.push(ch);
  }
  if (chars.length !== 24) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (chars[4] !== "-") {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (chars[7] !== "-") {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (chars[10] !== "T") {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (chars[13] !== ":") {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (chars[16] !== ":") {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (chars[19] !== ".") {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (chars[23] !== "Z") {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  const digits = new Map();
  digits.set("0", 0);
  digits.set("1", 1);
  digits.set("2", 2);
  digits.set("3", 3);
  digits.set("4", 4);
  digits.set("5", 5);
  digits.set("6", 6);
  digits.set("7", 7);
  digits.set("8", 8);
  digits.set("9", 9);
  const y0 = digits.get(chars[0]);
  const y1 = digits.get(chars[1]);
  const y2 = digits.get(chars[2]);
  const y3 = digits.get(chars[3]);
  const mo0 = digits.get(chars[5]);
  const mo1 = digits.get(chars[6]);
  const d0 = digits.get(chars[8]);
  const d1 = digits.get(chars[9]);
  const h0 = digits.get(chars[11]);
  const h1 = digits.get(chars[12]);
  const mi0 = digits.get(chars[14]);
  const mi1 = digits.get(chars[15]);
  const s0 = digits.get(chars[17]);
  const s1 = digits.get(chars[18]);
  const ms0 = digits.get(chars[20]);
  const ms1 = digits.get(chars[21]);
  const ms2 = digits.get(chars[22]);
  if (y0 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (y1 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (y2 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (y3 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (mo0 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (mo1 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (d0 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (d1 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (h0 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (h1 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (mi0 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (mi1 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (s0 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (s1 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (ms0 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (ms1 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (ms2 === undefined) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  const year = y0 * 1000 + y1 * 100 + y2 * 10 + y3;
  const month = mo0 * 10 + mo1;
  const day = d0 * 10 + d1;
  const hour = h0 * 10 + h1;
  const minute = mi0 * 10 + mi1;
  const second = s0 * 10 + s1;
  const millis = ms0 * 100 + ms1 * 10 + ms2;
  if (month < 1) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (month > 12) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  const isLeap = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
  const dimFeb = isLeap ? 29 : 28;
  const dim = month === 2 ? dimFeb : month === 4 ? 30 : month === 6 ? 30 : month === 9 ? 30 : month === 11 ? 30 : 31;
  if (day < 1) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (day > dim) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (hour > 23) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (minute !== 0 && minute !== 15 && minute !== 30 && minute !== 45) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (second !== 0) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (millis !== 0) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (typeof durationMinutes !== "number") {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (Number.isFinite(durationMinutes) === false) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (Number.isSafeInteger(durationMinutes) === false) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (durationMinutes < 15) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (durationMinutes > 120) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  if (durationMinutes % 15 !== 0) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  const totalMinute = minute + durationMinutes;
  const carryHours = totalMinute < 60 ? 0 : totalMinute < 120 ? 1 : 2;
  const endMinute = totalMinute < 60 ? totalMinute : totalMinute < 120 ? totalMinute - 60 : totalMinute - 120;
  const totalHour = hour + carryHours;
  const carryDays = totalHour < 24 ? 0 : 1;
  const endHour = totalHour < 24 ? totalHour : totalHour - 24;
  const tentativeDay = day + carryDays;
  const overDay = tentativeDay > dim;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDay = overDay ? 1 : tentativeDay;
  const endMonth = overDay ? nextMonth : month;
  const endYear = overDay ? nextYear : year;
  if (endYear > 9999) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  const yearStr = String(endYear).padStart(4, "0");
  const monthStr = String(endMonth).padStart(2, "0");
  const dayStr = String(endDay).padStart(2, "0");
  const hourStr = String(endHour).padStart(2, "0");
  const minuteStr = String(endMinute).padStart(2, "0");
  const endsAt = yearStr + "-" + monthStr + "-" + dayStr + "T" + hourStr + ":" + minuteStr + ":00.000Z";
  if (endsAt.length !== 24) {
    return { error: { code: "validation_error", message: "invalid appointment interval." }, ok: false };
  }
  return { durationMinutes: durationMinutes, endsAt: endsAt, ok: true, startsAt: startsAt };
}
