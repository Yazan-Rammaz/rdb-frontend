# NestJS KYC Backend — Implementation Spec

**Audience:** Jaffar (NestJS developer using GitHub Copilot Pro) **Goal:** Build
a fully-automated KYC verification backend that trusts a Next.js server (which
owns AWS integration) without ever calling AWS itself. Decisions are made
server-side from signed score bundles. No human review.

---

## Architecture Overview

```
Flutter / Browser  →  Next.js (server, owns AWS)  →  NestJS (this repo)
                   ←                              ←

Trust mechanism: HMAC-SHA256 signature on the request body using KYC_SHARED_SECRET.
Replay protection: timestamp (±5min) + nonce store (24h TTL).
Session binding: kycSessionId issued by NestJS, validated by Next.js, consumed on submit.
```

NestJS never talks to AWS. It accepts pre-computed scores from Next.js, verifies
the signature, runs decision logic, and stores the final record.

---

## Status Lifecycle

```
null
  ↓ POST /kyc/submit (docs + selfie scores, no video)
pending  ←──────── user clicks "Later", banner pulls them back
  ↓ PATCH /kyc/current/complete (video URL + scores)
approved  or  rejected
```

- Approval is **only** possible via the video PATCH. Doc submission alone never
  approves.
- Rejected users can re-submit (subject to 3/day lockout).
- Approved or pending users cannot re-submit.

---

## Environment Variables

```
# Shared HMAC secret with Next.js (32-byte hex)
KYC_SHARED_SECRET=

# Internal server-to-server secret for /kyc/sessions/:id/validate
KYC_INTERNAL_SECRET=

# Decision thresholds
KYC_MIN_LIVENESS=80
KYC_MIN_FACE_MATCH=75
KYC_MAX_REJECTIONS_PER_DAY=3
```

---

## Implementation Order

Execute prompts strictly in this order. Each prompt is self-contained — paste
one at a time into Copilot.

| #   | Prompt                      | Purpose                                                   |
| --- | --------------------------- | --------------------------------------------------------- |
| 1   | KYC Session Module          | Issue + validate + consume short-lived session IDs        |
| 2   | Internal Validate Endpoint  | Server-to-server endpoint for Next.js to verify a session |
| 3   | HMAC Signature Guard        | Block any request without a valid signature               |
| 4   | Nonce Store                 | Prevent replay of signed payloads                         |
| 5   | Schema Update               | Add scores + video + session fields to kyc-request        |
| 6   | Refactor /kyc/submit        | New DTO, new flow, no video fields here                   |
| 7   | Auto-Decision Logic         | Single source of truth for approve/reject/pending         |
| 8   | Media Ownership Helper      | Reject foreign image URLs                                 |
| 9   | Rejection Lockout           | Block 4th attempt within 24h                              |
| 10  | GET /kyc/current            | Read-only status fetch for the frontend                   |
| 11  | PATCH /kyc/current/complete | The endpoint that flips pending → approved/rejected       |
| 12  | Wire /kyc/submit            | Final integration of all helpers                          |
| 13  | Module Wiring               | Register everything in DI                                 |
| 14  | Manual Test Checklist       | Verify every threat is mitigated                          |

---

# Prompt 1 — KYC Session Module

**Purpose:** Manage temporary session IDs that bind a single KYC verification
attempt to one user. Prevents User A from submitting User B's verification.

```
Create a new NestJS module `kyc-session` under src/modules/kyc-session/.

Files to create:
- kyc-session.module.ts
- kyc-session.service.ts
- kyc-session.controller.ts
- entities/kyc-session.entity.ts (Mongoose schema)

Schema fields:
- _id: string (UUID v4, auto-generated)
- userId: ObjectId (ref User, indexed)
- status: enum ['active', 'consumed', 'expired'] default 'active'
- createdAt: Date
- expiresAt: Date (createdAt + 30 minutes)
- consumedAt: Date | null

Service methods:
- create(userId): create a new active session, return { sessionId, expiresAt }
- validate(sessionId, userId): throws if not found, expired, consumed, or userId mismatch. Returns the session.
- consume(sessionId, userId): marks status='consumed', sets consumedAt=now. Throws if not active.

Controller endpoints (all guarded by JwtAuthGuard, user from request):
- POST /kyc/sessions/start → calls create(user.id) → returns { sessionId, expiresAt }

Add a TTL index on expiresAt to auto-delete expired docs.
```

