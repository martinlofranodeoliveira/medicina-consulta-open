export function runFeature(payload) {
  const fail = { ok: false, error: { code: "validation_error", message: "invalid creation instant." } };
  if (payload === null) {
    return fail;
  }
  if (typeof payload !== "object") {
    return fail;
  }
  if (Array.isArray(payload)) {
    return fail;
  }
  const entries = Object.entries(payload);
  const info = new Map();
  info.set("count", 0);
  info.set("key", "");
  info.set("seen", "none");
  for (const entry of entries) {
    const inner = new Map();
    inner.set("n", 0);
    inner.set("first", "");
    inner.set("second", "");
    for (const part of entry) {
      const n = inner.get("n");
      if (n === 0) {
        inner.set("first", part);
      }
      if (n === 1) {
        inner.set("second", part);
      }
      inner.set("n", n + 1);
    }
    info.set("count", info.get("count") + 1);
    info.set("key", inner.get("first"));
    info.set("seen", inner.get("second"));
  }
  if (info.get("count") !== 1) {
    return fail;
  }
  if (info.get("key") !== "createdAt") {
    return fail;
  }
  const raw = info.get("seen");
  if (typeof raw !== "string") {
    return fail;
  }
  if (raw.length !== 24) {
    return fail;
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
  const seps = new Map();
  seps.set(4, "-");
  seps.set(7, "-");
  seps.set(10, "T");
  seps.set(13, ":");
  seps.set(16, ":");
  seps.set(19, ".");
  seps.set(23, "Z");
  const state = new Map();
  state.set("pos", 0);
  state.set("bad", 0);
  const store = new Map();
  store.set("copy", "");
  store.set("c0", "");
  store.set("c1", "");
  store.set("c2", "");
  store.set("c3", "");
  store.set("c5", "");
  store.set("c6", "");
  store.set("c8", "");
  store.set("c9", "");
  store.set("c11", "");
  store.set("c12", "");
  store.set("c14", "");
  store.set("c15", "");
  store.set("c17", "");
  store.set("c18", "");
  store.set("c20", "");
  store.set("c21", "");
  store.set("c22", "");
  const chars = [];
  for (const ch of raw) {
    const pos = state.get("pos");
    chars.push(ch);
    store.set("copy", store.get("copy") + ch);
    const want = seps.get(pos);
    if (want !== undefined) {
      if (ch !== want) {
        state.set("bad", 1);
      }
    } else {
      const dv = digits.get(ch);
      if (dv === undefined) {
        state.set("bad", 1);
      }
    }
    if (pos === 0) {
      store.set("c0", ch);
    }
    if (pos === 1) {
      store.set("c1", ch);
    }
    if (pos === 2) {
      store.set("c2", ch);
    }
    if (pos === 3) {
      store.set("c3", ch);
    }
    if (pos === 5) {
      store.set("c5", ch);
    }
    if (pos === 6) {
      store.set("c6", ch);
    }
    if (pos === 8) {
      store.set("c8", ch);
    }
    if (pos === 9) {
      store.set("c9", ch);
    }
    if (pos === 11) {
      store.set("c11", ch);
    }
    if (pos === 12) {
      store.set("c12", ch);
    }
    if (pos === 14) {
      store.set("c14", ch);
    }
    if (pos === 15) {
      store.set("c15", ch);
    }
    if (pos === 17) {
      store.set("c17", ch);
    }
    if (pos === 18) {
      store.set("c18", ch);
    }
    if (pos === 20) {
      store.set("c20", ch);
    }
    if (pos === 21) {
      store.set("c21", ch);
    }
    if (pos === 22) {
      store.set("c22", ch);
    }
    state.set("pos", pos + 1);
  }
  if (state.get("pos") !== 24) {
    return fail;
  }
  if (state.get("bad") !== 0) {
    return fail;
  }
  const m1 = digits.get(store.get("c5"));
  const m2 = digits.get(store.get("c6"));
  const d1 = digits.get(store.get("c8"));
  const d2 = digits.get(store.get("c9"));
  const h1 = digits.get(store.get("c11"));
  const h2 = digits.get(store.get("c12"));
  const mi1 = digits.get(store.get("c14"));
  const mi2 = digits.get(store.get("c15"));
  const s1 = digits.get(store.get("c17"));
  const s2 = digits.get(store.get("c18"));
  if (m1 === undefined) {
    return fail;
  }
  if (m2 === undefined) {
    return fail;
  }
  if (d1 === undefined) {
    return fail;
  }
  if (d2 === undefined) {
    return fail;
  }
  if (h1 === undefined) {
    return fail;
  }
  if (h2 === undefined) {
    return fail;
  }
  if (mi1 === undefined) {
    return fail;
  }
  if (mi2 === undefined) {
    return fail;
  }
  if (s1 === undefined) {
    return fail;
  }
  if (s2 === undefined) {
    return fail;
  }
  const month = m1 * 10 + m2;
  const day = d1 * 10 + d2;
  const hour = h1 * 10 + h2;
  const minute = mi1 * 10 + mi2;
  const second = s1 * 10 + s2;
  if (month < 1) {
    return fail;
  }
  if (month > 12) {
    return fail;
  }
  if (day < 1) {
    return fail;
  }
  if (month === 1) {
    if (day > 31) {
      return fail;
    }
  }
  if (month === 3) {
    if (day > 31) {
      return fail;
    }
  }
  if (month === 5) {
    if (day > 31) {
      return fail;
    }
  }
  if (month === 7) {
    if (day > 31) {
      return fail;
    }
  }
  if (month === 8) {
    if (day > 31) {
      return fail;
    }
  }
  if (month === 10) {
    if (day > 31) {
      return fail;
    }
  }
  if (month === 12) {
    if (day > 31) {
      return fail;
    }
  }
  if (month === 4) {
    if (day > 30) {
      return fail;
    }
  }
  if (month === 6) {
    if (day > 30) {
      return fail;
    }
  }
  if (month === 9) {
    if (day > 30) {
      return fail;
    }
  }
  if (month === 11) {
    if (day > 30) {
      return fail;
    }
  }
  if (month === 2) {
    if (day > 29) {
      return fail;
    }
  }
  if (hour < 0) {
    return fail;
  }
  if (hour > 23) {
    return fail;
  }
  if (minute < 0) {
    return fail;
  }
  if (minute > 59) {
    return fail;
  }
  if (second < 0) {
    return fail;
  }
  if (second > 59) {
    return fail;
  }
  const copy = store.get("copy");
  if (copy !== raw) {
    return fail;
  }
  const instant = { createdAt: copy };
  return { ok: true, valid: true, instant: instant };
}
