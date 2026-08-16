# Next.js KYC Frontend Integration — Implementation Spec

**Audience:** Weak-model AI (e.g. GitHub Copilot Pro) implementing the Next.js
side **Goal:** Wire the Next.js server (which owns AWS) to the new HMAC-signed
NestJS KYC backend. Issue/track `kycSessionId`, sign every server-to-server
call, send pre-computed scores, never expose AWS keys to client.

**Prerequisite:** NestJS backend from `nestjs_kyc.md` is fully implemented and
tested.

---

## Architecture Recap

```
Browser/Flutter  →  Next.js API routes  →  NestJS backend
                 ←  (HMAC-signed bundle) ←
                 →  (server-to-server)   →  AWS (Textract, Rekognition)
```

- AWS credentials live ONLY in Next.js server env
- Every Next.js → NestJS call carries `X-KYC-Signature` HMAC + `timestamp` +
  `nonce`
- `kycSessionId` is fetched from NestJS once per verification attempt and reused
  across all Next.js calls

---

## Environment Variables to Add

```
# NestJS backend base URL (already exists)
NEXT_PUBLIC_RDB_BASE_URL=https://api.example.com

# Shared HMAC secret with NestJS — server-only, identical 32-byte hex
KYC_SHARED_SECRET=

# Internal server-to-server secret for /kyc/sessions/:id/validate
KYC_INTERNAL_SECRET=

# AWS keys (already exist) — server-only
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
```

Add `KYC_SHARED_SECRET` and `KYC_INTERNAL_SECRET` to `.env.local.example`. Both
must match the NestJS values exactly.

---

## Files to Create / Modify

| File                                                               | Action  | Purpose                                                   |
| ------------------------------------------------------------------ | ------- | --------------------------------------------------------- |
| `src/lib/kycSigning.ts`                                            | CREATE  | HMAC sign + envelope helper                               |
| `src/app/api/kyc/session/route.ts`                                 | CREATE  | Proxy `POST /kyc/sessions/start`                          |
| `src/app/api/kyc/submit/route.ts`                                  | REWRITE | Sign + forward submit                                     |
| `src/app/api/kyc/complete/route.ts`                                | CREATE  | Sign + forward video PATCH                                |
| `src/app/api/kyc/current/route.ts`                                 | EXISTS  | Already created                                           |
| `src/app/api/kyc/liveness-credentials/route.ts`                    | MODIFY  | Validate session before issuing creds                     |
| `src/services/kyc/kycService.interface.ts`                         | MODIFY  | Add session + complete methods                            |
| `src/services/kyc/mockKycService.ts`                               | MODIFY  | Implement new methods                                     |
| `src/context/VerificationContext.tsx`                              | MODIFY  | Hold `kycSessionId`                                       |
| `src/components/verification/VerificationPage.tsx`                 | MODIFY  | Fetch session on mount                                    |
| `src/components/verification/screens/FaceMatchScreen.tsx`          | MODIFY  | Trigger submit with selfieVsIdScore (after match success) |
| `src/components/verification/screens/video/VideoPreCallScreen.tsx` | MODIFY  | Remove old auto-submit (already done by FaceMatchScreen)  |
| `src/components/verification/screens/video/VideoCallScreen.tsx`    | MODIFY  | Capture video score + PATCH complete                      |
| `.env.local.example` + `.env.local`                                | MODIFY  | Remove KYC_WEBHOOK_SECRET (replaced by KYC_SHARED_SECRET) |
| `src/app/api/kyc/webhook-nestjs/route.ts`                          | DELETE  | Old webhook route — no longer used                        |
| `src/services/kyc/mockKycService.ts`                               | MODIFY  | Remove sendWebhook method (was using old secret)          |
| `src/services/kyc/kycService.interface.ts`                         | MODIFY  | Remove sendWebhook from interface                         |
| `src/components/home/PendingKycBanner.tsx`                         | CREATE  | Home-page banner for `pending` users                      |
| `src/app/(protected)/home/page.tsx`                                | MODIFY  | Mount the PendingKycBanner near the top                   |
| `src/components/verification/screens/IntroScreen.tsx`              | MODIFY  | Show 24h cooldown UI when /api/kyc/submit returns 429     |