---

# Prompt 2 — Internal Validate Endpoint

**Purpose:** Allow Next.js (server-to-server) to validate a session before
issuing AWS Liveness credentials. Stops impersonation at the credential issuance
layer.

```
Add an internal endpoint to the kyc-session controller for server-to-server validation by Next.js.

POST /kyc/sessions/:id/validate
Body: { userId: string }
Headers: X-Internal-Secret: <KYC_INTERNAL_SECRET from env>

Logic:
1. Read X-Internal-Secret header. If !== process.env.KYC_INTERNAL_SECRET, return 403.
2. Call kycSessionService.validate(params.id, body.userId).
3. Return { valid: true, expiresAt } or 401 with { valid: false, reason }.

Do NOT use JwtAuthGuard here — this is server-to-server only.
Add a new guard `InternalSecretGuard` that checks the header. Apply it to this route.
```

---

# Prompt 3 — HMAC Signature Guard

**Purpose:** Verify every request from Next.js is genuine. Without this, a user
with devtools could forge scores and self-approve.

```
Create a NestJS guard `KycSignatureGuard` at src/modules/kyc/guards/kyc-signature.guard.ts.

Logic in canActivate(context):
1. Get the raw request body as a string. Make sure body-parser preserves the raw buffer (req.rawBody).
2. Read header: const sig = request.headers['x-kyc-signature']
3. Read secret: const secret = process.env.KYC_SHARED_SECRET
4. Compute: const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex')
5. Use crypto.timingSafeEqual to compare sig vs expected (Buffer.from both, equal length first).
6. If mismatch, throw UnauthorizedException('Invalid signature').
7. Also check timestamp in body: if Math.abs(Date.now()/1000 - body.timestamp) > 300, throw UnauthorizedException('Stale request').
8. Return true.

Make sure main.ts enables raw body:
app.use(bodyParser.json({ verify: (req, _, buf) => { req.rawBody = buf; } }))
```

---

# Prompt 4 — Nonce Store

**Purpose:** Block replay attacks. Even with a valid signature, a payload can
only be used once.

```
Create a NestJS service `NonceStoreService` at src/modules/kyc/services/nonce-store.service.ts.

Use Redis if available (inject @nestjs/cache-manager or ioredis).
If Redis isn't set up, use a Mongoose collection 'nonces' with TTL index on expiresAt.

Method:
- async claim(nonce: string, ttlSeconds = 86400): Promise<boolean>
  - Try to atomically insert the nonce.
  - Returns true if claimed (first time seen).
  - Returns false if it already existed.

Wire this into the KYC submit flow: after HMAC verification, call claim(body.nonce). If it returns false, throw ConflictException('Nonce already used — replay detected').
```

---

# Prompt 5 — Schema Update

**Purpose:** Add fields needed for the new scoring + video flow.

```
Add these fields to the existing kyc-request mongoose schema:

- selfieVsIdScore: number (0–100)
- livenessConfidence: number (0–100, nullable)
- videoVsIdScore: number (0–100, nullable)
- videoCallUrl: string | null
- kycSessionId: string (the session this submission belongs to, indexed)
- documentExpiryDate: string | null
- decidedAt: Date | null
- rejectionReason: string | null (already exists — keep)

Add index on { userId: 1, status: 1 } for /kyc/current lookups.
```

---

# Prompt 6 — Refactor POST /kyc/submit

**Purpose:** New DTO + new controller signature. Video fields are NOT in this
payload — they come later via PATCH.

