'use client';

/**
 * passkeyApi — Backend-connected implementation.
 *
 * PIN setup:          POST /sessions/passcode/set            (JwtAuthGuard)
 * PIN unlock (app):   POST /sessions/passcode/verify         (JwtAuthGuard)
 * PIN unlock (login): POST /sessions/step/passcode/verify    (StepTokenGuard)
 * WebAuthn:           POST /sessions/passkey/*               (JwtAuthGuard)
 */

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { apiFetchOp } from '@/core/utils';
import { pfetch } from '@/lib/p';
import type {
    DeviceStatus,
    PinSetupResult,
    UnlockResult,
    BiometricEnrollResult,
} from '@/core/types/passkey';

// ---------------------------------------------------------------------------
// One-time cleanup: remove any stale local PIN hash from old builds
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
    for (const key of [
        'rdb_passkey_record',
        'rdb_passcode',
        'rdb_passcode_hash',
        'rdb_passcode_attempts',
        'rdb_passcode_locked_until',
    ]) {
        localStorage.removeItem(key);
    }
}


// ---------------------------------------------------------------------------
// Biometric enrollment flag — persists locally so we remember enrollment even
// if the backend passkey list is temporarily unavailable.
// ---------------------------------------------------------------------------

const BIOMETRIC_ENROLLED_KEY = 'rdb_biometric_enrolled';

// ---------------------------------------------------------------------------
// Device ID — stable UUID per browser, not a secret
// ---------------------------------------------------------------------------

const DEVICE_ID_KEY = 'rdb_passkey_device_id';

function generateUUID(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

export function getDeviceId(): string {
    if (typeof window === 'undefined') return 'ssr';
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

// ---------------------------------------------------------------------------
// WebAuthn rpId — IP addresses rejected by spec
// ---------------------------------------------------------------------------

function getRpId(): string {
    const hostname = window.location.hostname;
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.startsWith('[');
    return isIp ? 'localhost' : hostname;
}

// ---------------------------------------------------------------------------
// Device status
// ---------------------------------------------------------------------------

function fetchOpWithTimeout(o: string, ms = 5000): Promise<Response | null> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    // apiFetchOp so an expired access token (e.g. unlocking after the idle window)
    // silently refreshes instead of resolving device status as "no PIN".
    return apiFetchOp(o, undefined, { signal: controller.signal })
        .catch(() => null)
        .finally(() => clearTimeout(id));
}

export async function getDeviceStatus(): Promise<DeviceStatus> {
    const [passcodeRes, passkeysRes] = await Promise.all([
        fetchOpWithTimeout('ps'),
        fetchOpWithTimeout('kl'),
    ]);

    const passcode = passcodeRes?.ok ? await passcodeRes.json().catch(() => ({}) as any) : {};
    const passkeysBody = passkeysRes?.ok ? await passkeysRes.json().catch(() => ({}) as any) : {};

    const passcodeEnabled = passcode?.data?.enabled ?? passcode?.enabled ?? false;
    const passkeyList = Array.isArray(passkeysBody)
        ? passkeysBody
        : Array.isArray(passkeysBody?.data)
          ? passkeysBody.data
          : [];

    const localBiometric =
        typeof window !== 'undefined' &&
        localStorage.getItem(BIOMETRIC_ENROLLED_KEY) === 'true';

    return {
        hasPin: passcodeEnabled,
        hasBiometricEnrolled: passkeyList.length > 0 || localBiometric,
    };
}

// ---------------------------------------------------------------------------
// PIN management — all verification done by NestJS (bcrypt)
// ---------------------------------------------------------------------------

export async function setupPin(pin: string): Promise<PinSetupResult> {
    const res = await apiFetchOp('pc', { passcode: pin });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error ?? 'ALREADY_SET' };
    }
    return { success: true };
}