---

## Implementation Order

| #   | Prompt                               | Purpose                                                         |
| --- | ------------------------------------ | --------------------------------------------------------------- |
| 1   | Create kycSigning helper             | One place that builds signed envelopes                          |
| 2   | Create /api/kyc/session              | Mint sessionId from NestJS                                      |
| 3   | Rewrite /api/kyc/submit              | Sign + forward doc submission                                   |
| 4   | Create /api/kyc/complete             | Sign + forward video result                                     |
| 5   | Update /api/kyc/liveness-credentials | Bind creds to session                                           |
| 6   | Update KYC service interface         | New methods                                                     |
| 7   | Update VerificationContext           | Hold sessionId                                                  |
| 8   | Update VerificationPage              | Fetch session on mount                                          |
| 9   | Update FaceMatchScreen               | Send selfieVsIdScore on submit (background after match success) |
| 10  | Clean up VideoPreCallScreen          | Remove old auto-submit logic                                    |
| 11  | Update VideoCallScreen               | Compute videoVsIdScore + PATCH complete-video                   |
| 12  | Manual test checklist                | End-to-end verification                                         |
| 13  | Remove KYC_WEBHOOK_SECRET cleanup    | Delete old webhook env var, route, and service method           |
| 14  | Add home-page PendingKycBanner       | Persistent reminder for users who clicked "Later"               |
| 15  | Cooldown UI on 429 lockout           | Show retry-after timer in IntroScreen when locked               |

---

# Prompt 1 — Create kycSigning Helper

**Purpose:** Centralize HMAC signing so every endpoint uses the same envelope
shape. Without this, signature mismatches will be impossible to debug.

```
Create file src/lib/kycSigning.ts.

Export these:

import { createHmac, randomUUID } from 'crypto';

export interface SignedEnvelope<T> {
  body: T & { timestamp: number; nonce: string };
  signature: string;
}

/**
 * Wrap a payload with timestamp + nonce, then sign the JSON-stringified body
 * with HMAC-SHA256 using KYC_SHARED_SECRET.
 *
 * Returns the signed body and the signature header value to send.
 */
export function signKycPayload<T extends object>(payload: T): SignedEnvelope<T> {
  const secret = process.env.KYC_SHARED_SECRET;
  if (!secret) throw new Error('KYC_SHARED_SECRET is not set');

  const body = {
    ...payload,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: randomUUID(),
  };

  const json = JSON.stringify(body);
  const signature = 'sha256=' + createHmac('sha256', secret).update(json).digest('hex');

  return { body, signature };
}

/**
 * Forward a signed payload to NestJS with all required headers.
 */
export async function postSignedToNest(
  path: string,
  payload: object,
  authToken: string,
): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_RDB_BASE_URL ?? '';
  if (!baseUrl) throw new Error('NEXT_PUBLIC_RDB_BASE_URL is not set');

  const { body, signature } = signKycPayload(payload);

  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      'X-KYC-Signature': signature,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Same as postSignedToNest but with PATCH method.
 */
export async function patchSignedToNest(
  path: string,
  payload: object,
  authToken: string,
): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_RDB_BASE_URL ?? '';
  if (!baseUrl) throw new Error('NEXT_PUBLIC_RDB_BASE_URL is not set');

  const { body, signature } = signKycPayload(payload);

  return fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      'X-KYC-Signature': signature,
    },
    body: JSON.stringify(body),
  });
}
```

---

# Prompt 2 — Create /api/kyc/session

**Purpose:** Frontend calls this once at the start of a verification attempt. It
proxies to NestJS to mint a `kycSessionId`.

