# KYC — Flutter Integration Guide (No Video Interview)

**Audience:** Flutter app developers integrating onboarding KYC against the RDB Cloudflare
Worker (the same `/api/kyc/*` surface the web app uses).
**Companion docs:** `KYC_REMOVE_VIDEO_FRONTEND.md`, `KYC_REMOVE_VIDEO_BACKEND.md`, `nestjs_kyc.md`.
**Branch:** `kyc-no-video-call`.

The live **video interview was removed**. KYC now completes at the **face-match → submit**
step. The verification decision (`approved` / `pending` / `rejected`) is made **only** in the
NestJS backend. The client just captures images, gets scores, submits, and renders whatever
status the backend returns. **Never decide pass/fail on the device.**

```
intro → ID front → ID back → ID summary → liveness (face-detection) → face-match → submit → success
                                                                                          │
                                                                          GET /kyc/status (verified?)
```

---

## 1. Base URL & auth model

All endpoints live under the Worker at **`{WORKER_ORIGIN}/api/kyc/...`** (same origin that
serves the web app). Use the same origin your Flutter app already calls for other RDB APIs.

Auth differs **per route** — this is the single most important thing to get right:

| Route | Auth required | How the Worker reads it today |
|---|---|---|
| `POST /api/kyc/session` | ✅ user | **`rdb_at` cookie only** |
| `GET  /api/kyc/status` | ✅ user | **`rdb_at` cookie only** |
| `GET  /api/kyc/current` | ✅ user | **`rdb_at` cookie only** |
| `POST /api/kyc/submit` | ✅ user | **`rdb_at` cookie only** |
| `POST /api/kyc/analyze-id` | ❌ open | — |
| `POST /api/kyc/liveness` | ❌ open | — |
| `POST /api/kyc/compare-face` | ❌ open | — |
| `POST /api/kyc/reverify/*` | ✅ user | **`Authorization: Bearer` _or_ cookie** |

> ⚠️ **Action item for the backend team.** The four authed *onboarding* routes
> (`session`, `status`, `current`, `submit`) currently accept **only the `rdb_at` cookie**
> (`getCookie(c, 'rdb_at')` in `packages/backend-api/src/routes/kyc.ts`). The Face
> Re-Verification routes already accept a `Bearer` token (`reverifyToken()`), so the pattern
> exists. **Pick one before Flutter ships:**
>
> 1. **Add Bearer support** to `session` / `status` / `current` / `submit` (mirror
>    `reverifyToken(c)`). Recommended — native apps have no cookie jar. **OR**
> 2. **Send the cookie** from Flutter: attach `Cookie: rdb_at=<accessToken>` on those four
>    requests (e.g. a Dio interceptor). Works today with no backend change, but couples the
>    app to cookie semantics.
>
> The open routes (`analyze-id`, `liveness`, `compare-face`) need no auth header.

All image fields are **base64 data URLs**: `data:image/jpeg;base64,<...>`. Send and expect
that exact format (the Worker strips the `data:` prefix server-side on upload).

---

## 2. The flow, step by step

### Step 0 — Pre-check status & start a session

On entering the KYC screen:

1. `GET /api/kyc/status`. If `status == "verified"` → user is already verified, skip the flow.
   If `status == "pending"` → there is **no in-app step to resume** (video is gone) and the
   backend blocks re-submission while pending → send the user to home with an "under review"
   note. `rejected` or `not_submitted` → proceed.
2. `POST /api/kyc/session` → keep `sessionId`. You **must** have a fresh `sessionId` to submit;
   a session is **single-use** (spent once `submit` reaches NestJS — a retry needs a new one).

```
POST /api/kyc/session            →  { "sessionId": "...", "expiresAt": "ISO-8601" }
GET  /api/kyc/status             →  { "status": "verified|pending|rejected|not_submitted",
                                      "statusLabel": "...", "expiresAt": null, "rejectionReason": null }
```

### Step 1 — Capture & analyze the ID (front, then back)

Capture a frame from the camera, send it as a data URL. **Poll** `analyze-id` on a live
camera feed until `status == "success"` (mock returns `not_found` for the first ~2 calls; the
real Textract path returns `error` with a `code` when the card is unreadable / wrong side).

```
POST /api/kyc/analyze-id
{ "imageData": "data:image/jpeg;base64,...", "side": "front", "sessionHint": "<sessionId or any stable key>" }
```

Response (`AnalyzeIdResult`):

```jsonc
{
  "status": "success",            // "not_found" | "error" | "success"
  "code": "WRONG_SIDE",           // only when status=="error"
  "message": "…user-facing…",     // only when status=="error"
  "nextStep": "REQUIRE_BACK",     // "REQUIRE_BACK" | "COMPLETE" (success only)
  "croppedImageData": "data:image/jpeg;base64,...",  // use this as the stored front/back image
  "idFaceImageData": "data:image/jpeg;base64,...",   // FRONT only — the ID photo crop, needed for face-match
  "side": "front",
  "extractedData": {
    "idType": "Personal Identity ID", "country": "Syria",
    "name": "Mohammad De Bruijn", "firstName": "Mohammad", "lastName": "De Bruijn",
    "nationalNumber": "0998...", "documentNumber": "0998...",
    "birthday": "01.01.1999", "expiryDate": "01.01.2030"
  }
}
```

