/* eslint-disable */
// @ts-nocheck
/**
 * VENDORED — upstream plus two local patches, both marked `rdb LOCAL PATCH`.
 *
 * Source: https://ramaaz-observe.yazan-adnof.workers.dev/sdk.js
 * Refresh with:
 *   curl -sSL -o src/lib/observe/sdk.js https://ramaaz-observe.yazan-adnof.workers.dev/sdk.js
 *   (then re-apply this header AND both patches — `git diff` against the
 *    downloaded file is the quickest way to find them)
 *
 * The patches:
 *   1. redact JSON values whose KEY looks like a credential (token, passcode,
 *      password, secret, otp, pin) — the upstream rules match by shape, which
 *      misses a short UUID session token
 *   2. `denyRequestBodyPaths` — suppress a request body without losing the
 *      response, so a credential endpoint can still be diagnosed
 *
 * Both belong upstream in the collector rather than here; this copy carries
 * them until then.
 *
 * Why vendored instead of imported from the URL, as the dashboard also offers:
 * our CSP is `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:` (see
 * next.config.ts). A remote <script> / remote ESM import from the worker origin
 * is blocked outright — and webpack cannot resolve a URL import anyway. Bundled
 * from src/ it is a first-party script, so the CSP question never arises.
 *
 * Types live in ./sdk.d.ts; the public surface this app uses is ./index.ts.
 */
