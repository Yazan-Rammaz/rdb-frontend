/** Request bodies and responses for `endpoints/auth.ts`. */

// ─── Requests ────────────────────────────────────────────────────────────────

export interface SendOtpBody {
    phoneNumber: string;
    countryCode: string;
}

export interface VerifyOtpBody {
    phoneNumber: string;
    countryCode: string;
    otp: string;
}

export interface SetPasscodeBody {
    passcode: string;
}

export interface VerifyPasscodeBody {
    passcode: string;
}

export interface UpdateProfileBody {
    firstName?: string;
    lastName?: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface OtpSentResponse {
    /** Seconds before a resend is permitted. */
    retryAfter?: number;
    /** Present in non-production so a tester can complete the flow. */
    debugOtp?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    /** Seconds until `accessToken` expires. */
    expiresIn: number;
}

/**
 * A login attempt can succeed outright or stop for a second factor. Modelled as
 * a union so a caller cannot read `tokens` on a response that only carries a
 * step-up challenge.
 */
export type LoginResponse =
    | { status: 'authenticated'; tokens: AuthTokens; user: CurrentUser }
    | { status: 'step_up_required'; challengeId: string; method: 'face' | 'otp'; reason?: string };

export interface CurrentUser {
    id: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    countryCode?: string;
    kycVerification?: { status: string };
}

export interface QrSessionResponse {
    sessionId: string;
    /** Encoded into the QR the desktop client displays. */
    token: string;
    expiresAt: string;
}
