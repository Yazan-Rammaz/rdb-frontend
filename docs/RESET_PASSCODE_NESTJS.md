# Forget / Reset Passcode — NestJS Backend Spec

**Audience:** NestJS backend owner (the service behind `RDB_BASE_URL`; not in this repo).
**Companion docs:** `RESET_PASSCODE_BACKEND.md` (the concise frontend↔backend contract),
`FACE_REVERIFY_BACKEND.md` (face step-up precedent — reused by the *verified* branch),
`AUTH_LOGOUT_REFRESH_WEB.md` (session/cookie model).

## What this is

A passcode-recovery flow for a user who is signed in but forgot their passcode
(on web this is reached from the idle-lock screen, so the **session cookie still
identifies the user**). After tapping **Forget Passcode** the user sees an intro,
then the flow **branches on KYC status**:

```
POST /auth/reset-passcode/init
  ├─ user is currently locked out (prior quiz failures) → returns { lockout }
  ├─ isVerified (approved KYC)      → returns { isVerified:true, stepUp:{ face } }
  │      └─ Face Re-Verify (existing /kyc/reverify/*) → step token in rdb_step cookie
  └─ NOT verified                   → returns { isVerified:false }
         └─ phone → OTP → security quiz (questions, attempts, lockout from backend)
POST /auth/reset-passcode/complete  → overwrite the passcode, clear state → done
```

Both branches end at `POST /auth/reset-passcode/complete`, which **overwrites**
the existing passcode after the identity proof (face step token *or* a quiz
`resetToken`).

## The one principle (carried over from KYC / face step-up)

> **The pass/fail decision, attempt counters, and lockout timers live ONLY in
> NestJS.** The client renders what the backend returns and never decides
> whether a reset is allowed.

All endpoints are authenticated by the user's session (`JwtAuthGuard`, the
`rdb_at` bearer). No `userId` in any request body — resolve it from the JWT.
Requests arrive through the Next.js proxy (`/api/...` → NestJS), which also
forwards `X-Step-Token` (from the `rdb_step` cookie) on the `complete` call.

---

## 1. Data model

### 1.1 `ResetPasscodeSession` (new, short-lived — ~15 min)

| field | notes |
|---|---|
| `id` | session id |
| `userId` | owner; resolved from JWT on every call |
| `isVerified` | snapshot of KYC status at `init` |
| `phoneVerified` | set true after `verify-otp` passes (non-verified branch) |
| `otpSessionInfo` | provider session handle for the OTP (reuse existing OTP infra) |
| `questionSetId` | the quiz instance graded in `answers` |
| `quizAttempts` | failed quiz attempts in the **current** window (max 2) |
| `lockoutCount` | how many times this user has been locked out (drives escalation) |
| `lockedUntil` | timestamp; while in the future the user cannot attempt |
| `resetToken` | minted on quiz pass; single-use, scoped `{ userId, action:'reset_passcode' }`, ~10 min TTL |
| `status` | `'pending' \| 'otp_passed' \| 'quiz_passed' \| 'locked' \| 'completed' \| 'expired'` |
| `createdAt` / `updatedAt` | |

`quizAttempts`, `lockoutCount`, and `lockedUntil` must persist on the **user**
(or a durable per-user record), not only on the ephemeral session — otherwise a
user dodges lockout by restarting the flow. Keep the session for in-progress
state and store the lockout/attempt counters keyed by `userId`.

### 1.2 Verified branch reuses `FaceStepUpChallenge`

No new model for the verified branch. Issue a `FaceStepUpChallenge` (see
`FACE_REVERIFY_BACKEND.md` §1) with `action: 'forgot_passcode'` and reuse the
entire `/kyc/reverify/*` pipeline. The minted **step token** is the identity
proof consumed by `complete`.

---

## 2. Endpoints

### 2.1 `POST /auth/reset-passcode/init`
Auth: `JwtAuthGuard`. Body: none.

Logic:
1. Load the user + KYC status + persisted `lockedUntil` / `lockoutCount`.
2. If `lockedUntil` is in the future → return the lockout (do **not** branch):
   ```json
   { "isVerified": false, "lockout": { "lockedUntil": "<ISO>", "nextLockoutHours": 5 } }
   ```
3. Else create a `ResetPasscodeSession` (status `pending`) and:
   - If KYC **approved** with a stored enrolled selfie → also create a
     `FaceStepUpChallenge(action='forgot_passcode')` and return:
     ```json
     { "isVerified": true,
       "stepUp": { "method": "face", "challengeId": "<uuid>", "reason": "Confirm your identity to reset your passcode" } }
     ```
   - Else:
     ```json
     { "isVerified": false }
     ```

