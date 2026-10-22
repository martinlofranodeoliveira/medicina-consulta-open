export function runFeature(payload) {
  if (payload === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
  }
  if (typeof payload !== "object") {
    return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
  }
  if (Array.isArray(payload)) {
    return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
  }
  let ops = null;
  let topCount = 0;
  for (const topPair of Object.entries(payload)) {
    const topKey = topPair[0];
    const topVal = topPair[1];
    topCount = topCount + 1;
    if (topKey !== "operations") {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    ops = topVal;
  }
  if (topCount !== 1) {
    return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
  }
  if (ops === null) {
    return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
  }
  if (Array.isArray(ops) === false) {
    return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
  }
  if (ops.length !== 8) {
    return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
  }
  const allowedMethods = [];
  allowedMethods.push("GET");
  allowedMethods.push("POST");
  allowedMethods.push("PATCH");
  allowedMethods.push("DELETE");
  const allowedPaths = [];
  allowedPaths.push("/");
  allowedPaths.push("/health");
  allowedPaths.push("/api/practitioners");
  allowedPaths.push("/api/appointments");
  allowedPaths.push("/api/appointments/:id");
  allowedPaths.push("/api/appointments/:id/reschedule");
  const seen = new Map();
  for (const item of ops) {
    if (item === null) {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    if (typeof item !== "object") {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    if (Array.isArray(item)) {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    let methodVal = null;
    let pathVal = null;
    let fieldCount = 0;
    let hasMethod = false;
    let hasPath = false;
    for (const field of Object.entries(item)) {
      const fk = field[0];
      const fv = field[1];
      fieldCount = fieldCount + 1;
      if (fk === "method") {
        if (hasMethod) {
          return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
        }
        hasMethod = true;
        methodVal = fv;
      } else if (fk === "path") {
        if (hasPath) {
          return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
        }
        hasPath = true;
        pathVal = fv;
      } else {
        return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
      }
    }
    if (fieldCount !== 2) {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    if (hasMethod === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    if (hasPath === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    if (typeof methodVal !== "string") {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    if (typeof pathVal !== "string") {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    let methodOk = false;
    for (const cand of allowedMethods) {
      if (methodVal.length === cand.length) {
        const cmap = new Map();
        let ci = 0;
        for (const ch of cand) {
          cmap.set(ci, ch);
          ci = ci + 1;
        }
        let mi = 0;
        let same = true;
        for (const ch of methodVal) {
          const ex = cmap.get(mi);
          if (ch !== ex) {
            same = false;
            break;
          }
          mi = mi + 1;
        }
        if (same) {
          methodOk = true;
          break;
        }
      }
    }
    if (methodOk === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    let pathOk = false;
    for (const cand of allowedPaths) {
      if (pathVal.length === cand.length) {
        const pmap = new Map();
        let pi = 0;
        for (const ch of cand) {
          pmap.set(pi, ch);
          pi = pi + 1;
        }
        let qi = 0;
        let same = true;
        for (const ch of pathVal) {
          const ex = pmap.get(qi);
          if (ch !== ex) {
            same = false;
            break;
          }
          qi = qi + 1;
        }
        if (same) {
          pathOk = true;
          break;
        }
      }
    }
    if (pathOk === false) {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
    const pairKey = methodVal + " " + pathVal;
    const cur = seen.get(pairKey);
    if (cur === undefined) {
      seen.set(pairKey, 1);
    } else {
      seen.set(pairKey, cur + 1);
    }
  }
  const want = new Map();
  want.set("GET" + " " + "/", 1);
  want.set("GET" + " " + "/health", 1);
  want.set("GET" + " " + "/api/practitioners", 1);
  want.set("GET" + " " + "/api/appointments", 1);
  want.set("POST" + " " + "/api/appointments", 1);
  want.set("PATCH" + " " + "/api/appointments/:id", 1);
  want.set("DELETE" + " " + "/api/appointments/:id", 1);
  want.set("POST" + " " + "/api/appointments/:id/reschedule", 1);
  if (seen.size !== 8) {
    return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
  }
  for (const wp of want) {
    const wk = wp[0];
    const wv = wp[1];
    const got = seen.get(wk);
    if (got !== wv) {
      return { ok: false, error: { code: "validation_error", message: "invalid openapi inventory." } };
    }
  }
  const operations = [];
  operations.push({ method: "DELETE" + "", path: "/api/appointments/:id" + "" });
  operations.push({ method: "GET" + "", path: "/" + "" });
  operations.push({ method: "GET" + "", path: "/api/appointments" + "" });
  operations.push({ method: "GET" + "", path: "/api/practitioners" + "" });
  operations.push({ method: "GET" + "", path: "/health" + "" });
  operations.push({ method: "PATCH" + "", path: "/api/appointments/:id" + "" });
  operations.push({ method: "POST" + "", path: "/api/appointments" + "" });
  operations.push({ method: "POST" + "", path: "/api/appointments/:id/reschedule" + "" });
  return { ok: true, count: 8, operations: operations };
}