export async function unlockWithPin(pin: string): Promise<UnlockResult> {
    let res: Response;
    try {
        res = await apiFetchOp('pv', { passcode: pin });
    } catch {
        return { success: false, error: 'WRONG_PIN' };
    }

    // A 401 here is never a wrong passcode (those return 200 {valid:false}). apiFetch
    // already attempted a token refresh; a surviving 401 means the session is gone
    // (refresh token dead/revoked) → restart login instead of flashing "wrong PIN".
    if (res.status === 401) {
        return { success: false, error: 'SESSION_EXPIRED' };
    }

    if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return data.valid === false
            ? { success: false, error: 'WRONG_PIN' }
            : { success: true };
    }

    const data = await res.json().catch(() => ({}));
    const message = ((data.message ?? '') as string).toLowerCase();
    if (message.includes('lock')) {
        return { success: false, error: 'LOCKED_OUT', lockoutRemainingMs: 30_000 };
    }
    return { success: false, error: 'WRONG_PIN' };
}

// ---------------------------------------------------------------------------
// WebAuthn / Biometric
// ---------------------------------------------------------------------------

export async function registerBiometric(userId?: string): Promise<BiometricEnrollResult> {
    const optRes = await apiFetchOp('ko', {});
    if (!optRes.ok) return { success: false, error: 'PLATFORM_ERROR' };
    const options = await optRes.json();

    // Override rpId to match the current origin so WebAuthn works on localhost/dev
    if (options?.rp) options.rp.id = getRpId();

    let registrationResponse;
    try {
        registrationResponse = await startRegistration({ optionsJSON: options });
    } catch (err: unknown) {
        const e = err as Error;
        if (e.name === 'NotAllowedError') return { success: false, error: 'USER_CANCELLED' };
        if (e.name === 'NotSupportedError' || e.name === 'InvalidStateError' || e.name === 'SecurityError') {
            return { success: false, error: 'NOT_SUPPORTED' };
        }
        return { success: false, error: 'PLATFORM_ERROR' };
    }

    const verifyRes = await apiFetchOp('kr', { registrationResponse });

    if (!verifyRes.ok) return { success: false, error: 'PLATFORM_ERROR' };
    const result = await verifyRes.json();
    if (typeof window !== 'undefined') {
        localStorage.setItem(BIOMETRIC_ENROLLED_KEY, 'true');
    }
    return { success: true, credentialId: result.id ?? result.credentialId ?? '' };
}

export async function verifyBiometric(): Promise<UnlockResult> {
    const optRes = await apiFetchOp('ka', {});
    if (!optRes.ok) return { success: false, error: 'WEBAUTHN_FAILED' };
    const options = await optRes.json();

    // Override rpId to match the current origin so WebAuthn works on localhost/dev
    if (options?.rpId !== undefined) options.rpId = getRpId();

    let authResponse;
    try {
        authResponse = await startAuthentication({ optionsJSON: options });
    } catch (err: unknown) {
        const e = err as Error;
        if (e.name === 'NotAllowedError') return { success: false, error: 'WEBAUTHN_CANCELLED' };
        return { success: false, error: 'WEBAUTHN_FAILED' };
    }

    const verifyRes = await apiFetchOp('kv', { authenticationResponse: authResponse });

    const data = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || !data.valid) return { success: false, error: 'WEBAUTHN_FAILED' };
    return { success: true };
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function revokeSession(): Promise<void> {
    await pfetch('dc').catch(() => {});
}

// ---------------------------------------------------------------------------
// Platform capability
// ---------------------------------------------------------------------------

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!window.PublicKeyCredential) return false;
    try {
        if (typeof (PublicKeyCredential as any).getClientCapabilities === 'function') {
            const caps: Record<string, boolean> = await (PublicKeyCredential as any).getClientCapabilities();
            if (caps['conditionalGet'] === true || caps['conditionalCreate'] === true) return true;
        }
        const platform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (platform) return true;
        if (typeof PublicKeyCredential.isConditionalMediationAvailable === 'function') {
            return await PublicKeyCredential.isConditionalMediationAvailable();
        }
        return false;
    } catch {
        return false;
    }
}
