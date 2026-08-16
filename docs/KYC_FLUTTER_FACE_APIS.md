# KYC Face APIs — Flutter Integration (compare-face + face re-verification)

**Audience:** Flutter app developers.
**Base URL:** `https://api.ramaaz-digital-bank.online`
**Status:** reflects what is **deployed to production now** (compare-face error codes + single-frame
re-verification). Companion: `KYC_FLUTTER_INTEGRATION.md` (full onboarding flow).

> **Golden rule:** these endpoints return **HTTP 200 with a `status`/`code` body even on logical
> failure.** Branch on the JSON `code`, **not** the HTTP status. A non-200 (4xx/5xx) means a
> transport/validation problem, not a face-logic result.

All images are **base64 data URLs** — `data:image/jpeg;base64,<...>` — and must be:
- **JPEG or PNG** (not HEIC/WebP — AWS rejects those),
- **under 5 MB** decoded,
- each containing a **clear, detectable face** where a face is expected.

```dart
String toDataUrl(Uint8List jpeg) => 'data:image/jpeg;base64,${base64Encode(jpeg)}';
```

---

## 1. Face match — `POST /api/kyc/compare-face`

Compares the **photo cropped from the ID** against the **selfie**. (Auth not required; sending the
`Bearer` token is harmless.)

### Request
```jsonc
POST /api/kyc/compare-face
Content-Type: application/json
{
  "idFaceImageData": "data:image/jpeg;base64,<CROPPED ID PHOTO — must contain a face>",
  "selfieImageData": "data:image/jpeg;base64,<SELFIE — must contain a face>"
}
```