Rules:
- `nextStep == "REQUIRE_BACK"` → run **back** capture next (`side: "back"`).
- `nextStep == "COMPLETE"` on the **front** means it is a **passport** → skip the back step.
- Keep from the FRONT result: `croppedImageData` (→ `frontImageData`), `idFaceImageData`,
  and the whole `extractedData`. From the BACK result keep `croppedImageData` (→ `backImageData`).
- `error` codes to surface as guidance: `WRONG_SIDE`, `INVALID_ID_TYPE`, `MISSING_CRITICAL_DATA`,
  `NO_TEXT_DETECTED`, `SPOOFING_DETECTED`.

### Step 2 — ID summary

Show `extractedData` (name, ID number, birthday, expiry, country) for the user to confirm.
No network call — just a review screen before liveness.

### Step 3 — Liveness (face-detection)

Two options — pick based on whether AWS Face Liveness streaming is available on device:

**(a) Simple single-frame liveness (recommended baseline, matches the web fallback):**

```
POST /api/kyc/liveness
{ "faceImageData": "data:image/jpeg;base64,...", "challengeStep": "look_straight", "crop": true }
→ { "isLive": true, "challengeStep": "look_straight",
    "metrics": { "confidence": 96.4, "yaw": 2.1, "eyesOpen": true, "brightness": 180, "sharpness": 42, "sunglasses": false },
    "faceImageData": "data:image/jpeg;base64,<cropped selfie>",
    "reason": null }
```

- Poll on the live camera until `isLive == true`. `reason` tells the user what to fix
  (`too_dark`, `too_blurry`, `not_facing_camera`, `eyes_closed`, `sunglasses_detected`,
  `no_face_detected`).
- **Keep** the returned `faceImageData` (the cropped selfie) and `metrics.confidence` — both
  are needed at submit time. If the server returns no crop, fall back to the frame you sent.

**(b) AWS streaming Face Liveness (higher assurance):** `POST /api/kyc/liveness-aws` to create
a session, `POST /api/kyc/liveness-credentials` (cookie-authed, body `{ kycSessionId }`) to vend
temp AWS creds for the Amplify FaceLivenessDetector, then `GET /api/kyc/liveness-aws?sessionId=…`
→ `{ status, confidence, livenessImageData }`. Use `confidence` as `livenessConfidence` and
`livenessImageData` as the selfie. Only do this if you have an Amplify/Rekognition liveness
widget on the Flutter side; otherwise use (a).

### Step 4 — Face match (selfie vs ID photo)

```
POST /api/kyc/compare-face
{ "selfieImageData": "<liveness faceImageData>", "idFaceImageData": "<front idFaceImageData>" }
→ success:  { "status": "success", "matchScore": 87.3, "message": "Face matched successfully." }
→ failure:  { "status": "error", "code": "FACE_MISMATCH" | "FACE_NOT_DETECTED" | "INTERNAL_ERROR", "message": "…" }
```

- On `status == "success"` keep `matchScore` → it becomes `selfieVsIdScore` at submit.
- On `error`, show `message` and let the user retry liveness (do **not** submit). The threshold
  is enforced server-side; the device never decides.

### Step 5 — Submit

This is the only write that creates the KYC request. Send everything collected:

```
POST /api/kyc/submit            // cookie-authed (see §1)
{
  "kycSessionId":      "<from Step 0>",
  "frontImageData":    "data:image/jpeg;base64,...",   // front croppedImageData
  "backImageData":     "data:image/jpeg;base64,...",   // omit for passports
  "selfieImageData":   "data:image/jpeg;base64,...",   // liveness faceImageData
  "selfieVsIdScore":   87.3,                            // compare-face matchScore
  "livenessConfidence": 96.4,                           // liveness metrics.confidence (0–100)
  "extracted": {
    "idType":         "Personal Identity ID",
    "country":        "Syria",
    "name":           "Mohammad De Bruijn",            // person's full name (NOT the doc-type label)
    "nationalNumber": "0998...",                        // send the same value in both number fields
    "documentNumber": "0998...",
    "birthday":       "01.01.1999",
    "expiryDate":     "01.01.2030"
  }
}
→ { "success": true, "kycRequest": { "id": "...", "status": "approved|pending|rejected", "rejectionReason": null, "fullName": "..." } }
```