```
Refactor POST /kyc/submit in the kyc controller.

Apply guards in order: JwtAuthGuard, KycSignatureGuard.

Use a new DTO `SubmitKycDto`:
- kycSessionId: string (UUID, required) — @IsUUID()
- timestamp: number (unix seconds, required) — @IsNumber()
- nonce: string (UUID, required) — @IsUUID()
- fullName: string (required) — @IsString()
- nationalityCountryId: string (required) — @IsMongoId()
- documentType: string (required) — @IsEnum(['national_id', 'passport', 'driving_license'])
- nationalIdNumber: string (required) — @IsString()
- documentFrontImageUrl: string (required) — @IsUrl()
- documentBackImageUrl: string (optional, only for non-passport) — @IsOptional() @IsUrl()
- selfieImageUrl: string (required) — @IsUrl()
- selfieVsIdScore: number (0–100, required) — @IsNumber() @Min(0) @Max(100)
- documentExpiryDate: string (optional) — @IsOptional() @IsString()

NOTE: video fields are NOT in this DTO. Video is sent later via PATCH /kyc/current/complete.

Service flow in submit() — see Prompt 12 for the full implementation.
```

---

# Prompt 7 — Auto-Decision Logic

**Purpose:** Single source of truth for approve/reject/pending. Used by both
/submit and /video endpoints.

```
Add method `decide(scores)` in kyc.service.ts.

Input type:
{
  selfieVsIdScore: number;
  livenessConfidence?: number;
  videoVsIdScore?: number;
  documentExpiryDate?: string;
}

Constants:
const MIN_LIVENESS = parseFloat(process.env.KYC_MIN_LIVENESS) || 80;
const MIN_FACE_MATCH = parseFloat(process.env.KYC_MIN_FACE_MATCH) || 75;

Logic in this exact order:

1. Document expiry check (if documentExpiryDate provided):
   const expiry = parseExpiry(scores.documentExpiryDate);
   if (expiry && expiry < new Date())
     return { status: 'rejected', rejectionReason: 'Document is expired' };

2. Selfie vs ID check:
   if (scores.selfieVsIdScore < MIN_FACE_MATCH)
     return { status: 'rejected', rejectionReason: 'Selfie does not match ID photo' };

3. Video provided check:
   const hasVideo = scores.livenessConfidence != null && scores.videoVsIdScore != null;
   if (!hasVideo) return { status: 'pending', rejectionReason: null };

4. Liveness check:
   if (scores.livenessConfidence < MIN_LIVENESS)
     return { status: 'rejected', rejectionReason: 'Liveness check failed — please try again in good lighting' };

5. Video vs ID check:
   if (scores.videoVsIdScore < MIN_FACE_MATCH)
     return { status: 'rejected', rejectionReason: 'Video face does not match ID photo' };

6. All passed:
   return { status: 'approved', rejectionReason: null };

Helper at top of service file:
function parseExpiry(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}`);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
```

---

# Prompt 8 — Media Ownership Helper

**Purpose:** Reject submissions that reference image URLs uploaded by another
user. Without this, User A could submit User B's selfie URL.

```
Create a method `validateMediaOwnership(urls, userId)` in kyc.service.ts.

Signature:
async validateMediaOwnership(urls: (string | null | undefined)[], userId: string): Promise<void>

Logic:
for (const url of urls) {
  if (!url) continue;
  const media = await this.mediaModel.findOne({ url }).lean();
  if (!media) throw new NotFoundException(`Media not found: ${url}`);
  if (String(media.uploaderId) !== String(userId))
    throw new ForbiddenException('Media does not belong to user');
}

Inject MediaModel into KycService constructor:
constructor(
  @InjectModel(KycRequest.name) private kycRequestModel: Model<KycRequest>,
  @InjectModel(Media.name) private mediaModel: Model<Media>,
  private kycSessionService: KycSessionService,
  private nonceStore: NonceStoreService,
) {}

Make sure MongooseModule.forFeature includes Media in kyc.module.ts imports.
```

---

# Prompt 9 — Rejection Lockout

**Purpose:** Stop brute-force attempts. After 3 rejections in 24h, block until
cooldown.

```
Add method `enforceLockout(userId)` to kyc.service.ts.

