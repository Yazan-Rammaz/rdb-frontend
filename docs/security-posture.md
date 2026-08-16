# RDB Frontend — Security Posture & Pre-Scan Assessment

_Last updated: 2026-07-19. Scope: the `rdb` Cloudflare Worker frontend
(`apps/frontend`), deployed via OpenNext. Written ahead of a professional
security assessment._

---

## 1. Executive summary

The RDB web app's **substantive** security posture is strong: tokens live only
in httpOnly cookies, access tokens are short-lived with rotation + reuse
detection, sensitive operations require step-up auth (passcode / face
re-verify), and the API surface is fronted by an opaque gateway. The main gaps a
scanner or red-team will raise are **infrastructure/presentation**, not logic:

1. The app is served from a **free-host subdomain** (`*.workers.dev`,
   previously `*.pages.dev`) — the single biggest "looks like phishing" signal.
2. **Security-response headers** were previously absent — now added (see §3).

Neither reflects a vulnerability in the app logic, but both are standard
findings for a banking product and should be closed before the engagement.

---

## 2. What already protects the app (state these to the assessors)

| Control | Implementation |
|---|---|
| Token secrecy | `rdb_at` / `rdb_rt` are **httpOnly, Secure, SameSite=Strict** cookies — never in JS or response bodies. |
| Short-lived access + rotation | ~15-min access token; single-flight silent refresh via the gateway; refresh-token **reuse detection** revokes the session. |
| Step-up auth | Passcode + WebAuthn/biometric unlock; **face re-verify** for sensitive actions; idle auto-lock. |
| Server-side authz | All authorization enforced by NestJS per-resource, not by UI gating. |
| Endpoint opacity | Server Actions + the `/api/p` gateway (see §4) hide the REST endpoint map from the Network tab. |
| Session integrity | Session-takeover detection (`session:revoked_by_new_login`), per-session id cookie. |
| Real client IP pinning | `X-Client-IP` forwarded to NestJS for geo checks (edge-safe; not spoofable via `cf-connecting-ip`). |

---

## 3. Security-response headers (added 2026-07-19)

Configured in `apps/frontend/next.config.ts` via `headers()`, applied to every
route on the Worker. Verify with `curl -I https://<host>/auth`.

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | see below | Limits script sources / exfil / injection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS, block downgrade |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME-sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage |
| `Permissions-Policy` | `camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), browsing-topics=()` | Restrict powerful features (camera/mic kept for KYC) |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cross-origin isolation |
| `X-DNS-Prefetch-Control` | `off` | Reduce metadata leakage |

**CSP directive set:** `default-src 'self'`; `object-src 'none'`;
`frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`;
`script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:`;
`style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob: https:`;
`media-src 'self' blob: https:`; `connect-src 'self' https: wss:`;
`frame-src 'self' https:`; `worker-src 'self' blob:`; `upgrade-insecure-requests`.

**Known CSP weaknesses (documented, intentional for now):**
- `'unsafe-inline'` + `'unsafe-eval'` in `script-src` are required by Next.js App
  Router hydration and the KYC SDKs (WASM/liveness/avatar). A scanner will flag
  these. **Hardening path:** migrate to a **nonce-based** CSP and pin the exact
  SDK hosts, then drop `'unsafe-*'`.
- `connect-src`/`img-src`/`media-src`/`frame-src` use `https:`/`wss:` rather than
  an explicit allow-list, so the NestJS API, socket.io, Cloudinary/S3, and the
  face-verify SDKs keep working without per-host tuning. **Hardening path:**
  replace `https:`/`wss:` with the concrete origins (NestJS base, KYC worker,
  socket host, media CDNs) once that list is frozen.
- Consider promoting to `Content-Security-Policy-Report-Only` alongside a
  reporting endpoint first if you want to tighten without risking KYC breakage.

---

## 4. API surface opacity (Server Actions + `/api/p` gateway)

- **Data operations** (`useActions()` layer) run as Next.js **Server Actions**
  (`NEXT_PUBLIC_USE_SERVER_ACTIONS=true`) — they appear in the Network tab as
  opaque `POST /<page>` requests with a hashed `Next-Action` id, not named REST
  routes.
- **Session/auth plumbing** (session-complete, token save/refresh, passcode
  verify, profile, passkey, KYC status…) routes through a single opaque gateway
  **`POST /api/p`** with a 2-letter opcode in the body (`src/lib/p.ts`,
  `src/app/api/p/route.ts`). The original named routes (`/api/auth/*`,
  `/api/sessions/*`, `/api/profile/*`) now **404 on direct access** — only the
  gateway (internal `x-pg` marker) reaches them.

> **Honest framing for the assessors:** this is **obfuscation, not a security
> control**. Request/response bodies remain visible in the user's own DevTools —
> that is unavoidable on the web platform. The value is a smaller, harder-to-map
> attack surface; the real security is the server-side authorization, which is
> unchanged. Do not present endpoint hiding as a mitigating control.

---

## 5. Open items / recommendations (priority order)

1. **Move off `*.workers.dev` to a branded, registered domain** (e.g.
   `app.ramaaz.<tld>`) bound to the Worker as a custom domain. Removes the
   largest anti-phishing / reputation red flag for a banking product. _(Infra/DNS
   decision — owner action.)_
2. **Tighten CSP** to nonces + explicit host allow-list; drop `'unsafe-eval'`
   where the SDKs permit. _(Follow-up eng task.)_
3. **Rate limiting / WAF / bot-fight** on the Worker route and the NestJS origin;
   lock the NestJS origin to Cloudflare-only ingress (shared-secret header or
   authenticated origin pull) so the API is not directly reachable.
4. **Verify cookie flags in production** (`Secure` requires `NODE_ENV=production`
   — confirm the Worker build sets it) and confirm `SameSite=Strict` doesn't
   break any legitimate cross-site return flow.
5. **Dependency & secret hygiene**: `npm audit` in CI; confirm no secrets in the
   client bundle (only `NEXT_PUBLIC_*` are inlined — audit that list).

---

## 6. Quick verification commands

```bash
# Headers present on the deployed Worker
curl -sI https://rdb.yazan-adnof.workers.dev/auth | grep -iE \
  'content-security|strict-transport|x-frame|x-content|referrer|permissions-policy'

# Endpoint opacity: named routes hidden, gateway reachable
curl -s -o /dev/null -w '%{http_code}\n' https://rdb.yazan-adnof.workers.dev/api/profile/me      # want 404
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' \
  -d '{"o":"me"}' https://rdb.yazan-adnof.workers.dev/api/p                                       # want 401 pre-login
```