```
Create file src/app/api/kyc/session/route.ts.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BASE_URL = process.env.NEXT_PUBLIC_RDB_BASE_URL ?? '';

export async function POST() {
  if (!BASE_URL) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('rdb_at')?.value ?? '';

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${BASE_URL}/kyc/sessions/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

---

# Prompt 3 — Rewrite /api/kyc/submit

**Purpose:** Replace the existing submit route. Now it: (1) reads scores from
client body, (2) uploads images to media endpoint, (3) builds signed envelope,
(4) forwards to NestJS.

```
Replace src/app/api/kyc/submit/route.ts entirely.

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { postSignedToNest } from '@/lib/kycSigning';

export const runtime = 'nodejs';

const BASE_URL = process.env.NEXT_PUBLIC_RDB_BASE_URL ?? '';

function mapDocumentType(idType: string | undefined): string {
  if (!idType) return 'national_id';
  const t = idType.toLowerCase();
  if (t.includes('passport')) return 'passport';
  if (t.includes('driver') || t.includes('driving')) return 'driving_license';
  return 'national_id';
}

function stripDataUrl(b64: string): string {
  const i = b64.indexOf(',');
  return i >= 0 ? b64.slice(i + 1) : b64;
}

async function uploadImage(
  base64: string,
  filename: string,
  type: 'document' | 'image',
  token: string,
): Promise<string> {
  const buf = Buffer.from(stripDataUrl(base64), 'base64');
  const blob = new Blob([buf], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('file', blob, filename);
  form.append('type', type);

  const res = await fetch(`${BASE_URL}/media/upload/direct`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Media upload failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

async function resolveCountryId(name: string | undefined, token: string): Promise<string | undefined> {
  if (!name) return undefined;
  const res = await fetch(`${BASE_URL}/countries?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;
  const data = (await res.json()) as { items: { id: string; name: string; displayName: string }[] };
  const needle = name.toLowerCase();
  const match = data.items.find(
    (c) => c.name.toLowerCase() === needle || c.displayName.toLowerCase() === needle,
  );
  return match?.id;
}

interface SubmitBody {
  kycSessionId: string;
  frontImageData: string;
  backImageData?: string;
  selfieImageData: string;
  selfieVsIdScore: number;
  extracted: {
    name?: string;
    idType?: string;
    country?: string;
    nationalNumber?: string;
    documentNumber?: string;
    expiryDate?: string;
  };
}

export async function POST(request: NextRequest) {
  if (!BASE_URL) return NextResponse.json({ success: true });

  const cookieStore = await cookies();
  const token = cookieStore.get('rdb_at')?.value ?? '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let parsed: SubmitBody;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!parsed.kycSessionId || !parsed.frontImageData || !parsed.selfieImageData || !parsed.extracted || parsed.selfieVsIdScore == null) {
    return NextResponse.json(
      { error: 'kycSessionId, frontImageData, selfieImageData, selfieVsIdScore, extracted are required' },
      { status: 422 },
    );
  }

  const isPassport = (parsed.extracted.idType ?? '').toLowerCase().includes('passport');

  let frontUrl: string;
  let backUrl: string | undefined;
  let selfieUrl: string;
  let nationalityCountryId: string | undefined;

  try {
    [frontUrl, backUrl, selfieUrl, nationalityCountryId] = await Promise.all([
      uploadImage(parsed.frontImageData, 'front.jpg', 'document', token),
      isPassport
        ? Promise.resolve(undefined)
        : parsed.backImageData
          ? uploadImage(parsed.backImageData, 'back.jpg', 'document', token)
          : Promise.resolve(undefined),
      uploadImage(parsed.selfieImageData, 'selfie.jpg', 'image', token),
      resolveCountryId(parsed.extracted.country, token),
    ]);
  } catch (err) {
    console.error('[kyc/submit] Upload or country lookup failed:', err);
    return NextResponse.json(
      { error: 'Failed to upload verification documents.' },
      { status: 502 },
    );
  }

  const nestPayload = {
    kycSessionId: parsed.kycSessionId,
    fullName: parsed.extracted.name ?? '',
    nationalityCountryId,
    documentType: mapDocumentType(parsed.extracted.idType),
    documentFrontImageUrl: frontUrl,
    documentBackImageUrl: backUrl,
    selfieImageUrl: selfieUrl,
    nationalIdNumber: parsed.extracted.nationalNumber ?? parsed.extracted.documentNumber ?? '',
    selfieVsIdScore: parsed.selfieVsIdScore,
    documentExpiryDate: parsed.extracted.expiryDate,
  };

  console.log('[kyc/submit] → /kyc/submit body:', nestPayload);

  const submitRes = await postSignedToNest('/kyc/submit', nestPayload, token);
  const responseText = await submitRes.text();
  console.log(`[kyc/submit] ← ${submitRes.status} body=${responseText}`);

  if (!submitRes.ok) {
    return NextResponse.json(
      { error: 'Verification backend rejected the submission.', detail: responseText },
      { status: submitRes.status >= 500 ? 502 : submitRes.status },
    );
  }

  const result = JSON.parse(responseText);
  return NextResponse.json({ success: true, kycRequest: result.kycRequest });
}
```

---

# Prompt 4 — Create /api/kyc/complete

**Purpose:** PATCH endpoint that runs after the video call. Sends video URL +
liveness + video-vs-ID scores to NestJS for the final approve/reject decision.

```
Create file src/app/api/kyc/complete/route.ts.

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { patchSignedToNest } from '@/lib/kycSigning';

export const runtime = 'nodejs';

const BASE_URL = process.env.NEXT_PUBLIC_RDB_BASE_URL ?? '';

interface CompleteBody {
  kycSessionId: string;
  videoCallUrl: string;
  livenessConfidence: number;
  videoVsIdScore: number;
}

export async function POST(request: NextRequest) {
  if (!BASE_URL) return NextResponse.json({ success: true });

  const cookieStore = await cookies();
  const token = cookieStore.get('rdb_at')?.value ?? '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let parsed: CompleteBody;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !parsed.kycSessionId ||
    !parsed.videoCallUrl ||
    parsed.livenessConfidence == null ||
    parsed.videoVsIdScore == null
  ) {
    return NextResponse.json(
      { error: 'kycSessionId, videoCallUrl, livenessConfidence, videoVsIdScore are required' },
      { status: 422 },
    );
  }

  const nestPayload = {
    kycSessionId: parsed.kycSessionId,
    videoCallUrl: parsed.videoCallUrl,
    livenessConfidence: parsed.livenessConfidence,
    videoVsIdScore: parsed.videoVsIdScore,
  };

  console.log('[kyc/complete] → PATCH body:', nestPayload);

  const res = await patchSignedToNest('/kyc/current/complete', nestPayload, token);
  const responseText = await res.text();
  console.log(`[kyc/complete] ← ${res.status} body=${responseText}`);

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Video completion failed.', detail: responseText },
      { status: res.status >= 500 ? 502 : res.status },
    );
  }

  const result = JSON.parse(responseText);
  return NextResponse.json({ success: true, kycRequest: result });
}
```

---

# Prompt 5 — Update /api/kyc/liveness-credentials

**Purpose:** Before issuing AWS Liveness creds, validate the `kycSessionId`
belongs to the current user via NestJS internal endpoint. Stops User A from
doing liveness as User B.

```
Find src/app/api/kyc/liveness-credentials/route.ts and modify the POST handler.

Read kycSessionId from request body (POST JSON).
Read auth token from cookie 'rdb_at'.
Get current user id from the token (decode JWT — there should already be a helper, otherwise call NestJS /auth/me or a similar endpoint to get the user id).

Before issuing AWS Cognito creds, call:

const validateRes = await fetch(`${process.env.NEXT_PUBLIC_RDB_BASE_URL}/kyc/sessions/${kycSessionId}/validate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Secret': process.env.KYC_INTERNAL_SECRET ?? '',
  },
  body: JSON.stringify({ userId: currentUserId }),
});

if (!validateRes.ok) {
  return NextResponse.json({ error: 'Invalid or expired KYC session' }, { status: 401 });
}

Only AFTER successful validation, proceed to issue the AWS Cognito credentials as before.

If the route currently doesn't read the body (it might be a GET), change it to POST and update the client side that calls it (in VideoCallScreen Amplify config) to send POST with body { kycSessionId }.
```

---

# Prompt 6 — Update KYC Service Interface

**Purpose:** Add the new methods that components will call.

```
Modify src/services/kyc/kycService.interface.ts.

Add to IKycService interface:

interface IKycService {
  // ... existing methods stay ...

  startSession(): Promise<{ sessionId: string; expiresAt: string }>;

  submitVerification(payload: SubmitVerificationPayload): Promise<{
    success: boolean;
    kycRequest?: KycRequest;
  }>;

  completeVideo(payload: {
    kycSessionId: string;
    videoCallUrl: string;
    livenessConfidence: number;
    videoVsIdScore: number;
  }): Promise<{ success: boolean; kycRequest?: KycRequest }>;
}

Update SubmitVerificationPayload interface to:
interface SubmitVerificationPayload {
  kycSessionId: string;
  frontImageData: string;
  backImageData?: string;
  selfieImageData: string;
  selfieVsIdScore: number;
  extracted: Partial<IDDocument>;
}

Add KycRequest interface (subset of NestJS response):
interface KycRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  fullName?: string;
  // ... add any other fields the frontend reads ...
}

Then update src/services/kyc/mockKycService.ts:

async startSession(): Promise<{ sessionId: string; expiresAt: string }> {
  const res = await fetch(`${this.baseUrl}/api/kyc/session`, { method: 'POST' });
  if (!res.ok) throw new Error(`Session start failed: ${res.status}`);
  return res.json();
}

async submitVerification(payload: SubmitVerificationPayload) {
  const res = await fetch(`${this.baseUrl}/api/kyc/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Submit failed: ${res.status}`);
  }
  return res.json();
}