Decision handling (the backend is the source of truth):
- `status == "rejected"` → show failure with `kycRequest.rejectionReason` (e.g. *"Selfie does
  not match ID photo"*, *"Document is expired"*). Let the user restart (new session).
- `status == "approved"` or `"pending"` → go to the **success** screen.
- Non-2xx → the body carries `{ error, detail }`; show a retry. A **single-use** session is
  spent on a successful POST — start a **new** session before retrying a fresh submit.

> The web app sends `livenessConfidence` so NestJS can factor liveness in now that video is
> gone. Send it whenever you have it. If you omit it, the backend decides on selfie/expiry only.

### Step 6 — Confirm status

After success, optionally `GET /api/kyc/status` to read the final state. NestJS maps
`approved → "verified"`; once that lands, show the Verified badge. While `decide()` resolves to
`pending` (e.g. backend not yet deployed — see `KYC_REMOVE_VIDEO_BACKEND.md`) the user reaches
success but stays unverified. App access is **not** gated on KYC, so this lag is cosmetic.

---

## 3. Suggested Dart models & client

Minimal sketch (use `dio` or `http`; swap in your existing token/cookie interceptor):

```dart
class KycSession { final String sessionId; final String expiresAt;
  KycSession.fromJson(Map<String,dynamic> j) : sessionId=j['sessionId'], expiresAt=j['expiresAt']; }

class AnalyzeIdResult {
  final String status;           // not_found | error | success
  final String? code, message, nextStep, croppedImageData, idFaceImageData;
  final Map<String,dynamic>? extractedData;
  AnalyzeIdResult.fromJson(Map<String,dynamic> j)
    : status=j['status'], code=j['code'], message=j['message'], nextStep=j['nextStep'],
      croppedImageData=j['croppedImageData'], idFaceImageData=j['idFaceImageData'],
      extractedData=(j['extractedData'] as Map?)?.cast<String,dynamic>();
}

class KycStatus { final String status, statusLabel; final String? rejectionReason;
  KycStatus.fromJson(Map<String,dynamic> j)
    : status=j['status'], statusLabel=j['statusLabel'], rejectionReason=j['rejectionReason']; }

class KycApi {
  final Dio _dio;                       // baseUrl = WORKER_ORIGIN; auth interceptor attached
  KycApi(this._dio);

  Future<KycSession> startSession() async =>
    KycSession.fromJson((await _dio.post('/api/kyc/session')).data);

  Future<KycStatus> status() async =>
    KycStatus.fromJson((await _dio.get('/api/kyc/status')).data);

  Future<AnalyzeIdResult> analyzeId(String imageDataUrl, String side, String hint) async =>
    AnalyzeIdResult.fromJson((await _dio.post('/api/kyc/analyze-id',
      data: {'imageData': imageDataUrl, 'side': side, 'sessionHint': hint})).data);

  Future<Map<String,dynamic>> liveness(String faceDataUrl, {String step='look_straight'}) async =>
    (await _dio.post('/api/kyc/liveness',
      data: {'faceImageData': faceDataUrl, 'challengeStep': step, 'crop': true})).data;

  Future<Map<String,dynamic>> compareFace(String selfie, String idFace) async =>
    (await _dio.post('/api/kyc/compare-face',
      data: {'selfieImageData': selfie, 'idFaceImageData': idFace})).data;

  Future<Map<String,dynamic>> submit(Map<String,dynamic> payload) async =>
    (await _dio.post('/api/kyc/submit', data: payload)).data;
}

String toDataUrl(Uint8List jpeg) => 'data:image/jpeg;base64,${base64Encode(jpeg)}';
```

---

## 4. Gotchas

- **Single-use session.** Re-running `submit` after a successful POST needs a fresh
  `POST /api/kyc/session`. The "Missing verification data" / spent-session class of bugs comes
  from reusing a consumed `sessionId`.
- **Passport = no back side.** When the front result returns `nextStep == "COMPLETE"`, skip the
  back capture and **omit** `backImageData` from submit.
- **`name` vs `idName`.** Submit the person's full name (`extractedData.name`), never the
  document-type label (`idType`/`idName` like "PASSPORT").
- **National ID number.** Send the same value in both `nationalNumber` and `documentNumber` so
  the backend's `nationalIdNumber` is never empty.
- **Image size.** Crops returned by the Worker are already tight — submit those, not the full
  raw camera frames, to keep upload payloads small.
- **No `/complete` / `/verify-video`.** Those video routes still exist on the Worker but are
  **unwired**. Do not call them. The face-match `submit` is the terminal step.

---

## 5. Face Re-Verification (step-up "Face ID") — already Flutter-ready

Separate from onboarding: gated actions (transfer, withdraw, forgot-passcode) return a
`challengeId`; the client runs a fast face check and the Worker compares the live face against
the user's **enrolled KYC selfie**, then commits a signed result to NestJS (which decides).
These routes **already accept `Authorization: Bearer`**, so they work from native clients today:

```
POST /api/kyc/reverify/start    { challengeId }                         → { sessionId, region, mock }
GET  /api/kyc/reverify/credentials?challengeId=…                        → { accessKeyId, secretAccessKey, sessionToken? }
POST /api/kyc/reverify/verify   { challengeId, sessionId | liveFaceImageData }
     → { status: "passed|failed|error", reason?, stepToken?, faceMatchScore?, livenessConfidence? }
```

Single-frame path (no Amplify widget): send `liveFaceImageData` (a straight-face data URL)
instead of `sessionId`. On `status == "passed"`, carry `stepToken` on the retried gated action.
See `kycRoutes.post('/reverify/*')` in `packages/backend-api/src/routes/kyc.ts`.