Logic:
async enforceLockout(userId: string): Promise<void> {
  const MAX_REJECTIONS = parseInt(process.env.KYC_MAX_REJECTIONS_PER_DAY) || 3;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const count = await this.kycRequestModel.countDocuments({
    userId,
    status: 'rejected',
    createdAt: { $gte: since },
  });

  if (count >= MAX_REJECTIONS) {
    throw new HttpException(
      'Too many failed attempts. Please try again in 24 hours.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

Call this near the top of submit() — right after the resubmit-block check.
```

---

# Prompt 10 — GET /kyc/current Endpoint

**Purpose:** Frontend reads this on every verification page mount to decide
which screen to show.

```
Add GET /kyc/current to the kyc controller. Guarded by JwtAuthGuard only (no signature needed — read-only).

Service method:
async getCurrent(userId: string) {
  const record = await this.kycRequestModel
    .findOne({ userId })
    .sort({ createdAt: -1 })
    .populate('nationalityCountryId', 'name code flagImageUrl')
    .lean();

  if (!record) return { kycRequest: null };

  const { nationalityCountryId, ...rest } = record;
  return {
    kycRequest: {
      ...rest,
      nationalityCountry: nationalityCountryId,
      nationalityCountryId:
        typeof nationalityCountryId === 'object' && nationalityCountryId
          ? (nationalityCountryId as any)._id
          : nationalityCountryId,
    },
  };
}

Controller:
@Get('current')
@UseGuards(JwtAuthGuard)
async getCurrent(@CurrentUser() user) {
  return this.kycService.getCurrent(user.id);
}
```

---

# Prompt 11 — PATCH /kyc/current/complete

**Purpose:** The only endpoint that can flip a record from `pending` to
`approved`. Video is mandatory for approval.

```
Add PATCH /kyc/current/complete to the kyc controller.

Apply guards: JwtAuthGuard, KycSignatureGuard.

Create DTO `CompleteKycVideoDto`:
- kycSessionId: string (UUID) — @IsUUID()
- timestamp: number — @IsNumber()
- nonce: string (UUID) — @IsUUID()
- videoCallUrl: string — @IsUrl()
- livenessConfidence: number (0–100) — @IsNumber() @Min(0) @Max(100)
- videoVsIdScore: number (0–100) — @IsNumber() @Min(0) @Max(100)

Service method `completeVideo(userId, dto)`:
1. Find pending record:
   const record = await this.kycRequestModel.findOne({ userId, status: 'pending' });
   If !record, throw NotFoundException('No pending KYC to complete');
2. Claim nonce — throw 409 on replay
3. Validate kycSessionId via kycSessionService.validate(dto.kycSessionId, userId)
4. Validate media ownership: validateMediaOwnership([dto.videoCallUrl], userId)
5. Run decide() with all scores from record + new video scores:
   const decision = this.decide({
     selfieVsIdScore: record.selfieVsIdScore,
     livenessConfidence: dto.livenessConfidence,
     videoVsIdScore: dto.videoVsIdScore,
     documentExpiryDate: record.documentExpiryDate,
   });
6. Update record:
   record.videoCallUrl = dto.videoCallUrl;
   record.livenessConfidence = dto.livenessConfidence;
   record.videoVsIdScore = dto.videoVsIdScore;
   record.status = decision.status;
   record.rejectionReason = decision.rejectionReason;
   record.decidedAt = new Date();
   await record.save();
7. Consume the kycSessionId
8. Return updated record (populate nationalityCountry)

Controller:
@Patch('current/video')
@UseGuards(JwtAuthGuard, KycSignatureGuard)
async completeVideo(@CurrentUser() user, @Body() dto: CompleteKycVideoDto) {
  return this.kycService.completeVideo(user.id, dto);
}
```

---

# Prompt 12 — Wire /kyc/submit

**Purpose:** Tie together every helper from prompts 4, 7, 8, 9 into the final
submit() implementation.

```
Write the full submit() service method. Replace any existing logic.

async submit(userId: string, dto: SubmitKycDto) {
  // 1. Block resubmit
  const existing = await this.kycRequestModel.findOne({
    userId,
    status: { $in: ['pending', 'approved'] },
  }).lean();
  if (existing) {
    if (existing.status === 'approved')
      throw new ConflictException('You are already verified');
    if (existing.status === 'pending')
      throw new ConflictException('A verification is already in progress');
  }

  // 2. Lockout
  await this.enforceLockout(userId);

  // 3. Replay protection
  const fresh = await this.nonceStore.claim(dto.nonce);
  if (!fresh) throw new ConflictException('Replay detected — nonce already used');

  // 4. Session binding
  await this.kycSessionService.validate(dto.kycSessionId, userId);

  // 5. Media ownership
  await this.validateMediaOwnership(
    [dto.documentFrontImageUrl, dto.documentBackImageUrl, dto.selfieImageUrl],
    userId,
  );

  // 6. Decision (no video yet → 'pending')
  const decision = this.decide({
    selfieVsIdScore: dto.selfieVsIdScore,
    documentExpiryDate: dto.documentExpiryDate,
  });

  // 7. Save record
  const created = await this.kycRequestModel.create({
    userId,
    fullName: dto.fullName,
    nationalityCountryId: dto.nationalityCountryId,
    documentType: dto.documentType,
    nationalIdNumber: dto.nationalIdNumber,
    documentFrontImageUrl: dto.documentFrontImageUrl,
    documentBackImageUrl: dto.documentBackImageUrl,
    selfieImageUrl: dto.selfieImageUrl,
    documentExpiryDate: dto.documentExpiryDate,
    selfieVsIdScore: dto.selfieVsIdScore,
    livenessConfidence: null,
    videoVsIdScore: null,
    videoCallUrl: null,
    kycSessionId: dto.kycSessionId,
    status: decision.status,
    rejectionReason: decision.rejectionReason,
    decidedAt: decision.status === 'rejected' ? new Date() : null,
  });

  // 8. Consume session
  await this.kycSessionService.consume(dto.kycSessionId, userId);

  // 9. Return populated record
  return this.kycRequestModel
    .findById(created._id)
    .populate('nationalityCountryId', 'name code flagImageUrl')
    .lean();
}

Controller:
@Post('submit')
@UseGuards(JwtAuthGuard, KycSignatureGuard)
async submit(@CurrentUser() user, @Body() dto: SubmitKycDto) {
  const kycRequest = await this.kycService.submit(user.id, dto);
  return { kycRequest, message: 'KYC verification request submitted successfully' };
}
```

---

# Prompt 13 — Module Wiring

**Purpose:** Register all providers + import dependencies in the DI container.

```
Update kyc.module.ts:

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KycRequest.name, schema: KycRequestSchema },
      { name: Media.name, schema: MediaSchema },
    ]),
    KycSessionModule,
  ],
  providers: [
    KycService,
    NonceStoreService,
    KycSignatureGuard,
  ],
  controllers: [KycController],
})
export class KycModule {}

