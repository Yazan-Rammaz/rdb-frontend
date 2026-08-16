# Face Re-Verification (Step-Up) — NestJS Backend Spec

**Audience:** NestJS backend owner (the service behind `RDB_BASE_URL`; not in this repo).
**Companion docs:** `FACE_REVERIFY_FLUTTER.md` (the shared client API), `KYC_REMOVE_VIDEO_BACKEND.md` (format & signing precedent).

## What this is

A fast "is this still you?" face check (like Face ID) that a gated action can demand
before completing. The client opens the camera, captures a straight-face selfie, and the
Cloudflare Worker compares it against the user's **enrolled KYC selfie** via AWS Rekognition
`CompareFaces` (plus an AWS liveness/quality gate). The Worker then submits a **signed**
result to NestJS.

```
Gated action (transfer / withdraw / forgot-passcode)
  └─ NestJS returns (HTTP 200): { stepUp: { method: 'face', challengeId, reason } }
       │
       ▼
  POST /api/kyc/reverify/start { challengeId }      → Worker validates challenge w/ NestJS, opens AWS session
  POST /api/kyc/reverify/verify { challengeId, … }  → Worker runs liveness + CompareFaces(enrolled selfie, live)
       └─ POST (signed) /kyc/reverify/commit { challengeId, livenessConfidence, faceMatchScore }
            → NestJS DECIDES, marks the challenge satisfied, mints a step token
  Client persists the step token → retries the gated action with X-Step-Token
```

## The one principle (carried over from KYC)

> **The pass/fail decision and the "challenge satisfied" state live ONLY in NestJS.**
> The Worker performs AWS liveness + CompareFaces and submits signed scores; NestJS decides
> with its own thresholds, marks the challenge satisfied, and mints the step token.

---

## 1. Challenge model

A short-lived `FaceStepUpChallenge`:

| field | notes |
|---|---|
| `id` | the `challengeId` returned to the client |
| `userId` | owner; validated on every Worker call |
| `action` | `'transfer' \| 'withdraw' \| 'forgot_passcode' \| …` (what it gates) |
| `reason` | human string surfaced in the UI (e.g. "High-value transfer") |
| `status` | `'pending' \| 'satisfied' \| 'failed' \| 'expired'` |
| `expiresAt` | ~10 minutes after issue |
| `attempts` | increment per commit; lock out after N (e.g. 3) |

The user must be an **approved KYC** account with a stored `selfieImageUrl`. If not, the gated
action should route to KYC onboarding, not step-up.

## 2. Issuing the challenge (gated actions)

When a gated action requires step-up, **return HTTP 200** with a step-up envelope instead of
completing the action:

```json
{ "stepUp": { "method": "face", "challengeId": "<uuid>", "reason": "high_value_transfer" } }
```

> Use **HTTP 200**, not 403. The web client extracts `stepUp` from the response body; a 4xx is
> collapsed to a generic error string by the shared fetch wrapper and the requirement is lost.
> The boolean convenience flags `requireFaceVerification: true` / `requireOtpVerification: true`
> (alongside a top-level `challengeId`) are also accepted by the client, but the `stepUp` object
> is preferred.

Affected endpoints (per policy): `POST /transfers/send`, the withdraw endpoint, and the
forgot-passcode initiator. The action must **refuse to complete** until the challenge is satisfied.

## 3. Endpoints NestJS must expose

### 3.1 `POST /kyc/reverify/{challengeId}/validate` — internal (called by the Worker)
- **Auth:** `X-Internal-Secret: <KYC_INTERNAL_SECRET>` (same secret/pattern as `/kyc/sessions/{id}/validate`).
- **Body:** `{ "userId": "<from JWT sub>" }`
- **Returns:** `200` when the challenge is `pending`, unexpired, and owned by `userId`; `401`/`410` otherwise.
- Called by the Worker on both `/reverify/start` and `/reverify/credentials`.

### 3.2 `GET /kyc/current` — already exists
Must include the approved record's `selfieImageUrl` (the **enrolled selfie**). The Worker fetches
this URL server-side and base64-encodes the bytes for `CompareFaces` — the selfie is **never sent
to the client**. If `selfieImageUrl` is a private/expiring URL the Worker cannot fetch with the
user's Bearer token, expose a dedicated internal endpoint that returns the bytes/base64 instead.