> Always **HTTP 200** with the envelope (never 4xx) — the shared web fetch
> wrapper collapses 4xx to a generic string and the branch data is lost.

### 2.2 `POST /auth/reset-passcode/send-otp`  *(non-verified branch)*
Auth: `JwtAuthGuard`. Body: `{ "phoneNumber": "+90…", "channel": "sms" | "whatsapp" }`.

1. Verify `phoneNumber` matches the signed-in user's registered number
   (reject mismatches — this is an identity confirmation step).
2. Send an OTP via the existing OTP provider (reuse `/auth/phone/send-otp`
   internals). Store the provider handle on the session as `otpSessionInfo`.
3. Return `{ "ok": true, "sessionInfo": "<opaque>" }` or `{ "ok": false, "error": "…" }`.

### 2.3 `POST /auth/reset-passcode/verify-otp`  *(non-verified branch)*
Auth: `JwtAuthGuard`. Body: `{ "phoneNumber": "+90…", "otpCode": "123456" }`.

1. Verify the OTP against `otpSessionInfo`. **Do not** log the user in or mint
   auth tokens — this only proves phone ownership for the reset.
2. On success set session `phoneVerified=true`, `status='otp_passed'`.
3. Return `{ "ok": true }` or `{ "ok": false, "error": "Invalid code" }`.

### 2.4 `GET /auth/reset-passcode/questions`  *(non-verified branch)*
Auth: `JwtAuthGuard`. Requires session `status='otp_passed'` (else `409`).

Return a knowledge-based quiz the backend can grade (see §3):
```json
{
  "questions": [
    { "id": "q-last-login", "text": "Do You Remember Your Last Login ?",
      "options": [ { "id": "hours", "label": "Hours Ago" }, { "id": "days", "label": "Days Ago" },
                   { "id": "weeks", "label": "Weeks Ago" }, { "id": "months", "label": "Months Ago" },
                   { "id": "dunno", "label": "I Don't Remember" } ] }
  ],
  "attemptsRemaining": 2
}
```
Persist the correct answers server-side against `questionSetId`. **Never** send
correctness to the client.

### 2.5 `POST /auth/reset-passcode/answers`  *(non-verified branch)*
Auth: `JwtAuthGuard`. Body: `{ "answers": [ { "questionId": "q-last-login", "optionId": "days" } ] }`.

Decision:
```
require session.status == 'otp_passed' and not currently locked
grade all answers against the stored set for questionSetId

if ALL correct:
    mint resetToken (single-use, scoped {userId, action:'reset_passcode'}, ~10 min)
    session.status = 'quiz_passed'; reset quizAttempts = 0
    → { success: true, attemptsRemaining: <MAX>, resetToken }

else:
    quizAttempts += 1
    remaining = MAX_ATTEMPTS (2) - quizAttempts
    if remaining > 0:
        → { success: false, attemptsRemaining: remaining }          // Image #4: one attempt left
    else:
        lockoutCount += 1
        hours = LOCKOUT_SCHEDULE[min(lockoutCount-1, len-1)]          // 5 → 12 → 2 → 2 …
        lockedUntil = now + hours
        quizAttempts = 0; session.status = 'locked'
        → { success: false, attemptsRemaining: 0, lockedUntil: "<ISO>", lockoutHours: hours }  // Image #5
```
`LOCKOUT_SCHEDULE = [5, 12, 2]` hours (env-overridable). `MAX_ATTEMPTS = 2`.

### 2.6 `POST /auth/reset-passcode/complete`  *(both branches)*
Auth: `JwtAuthGuard`. Body: `{ "passcode": "1234", "resetToken": "<optional>" }`.
The verified branch carries no `resetToken`; instead the proxy forwards the face
**`X-Step-Token`** header (from the `rdb_step` cookie).

1. Accept the reset **only** if one identity proof is valid:
   - `resetToken` is valid, unexpired, single-use, scoped `{userId, action:'reset_passcode'}`, and its session is `quiz_passed`; **or**
   - `X-Step-Token` is valid, unexpired, single-use, scoped `{userId, action:'forgot_passcode'}`, and its `FaceStepUpChallenge` is `satisfied`.
   Otherwise `403`.
2. **Overwrite** the user's passcode (set the new bcrypt hash). This is a
   *change*, not a first-time set — do **not** route through the first-time
   `/sessions/passcode/set` path that rejects with `ALREADY_SET`.
3. **Consume** the proof (resetToken / step token + challenge) so it can't be
   replayed. Clear `quizAttempts`, `lockedUntil`, and the session
   (`status='completed'`). Optionally reset `lockoutCount` to 0 on success.
