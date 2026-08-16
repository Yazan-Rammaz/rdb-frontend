# Reset Passcode — Web Integration Guide

**Audience:** Web / frontend team integrating with the NestJS backend.
**Backend spec:** `RESET_PASSCODE_NESTJS.md` · required scenarios: `RESET_PASSCODE_REQUIRED_PLAN.md` · face branch: `FACE_REVERIFY_BACKEND.md`.

A signed-in user who forgot their app-lock passcode recovers it here. Every call
is authenticated — you never send a `userId`. The flow branches on **KYC status**
and on **which screen the user came from**.

> **All decisions are server-side.** The client only renders what the backend
> returns (lockout, attempts, branch) — it never decides whether a reset is allowed.

---

## 0. The four scenarios

| # | User | Entry screen | Flow |
|---|---|---|---|
| 1 | Not verified | **Idle-lock** (logged in) | send OTP → verify OTP → answer questions → set new passcode |
| 2 | Not verified | **Mid-login** (passcode step) | **answer questions directly** → set new passcode *(no OTP — the login OTP just passed)* |
| 3 | Verified | **Idle-lock** | face re-verify → set new passcode |
| 4 | Verified | **Mid-login** | **face re-verify** (since 2026-07-16) → set new passcode — see `RESET_PASSCODE_STEP_FACE_WEB_INTEGRATION.md`; quiz endpoints return `409` for verified sessions |

If the mid-login **step token expires** during the flow, every `step/*` call
returns `401` — restart the login (new OTP) to get a fresh step token, then call
`step/init` again. Quiz attempts/lockouts are durable server-side, so nothing is
lost or dodged by restarting.

---

## 0.1 Two entry points / two endpoint sets

The two screens hold **different credentials**, so the backend exposes two
parallel endpoint sets with identical bodies/responses — only the **base path**
and the **bearer** differ:

| Entry point | Credential | Endpoint set | Bearer |
|---|---|---|---|
| **Idle / app-lock** (ACTIVE session) | access token `rdb_at` | `/api/auth/reset-passcode/*` | `Authorization: Bearer <rdb_at>` (auto via proxy/cookie) |
| **Login passcode step** (`status:'requires_passcode'`) | the 10-min **`stepToken`** from the login response | `/api/auth/reset-passcode/step/*` | `Authorization: Bearer <stepToken>` |

Key behavioural differences of the **step set**:

- `step/init` returns `{ isVerified:false }` for non-verified users; since
  2026-07-16 it returns the **face branch** (`isVerified:true` + `stepUp`) for
  KYC-verified users with a selfie — full contract in
  `RESET_PASSCODE_STEP_FACE_WEB_INTEGRATION.md` (face proof travels in the
  `X-Face-Step-Token` header on `step/complete`; Worker commits to
  `/kyc/reverify/step/commit`).
- **No OTP step needed**: the session starts with the phone already considered
  verified (the login OTP just passed), so go **straight from `step/init` to
  `step/questions`**. `step/send-otp` / `step/verify-otp` exist but are unnecessary.
- After a successful `step/.../complete`, return the user to the login passcode
  step and submit the **new** passcode to `POST /sessions/step/passcode/verify`
  (the stepToken is still valid) to finish logging in.

## 0.2 Other conventions

- **Base path:** call through the Next.js proxy at `/api/...` → NestJS.
- **Always HTTP 200** on these endpoints (even lockout / branch / failures) —
  read the JSON envelope, not the status code. Exceptions: `questions` → `409`
  before the quiz is available, `complete` → `403` on a bad proof, step set →
  `401` on an expired stepToken.
- **Step token cookie:** the face branch writes its step token to the `rdb_step`
  cookie; the proxy forwards it as `X-Step-Token` on `complete`. You don't touch it.
- **Mock toggle:** the web client ships with a mock
  (`apps/frontend/src/services/resetPasscode/resetPasscodeApi.ts`) enabled by
  default. Set `NEXT_PUBLIC_RESET_PASSCODE_MOCK=0` once integrating live.

---

## 1. Flow at a glance

```
IDLE-LOCK (rdb_at)                          MID-LOGIN (stepToken)
POST /auth/reset-passcode/init              POST /auth/reset-passcode/step/init
  ├─ locked  → { lockout } ── countdown       ├─ locked → { lockout } ── countdown
  ├─ verified→ { stepUp:{ face } }            └─ always → { isVerified:false }
  │     └─ face re-verify → rdb_step               └─ GET step/questions   ← no OTP
  └─ not verified → { isVerified:false }           └─ POST step/answers → resetToken
        └─ send-otp → verify-otp
              └─ questions → answers → resetToken

POST …/complete { passcode, resetToken? }   ← both sets, both branches
  (face branch: X-Step-Token forwarded automatically instead of resetToken)
```