⚠️ **`idFaceImageData` must be the face crop from the ID** (the person's photo on the card), **not**
the whole ID card, not the back side, not a blank crop. `selfieImageData` is the live selfie. Most
`FACE_NOT_DETECTED` / 500 errors come from sending the wrong image here.

### Responses (read `code`)
| HTTP | `status` / `code` | Meaning | What to do |
|---|---|---|---|
| 200 | `status:"success"` + `matchScore` | Faces match | Proceed |
| 200 | `code:"FACE_MISMATCH"` | Faces don't match | Ask user to retry |
| 200 | `code:"FACE_NOT_DETECTED"` | No face in the ID photo or selfie | Re-capture; check `idFaceImageData` is a face crop |
| 200 | `code:"INVALID_IMAGE"` | Not JPEG/PNG | Re-encode as JPEG |
| 200 | `code:"IMAGE_TOO_LARGE"` | Over 5 MB | Send a tighter crop |
| 400 | `code:"INTERNAL_ERROR"` | `selfieImageData`/`idFaceImageData` missing | Fix the request body |
| 500 | `code:"INTERNAL_ERROR"` + **`detail`** | Unexpected AWS error | Read `detail` for the exact cause |

```jsonc
// success
{ "status": "success", "matchScore": 87.3, "message": "Face matched successfully." }
// logical failure (still HTTP 200)
{ "status": "error", "code": "FACE_NOT_DETECTED", "message": "No face detected in the ID photo or the selfie..." }
```

---

## 2. Face re-verification (step-up "Face ID") — single-frame, **same as web**

Used when a gated action (transfer / withdraw / forgot-passcode) requires a fresh face check. The
NestJS backend returns a step-up requirement carrying a **`challengeId`**. The client runs a quick
face check; the Worker compares the live face against the user's **enrolled KYC selfie** and commits
a signed result to NestJS, which decides pass/fail.

> ✅ **Use the SINGLE-FRAME path** (send `liveFaceImageData`). This is exactly what the web app does.
> ❌ **Do NOT send `sessionId`** and **do NOT call `/reverify/credentials`** — those are only for the
> AWS Amplify streaming Face Liveness UI, which has **no Flutter component**, so the session never
> reaches `SUCCEEDED` and you get `LIVENESS_FAILED`.

### ⛔ The exact mistake to fix — `sessionId` vs `liveFaceImageData`

If you send `sessionId`, the verify body is treated as the **streaming** path and fails. Send a
captured selfie frame instead:

```jsonc
// ❌ WRONG — what produces { code: "LIVENESS_FAILED", livenessStatus: "CREATED" }
POST /api/kyc/reverify/verify
{ "challengeId": "abc", "sessionId": "<from /reverify/start>" }

// ✅ RIGHT — single-frame, works exactly like web
POST /api/kyc/reverify/verify
{ "challengeId": "abc", "liveFaceImageData": "data:image/jpeg;base64,/9j/4AAQSk..." }
```

**Decode the failure you're seeing** (`{ code: "LIVENESS_FAILED", livenessStatus: "CREATED", confidence: 0 }`):

| `livenessStatus` | What it means | Fix |
|---|---|---|
| **`CREATED`** ← you are here | A session was created via `/reverify/start` but **no liveness video was ever streamed** — i.e. you sent `sessionId` to verify. | **Send `liveFaceImageData` instead of `sessionId`.** |
| `IN_PROGRESS` | Streaming started but never finished | Same fix — use single-frame |
| `EXPIRED` | Session too old / reused | Single-frame has no session to expire |
| `FAILED` | A genuine liveness failure | Only reachable on the streaming path |
| *(absent)* | You're on the single-frame path | If you still fail, it's `FACE_NOT_DETECTED` (no clear face) |

> **`livenessStatus: "CREATED"` literally means "you never sent a face image."** The `sessionId` from
> Step 1 is **not** used on the single-frame path — ignore it.

These routes **require the `Bearer` token** (they accept it for native clients).

### The 3 steps (mirror of the web flow)
```jsonc
// Step 1 — validate the challenge
POST /api/kyc/reverify/start
Authorization: Bearer <jwt>
{ "challengeId": "<from the gated action>" }
//  → { "sessionId": "...", "region": "us-east-1", "mock": false }   // ignore these for single-frame

// Step 2 — capture ONE straight-face selfie frame from the camera (data URL)

// Step 3 — verify with that single frame
POST /api/kyc/reverify/verify
Authorization: Bearer <jwt>
{
  "challengeId": "<same id>",
  "liveFaceImageData": "data:image/jpeg;base64,<straight-face selfie>"
}
```

### Step 3 responses (read `status`/`code`, HTTP is 200)
```jsonc
// passed
{ "status": "passed", "stepToken": "<carry on the retried action>", "faceMatchScore": 91.2, "livenessConfidence": 88.0 }
// failed (decided by NestJS)
{ "status": "failed", "reason": "..." }
// logical error
{ "status": "error", "code": "FACE_NOT_DETECTED", "message": "No face detected — face the camera in good light." }
{ "status": "error", "code": "LIVENESS_FAILED",   "message": "Liveness check did not succeed.", "livenessStatus": "CREATED", "confidence": 0 }
```

- On `status:"passed"` → take `stepToken` and **send it on the retried gated action** (transfer/withdraw/etc.).
- `livenessStatus` (on `LIVENESS_FAILED`) only appears on the streaming path — if you see it, you're
  still sending `sessionId`; switch to `liveFaceImageData`. `CREATED`/`IN_PROGRESS` = the streaming
  session was never completed.

---

## 3. Forget-passcode (face) — the **full 3-call flow**

Reverify alone does **not** reset the passcode — it only proves the face. The full
forget-passcode flow is **3 calls across 2 backends**, and it's identical to what the web app does:

| # | Call | Backend | Returns |
|---|---|---|---|
| 1 | `POST /auth/reset-passcode/init` | **NestJS** (direct) | `challengeId` |
| 2 | `POST /api/kyc/reverify/verify` | **Worker** (`api.ramaaz-digital-bank.online`) | `stepToken` |
| 3 | `POST /auth/reset-passcode/complete` | **NestJS** (direct) | `success` |

```
Flutter ─(1 init)──────────────────▶ NestJS        → challengeId
Flutter ─(2 reverify + selfie)─────▶ Worker (AWS)  → stepToken
                                       └ Worker signs result ▶ NestJS (marks challenge satisfied)
Flutter ─(3 complete + X-Step-Token)▶ NestJS        → passcode reset ✅
```

> **`{NEST}`** below = the NestJS base URL you already use for login (NOT `api.ramaaz-digital-bank.online`,
> which only serves `/api/kyc/*`). Only **reverify** goes to the Worker — because the face compare needs
> AWS, which only the Worker has. `init` and `complete` are plain NestJS.

```http
# 1) Start the reset → get the face challenge
POST {NEST}/auth/reset-passcode/init
Authorization: Bearer <user JWT>
# → { "isVerified": true, "stepUp": { "method": "face", "challengeId": "<uuid>" } }

# 2) Face check (Worker) → get the step token  (see §2)
POST https://api.ramaaz-digital-bank.online/api/kyc/reverify/verify
Authorization: Bearer <user JWT>
{ "challengeId": "<uuid>", "liveFaceImageData": "data:image/jpeg;base64,..." }
# → { "status": "passed", "stepToken": "<uuid>" }

# 3) Set the new passcode → proof goes in the HEADER, NOT the body
POST {NEST}/auth/reset-passcode/complete
Authorization: Bearer <user JWT>
X-Step-Token: <stepToken from step 2>
Content-Type: application/json
{ "passcode": "999999" }
# → { "success": true }
```

### ⛔ The mistake that returns `403 "Invalid or expired reset proof"`
`complete` accepts **two kinds of proof** — and the face branch uses the **header**, not the body:

| Branch | Where the proof goes | `resetToken` in body? |
|---|---|---|
| **Face** (this flow) ✅ | **`X-Step-Token` header** = the reverify `stepToken` | ❌ **omit it** |
| Quiz (KBA questions) | body `{ passcode, resetToken }` | ✅ |

```jsonc
// ❌ WRONG — face stepToken stuffed into the quiz field → 403 "Invalid or expired reset proof"
POST {NEST}/auth/reset-passcode/complete
{ "passcode": "999999", "resetToken": "<stepToken>" }

// ✅ RIGHT — face branch: stepToken in the header, body is just the passcode
POST {NEST}/auth/reset-passcode/complete
Headers: { "X-Step-Token": "<stepToken>" }
{ "passcode": "999999" }
```

Also note: the `stepToken` is **single-use** with a short TTL — use the one from the **most recent**
`passed` reverify, and call `complete` promptly (reusing or delaying → also `403`).

---

## 4. Dart client (Dio)

```dart
class KycFaceApi {
  final Dio _dio; // baseUrl = https://api.ramaaz-digital-bank.online, Bearer interceptor attached
  KycFaceApi(this._dio);

  /// Returns matchScore on success, or throws with the server `code`.
  Future<double> compareFace({required String idFaceDataUrl, required String selfieDataUrl}) async {
    final r = await _dio.post('/api/kyc/compare-face', data: {
      'idFaceImageData': idFaceDataUrl,
      'selfieImageData': selfieDataUrl,
    });
    final body = r.data as Map<String, dynamic>;
    if (body['status'] == 'success') return (body['matchScore'] as num).toDouble();
    throw KycFaceError(body['code'] ?? 'INTERNAL_ERROR', body['message'] ?? '', body['detail']);
  }

  /// Step-up face re-verification (single-frame). Returns a stepToken on success.
  Future<String> reverify({required String challengeId, required String liveFaceDataUrl}) async {
    await _dio.post('/api/kyc/reverify/start', data: {'challengeId': challengeId});
    final r = await _dio.post('/api/kyc/reverify/verify', data: {
      'challengeId': challengeId,
      'liveFaceImageData': liveFaceDataUrl, // single-frame — never send sessionId
    });
    final body = r.data as Map<String, dynamic>;
    if (body['status'] == 'passed' && body['stepToken'] != null) return body['stepToken'] as String;
    throw KycFaceError(body['code'] ?? body['status'] ?? 'error', body['message'] ?? body['reason'] ?? '', body['livenessStatus']);
  }
}

/// Full forget-passcode (face) flow — spans BOTH backends:
///   nestDio → NestJS (your login backend): init + complete
///   faceApi → Worker (api.ramaaz-digital-bank.online): reverify
Future<void> resetPasscodeWithFace({
  required Dio nestDio,        // existing NestJS client, Bearer attached
  required KycFaceApi faceApi, // the Worker client above
  required String newPasscode,
  required Future<String> Function() captureSelfieDataUrl, // → data:image/jpeg;base64,...
}) async {
  // 1) NestJS: start the reset → get the face challenge
  final init = await nestDio.post('/auth/reset-passcode/init');
  final challengeId = init.data['stepUp']?['challengeId'] as String?;
  if (init.data['isVerified'] != true || challengeId == null) {
    throw KycFaceError('NOT_VERIFIED', 'Face reset not available for this account.');
  }

  // 2) Worker: face check → stepToken
  final selfie = await captureSelfieDataUrl();
  final stepToken = await faceApi.reverify(challengeId: challengeId, liveFaceDataUrl: selfie);

  // 3) NestJS: set the new passcode — proof in the HEADER, NOT resetToken in the body
  await nestDio.post(
    '/auth/reset-passcode/complete',
    data: {'passcode': newPasscode}, // no resetToken on the face branch
    options: Options(headers: {'X-Step-Token': stepToken}),
  );
}

class KycFaceError implements Exception {
  final String code; final String message; final dynamic detail;
  KycFaceError(this.code, this.message, [this.detail]);
  @override String toString() => 'KycFaceError($code): $message${detail != null ? " [$detail]" : ""}';
}
```

---

## 5. Troubleshooting quick table

| Symptom | Cause | Fix |
|---|---|---|
| compare-face → `FACE_NOT_DETECTED` (or old 500) | `idFaceImageData` isn't a face crop / no face in selfie | Send the **ID photo crop** + a clear selfie |
| compare-face → `INVALID_IMAGE` | HEIC/WebP | Encode as JPEG |
| compare-face → `IMAGE_TOO_LARGE` | > 5 MB | Tighter crop / lower quality |
| reverify → `LIVENESS_FAILED` with `livenessStatus: CREATED/IN_PROGRESS` | Sending `sessionId` (streaming) | Switch to `liveFaceImageData` (single-frame) |
| reverify → `FACE_NOT_DETECTED` | Selfie has no clear face / poor light | Re-capture straight-on in good light |
| complete → `403 "Invalid or expired reset proof"` | Sent the face `stepToken` as `resetToken` in the body (quiz shape) | Send it as the **`X-Step-Token` header**; body is just `{ passcode }` |
| complete → `403` even with the header | `stepToken` reused or expired (single-use, short TTL) | Use the `stepToken` from the **latest** `passed` reverify; call `complete` promptly |
| Any → 401 | Missing/expired Bearer | Attach a valid `Authorization: Bearer` (and for `complete`, on NestJS not the Worker) |
