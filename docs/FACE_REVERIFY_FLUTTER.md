# Face Re-Verification (Step-Up) — Flutter Integration

**Audience:** Flutter app developers. **No UI is shared** — build native screens; the Cloudflare
Worker endpoints below are the shared contract (the web app uses the exact same ones).
**Companion doc:** `FACE_REVERIFY_BACKEND.md` (the NestJS side).

## Base URL & auth

- All endpoints are under the same origin that serves `/api/kyc/*` (the Cloudflare Worker).
- The web app authenticates with the `rdb_at` cookie. **Flutter has no cookie jar, so send the
  JWT as a header:** `Authorization: Bearer <access token>`. The Worker accepts either.

## The flow

```
1. Call the gated action (transfer / withdraw / forgot-passcode) as usual.
   If NestJS responds (HTTP 200) with:
     { "stepUp": { "method": "face", "challengeId": "<id>", "reason": "<why>" } }
   → step-up is required. (Also accepted: { "requireFaceVerification": true, "challengeId": "<id>" }.)

2. POST /api/kyc/reverify/start { challengeId }           → { sessionId, region, mock }

3. Run AWS Face Liveness (straight face only):
   • Use the AWS Amplify Face Liveness Flutter SDK with the sessionId + region,
     fetching temporary AWS credentials from
       GET /api/kyc/reverify/credentials?challengeId=<id>  → { accessKeyId, secretAccessKey, sessionToken? }
   • OR (fast path / no streaming) capture a single straight-face JPEG and skip step 3's SDK.

4. POST /api/kyc/reverify/verify { challengeId, sessionId }            (streaming path)
                              or { challengeId, liveFaceImageData }    (single-frame path; data URL)
   → { status: 'passed' | 'failed' | 'error', reason?, code?, message?, stepToken?, faceMatchScore?, livenessConfidence? }

5. On status === 'passed': retry the original gated action, adding header
     X-Step-Token: <stepToken>
   NestJS verifies the token, completes the action, and consumes it (single-use).
```

The reference image is the user's **enrolled KYC selfie**, fetched server-side by the Worker —
the client never receives it. The pass/fail decision is made only in NestJS.

## Endpoint contracts

### `POST /api/kyc/reverify/start`
Validate the challenge and open an AWS Face Liveness session.
- **Headers:** `Authorization: Bearer <jwt>`, `Content-Type: application/json`
- **Body:** `{ "challengeId": "<id>" }`
- **200:** `{ "sessionId": "<aws-or-mock>", "region": "us-east-1", "mock": false }`
- **401:** missing/invalid token, or invalid/expired challenge. **422:** `challengeId` missing.

### `GET /api/kyc/reverify/credentials?challengeId=<id>`
Temporary AWS credentials for the Amplify Face Liveness SDK (streaming path only).
- **Headers:** `Authorization: Bearer <jwt>`
- **200:** `{ "accessKeyId": "...", "secretAccessKey": "...", "sessionToken": "..." }` (`sessionToken` optional)
- **401:** invalid token / challenge. **422:** `challengeId` missing.

### `POST /api/kyc/reverify/verify`
Run liveness + CompareFaces and commit the signed result to NestJS.
- **Headers:** `Authorization: Bearer <jwt>`, `Content-Type: application/json`
- **Body (choose one path):**
  - Streaming: `{ "challengeId": "<id>", "sessionId": "<from start>" }`
  - Single-frame: `{ "challengeId": "<id>", "liveFaceImageData": "data:image/jpeg;base64,…" }`
- **200 (pass):** `{ "status": "passed", "stepToken": "<token>", "faceMatchScore": 96.2, "livenessConfidence": 98.1 }`
- **200 (fail):** `{ "status": "failed", "reason": "mismatch" | "liveness" | "locked_out" }`
- **200 (error):** `{ "status": "error", "code": "LIVENESS_FAILED" | "FACE_NOT_DETECTED" | "NO_ENROLLED_SELFIE" | "INTERNAL_ERROR", "message": "…" }`
- **503:** signing not configured on the server (deployment issue).

## Retrying the gated action

After a `passed` result, retry the original request and include the step token:

```
POST /transfers/send
Authorization: Bearer <jwt>
X-Step-Token: <stepToken from /reverify/verify>
{ …original transfer body, SAME idempotencyKey… }
```

Reuse the **same idempotency key** as the first attempt so the backend dedups instead of creating
a second transfer.

## Notes

- **Straight face only** — no left/right head-turn challenges. AWS Face Liveness is passive
  (oval-fit + colour flash); the single-frame path is just one well-lit frontal frame.
- **Budget:** the single-frame path is the fastest way to stay near ~5s end-to-end. AWS Face
  Liveness streaming adds ~2–4s; use it where higher assurance is needed.
- **Mock mode:** when the server runs with `AWS_MOCK != 'false'`, `start` returns
  `{ mock: true }` and `verify` returns a synthetic pass — use this to build/test the UI without AWS.
- Handle `status: 'error'` with `code: 'NO_ENROLLED_SELFIE'` by routing the user to KYC onboarding.
