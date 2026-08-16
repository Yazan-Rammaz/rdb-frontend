/**
 * Passkey / PIN Gate — Shared Types
 * Feature: webauthn-pin-lock
 */

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------

export type LockStatus =
    | 'BOOTING'          // App just loaded; getDeviceStatus() in-flight; SplashScreen active
    | 'SETUP_REQUIRED'   // New/unrecognised device — one-time PIN creation + optional biometric enrollment
    | 'LOCKED'           // Valid session exists but user must authenticate
    | 'UNLOCKED';        // User is authenticated; access token held in memory only

// ---------------------------------------------------------------------------
// Service Result Types (mirror of contracts/passkeyApi.ts)
// ---------------------------------------------------------------------------

export interface DeviceStatus {
    /** True if setupPin() has been completed on this device */
    hasPin: boolean;
    /** True if registerBiometric() has been completed on this device */
    hasBiometricEnrolled: boolean;
}

export interface PinSetupResult {
    success: boolean;
    error?: 'ALREADY_SET';
}

export interface UnlockResult {
    success: boolean;
    /**
     * Returned only on success.
     * Caller MUST store in React context memory only — never in persistent storage.
     */
    accessToken?: string;
    error?:
        | 'WRONG_PIN'
        | 'LOCKED_OUT'
        | 'WEBAUTHN_FAILED'
        | 'WEBAUTHN_CANCELLED'
        | 'STEP_EXPIRED'
        /** Access + refresh both invalid — token refresh failed; restart login. */
        | 'SESSION_EXPIRED';
    /** Milliseconds remaining in lockout window. Populated when error === 'LOCKED_OUT'. */
    lockoutRemainingMs?: number;
    /** Current failed attempt count. Populated on WRONG_PIN. */
    failedAttempts?: number;
    /** True when revokeSession() was triggered (10 failed attempts). Caller should redirect to /auth. */
    sessionRevoked?: boolean;
}

export interface BiometricEnrollResult {
    success: boolean;
    credentialId?: string;
    error?: 'NOT_SUPPORTED' | 'USER_CANCELLED' | 'PLATFORM_ERROR';
}

// ---------------------------------------------------------------------------
// Device Record (localStorage shape — only passkeyApi.ts reads/writes this)
// ---------------------------------------------------------------------------

export interface DeviceRecord {
    /** True after setupPin() succeeds */
    hasPin: boolean;
    /** Hex SHA-256 of the PIN. Raw PIN is never stored. */
    pinHash: string;
    /** True after registerBiometric() succeeds */
    hasBiometrics: boolean;
    /** WebAuthn credential ID (base64url); null if PIN-only device */
    credentialId: string | null;
    /** Persisted — survives page refresh. Resets to 0 on revokeSession(). */
    failedPinAttempts: number;
    /** Unix ms timestamp for lockout expiry; null if not in lockout window */
    pinLockedUntil: number | null;
    /** Stable UUID identifying this browser/device pair */
    deviceId: string;
}
