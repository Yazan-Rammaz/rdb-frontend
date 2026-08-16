import type {
    IKycService,
    KycRequest,
    LivenessChallenge,
    AnalyzeIdResult,
    SubmitVerificationPayload,
    VerifyVideoPayload,
    VerifyVideoResult,
    ReverifySession,
    ReverifyPayload,
    ReverifyResult,
} from './kycService.interface';
import type { LivenessResult, IDDocument, MatchResult } from '@/core/types/verification';
import { apiFetch, apiFetchOp } from '@/core/utils';

export class HttpKycService implements IKycService {
    private baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    async detectFace(
        faceImageData: string,
        challengeStep: LivenessChallenge = 'look_straight',
        options: { crop?: boolean } = {},
    ): Promise<LivenessResult> {
        const res = await fetch(`${this.baseUrl}/api/kyc/liveness`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ faceImageData, challengeStep, crop: options.crop }),
        });

        if (!res.ok) {
            throw new Error(`Liveness API error: ${res.status}`);
        }

        const data = await res.json();
        // Always preserve a usable image for downstream face-match: fall back to
        // the original frame when the server didn't return a crop.
        return {
            ...data,
            faceImageData: data.faceImageData ?? faceImageData,
        } as LivenessResult;
    }

    async analyzeId(
        imageData: string,
        side: 'front' | 'back',
        sessionHint = 'default',
    ): Promise<AnalyzeIdResult> {
        const res = await fetch(`${this.baseUrl}/api/kyc/analyze-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData, side, sessionHint }),
        });

        if (!res.ok) {
            throw new Error(`Analyze ID API error: ${res.status}`);
        }

        return res.json();
    }

    async captureID(imageData: string, side: 'front' | 'back'): Promise<Partial<IDDocument>> {
        const result = await this.analyzeId(imageData, side);
        if (result.status !== 'success') {
            return {};
        }
        if (side === 'front') {
            const base = result.extracted ?? {};
            // The authoritative ID number after the API's passport/national-ID
            // mapping is `extractedData.documentNumber` — for a PASSPORT that is the
            // passport number (the raw `extracted` object only carries it under
            // `passportNumber`, a field IDDocument doesn't have, so it would be lost).
            // Carry it into BOTH nationalNumber and documentNumber so the downstream
            // submit always has a non-empty number for passports and national IDs alike.
            const documentNumber =
                result.extractedData?.documentNumber ||
                base.documentNumber ||
                base.nationalNumber ||
                '';
            return {
                frontImageData: result.croppedImageData || imageData,
                idFaceImageData: result.idFaceImageData,
                ...base,
                nationalNumber: base.nationalNumber || documentNumber,
                documentNumber,
            };
        }
        return {
            backImageData: result.croppedImageData || imageData,
        };
    }

    /**
     * `faceData` = live selfie crop (target). `idData` = ID-photo crop (source).
     * The argument order matches the existing IKycService contract; under the
     * hood we map them to the API's named fields so there's no ambiguity.
     */
    async matchFaceToID(faceData: string, idData: string): Promise<MatchResult> {
        const res = await fetch(`${this.baseUrl}/api/kyc/face-match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idFaceImageData: idData,
                liveFaceImageData: faceData,
            }),
        });

        if (!res.ok) {
            throw new Error(`Face match API error: ${res.status}`);
        }

        const data = (await res.json()) as {
            isMatch: boolean;
            similarity?: number;
            confidence?: number;
            verdict?: 'pass' | 'review' | 'fail';
            errorMessage: string | null;
        };

        return {
            isMatch: data.isMatch,
            confidence:
                typeof data.confidence === 'number'
                    ? data.confidence
                    : (data.similarity ?? 0) / 100,
            similarity: data.similarity,
            verdict: data.verdict,
            errorMessage: data.errorMessage,
        };
    }

    async startVideoCall(sessionId: string): Promise<{ streamUrl: string }> {
        await new Promise((r) => setTimeout(r, 1000));
        return { streamUrl: 'mock://video-stream' };
    }

    async endVideoCall(sessionId: string): Promise<{ success: boolean }> {
        await new Promise((r) => setTimeout(r, 500));
        return { success: true };
    }

    async sendWebhook(
        userId: string,
        status: 'verified' | 'rejected',
        extractedData: Record<string, unknown>,
    ): Promise<{ success: boolean }> {
        const res = await fetch(`${this.baseUrl}/api/kyc/webhook-nestjs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, status, extractedData }),
        });

        if (!res.ok) {
            throw new Error(`Webhook API error: ${res.status}`);
        }

        return res.json();
    }

    async startSession(): Promise<{ sessionId: string; expiresAt: string }> {
        const res = await apiFetch(`${this.baseUrl}/api/kyc/session`, { method: 'POST' });
        if (!res.ok) throw new Error(`Session start failed: ${res.status}`);
        return res.json();
    }

    async submitVerification(
        payload: SubmitVerificationPayload,
    ): Promise<{ success: boolean; kycRequest?: KycRequest }> {
        const res = await apiFetch(`${this.baseUrl}/api/kyc/submit`, {
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

    async completeVideo(payload: {
        kycSessionId: string;
        videoCallUrl: string;
        livenessConfidence: number;
        videoVsIdScore: number;
    }): Promise<{ success: boolean; kycRequest?: KycRequest }> {
        const res = await apiFetch(`${this.baseUrl}/api/kyc/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(
                (body as { error?: string }).error ?? `Complete video failed: ${res.status}`,
            );
        }

        return res.json();
    }

    async startReverify(challengeId: string): Promise<ReverifySession> {
        // Opcode via the random-hash gateway — hides the endpoint name (PROXY_OPS
        // 'vs' → /api/kyc/reverify/start in app/api/[...path]/route.ts).
        const res = await apiFetchOp('vs', { challengeId });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(
                (body as { error?: string }).error ?? `Re-verify start failed: ${res.status}`,
            );
        }
        return res.json();
    }

    async submitReverify(payload: ReverifyPayload): Promise<ReverifyResult> {
        // Opcode 'vv' → /api/kyc/reverify/verify (see PROXY_OPS).
        const res = await apiFetchOp('vv', payload);
        // The Worker returns a structured result even on a logical failure; only a
        // transport/5xx error throws. Parse and normalise here.
        const data = (await res.json().catch(() => ({}))) as Partial<ReverifyResult> & {
            error?: string;
        };
        if (!res.ok && !data.status) {
            throw new Error(data.error ?? `Re-verify failed: ${res.status}`);
        }
        return {
            status: data.status ?? 'error',
            reason: data.reason,
            code: data.code,
            message: data.message ?? data.error,
            stepToken: data.stepToken,
            faceMatchScore: data.faceMatchScore,
            livenessConfidence: data.livenessConfidence,
        };
    }

    async verifyVideo(payload: VerifyVideoPayload): Promise<VerifyVideoResult> {
        const res = await fetch(`${this.baseUrl}/api/kyc/verify-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(
                (body as { error?: string }).error ?? `Verify video failed: ${res.status}`,
            );
        }

        return res.json();
    }
}