### 3.3 `POST /kyc/reverify/commit` — signed (called by the Worker)
- **Auth:** `Authorization: Bearer <user JWT>` **and** `X-KYC-Signature: sha256=<hmac>` over the
  JSON body using `KYC_SHARED_SECRET` — identical envelope to `/kyc/submit`
  (body includes `timestamp` + `nonce`; verify HMAC, reject stale/replayed nonces).
- **Body:** `{ challengeId, livenessConfidence, faceMatchScore, timestamp, nonce }`
- **Decision:**
  ```
  MIN_LIVENESS   = env KYC_REVERIFY_MIN_LIVENESS   (e.g. 80)
  MIN_FACE_MATCH = env KYC_REVERIFY_MIN_FACE_MATCH (e.g. 80)

  increment challenge.attempts
  if attempts > MAX (e.g. 3)                         → status='failed', reason='locked_out'
  else if livenessConfidence < MIN_LIVENESS          → status='failed', reason='liveness'
  else if faceMatchScore     < MIN_FACE_MATCH        → status='failed', reason='mismatch'
  else                                               → status='satisfied'
  ```
- **On `satisfied`:** mark the challenge satisfied and **mint a step token** (same shape/mechanism
  as the existing passcode/passkey step-up token, scoped to `{ userId, action, challengeId }`,
  single-use, short TTL).
- **Returns:**
  - pass → `{ "status": "passed", "stepToken": "<token>" }`
  - fail → `{ "status": "failed", "reason": "mismatch" | "liveness" | "locked_out" }`

### 3.4 Consuming the step token (retry of the gated action)
The web client persists the step token in the `rdb_step` cookie; the Next.js API proxy forwards
it to NestJS as **`X-Step-Token`** on the retried request (this repo's `apps/frontend/src/app/api/[...path]/route.ts`
now forwards it for all non-KYC calls). Flutter sends `X-Step-Token` directly.

The gated action (e.g. `POST /transfers/send`) must:
1. Read `X-Step-Token`; verify it is valid, unexpired, single-use, and scoped to this `userId` + `action`.
2. Confirm the linked challenge is `satisfied`.
3. Complete the action and **consume** the token + challenge (so it can't be replayed).

## 4. Contract the Worker sends (reference)

- `POST {RDB_BASE_URL}/kyc/reverify/{challengeId}/validate` — `X-Internal-Secret`, `{ userId }`.
- `GET  {RDB_BASE_URL}/kyc/current` — `Authorization: Bearer <jwt>` (reads `selfieImageUrl`).
- `POST {RDB_BASE_URL}/kyc/reverify/commit` — `Authorization: Bearer <jwt>` + `X-KYC-Signature`,
  body `{ challengeId, livenessConfidence, faceMatchScore, timestamp, nonce }`.

No new Worker secrets are required (reuses `KYC_INTERNAL_SECRET`, `KYC_SHARED_SECRET`, `AWS_*`).

## 5. Deployment ordering

Ship the NestJS changes **with or before** the client. Until `/kyc/reverify/commit` exists, the
Worker's `/reverify/verify` will get a non-2xx from NestJS and return an error; no gated action
will be falsely completed (the decision is server-side). In `AWS_MOCK` dev without
`KYC_SHARED_SECRET`, the Worker short-circuits to a mock pass so the UI can be exercised.

## 6. Test checklist

1. Gated transfer over policy → action returns `200 { stepUp: { method:'face', challengeId } }`.
2. `validate` → `200` for the owning user with an open challenge; `410` once expired.
3. `commit` with `faceMatchScore ≥ MIN` and `livenessConfidence ≥ MIN` → `{ status:'passed', stepToken }`.
4. `commit` with low `faceMatchScore` → `{ status:'failed', reason:'mismatch' }`.
5. `commit` with low `livenessConfidence` → `{ status:'failed', reason:'liveness' }`.
6. Retry `POST /transfers/send` with a valid `X-Step-Token` → completes; the token + challenge are single-use.
7. Replay the same step token → rejected.
8. Tamper with the signed body / reuse a nonce on `commit` → rejected.
