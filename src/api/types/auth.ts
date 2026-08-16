/**
 * Request bodies and responses for `endpoints/auth.ts`.
 *
 * Responses re-export the existing definitions in `core/types/auth.ts` —
 * VerifyOtpResponse extends UserData, which carries the whole session shape, and
 * redeclaring it here would guarantee drift.
 *
 * Request bodies are declared, because the actions expressed them as loose
 * function parameters and then transformed them before sending.
 */

export type { SendOtpResponse, VerifyOtpResponse } from '@/core/types/auth';

/**
 * A QR desktop-login attempt.
 *
 * Declared here rather than re-exported: it lived inside the action module,
 * which this migration deletes, so there is no shared definition to point at.
 */
export interface QrSessionResponse {
    linkId: string;
    qrToken: string;
    subscribeSecret: string;
    expiresAt?: string;
    /** How often the client should rotate the token. */
    refreshIntervalMs?: number;
}

// ─── Requests ────────────────────────────────────────────────────────────────

export interface SendOtpBody {
    phoneNumber: string;
    channel: 'sms' | 'whatsapp';
    email?: string;
}

export interface ResendOtpBody {
    phoneNumber: string;
    channel: 'sms' | 'whatsapp';
}

/**
 * What the caller supplies. The endpoint renames `type` to `action` and adds
 * `platform: 'web'` before sending — the wire body is not this shape.
 */
export interface VerifyOtpInput {
    phoneNumber: string;
    otpCode: string;
    msegatId?: number | string;
    sessionInfo?: string;
    type: 'signIn' | 'signUp';
    deviceId?: string;
    deviceInfo?: Record<string, string>;
}

export interface CreateQrSessionBody {
    deviceInfo?: Record<string, string>;
}

export interface RefreshQrTokenQuery {
    linkId: string;
    subscribeSecret: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface QrTokenResponse {
    qrToken: string;
    expiresAt?: string;
}