async completeVideo(payload) {
  const res = await fetch(`${this.baseUrl}/api/kyc/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Complete video failed: ${res.status}`);
  }
  return res.json();
}
```

---

# Prompt 7 — Update VerificationContext

**Purpose:** Hold the `kycSessionId` for the lifetime of one verification
attempt. All screens read from here.

```
Modify src/context/VerificationContext.tsx.

Add to VerificationContextType interface:
- kycSessionId: string | null;
- setKycSessionId: (id: string | null) => void;

Add to provider state:
const [kycSessionId, setKycSessionId] = useState<string | null>(null);

Include in the value object passed to the provider.
Include kycSessionId in resetSession() — set to null.
```

---

# Prompt 8 — Update VerificationPage

**Purpose:** On mount, fetch a fresh `kycSessionId` from NestJS via
/api/kyc/session and store it in context. Skip if already exists.

```
Modify src/components/verification/VerificationPage.tsx.

Inside the existing useEffect that checks /api/kyc/current, add session fetch logic:

useEffect(() => {
  if (checkedRef.current) return;
  checkedRef.current = true;

  (async () => {
    try {
      // 1. Check existing KYC status (existing logic)
      const statusRes = await fetch('/api/kyc/current');
      if (statusRes.ok) {
        const data = await statusRes.json() as { kycRequest?: { status?: string } | null };
        const status = data?.kycRequest?.status?.toLowerCase();

        if (status === 'approved') {
          router.push('/home');
          return;
        }
      }

      // 2. Fetch a fresh kycSessionId
      const sessionRes = await fetch('/api/kyc/session', { method: 'POST' });
      if (sessionRes.ok) {
        const { sessionId } = await sessionRes.json();
        setKycSessionId(sessionId);
      }

      // 3. Route based on existing status
      const data = await (await fetch('/api/kyc/current')).json();
      const status = data?.kycRequest?.status?.toLowerCase();
      if (status === 'pending') {
        goTo('video-pre-call', 1);
      }
      // 'rejected' or null → stay on intro
    } catch {
      // Silent — stay on intro
    }
  })();
}, []);