4. Return `{ "success": true }` or `{ "success": false, "error": "…" }`.

After this the next app-lock unlock verifies the new passcode via the existing
`POST /sessions/passcode/verify`. The client does not store any local PIN hash.

---

## 3. Where the quiz questions come from

The scenario uses **knowledge-based authentication (KBA)** — questions only the
real account owner can answer, graded against the user's actual data:

- **Last login** → bucket the real `lastLoginAt` into Hours/Days/Weeks/Months;
  the correct option is the bucket that matches.
- **Last transfer purpose / amount range / recipient** → from transaction history.
- **Account age** → from `createdAt`.
- **Registered city / branch** → from the profile.

Generate 3–5 questions per set from data the user reasonably remembers, store
the correct `optionId`s against `questionSetId`, and grade server-side. Include
plausible distractors and an "I Don't Remember" option (always graded wrong).

A simpler v1 is acceptable: an admin-curated question bank with stored answers.
The endpoint contract is identical either way — only the source of truth differs.

---

## 4. Environment / config

| var | purpose | example |
|---|---|---|
| `RESET_PASSCODE_MAX_ATTEMPTS` | wrong quiz attempts before lockout | `2` |
| `RESET_PASSCODE_LOCKOUT_HOURS` | escalation schedule (CSV) | `5,12,2` |
| `RESET_PASSCODE_SESSION_TTL_MIN` | in-progress session lifetime | `15` |
| `RESET_PASSCODE_TOKEN_TTL_MIN` | `resetToken` lifetime | `10` |
| `RESET_PASSCODE_QUESTION_COUNT` | questions per set | `3` |

Verified branch reuses the existing face step-up envs
(`KYC_REVERIFY_MIN_LIVENESS`, `KYC_REVERIFY_MIN_FACE_MATCH`, `KYC_*` secrets) —
nothing new there.

---

## 5. Suggested module layout

```
auth/reset-passcode/
  reset-passcode.module.ts
  reset-passcode.controller.ts      // the 6 endpoints in §2 (JwtAuthGuard)
  reset-passcode.service.ts         // init/branch, OTP glue, quiz grading, lockout, complete
  quiz/quiz.service.ts              // KBA question generation + grading (§3)
  entities/reset-passcode-session.entity.ts
  dto/*.dto.ts                      // SendOtp, VerifyOtp, SubmitAnswers, Complete
```
Reuse existing providers: the OTP service (`send-otp`/`verify-otp` internals),
the passcode service (add a `changePasscode(userId, newPin)` that overwrites),
the step-token service (validate/consume), and the face step-up module.

---

## 6. Deployment ordering & frontend toggle

- The web client ships with a **mock** (`apps/frontend/src/services/resetPasscode/resetPasscodeApi.ts`)
  enabled by default. Once these endpoints are live, the web team sets
  `NEXT_PUBLIC_RESET_PASSCODE_MOCK=0` to use the real backend.
- Ship `complete`'s proof-consumption and the lockout persistence **before**
  flipping the toggle; until then no reset can complete (the decision is
  server-side, so nothing is bypassed).
- The verified branch additionally needs the face `/kyc/reverify/*` pipeline
  already described in `FACE_REVERIFY_BACKEND.md`, with `action='forgot_passcode'`.

---

## 7. Test checklist

1. `init` for a **verified** user → `200 { isVerified:true, stepUp:{method:'face',challengeId} }`.
2. `init` for a **non-verified** user → `200 { isVerified:false }`.
3. `init` for a **locked** user → `200 { lockout:{ lockedUntil, nextLockoutHours } }` (no branch).
4. `send-otp` with a number that doesn't match the user → rejected.
5. `verify-otp` with the right code → `{ ok:true }`, session `otp_passed`; wrong code → `{ ok:false }`. No auth tokens minted.
6. `questions` before `otp_passed` → `409`.
7. `answers` all correct → `{ success:true, resetToken }`.
8. `answers` first wrong → `{ success:false, attemptsRemaining:1 }`.
9. `answers` second wrong → `{ success:false, lockedUntil, lockoutHours:5 }`; subsequent lockouts escalate `12`, then `2`.
10. Restarting the flow while `lockedUntil` is in the future still returns the lockout (no attempt dodging).
11. `complete` with a valid quiz `resetToken` → passcode overwritten; token single-use (replay → `403`).
12. `complete` with a valid face `X-Step-Token` (verified branch) → passcode overwritten; token + challenge single-use.
13. `complete` with no/invalid proof → `403`, passcode unchanged.
14. After a successful reset, unlocking with the **new** passcode via `/sessions/passcode/verify` succeeds; the **old** one fails.