---

## 2. Endpoints

### 2.1 `POST …/init`
Body: none. Three possible 200 responses:

```jsonc
// a) currently locked out (prior quiz failures)
{ "isVerified": false, "lockout": { "lockedUntil": "2026-06-10T19:00:00.000Z", "nextLockoutHours": 5 } }

// b) verified + IDLE-LOCK SET ONLY → face branch
{ "isVerified": true,
  "stepUp": { "method": "face", "challengeId": "<uuid>", "reason": "Confirm your identity to reset your passcode" } }

// c) quiz branch (not verified on either set; ALWAYS on the step set)
{ "isVerified": false }
```

Client handling:
- `lockout` present → show countdown to `lockedUntil`, block the flow.
- `stepUp.method === 'face'` → run the face flow (§3) with `challengeId`.
- otherwise → quiz branch: **idle-lock set** continues at §2.2 (OTP);
  **step set** skips straight to §2.4 (`step/questions`).

### 2.2 `POST /auth/reset-passcode/send-otp` *(idle-lock set only)*
Body: `{ "phoneNumber": "+90…", "channel": "sms" | "whatsapp" }`

The phone **must match** the signed-in user's registered number.

```jsonc
{ "ok": true,  "sessionInfo": "<opaque>" }
{ "ok": false, "error": "…" }                  // mismatch / provider error
```

### 2.3 `POST /auth/reset-passcode/verify-otp` *(idle-lock set only)*
Body: `{ "phoneNumber": "+90…", "otpCode": "123456" }`

Proves phone ownership only — **no login, no auth tokens minted.**

```jsonc
{ "ok": true }
{ "ok": false, "error": "Invalid code" }
```

### 2.4 `GET …/questions`
Idle-lock set: requires the OTP step passed (else `409`). Step set: available
right after `step/init`.

```jsonc
{
  "questions": [
    {
      "id": "q-last-login",
      "text": "Do You Remember Your Last Login ?",
      "options": [
        { "id": "hours",  "label": "Hours Ago" },
        { "id": "days",   "label": "Days Ago" },
        { "id": "weeks",  "label": "Weeks Ago" },
        { "id": "months", "label": "Months Ago" },
        { "id": "dunno",  "label": "I Don't Remember" }
      ]
    }
    // … RESET_PASSCODE_QUESTION_COUNT questions (default 3)
  ],
  "attemptsRemaining": 2
}
```

Question titles are fixed; **options vary per user** (computed from real account
data). "I Don't Remember" is always present and always wrong.

| id | title | options |
|---|---|---|
| `q-last-login` | Do You Remember Your Last Login ? | Hours / Days / Weeks / Months Ago · I Don't Remember |
| `q-account-age` | How Long Ago Did You Create And Sign Up Your Account With Us? | Days / Weeks / Months / Years · I Don't Remember |
| `q-largest-amount` | What Is The Largest USD Amount That Has Reached Your Account? (Deposit / Transfer) | No USD · 1–1000 · 1000–10,000 · Over 10,000 · I Don't Remember |
| `q-last-tx-amount` | Choose Your Last Transaction From The List | real amount + 3 distractors (shuffled) · I Don't Remember |
| `q-last-tx-type` | What Was The Transaction? | Deposit / Transfer / Payment · I Don't Remember |
| `q-center-deposit` | Have You Personally, Even Once, Made A Deposit At One Of Our Centers? | Yes / No / More Than Once · I Don't Remember |

> Render exactly the `questions[]` the backend returns — never assume which
> subset/order. Send back the `option.id` the user picked, not the label.
> **v1 note:** `q-center-deposit` is not served yet (no data source).

### 2.5 `POST …/answers`
Body: `{ "answers": [ { "questionId": "q-last-login", "optionId": "days" } ] }`

Graded server-side — all answers must be correct. Three outcomes (all HTTP 200):

```jsonc
// all correct → proof minted, go to complete
{ "success": true,  "attemptsRemaining": 2, "resetToken": "<token>" }

// wrong, still inside the two free attempts
{ "success": false, "attemptsRemaining": 1 }

// wrong, now locked (see §4 for the schedule)
{ "success": false, "attemptsRemaining": 0, "lockedUntil": "2026-06-10T19:00:00.000Z", "lockoutHours": 5 }
```

### 2.6 `POST …/complete` *(both sets, both branches)*
Body: `{ "passcode": "1234", "resetToken": "<optional>" }` (passcode = 4–6 digits)

