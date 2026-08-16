# KYC — Frontend & Worker Changes (Remove Video Interview)

**Branch:** `kyc-no-video-call`
**Goal:** Drop the live video interview. KYC now completes at the **face-match** step.
The verification decision (`approved` / `pending` / `rejected`) is made **only** in the
NestJS backend — the frontend just submits scores and renders the returned status.
**Backend counterpart:** see `KYC_REMOVE_VIDEO_BACKEND.md`.

New flow:

```
intro → ID front/back → ID summary → liveness (face-detection) → face-match → success
```

The video screen files (`VideoPreCallScreen.tsx`, `VideoCallScreen.tsx`), the
`/api/kyc/complete` and `/api/kyc/verify-video` proxy routes, `videoConfig`, and the
`completeVideo` / `verifyVideo` service methods are **kept on disk but unwired** (unreachable).

---

## Frontend changes (`apps/frontend`)

### 1. `src/context/VerificationContext.tsx`
Removed the two video steps from `STEP_ORDER` so in-session resume can never target video.

```diff
  const STEP_ORDER: VerificationStep[] = [
      'intro',
      'id-capture-front',
      'id-capture-back',
      'id-summary',
      'face-detection',
      'face-match',
-     'video-pre-call',
-     'video-call',
      'success',
  ];
```

> The `VerificationStep` union in `core/types/verification.ts` still contains the video
> values (the kept video files reference them) — only the ordered flow list changed.

### 2. `src/components/verification/screens/FaceMatchScreen.tsx`
On a successful match: (a) navigate to `success` instead of `video-pre-call`, and
(b) include `livenessConfidence` in the submit payload so the backend can factor liveness
into its decision.

```diff
  const res = await kycService.current.submitVerification({
      kycSessionId,
      frontImageData: idDocument.frontImageData,
      backImageData: idDocument.backImageData || undefined,
      selfieImageData: livenessResult.faceImageData,
      selfieVsIdScore: score,
+     livenessConfidence: livenessResult.metrics?.confidence,
      extracted: { ... },
  });
  ...
- goTo('video-pre-call', 1);
+ goTo('success', 1);   // face match is now the final step
```

The failure path is unchanged (still resets to `intro`). The submit call itself was already
here before — only the navigation target and the added `livenessConfidence` field changed.

### 3. `src/components/verification/VerificationPage.tsx`
- Removed the `video-pre-call` / `video-call` render cases and their imports.
- Removed the now-unused `goTo` from the `useVerification()` destructure.
- Changed the `pending` resume branch: there is no video step to resume into, and the
  backend blocks re-submission while pending, so send the user home.

```diff
- import VideoPreCallScreen from './screens/video/VideoPreCallScreen';
- import VideoCallScreen from './screens/video/VideoCallScreen';
  ...
- const { currentStep, direction, goTo, setKycSessionId } = useVerification();
+ const { currentStep, direction, setKycSessionId } = useVerification();
  ...
- if (status === 'pending') {
-     goTo('video-pre-call', 1);
- }
+ if (status === 'pending') {
+     router.push('/home');
+     return;
+ }
  ...
  // renderStep():
- case 'video-pre-call':
-     return <VideoPreCallScreen />;
- case 'video-call':
-     return <VideoCallScreen />;
```

`VERIFIED → /home` on mount is unchanged.

### 4. `src/services/kyc/kycService.interface.ts`
Added an optional `livenessConfidence` to the submit payload type.

```diff
  export interface SubmitVerificationPayload {
      kycSessionId: string;
      frontImageData: string;
      backImageData?: string;
      selfieImageData: string;
      selfieVsIdScore: number;
+     /** Liveness confidence (0–100) from face-detection; forwarded to NestJS. */
+     livenessConfidence?: number;
      extracted: Partial<IDDocument>;
  }
```

`httpKycService.submitVerification` already forwards the whole payload, so it needed no change.

---

## Worker change (`packages/backend-api`)

### `src/routes/kyc.ts` — `POST /api/kyc/submit`
Accept `livenessConfidence` from the client and forward it (signed) to NestJS `POST /kyc/submit`.

```diff
- let parsed: { kycSessionId: string; frontImageData: string; backImageData?: string; selfieImageData: string; selfieVsIdScore: number; extracted: Record<string, string | undefined> };
+ let parsed: { kycSessionId: string; frontImageData: string; backImageData?: string; selfieImageData: string; selfieVsIdScore: number; livenessConfidence?: number; extracted: Record<string, string | undefined> };
  ...
- const nestPayload = { ..., selfieVsIdScore: parsed.selfieVsIdScore, documentExpiryDate: parsed.extracted['expiryDate'] };
+ const nestPayload = { ..., selfieVsIdScore: parsed.selfieVsIdScore, livenessConfidence: parsed.livenessConfidence, documentExpiryDate: parsed.extracted['expiryDate'] };
```

The Worker still makes **no decision** — it only uploads images, resolves country, and proxies
the signed payload to NestJS.

---

## Verification done
- `tsc --noEmit` on `apps/frontend` — clean.
- `tsc --noEmit` on `packages/backend-api` — clean (kept video files still type-check).
- `next lint` is removed in Next 16 and ESLint can't run in this environment
  (`eslint-config-next` not installed) — a tooling gap, not a code issue.

## Not yet done
- Commit / push the branch.
- Deploy the NestJS `decide()` change (`KYC_REMOVE_VIDEO_BACKEND.md`). Until then submissions
  resolve to `pending`, so the success screen shows but the Verified badge lags. App access is
  not gated on KYC, so the flow still completes.
