// Types for the Login History feature — match the backend
// GET /users/me/login-history response. See specs/login-history/data-model.md.

export type LoginStatus = 'success' | 'failure';

export type LoginMethod =
    | 'phone_otp'
    | 'trydos_otp'
    | 'session_complete'
    | 'passcode'
    | 'ip_verification'
    | 'qr'
    | 'unknown';

export type LoginFailureReason =
    | 'invalid_otp'
    | 'expired_otp'
    | 'invalid_passcode'
    | 'account_locked'
    | 'ip_challenge_failed'
    | 'unknown';

export interface LoginDevice {
    userAgent?: string;
    browser?: string;
    browserVersion?: string;
    device?: string; // e.g. "mobile"
    operatingSystem?: string; // e.g. "android" | "ios"
}

export interface LoginHistoryItem {
    id: string;
    userId: string;
    status: LoginStatus;
    method: LoginMethod;
    /** Present on failures only. */
    failureReason?: LoginFailureReason;
    /** Present on failures only — localized (per Accept-Language). Display this. */
    failureReasonLabel?: string;
    ipAddress?: string;
    city?: string;
    /** 2-letter ISO country code, e.g. "EG". */
    country?: string;
    device?: LoginDevice;
    /** ISO 8601 — when the attempt happened (sort key, most-recent-first). */
    createdAt: string;
    updatedAt: string;
}

export interface LoginHistoryResponse {
    items: LoginHistoryItem[];
    total: number;
    page: number; // 0-indexed
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}