- **Quiz branch:** include the `resetToken` from §2.5.
- **Face branch:** omit `resetToken`; the proxy forwards the face `X-Step-Token`
  (from the `rdb_step` cookie) automatically.

Exactly one valid proof is required, or `403`.

```jsonc
{ "success": true }
```

On success the passcode is **overwritten**, all lockout/attempt state is
cleared, and the proof is consumed (single-use — replaying it → `403`).
The next unlock verifies the new passcode via the existing
`POST /sessions/passcode/verify` (idle-lock) or
`POST /sessions/step/passcode/verify` (mid-login).

---

## 3. Verified branch — Face Re-Verify (idle-lock set only)

From `init` you receive `stepUp.challengeId`.

1. Run the standard face step-up client flow with that `challengeId`
   (`POST /api/kyc/reverify/start` → camera → `POST /api/kyc/reverify/verify`).
2. On success the backend mints a **step token** into the `rdb_step` cookie.
3. Call **`complete`** with just the new passcode — the proxy attaches
   `X-Step-Token` for you.

If the face check fails, surface the failure; `complete` will `403` without a
valid proof.

---

## 4. Quiz attempts & lockout (what the UI must render)

- **2 direct attempts, no timer.**
- From then on each wrong answer triggers a single escalating lockout and each
  unlock grants exactly **one** attempt:

| Attempt # | Allowed |
|---|---|
| 1st, 2nd | immediately |
| 3rd | after **5 hours** |
| 4th | after **12 hours** |
| 5th | after **24 hours** |
| 6th+ | after **24 hours** each (repeats) |

- `attemptsRemaining` semantics: `2 → 1` inside the free window; **`1`** after
  every unlock (one shot before the next lockout); locked responses carry
  `lockedUntil` + `lockoutHours` instead.
- Counters are **durable per user** — restarting the flow, the app, or the
  login does not reset them. `init` keeps returning the `lockout` envelope
  until `lockedUntil` passes.
- A successful reset (`complete`) clears all counters.

---

## 5. Error & edge handling (client checklist)

| Situation | Backend signal | UI |
|---|---|---|
| Locked at start | `init` → `lockout` | Countdown to `lockedUntil`, disable flow |
| Wrong phone | `send-otp` → `{ ok:false }` | Inline error, allow re-enter |
| Wrong OTP | `verify-otp` → `{ ok:false }` | Inline error, allow retry |
| Quiz before OTP (idle-lock set) | `questions` → `409` | Route back to OTP step |
| Quiz wrong (free attempts left) | `answers` → `attemptsRemaining ≥ 1` | Show remaining attempts |
| Quiz wrong (locked) | `answers` → `lockedUntil`, `lockoutHours` | Countdown, escalating 5/12/24h |
| Step token expired (step set) | any `step/*` → `401` | Restart login OTP → new stepToken → `step/init` |
| Invalid/expired/replayed proof | `complete` → `403` | Generic "could not verify", restart |
| Face check failed | face `verify` non-pass | Retry per face-flow rules |

---

## 6. Happy-path sequences

**#1 — Not verified, idle-lock:**
```
init → { isVerified:false }
send-otp → { ok:true } → verify-otp → { ok:true }
questions → answers → { success:true, resetToken }
complete { passcode, resetToken } → { success:true }
```

**#2 / #4 — Mid-login (any KYC status):**
```
step/init → { isVerified:false }
step/questions → step/answers → { success:true, resetToken }
step/complete { passcode, resetToken } → { success:true }
POST /sessions/step/passcode/verify { passcode }   ← finish the login
```

**#3 — Verified, idle-lock:**
```
init → { isVerified:true, stepUp:{ challengeId } }
face reverify (challengeId) → step token in rdb_step cookie
complete { passcode } → { success:true }            ← X-Step-Token auto-forwarded
```

---

## 7. Config

| var | meaning |
|---|---|
| `NEXT_PUBLIC_RESET_PASSCODE_MOCK` | `1` (default) uses the local mock; `0` hits the live backend |

Backend-side tuning (read-only to web, explains observed values):
`RESET_PASSCODE_MAX_ATTEMPTS=2` (free attempts),
`RESET_PASSCODE_LOCKOUT_HOURS=5,12,24` (wait before the 3rd/4th/5th attempt,
last value repeats), `RESET_PASSCODE_SESSION_TTL_MIN=15`,
`RESET_PASSCODE_TOKEN_TTL_MIN` → `STEP_TOKEN_TTL_MIN=10`,
`RESET_PASSCODE_QUESTION_COUNT=3`.