Add `setKycSessionId` to the destructured useVerification() call.
```

---

# Prompt 9 — Update FaceMatchScreen (correct submit trigger point)

**Purpose:** Submit KYC docs to NestJS the moment `selfieVsIdScore` becomes
available — that's right after CompareFaces returns success in FaceMatchScreen.
Submission runs in the background; user navigation is not blocked.

**Why here, not IDSummaryScreen:** the selfie + face match score don't exist at
IDSummaryScreen yet. The flow is: id-summary → face-detection → face-match →
(submit fires here) → video-pre-call.

```
Modify src/components/verification/screens/FaceMatchScreen.tsx.

Add imports at the top:
import { createKycService } from '@/services/kyc';

Inside the component, add:
const { goTo, livenessResult, idDocument, setMatchResult, incrementAttempt, resetSession, kycSessionId } = useVerification();
const kycService = useRef(createKycService());

In finaliseAfterAnimation, in the success branch (where data.status === 'success'),
AFTER setMatchResult(...) and BEFORE the setTimeout(... goTo('video-pre-call')...), add:

if (kycSessionId && idDocument && livenessResult?.faceImageData) {
  kycService.current
    .submitVerification({
      kycSessionId,
      frontImageData: idDocument.frontImageData,
      backImageData: idDocument.backImageData || undefined,
      selfieImageData: livenessResult.faceImageData,
      selfieVsIdScore: score,
      extracted: {
        idType: idDocument.idType,
        country: idDocument.country,
        name: idDocument.name,
        nationalNumber: idDocument.nationalNumber,
        birthday: idDocument.birthday,
        expiryDate: idDocument.expiryDate,
      },
    })
    .then((res) => {
      console.log('[FaceMatch] KYC submitted:', res.kycRequest?.status);
    })
    .catch((err) => {
      console.error('[FaceMatch] KYC submit failed:', err);
    });
}

