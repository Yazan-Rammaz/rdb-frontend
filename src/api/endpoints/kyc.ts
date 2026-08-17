import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    AnalyzeIdBody,
    CompareFaceBody,
    CompareFaceResponse,
    AnalyzeIdResult,
    CompleteVideoBody,
    CurrentKycResponse,
    FaceMatchBody,
    FaceMatchResponse,
    KycSessionResponse,
    KycStatusResponse,
    KycSubmitResponse,
    LivenessBody,
    LivenessResult,
    ReverifyPayload,
    ReverifySession,
    ReverifyStartBody,
    SubmitVerificationPayload,
    VerifyVideoPayload,
    VerifyVideoResult,
    WebhookBody,
    WebhookResponse,
} from '../types/kyc';

/**
 * Identity verification.
 *
 * Every call here previously went out one of three ways, including raw `fetch`
 * for five of them — which therefore never refreshed an expired token, so an
 * access token expiring mid-verification just failed the step. They are one
 * transport now, so refresh-on-401 applies uniformly.
 *
 * `HttpKycService` is the domain layer on top of this: it maps these results
 * onto the throwing `IKycService` contract its callers and its mock share.
 * Components should use that service, not this module directly — the two
 * exceptions are `status` and `current`, which are plain reads with no domain
 * logic and no place on the verification-flow interface.
 */
export const kyc = {
    status: (o?: RequestOptions): Promise<ApiResult<KycStatusResponse>> =>
        request({ path: '/kyc/status', options: o }),

    current: (o?: RequestOptions): Promise<ApiResult<CurrentKycResponse>> =>
        request({ path: '/kyc/current', options: o }),

    startSession: (o?: RequestOptions): Promise<ApiResult<KycSessionResponse>> =>
        request({ path: '/kyc/session', method: 'POST', options: o }),

    submit: (
        body: SubmitVerificationPayload,
        o?: RequestOptions,
    ): Promise<ApiResult<KycSubmitResponse>> =>
        request({ path: '/kyc/submit', method: 'POST', body, options: o }),

    completeVideo: (
        body: CompleteVideoBody,
        o?: RequestOptions,
    ): Promise<ApiResult<KycSubmitResponse>> =>
        request({ path: '/kyc/complete', method: 'POST', body, options: o }),

    liveness: (body: LivenessBody, o?: RequestOptions): Promise<ApiResult<LivenessResult>> =>
        request({ path: '/kyc/liveness', method: 'POST', body, options: o }),

    analyzeId: (body: AnalyzeIdBody, o?: RequestOptions): Promise<ApiResult<AnalyzeIdResult>> =>
        request({ path: '/kyc/analyze-id', method: 'POST', body, options: o }),

    /** AWS CompareFaces — a distinct endpoint from faceMatch, used by the ID/selfie step. */
    compareFace: (body: CompareFaceBody, o?: RequestOptions): Promise<ApiResult<CompareFaceResponse>> =>
        request({ path: '/kyc/compare-face', method: 'POST', body, options: o }),

    faceMatch: (body: FaceMatchBody, o?: RequestOptions): Promise<ApiResult<FaceMatchResponse>> =>
        request({ path: '/kyc/face-match', method: 'POST', body, options: o }),

    verifyVideo: (
        body: VerifyVideoPayload,
        o?: RequestOptions,
    ): Promise<ApiResult<VerifyVideoResult>> =>
        request({ path: '/kyc/verify-video', method: 'POST', body, options: o }),

    webhookNestjs: (body: WebhookBody, o?: RequestOptions): Promise<ApiResult<WebhookResponse>> =>
        request({ path: '/kyc/webhook-nestjs', method: 'POST', body, options: o }),

    // ─── Step-up re-verification ─────────────────────────────────────────────

    reverifyStart: (
        body: ReverifyStartBody,
        o?: RequestOptions,
    ): Promise<ApiResult<ReverifySession>> =>
        request({ method: 'POST', path: '/kyc/reverify/start', body, options: o }),

    /**
     * Returns a structured verdict even when it answers 4xx, so callers should
     * read `error.body` on failure rather than treating it as opaque —
     * `HttpKycService.submitReverify` does exactly that.
     */
    reverifyVerify: (
        body: ReverifyPayload,
        o?: RequestOptions,
    ): Promise<ApiResult<Record<string, unknown>>> =>
        request({ method: 'POST', path: '/kyc/reverify/verify', body, options: o }),
};
