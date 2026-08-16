# Web Client — Session Redesign Integration Guide

This describes the backend changes from the single-active-session redesign (and the
preceding auth hardening) and **exactly what the web client must do**.

> Companion doc for mobile: `SESSION_REDESIGN_APP_GUIDE.md`. Full spec: `SESSION_SINGLE_ACTIVE_SESSION_PLAN.md`.

---

## 1. What changed (web-relevant)

- **One active session globally.** A user can now have only ONE active session at a time (web **or** app). The **app is the primary device**: when the app logs in or "switches back", the **web session is revoked**.
- **`platform` is now required** on login. Web must send `platform: "web"`.
- **Web is never "locked".** Web is only `active` or `revoked`. (Locking/parking applies to the app only.)
- **Web login while the app is active needs app approval** (existing behavior, now strict): the web waits for the app to approve before it gets tokens.
- **Short-lived access tokens (15 min)** with refresh-token rotation + reuse detection. The web must refresh on `401` and must always use the latest refresh token.
- Tokens are now bound to a session and carry `iss`/`aud`/`jti`. **All existing tokens are invalidated on deploy** → users will be logged out once and must re-login.

---

## 2. Web to-do checklist

1. **Send `platform: "web"`** on every login call (`/auth/phone/verify`, `/auth/phone/login-with-id-token`).
2. **Implement silent refresh**: on any `401`, call `POST /auth/refresh` with the current refresh token, store the **new** access+refresh tokens, retry the request. If refresh returns `401`, clear tokens and route to login.
3. **Never reuse an old refresh token.** Rotation invalidates the previous one; sending a used refresh token triggers **server-side reuse detection that kills the whole session** (you'll be logged out everywhere). Always persist and send the most recent refresh token; serialize refresh calls (no parallel refreshes).
4. **Handle "your session ended" events** (WS + the `401` fallback) and log the user out — see §4.
5. **QR login** (web generates QR): unchanged transport, see §5.
6. **Phone-OTP login while the app is active**: handle the `requires_approval` response — see §6.

---

## 3. Login — required `platform`

```http
POST /auth/phone/verify
{ "phoneNumber": "...", "otpCode": "...", "action": "signIn", "platform": "web" }
```
```http
POST /auth/phone/login-with-id-token      # trydos-otp
{ "mobile_phone": "...", "otp_id_token": "...", "platform": "web" }
```
`platform` is now **required** — requests without it return `400`.

---

## 4. WebSocket / revocation events the web MUST handle

Connect to the authenticated sessions namespace with the access token. Log the user out (clear tokens, redirect to login) on any of these:

| Event | Meaning |
|---|---|
| `session:revoked_by_switch` | The app "switched back" and took over → **web session revoked**. |
| `session:revoked_by_new_login` | A newer login on the same platform replaced this one. |
| `session:revoked` | This session was revoked (e.g. from another device's "log out this session"). |
| `session:all_revoked` | All other sessions revoked (password change/reset, "log out other devices"). |

**Always also treat a `401` that does not recover via refresh as a logout** — WS may be down; the revoked-session check on the API is the source of truth.

---

## 5. QR login (web generates the QR)

Unchanged transport, still valid:

1. `POST /auth/qr/session` → `{ linkId, qrToken, subscribeSecret, expiresAt, refreshIntervalMs, wsNamespace: "/auth-link" }`. Render `qrToken` as the QR.
2. Connect WS namespace `/auth-link` with `{ linkId, subscribeSecret }`.
3. Rotate the QR via `GET /auth/qr/refresh?linkId&subscribeSecret` every `refreshIntervalMs`.
4. On WS event **`qr:approved { sessionToken }`** → call `POST /auth/session/complete { sessionToken }` → receive `{ user, accessToken, refreshToken, sessionId }`.

> New side effect (no web change needed): when the app approves the QR, **the app parks itself (LOCKED)** and your web session becomes the sole active session. The user can later switch back on the app, which will revoke this web session (you'll get `session:revoked_by_switch`).

---

## 6. Phone-OTP login while the app is active (approval)

If you call `/auth/phone/verify` (`platform: "web"`) and the user has an **active app**, the response is **not** tokens — it's an approval request:

```json
{ "status": "requires_approval", "stepToken": "...", "requestId": "...", "expiresAt": "..." }
```

Web then:
1. Show "Check your phone to approve this login".
2. Poll `GET /sessions/step/approval/{requestId}` with `Authorization: Bearer {stepToken}` until `status: "approved"` (it returns a `sessionToken`). (Approval expires in ~3 min → handle `expired`/`rejected`.)
3. `POST /auth/session/complete { sessionToken }` → tokens.

If the user's app is **not** active (only parked/none), the verify call returns tokens directly (no approval).

---

## 7. Mental model for web

- Web is a **guest** session: it exists only while it's the single active session.
- The app can revoke web at any time (app login, or app "switch back"). Web must react gracefully (logout UI), never assume its token is still valid without handling `401`/revocation events.
- There is **no** "locked web" state and **no** switch-to-web button on web — to get web again after the app takes over, the user logs in on web again (which will re-trigger app approval if the app is active).