Background fire — no await. By the time user reaches VideoPreCallScreen, status is already 'pending' in NestJS, ready for the video PATCH later.
```

---

# Prompt 10 — Clean Up VideoPreCallScreen

**Purpose:** Remove the old auto-submit logic. Submission now happens in
FaceMatchScreen. If we left the old useEffect in place, calling submit a second
time would hit a 409 'already pending' error from NestJS.

```
Modify src/components/verification/screens/video/VideoPreCallScreen.tsx.

DELETE these:
- The entire useEffect that calls kycService.current.submitVerification()
- useState for submitting and submitError
- The {submitError && ...} JSX block at the bottom
- The useRef for submitPromise

KEEP:
- The recording consent text "This session will be recorded..."
- handleStart that calls setVideoInterview + goTo('video-call', 1)
- handleLater that calls setVideoInterview + router.push('/home')
- All visual layout

The screen becomes a pure pre-call landing page. Submission is already done. Buttons fire immediately.
```

---

# Prompt 11 — Update VideoCallScreen

**Purpose:** After AWS Amplify Liveness completes: (1) compute Score 3 (video
face vs ID face), (2) capture the uploaded video URL from the silent recorder,
(3) PATCH /api/kyc/complete with all 3 video values. NestJS auto-decides
approve/reject.

**Note on existing module-level bridge:** the file already has a
`let _kycSessionId = ''` module-level variable and a `useEffect` that syncs it
from `useVerification()`. This is needed because Amplify's
`getCredentialsAndIdentityId` runs outside React. Keep that pattern as-is — the
credentials route already receives `kycSessionId` correctly.

```
Modify src/components/verification/screens/video/VideoCallScreen.tsx.

1. Add a ref for the uploaded video URL (alongside the existing recorderRef refs):
const uploadedVideoUrlRef = useRef<string | null>(null);

