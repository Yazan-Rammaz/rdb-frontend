# KYC — Backend Changes After Removing the Video Interview

**Audience:** NestJS backend owner (the service behind `RDB_BASE_URL`; not in this repo).
**Companion doc:** `nestjs_kyc.md` (prompt numbers below refer to it).

## What changed on the client

The web app **no longer runs the live video interview**. The KYC flow now ends at the
**face-match** step:

```
intro → ID front/back → ID summary → liveness (face-detection) → face-match → success
```

On a successful face match the frontend calls **`POST /kyc/submit`** (via the Cloudflare
Worker) with the document images, the selfie, `selfieVsIdScore`, and now also
**`livenessConfidence`**. It then shows the success screen and reads the result back from
`GET /kyc/status`. There is **no** `/kyc/current/complete` or `/kyc/verify-video` call anymore.

## The one principle

> **The verification decision (`approved` / `pending` / `rejected`) must be made ONLY in the
> NestJS backend.** The frontend never decides; it only submits scores and renders whatever
> status NestJS returns. Do not move any decision logic to the client or the Worker.

Because the video step is gone, **submit must now be able to resolve to `approved`** — today
`decide()` forces `pending` whenever there are no video scores. That is the core change.

---

## Required changes

### 1. `decide()` — approve on submit when there is no video (Prompt 7)

The current logic returns `pending` when video scores are absent:

```ts
// 3. Video provided check:
const hasVideo = scores.livenessConfidence != null && scores.videoVsIdScore != null;
if (!hasVideo) return { status: 'pending', rejectionReason: null };   // ← old behavior
```

Replace the "no video → pending" gate so that, with no video, a submission that passes the
document + selfie (+ liveness) checks resolves to **`approved`**. Recommended exact ordering:

```ts
decide(scores: {
  selfieVsIdScore: number;
  livenessConfidence?: number;   // now sent on /kyc/submit
  videoVsIdScore?: number;       // legacy; no longer sent
  documentExpiryDate?: string;
}) {
  const MIN_LIVENESS   = parseFloat(process.env.KYC_MIN_LIVENESS)   || 80;
  const MIN_FACE_MATCH = parseFloat(process.env.KYC_MIN_FACE_MATCH) || 75;

  // 1. Document expiry
  if (isExpired(scores.documentExpiryDate))
    return { status: 'rejected', rejectionReason: 'Document is expired' };

  // 2. Selfie vs ID
  if (scores.selfieVsIdScore < MIN_FACE_MATCH)
    return { status: 'rejected', rejectionReason: 'Selfie does not match ID photo' };

  // 3. Liveness (only enforced when provided)
  if (scores.livenessConfidence != null && scores.livenessConfidence < MIN_LIVENESS)
    return { status: 'rejected', rejectionReason: 'Liveness check failed — please try again in good lighting' };

  // 4. All passed → APPROVED (previously this path returned 'pending')
  return { status: 'approved', rejectionReason: null };
}
```

Notes:
- The old steps 4–5 (`livenessConfidence`/`videoVsIdScore` thresholds gated behind `hasVideo`)
  are folded into step 3 above. The `videoVsIdScore` branch can be dropped entirely.
- If you prefer to keep approving even without a liveness score, leave step 3 as written
  (it only rejects when a score is present and below threshold). If you want liveness to be
  **mandatory**, change it to also reject when `livenessConfidence == null`.

### 2. `submit()` — pass and persist `livenessConfidence` (Prompt 12)

- Add `livenessConfidence?: number` to **`SubmitKycDto`** (validate `@IsNumber() @Min(0) @Max(100)` when present, `@IsOptional()`).
- In `submit()`, pass it into `decide(...)` and store it on the record instead of hardcoding `null`:

```ts
const decision = this.decide({
  selfieVsIdScore: dto.selfieVsIdScore,
  livenessConfidence: dto.livenessConfidence,   // ← was omitted
  documentExpiryDate: dto.documentExpiryDate,
});

const created = await this.kycRequestModel.create({
  // ...
  selfieVsIdScore: dto.selfieVsIdScore,
  livenessConfidence: dto.livenessConfidence ?? null,   // ← was hardcoded null
  videoVsIdScore: null,
  videoCallUrl: null,
  status: decision.status,
  rejectionReason: decision.rejectionReason,
  decidedAt: decision.status === 'pending' ? null : new Date(),  // ← set for approved too
});
```

> `decidedAt` previously was set only for `rejected`. Since `approved` is now reachable at
> submit time, set it whenever the status is decided (anything other than `pending`).

### 3. Nothing else needs to change

- **`GET /kyc/status`** mapping (`approved → verified`) is unchanged. Once submit yields
  `approved`, status reports `verified` and the web app shows the Verified badge and routes
  to `/home` automatically.
- **Resubmit block** (approved/pending cannot resubmit; rejected can, subject to the
  3/day lockout) is unchanged and still correct.
- **`PATCH /kyc/current/complete`, `/kyc/verify-video`, and the video DTOs can stay** — they
  are simply no longer called. Remove them later if you want; not required for this change.

---

## Contract the Worker already sends

The Cloudflare Worker (`packages/backend-api/src/routes/kyc.ts`, `POST /api/kyc/submit`) now
forwards `livenessConfidence` in the signed payload to NestJS `POST /kyc/submit`, alongside the
existing `selfieVsIdScore` and `documentExpiryDate`. No further Worker change is needed.

## Deployment ordering

Ship this NestJS change **together with or before** the frontend. If the frontend ships first
against the old backend, submissions still return `pending` (users reach the success screen but
appear unverified until this change lands). App access is not gated on KYC, so this lag is
cosmetic, but the Verified badge will not appear until the backend is updated.

## Test checklist

1. Submit with `selfieVsIdScore ≥ 75`, no expiry issue, `livenessConfidence ≥ 80` → **`approved`** (returned as `verified` by `/kyc/status`).
2. Submit with `selfieVsIdScore < 75` → **`rejected`** ("Selfie does not match ID photo").
3. Submit with `livenessConfidence < 80` (when provided) → **`rejected`** ("Liveness check failed…").
4. Submit with an expired document → **`rejected`** ("Document is expired").
5. Submit with `livenessConfidence` omitted → still decides on selfie/expiry only (no crash); status is `approved` if those pass.
6. Re-submit while `approved`/`pending` → still blocked (409). Re-submit after `rejected` → allowed within the daily lockout.