Make sure KycSessionModule exports its service:

@Module({
  imports: [MongooseModule.forFeature([{ name: KycSession.name, schema: KycSessionSchema }])],
  providers: [KycSessionService, InternalSecretGuard],
  controllers: [KycSessionController],
  exports: [KycSessionService],
})
export class KycSessionModule {}
```

---

# Prompt 14 — Manual Test Checklist

**Purpose:** Verify every threat in the original threat model is mitigated. Run
via Postman/Insomnia with proper HMAC signing.

```
Setup steps before testing:
1. Get a kycSessionId:
   POST /kyc/sessions/start (Bearer token only) → returns { sessionId, expiresAt }

2. Sign each subsequent request:
   - Compute body JSON string exactly as sent (no whitespace differences)
   - signature = 'sha256=' + HMAC-SHA256(body, KYC_SHARED_SECRET) hex
   - Header: X-KYC-Signature: <signature>
   - Header: Authorization: Bearer <token>
   - Body must include current { timestamp: Math.floor(Date.now()/1000), nonce: <uuid> }

Test cases for POST /kyc/submit:
1. ✅ Valid signed request, selfieVsIdScore=92, no video → 200 with status='pending'
2. ❌ Wrong HMAC → 401 'Invalid signature'
3. ❌ Stale timestamp (>5min old) → 401 'Stale request'
4. ❌ Same nonce twice → 409 'Replay detected'
5. ❌ Another user's image URL → 403 'Media does not belong to user'
6. ❌ Invalid sessionId → 401 from kycSessionService.validate
7. ❌ Already pending → 409 'A verification is already in progress'
8. ❌ Already approved → 409 'You are already verified'
9. ❌ selfieVsIdScore=50 → 200 with status='rejected', reason='Selfie does not match ID photo'
10. ❌ 4th rejected attempt in 24h → 429 'Too many failed attempts'
11. ❌ Expired documentExpiryDate → 200 with status='rejected', reason='Document is expired'

