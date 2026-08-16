# Web — Logout & Refresh Token API Integration

Integration contract for the web client. Covers `POST /auth/refresh` and `POST /auth/logout`.

> Responses on `/auth/*` are **raw** (no `{ data: ... }` envelope).
> Access token lifetime ≈ **15 min**; refresh token ≈ **30 days**.

---

## 1. Refresh Token API

### Request
```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "<current refresh token>" }
```
- **No `Authorization` header needed** (the refresh token in the body is the credential).

### Response `200`
```json
{
  "accessToken":  { "token": "eyJ...", "expiresAt": "2025-12-16T10:30:00.000Z" },
  "refreshToken": { "token": "eyJ...", "expiresAt": "2026-01-15T10:15:00.000Z" }
}
```

### Behavior you MUST handle
1. **Rotation** — every refresh returns a **new** access **and** a **new** refresh token. The refresh token you sent is now **dead**. Persist both new values immediately and discard the old refresh token.
2. **Reuse detection (critical)** — if you ever send a refresh token that was already rotated/revoked, the server treats it as a breach and **revokes the entire session** (all tokens). You'll get `401` and the user is logged out. Therefore:
   - **Serialize refreshes**: never fire two `/auth/refresh` calls with the same token. Use a single in-flight refresh promise and queue other requests behind it.
   - Always read the *latest* stored refresh token at call time.
3. On **`401`** from refresh → the session is gone (expired/revoked/reused). Clear all tokens and route to login. Do **not** retry.

### Errors
| Status | Meaning | Web action |
|---|---|---|
| `401` | invalid / expired / reused refresh token, or session revoked | Clear tokens → login screen |
| `400` | malformed body | Fix request |

### Recommended pattern (single-flight refresh)
```
let refreshing = null;
async function getValidAccessToken() {
  if (accessTokenNotExpiredWithSkew()) return accessToken;
  refreshing = refreshing ?? doRefresh();   // single in-flight call
  try { return await refreshing; } finally { refreshing = null; }
}
// On any API 401 (other than from /auth/refresh): await getValidAccessToken(), retry once.
```

---

## 2. Logout API

### Request
```http
POST /auth/logout
Authorization: Bearer <access token>
Content-Type: application/json

{ "refreshToken": "<current refresh token>" }
```
- Requires **both** the access token (header) **and** the refresh token (body).

### Response
- **`204 No Content`** on success.

### Behavior
- Revokes the refresh token **and** the bound session (server-side blacklist) → the access token also stops working **immediately** (not just at its 15-min expiry).
- **Scope: this session only.** Web logout does **not** end the app's session, and vice versa. (To end other sessions use the session-management endpoints, not logout.)
- After a `204`, **clear all locally stored tokens** and route to login.

### Errors / edge cases
| Status | Cause | Web action |
|---|---|---|
| `401` | access token already expired/invalid when calling logout | Either refresh first then logout, **or** just clear local tokens (the session will lapse on its own) |
| `204` | success | Clear tokens, go to login |

**Recommended:** if the access token is expired at logout time, call `/auth/refresh` once, then `/auth/logout` with the fresh tokens. If refresh also fails, the session is already dead — just clear local state.

---

## 3. Quick rules for web

- Store `accessToken.token`, `accessToken.expiresAt`, `refreshToken.token` after every login **and every refresh**.
- One refresh at a time; always use the newest refresh token.
- `401` from `/auth/refresh` = hard logout (don't loop).
- Logout = clear local tokens after `204`; it only ends the current web session.