2. Modify the existing uploadRecording function — capture the URL on success:
const uploadRecording = useCallback((blob: Blob) => {
  const cookie = document.cookie
    .split('; ')
    .find((c) => c.startsWith('rdb_at='))
    ?.split('=')[1] ?? '';
  const baseUrl = process.env.NEXT_PUBLIC_RDB_BASE_URL ?? '';
  if (!baseUrl || !cookie) return;

  const form = new FormData();
  form.append('file', blob, `kyc-session-${Date.now()}.webm`);
  form.append('type', 'video');

  fetch(`${baseUrl}/media/upload/direct`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cookie}` },
    body: form,
  })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        uploadedVideoUrlRef.current = data.url;
        console.log('[VideoCall] recording uploaded:', data.url);
      }
    })
    .catch(() => {});
}, []);

3. Add a kycService ref alongside the other refs:
import { createKycService } from '@/services/kyc';
const kycService = useRef(createKycService());

4. Get kycSessionId in the destructure (alongside the existing verificationCtx spread).
   Update the destructure on line ~149:
const { goTo, setVideoInterview, selfieCapture, idDocument, kycSessionId } = useVerification();
(Remove the spread + the useEffect that synced verificationCtx — replace with a clean useEffect:)
useEffect(() => {
  if (kycSessionId) _kycSessionId = kycSessionId;
}, [kycSessionId]);

5. Replace handleAnalysisComplete with the full version:

const handleAnalysisComplete = useCallback(async () => {
  const result = await getResults();
  if (!result) {
    console.error('[AWS Face Liveness] Failed to load session results.');
    goTo('intro', -1);
    return;
  }

  const livenessImage = result?.livenessImageData ?? null;
  const livenessConfidence = result?.confidence ?? 0;
  let videoVsIdScore = 0;

  // Score 3 — video face vs ID face
  if (livenessImage && idDocument?.idFaceImageData) {
    try {
      const compareRes = await fetch('/api/kyc/compare-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selfieImageData: livenessImage,
          idFaceImageData: idDocument.idFaceImageData,
        }),
      });
      const compareData = await compareRes.json();
      videoVsIdScore = compareData.matchScore ?? 0;
      console.log('[VideoCall] videoVsIdScore:', videoVsIdScore);
    } catch (err) {
      console.error('[VideoCall] face compare failed:', err);
    }
  }

  // Stop the recorder so the upload starts (or finishes if already running)
  stopRecording();

  // Wait briefly for the upload to populate uploadedVideoUrlRef
  // (recording is fire-and-forget but completion is fast for ~30s clip)
  for (let i = 0; i < 20 && !uploadedVideoUrlRef.current; i++) {
    await new Promise((r) => setTimeout(r, 200));
  }

  try {
    if (!kycSessionId) throw new Error('Missing kycSessionId');

    const completeRes = await kycService.current.completeVideo({
      kycSessionId,
      videoCallUrl: uploadedVideoUrlRef.current ?? '',
      livenessConfidence,
      videoVsIdScore,
    });

    const finalStatus = completeRes.kycRequest?.status;
    console.log('[VideoCall] final status:', finalStatus);

    if (finalStatus === 'approved') {
      await finish();
    } else {
      console.warn('KYC rejected:', completeRes.kycRequest?.rejectionReason);
      goTo('intro', -1);
    }
  } catch (err) {
    console.error('[VideoCall] complete failed:', err);
    goTo('intro', -1);
  }
}, [finish, getResults, goTo, idDocument, kycSessionId]);

6. Existing module-level Amplify config already sends kycSessionId via _kycSessionId.
   No change needed there.
```

---

# Prompt 12 — Manual Test Checklist

**Purpose:** End-to-end verification that the integration works.

```
Pre-requisites:
- NestJS backend (from nestjs_kyc.md) deployed and reachable at NEXT_PUBLIC_RDB_BASE_URL
- KYC_SHARED_SECRET and KYC_INTERNAL_SECRET match exactly between Next.js and NestJS
- AWS keys set in Next.js env

End-to-end test cases:

1. ✅ Fresh user: navigate to /verification
   → /api/kyc/session called, sessionId stored in context
   → Intro screen shown

2. ✅ Complete ID capture (front + back), then liveness challenges
   → FaceMatchScreen runs CompareFaces → score returned
   → On match success, background submit to /api/kyc/submit fires
   → NestJS returns kycRequest with status='pending'
   → User sees match success → routes to video-pre-call
   → Console shows: '[FaceMatch] KYC submitted: pending'

3. ✅ Complete video call (Amplify Liveness)
   → handleAnalysisComplete fires
   → /api/kyc/compare-face computes videoVsIdScore (Score 3)
   → /api/kyc/complete called with all 3 video values + sessionId
   → NestJS PATCH returns kycRequest with status='approved' (assuming all scores pass)
   → Navigate to success screen

4. ✅ "Later" flow: at VideoPreCallScreen click Later
   → Status stays 'pending'
   → Navigate to /home
   → Settings shows "Under Review" badge with "Complete Now" link
   → Click → /verification → fetches sessionId again → routes to video-pre-call

5. ❌ Reject case: tamper Amplify result to return confidence=50
   → completeVideo PATCH returns status='rejected', reason='Liveness check failed'
   → Frontend logs rejection, routes back to intro

6. ❌ Replay test: capture network call to /api/kyc/submit, replay manually
   → Next.js proxy generates a fresh nonce each time, so this won't replay through the proxy
   → Direct call to NestJS with same body+signature → 409 'Replay detected'

7. ❌ Session expiry: leave verification page idle for 31 minutes, return
   → Session expired in NestJS
   → Next submit/PATCH returns 401
   → Frontend should detect and refetch session (add this if missing)

8. ❌ Already approved: try /verification on a verified user
   → /api/kyc/current returns status='approved'
   → router.push('/home') triggered immediately

9. ❌ Already pending without video: try /verification
   → /api/kyc/current returns status='pending'
   → goTo('video-pre-call', 1) triggered
   → Video flow continues from where user left off

Console logs to check at each step:
- [kyc/submit] → /kyc/submit body:
- [kyc/submit] ← 200 body=
- [kyc/complete] → PATCH body:
- [kyc/complete] ← 200 body=
- [VideoCall] video face vs ID score:
```

---

## Summary of Data Flow

```
User opens /verification
  ↓
Next.js fetches /api/kyc/session → NestJS mints kycSessionId → stored in VerificationContext
  ↓
User scans front + back + selfie + does liveness challenges
  ↓
FaceMatchScreen computes selfieVsIdScore via /api/kyc/compare-face
  ↓
IDSummaryScreen → "Correct, Next" → POST /api/kyc/submit
  → Next.js uploads images to /media/upload/direct (NestJS)
  → Next.js builds signed envelope { kycSessionId, scores, urls, ... } + HMAC
  → NestJS verifies signature, validates session, checks media ownership
  → NestJS saves record with status='pending'
  ↓
User completes Amplify Liveness video call
  ↓
VideoCallScreen handleAnalysisComplete:
  → Compute videoVsIdScore via /api/kyc/compare-face
  → POST /api/kyc/complete
    → Next.js PATCH /kyc/current/complete signed
    → NestJS runs decide() with all 3 scores
    → Returns status='approved' or 'rejected'
  ↓
Frontend routes to success or back to intro
```

---

## Definition of Done

- [ ] All 12 prompts implemented
- [ ] All 9 end-to-end test cases pass
- [ ] `KYC_SHARED_SECRET` matches exactly between Next.js and NestJS in
      production env
- [ ] No AWS keys present anywhere in client-side bundle (verify with
      `npm run build` and grep)
- [ ] `kycSessionId` is fetched fresh on every /verification mount
- [ ] Submit returns `pending`, video PATCH returns `approved` or `rejected`
- [ ] Rejected user can re-submit (subject to NestJS lockout)
- [ ] Settings page reflects status correctly after each flow

---

## Next Step After This

Once Next.js + NestJS integration is fully tested:

1. Update Flutter app to call the same Next.js `/api/kyc/*` endpoints
2. Remove the old `KYC_WEBHOOK_SECRET` env var (replaced by `KYC_SHARED_SECRET`)
3. Add a home-page banner for `pending` users (was discussed but not built)
4. Consider adding cooldown UI when 429 lockout returned