Test cases for PATCH /kyc/current/complete:
12. ✅ Valid video on pending record, all scores high → 200 with status='approved'
13. ❌ Video on rejected record → 404 'No pending KYC'
14. ❌ Video on approved record → 404 (no pending exists)
15. ❌ livenessConfidence=70 → status='rejected', reason='Liveness check failed'
16. ❌ videoVsIdScore=60 → status='rejected', reason='Video face does not match ID photo'
17. ❌ Stranger's videoCallUrl → 403 'Media does not belong to user'
18. ❌ Same nonce as a previous /submit → 409 'Replay detected'
19. ❌ Wrong HMAC → 401

Test cases for GET /kyc/current:
20. ✅ Returns { kycRequest: null } for new user
21. ✅ Returns latest record with populated nationalityCountry
22. ✅ Works without HMAC header (only requires Bearer)

Test cases for POST /kyc/sessions/start:
23. ✅ Returns { sessionId, expiresAt } with expiresAt = now + 30min
24. ❌ No Bearer token → 401

Test cases for POST /kyc/sessions/:id/validate (internal):
25. ✅ With correct X-Internal-Secret + valid sessionId + matching userId → { valid: true }
26. ❌ Wrong X-Internal-Secret → 403
27. ❌ Mismatched userId → 401
28. ❌ Expired session → 401
29. ❌ Already-consumed session → 401
```

---

## Threat Coverage Matrix

| Threat                              | Mitigation                             | Prompt(s)      |
| ----------------------------------- | -------------------------------------- | -------------- |
| Score forgery from devtools         | HMAC signature                         | 3              |
| Replay of valid payload             | Nonce + timestamp                      | 3, 4           |
| User A submits User B's images      | Media ownership check                  | 8              |
| User A submits User B's session     | Session userId binding                 | 1              |
| Approval without video              | Decide() returns 'pending' if no video | 7              |
| Re-submit after approval            | Block check at top of submit()         | 12             |
| Brute-force rejected attempts       | Lockout (3/24h)                        | 9              |
| Expired ID accepted                 | parseExpiry check before scoring       | 7              |
| Liveness creds issued to wrong user | Internal validate endpoint             | 2              |
| AWS keys leaked                     | NestJS never touches AWS               | (architecture) |

---

## Definition of Done

The backend is complete when:

- [ ] All 14 prompts implemented
- [ ] All 29 test cases pass
- [ ] `KYC_SHARED_SECRET` and `KYC_INTERNAL_SECRET` are 32-byte hex random
      values stored in production env (not committed)
- [ ] Indexes created: `kyc-session.expiresAt` (TTL),
      `kyc-request.{userId,status}`, `nonces.expiresAt` (TTL if Mongo-based)
- [ ] No AWS SDK dependencies in package.json
- [ ] Frontend (Next.js) confirmed integration with all endpoints

---

## Next Step

Once this spec is fully implemented and tested, switch to the Next.js side:
build the HMAC-signing layer, the new submit/PATCH route handlers, and the
`kycSessionId` lifecycle. That work is tracked separately in `nextjs_kyc.md` (to
be created after this is done).