const SENSITIVE_HEADERS = /* @__PURE__ */ new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
  "x-step-token",
  "x-csrf-token"
]);
function headersToObject(h, max) {
  const out = {};
  if (!h) return out;
  h.forEach((value, key) => {
    const name = key.toLowerCase();
    if (SENSITIVE_HEADERS.has(name)) {
      out[key] = "[redacted]";
      return;
    }
    out[key] = scrub(String(value)).slice(0, max);
  });
  return out;
}
const DEFAULTS = {
  levels: ["warn", "error"],
  maxBody: 2e3,
  flushMs: 1e4,
  maxFlushes: 50
};
const SECRET_SHAPES = [
  [/data:[a-z/+-]+;base64,[A-Za-z0-9+/=]+/gi, "[data-uri]"],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt]"],
  [/https?:\/\/[^\s"']*[?&](x-amz-|signature|token|sig)=[^\s"'&]+/gi, "[signed-url]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[hex]"],
  [/\b[A-Za-z0-9_-]{40,}\b/g, "[opaque]"],
  // ── rdb LOCAL PATCH (1 of 2) — re-apply when refreshing this file ────────
  // Mask JSON values by KEY NAME, not just by shape.
  //
  // The shape rules above catch a JWT and any opaque run of 40+ chars, which
  // is most credentials but not all of them: a 36-char UUID sessionToken
  // slips through both, and `/auth/session-complete` returns one alongside
  // the access and refresh tokens. Matching the key is what makes that
  // deterministic instead of lucky.
  //
  // Runs inside `scrub`, so it covers request bodies, response bodies, header
  // values and console arguments in one place.
  [
    /("[A-Za-z_]*(?:token|passcode|password|secret|otp|pin)[A-Za-z_]*"\s*:\s*)"[^"]*"/gi,
    '$1"[redacted]"'
  ]
  // ── end rdb LOCAL PATCH (1 of 2) ─────────────────────────────────────────
];
function scrub(input) {
  let out = input;
  for (const [pattern, replacement] of SECRET_SHAPES) out = out.replace(pattern, replacement);
  return out;
}
function redactPath(input) {
  let pathname = input;
  let origin = "";
  try {
    const parsed = new URL(input, "https://x.invalid");
    pathname = parsed.pathname;
    if (!input.startsWith("/")) origin = parsed.host === "x.invalid" ? "" : parsed.origin;
  } catch {
    pathname = input.split("?")[0] ?? input;
  }
  const cleaned = pathname.split("/").map(
    (segment) => segment.length >= 16 && /^[A-Za-z0-9._~-]+$/.test(segment) ? "[id]" : segment
  ).join("/");
  return origin + cleaned;
}
function describe(args) {
  let name;
  let stack;
  const parts = args.map((arg) => {
    if (arg instanceof Error) {
      name ?? (name = arg.name);
      stack ?? (stack = arg.stack?.slice(0, 4e3));
      return `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === "string") return arg;
    if (typeof arg === "object" && arg !== null) {
      const tag = arg.state ?? arg.code;
      if (typeof tag === "string") name ?? (name = tag);
      try {
        return JSON.stringify(arg).slice(0, 600);
      } catch {
        return "[unserialisable]";
      }
    }
    return String(arg);
  });
  return { msg: scrub(parts.join(" ")).slice(0, 2e3), name, stack };
}
let started = false;
let remote = { enabled: true };
let remoteDeny = [];
function captureScreen() {
  try {
    const doc = document.documentElement.cloneNode(true);
    for (const el of Array.from(doc.querySelectorAll("script,noscript"))) el.remove();
    for (const el of Array.from(doc.querySelectorAll("input"))) {
      const input = el;
      if (input.type === "password") input.setAttribute("value", "");
      else input.setAttribute("value", input.value ?? "");
    }
    const base = `<base href="${location.origin}">`;
    return `<!doctype html><html>${base}${doc.innerHTML}</html>`.slice(0, 38e4);
  } catch {
    return null;
  }
}
function observe(options) {
  if (started || typeof window === "undefined") return;
  started = true;
  const endpoint = options.url.replace(/\/$/, "") + "/ingest";
  const base = options.url.replace(/\/$/, "");
  const levels = options.levels ?? DEFAULTS.levels;
  const maxBody = options.maxBody ?? DEFAULTS.maxBody;
  const flushMs = options.flushMs ?? DEFAULTS.flushMs;
  const maxFlushes = options.maxFlushes ?? DEFAULTS.maxFlushes;
  let buffer = [];
  let seq = 0;
  let timer = null;
  let reporting = false;
  let correlation = options.correlation;
  const sid = (() => {
    const KEY = "__observe_sid";
    const make = () => (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, "");
    try {
      const found = sessionStorage.getItem(KEY);
      if (found) return found;
      const made = make();
      sessionStorage.setItem(KEY, made);
      return made;
    } catch {
      return make();
    }
  })();
  function record(event) {
    if (buffer.length >= 200) return;
    buffer.push(event);
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        void flush(false);
      }, flushMs);
    }
  }
  async function flush(final) {
    if (buffer.length === 0 || seq >= maxFlushes) return;
    const events = buffer;
    buffer = [];
    const payload = JSON.stringify({
      key: options.key,
      sid,
      seq: seq++,
      correlation,
      ua: navigator.userAgent.slice(0, 400),
      screen: `${screen?.width ?? 0}x${screen?.height ?? 0}x${devicePixelRatio ?? 1}`,
      url: redactPath(location.href),
      events
    });
    if (final && typeof navigator.sendBeacon === "function") {
      try {
        navigator.sendBeacon(endpoint, new Blob([payload], { type: "text/plain" }));
      } catch {
      }
      return;
    }
    reporting = true;
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
        mode: "cors"
      });
    } catch {
    } finally {
      reporting = false;
    }
  }
  for (const level of levels) {
    const original = console[level]?.bind(console);
    if (!original) continue;
    console[level] = (...args) => {
      original(...args);
      const { msg, name, stack } = describe(args);
      if (level === "error") maybeSnapshot(msg);
      record({ t: Date.now(), kind: "console", level, msg, name, stack });
    };
  }
  async function pollConfig() {
    try {
      const r = await originalFetch(`${base}/config/${encodeURIComponent(options.key)}`);
      if (!r.ok) return;
      remote = await r.json();
      remoteDeny = (remote.denyPaths ?? []).map((p) => {
        try {
          return new RegExp(p);
        } catch {
          return null;
        }
      }).filter((r2) => r2 !== null);
    } catch {
    }
  }
  const capBodies = () => options.captureBodies !== void 0 ? options.captureBodies : !!remote.captureBodies;
  const capHeaders = () => options.captureHeaders !== void 0 ? options.captureHeaders : !!remote.captureHeaders;
  let lastSnapshot = 0;
  function maybeSnapshot(reason) {
    if (!remote.captureScreens) return;
    if (Date.now() - lastSnapshot < 1e4) return;
    lastSnapshot = Date.now();
    const html = captureScreen();
    if (!html) return;
    try {
      navigator.sendBeacon(
        `${base}/snapshot`,
        new Blob(
          [
            JSON.stringify({
              key: options.key,
              sid,
              html,
              viewport: `${innerWidth}x${innerHeight}`,
              reason: reason.slice(0, 300)
            })
          ],
          { type: "text/plain" }
        )
      );
    } catch {
    }
  }
  window.addEventListener("error", (event) => {
    maybeSnapshot(String(event.message));
    record({
      t: Date.now(),
      kind: "error",
      level: "error",
      msg: scrub(String(event.message)).slice(0, 2e3),
      name: event.error instanceof Error ? event.error.name : void 0,
      stack: event.error instanceof Error ? event.error.stack?.slice(0, 4e3) : void 0,
      path: event.filename ? redactPath(event.filename) : void 0
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const { msg, name, stack } = describe([event.reason]);
    maybeSnapshot(msg);
    record({ t: Date.now(), kind: "rejection", level: "error", msg, name, stack });
  });
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (reporting || url.startsWith(endpoint)) return originalFetch(input, init);
    if (options.ignorePaths?.some((re) => re.test(url))) return originalFetch(input, init);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const path = redactPath(url);
    const startedAt = Date.now();
    const denied = (options.denyBodyPaths?.some((re) => re.test(path)) ?? false) || remoteDeny.some((re) => re.test(path));
    // ── rdb LOCAL PATCH (2 of 2) — re-apply when refreshing this file ────────
    // `denyRequestBodyPaths`: suppress the REQUEST body and headers while still
    // recording the response.
    //
    // `denyBodyPaths` is all-or-nothing, and for a credential endpoint that is
    // the wrong shape. /sessions/passcode/verify takes the PIN in and answers
    // `{ valid: false }` with HTTP 200 — deny both directions and a wrong
    // passcode is indistinguishable from a successful one in the log, which is
    // the exact failure this collector exists to catch. The secret is in the
    // request; the diagnosis is in the response.
    //
    // `denyBodyPaths` keeps its original meaning (both directions), and the
    // dashboard's remote denyPaths are untouched.
    const deniedReq = denied || (options.denyRequestBodyPaths?.some((re) => re.test(path)) ?? false);
    // ── end rdb LOCAL PATCH (2 of 2) ─────────────────────────────────────────
    let reqBody;
    let reqHeaders;
    if (!deniedReq && capBodies() && typeof init?.body === "string") {
      reqBody = scrub(init.body).slice(0, maxBody);
    }
    if (!deniedReq && capHeaders()) {
      const h = init?.headers instanceof Headers ? init.headers : init?.headers ? new Headers(init.headers) : input instanceof Request ? input.headers : void 0;
      reqHeaders = headersToObject(h, maxBody);
    }
    try {
      const response = await originalFetch(input, init);
      let body;
      if (capBodies() && !denied && // Reading the body consumes the stream, so work on a clone —
      // otherwise the collector would steal the response from the app
      // that asked for it, which is rule 1.
      response.body) {
        try {
          const text = await response.clone().text();
          body = scrub(text).slice(0, maxBody);
        } catch {
        }
      }
      const resHeaders = !denied && capHeaders() ? headersToObject(response.headers, maxBody) : void 0;
      const detail = reqHeaders || reqBody || resHeaders || body ? { reqHeaders, reqBody, resHeaders, resBody: body } : void 0;
      record({
        t: startedAt,
        kind: "fetch",
        method,
        path,
        status: response.status,
        ms: Date.now() - startedAt,
        body,
        detail,
        level: response.ok ? void 0 : "warn"
      });
      if (!response.ok) void flush(false);
      return response;
    } catch (err) {
      const { msg, name } = describe([err]);
      record({
        t: startedAt,
        kind: "fetch",
        method,
        path,
        status: 0,
        ms: Date.now() - startedAt,
        msg,
        name,
        level: "error",
        // The request still happened; only the response is missing. A
        // failed call is exactly when you want to see what was sent.
        detail: reqHeaders || reqBody ? { reqHeaders, reqBody } : void 0
      });
      void flush(false);
      throw err;
    }
  };
  window.addEventListener("__observe_note", (event) => {
    record({
      t: Date.now(),
      kind: "note",
      msg: scrub(String(event.detail)).slice(0, 2e3)
    });
  });
  window.addEventListener("__observe_screen", (event) => {
    record({
      t: Date.now(),
      kind: "screen",
      msg: scrub(String(event.detail)).slice(0, 2e3)
    });
  });
  window.addEventListener("__observe_corr", (event) => {
    correlation = String(event.detail).slice(0, 120);
    void flush(false);
  });
  void pollConfig();
  setInterval(() => void pollConfig(), 6e4);
  window.addEventListener("pagehide", () => void flush(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true);
  });
}
function note(msg) {
  window.dispatchEvent(new CustomEvent("__observe_note", { detail: msg }));
}
function screenMessage(text) {
  window.dispatchEvent(new CustomEvent("__observe_screen", { detail: text }));
}
function setCorrelation(value) {
  window.dispatchEvent(new CustomEvent("__observe_corr", { detail: value }));
}
export {
  note,
  observe,
  redactPath,
  screenMessage,
  scrub,
  setCorrelation
};
