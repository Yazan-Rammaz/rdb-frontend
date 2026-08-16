# Reset Passcode — Backend Contract (NestJS)

> **Backend team:** the full implementation spec (data model, per-endpoint
> logic, lockout/quiz rules, module layout, test checklist) is in
> **`RESET_PASSCODE_NESTJS.md`**. This file is the quick wire-level contract.

The web "Forget / Reset Passcode" flow is implemented on the frontend with a
mock service (`apps/frontend/src/services/resetPasscode/resetPasscodeApi.ts`).
This document defines the endpoints NestJS must expose so the frontend can drop
the mock by setting `NEXT_PUBLIC_RESET_PASSCODE_MOCK=0`.

All endpoints are **authenticated via the session cookie** (`rdb_at`). The user
is already signed in — they only locked themselves out / forgot the passcode —
so the backend resolves the user from the session; no `userId` in the body.
Requests go through the existing Next.js proxy (`/api/...` → NestJS).

The pass/fail decision, attempt counters, and lockout timers live **only** in
NestJS. The frontend just renders what the backend returns.

## Flow overview

```
tap "Forget Passcode"
  └ POST /auth/reset-passcode/init
        ├ lockout present        → show lockout countdown
        ├ isVerified: true       → Face Re-Verify (existing /kyc/reverify/*),
        │                          then POST /auth/reset-passcode/complete
        └ isVerified: false      → phone → OTP → quiz
                                     POST /auth/reset-passcode/send-otp
                                     POST /auth/reset-passcode/verify-otp
                                     GET  /auth/reset-passcode/questions
                                     POST /auth/reset-passcode/answers
                                       ├ success → complete
                                       ├ 1 fail  → "one attempt left"
                                       └ 2 fail  → lockout (5h → 12h → 2h …)
  └ POST /auth/reset-passcode/complete  → new passcode set → home
```

## Endpoints

### POST `/auth/reset-passcode/init`
Starts a reset session and reports the branch.

Response:
```jsonc
{
  "isVerified": true,
  // present only when isVerified — a face step-up challenge
  "stepUp": { "method": "face", "challengeId": "<uuid>", "reason": "Confirm your identity" },
  // present only when the user is currently locked out from prior failures
  "lockout": { "lockedUntil": "2026-06-10T19:30:00.000Z", "nextLockoutHours": 5 }
}
```
Verified branch reuses the existing Face Re-Verify pipeline
(`/kyc/reverify/start` + `/kyc/reverify/verify` + commit). On pass, the frontend
persists the step token to `rdb_step` and calls `complete`.

### POST `/auth/reset-passcode/send-otp`
Body: `{ "phoneNumber": "+90...", "channel": "sms" | "whatsapp" }`
Verifies the number matches the signed-in user's registered number, sends an OTP.
Response: `{ "ok": true, "sessionInfo": "<opaque>" }` or `{ "ok": false, "error": "..." }`.

### POST `/auth/reset-passcode/verify-otp`
Body: `{ "phoneNumber": "+90...", "otpCode": "123456" }`
Response: `{ "ok": true }` or `{ "ok": false, "error": "Invalid code" }`.
On success the backend records that the phone step passed for this reset session.

### GET `/auth/reset-passcode/questions`
Returns the security quiz. Questions/options are backend-defined.
```jsonc
{
  "questions": [
    { "id": "q-last-login", "text": "Do You Remember Your Last Login ?",
      "options": [ { "id": "hours", "label": "Hours Ago" }, { "id": "days", "label": "Days Ago" } ] }
  ],
  "attemptsRemaining": 2
}
```

### POST `/auth/reset-passcode/answers`
Body: `{ "answers": [ { "questionId": "q-last-login", "optionId": "days" } ] }`
The backend grades the full set.
```jsonc
// all correct
{ "success": true,  "attemptsRemaining": 2, "resetToken": "<short-lived token>" }
// first failure (one attempt left → Image #4)
{ "success": false, "attemptsRemaining": 1 }
// out of attempts → lockout (Image #5)
{ "success": false, "attemptsRemaining": 0,
  "lockedUntil": "2026-06-10T19:30:00.000Z", "lockoutHours": 5 }
```
Lockout escalation is backend policy. Reference schedule: **1st lockout 5h,
2nd 12h, 3rd+ 2h.** Two wrong attempts per lockout window.

### POST `/auth/reset-passcode/complete`
Body: `{ "passcode": "1234", "resetToken": "<from answers, optional>" }`
Verified path carries the face step token in the `rdb_step` cookie instead of a
`resetToken`. The backend validates the proof (face step token **or** quiz
`resetToken`), sets the new passcode, and clears attempt/lockout state.
Response: `{ "success": true }` or `{ "success": false, "error": "..." }`.

## Notes
- `resetToken` and the face step token are single-use and short-lived (~10 min).
- `complete` must **overwrite** an existing passcode (the user already has one).
  Do not route this through the first-time `/sessions/passcode/set` endpoint,
  which rejects with `ALREADY_SET`. PIN verification is server-side bcrypt —
  there is no client-side hash, so the frontend only calls `complete`.
- After `complete` succeeds the frontend calls `confirmUnlock()` (client lock
  state) and navigates home; the next lock verifies via `/sessions/passcode/verify`.
- Mock toggle: `NEXT_PUBLIC_RESET_PASSCODE_MOCK` (default on / `!= "0"`).
