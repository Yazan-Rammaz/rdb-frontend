/**
 * Request bodies and responses for `endpoints/kyc.ts`.
 *
 * KYC is split across two backends: the image/AI endpoints run on the KYC
 * Cloudflare Worker (reached through the `/api/kyc/*` proxy in the catch-all
 * route, which uses a service binding on Cloudflare), while status/current
 * ultimately read NestJS. From the client's side that is one namespace.
 *
 * The domain models live in `services/kyc/kycService.interface.ts`, next to the
 * IKycService contract they describe, and are re-exported here rather than
 * redeclared — same rule as the other type modules.
 */

import type {
    AnalyzeIdResult,
    KycRequest,
    LivenessChallenge,
    ReverifyPayload,
    ReverifyResult,
    ReverifySession,
    SubmitVerificationPayload,
    VerifyVideoPayload,
    VerifyVideoResult,
} from '@/services/kyc/kycService.interface';
import type { KycStatusResponse } from '@/core/types/auth';
import type { LivenessResult } from '@/core/types/verification';

export type {
    AnalyzeIdResult,
    KycRequest,
    KycStatusResponse,
    LivenessResult,
    ReverifyPayload,
    ReverifyResult,
    ReverifySession,
    SubmitVerificationPayload,
    VerifyVideoPayload,
    VerifyVideoResult,
};

// ─── Requests ────────────────────────────────────────────────────────────────

export interface LivenessBody {
    faceImageData: string;
    challengeStep: LivenessChallenge;
    /** Ask the server to return a face crop as well as the verdict. */
    crop?: boolean;
}

export interface AnalyzeIdBody {
    imageData: string;
    side: 'front' | 'back';
    sessionHint?: string;
}

/**
 * Named fields, so the source/target of the comparison is unambiguous — the
 * IKycService method takes them positionally and it is easy to swap them.
 */
export interface FaceMatchBody {
    idFaceImageData: string;
    liveFaceImageData: string;
}

export interface CompleteVideoBody {
    kycSessionId: string;
    videoCallUrl: string;
    livenessConfidence: number;
    videoVsIdScore: number;
}

export interface WebhookBody {
    userId: string;
    status: 'verified' | 'rejected';
    extractedData: Record<string, unknown>;
}

export interface ReverifyStartBody {
    challengeId: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface KycSessionResponse {
    sessionId: string;
    expiresAt: string;
}

export interface KycSubmitResponse {
    success: boolean;
    kycRequest?: KycRequest;
}

/**
 * Raw shape of the face-match endpoint. `confidence` and `similarity` are two
 * scales for the same thing and the server does not always send both, so
 * `HttpKycService.matchFaceToID` normalises them into the MatchResult contract.
 */
export interface FaceMatchResponse {
    isMatch: boolean;
    similarity?: number;
    confidence?: number;
    verdict?: 'pass' | 'review' | 'fail';
    errorMessage: string | null;
}

/**
 * `GET /api/kyc/current`.
 *
 * NestJS returns `{ kycRequest }` and the Worker wraps it again, so the record
 * arrives double-nested. The nesting depth is not contractual — callers use
 * `unwrapKycRequest` in `api/helpers/kyc.ts` rather than indexing it by hand.
 */
export interface CurrentKycResponse {
    kycRequest?: unknown;
    [key: string]: unknown;
}

export interface WebhookResponse {
    success: boolean;
}
