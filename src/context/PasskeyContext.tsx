'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { LockStatus, UnlockResult } from '@/core/types/passkey';
import {
    getDeviceStatus,
    setupPin as apiSetupPin,
    unlockWithPin as apiUnlockWithPin,
    registerBiometric,
    verifyBiometric,
    revokeSession,
    isPlatformAuthenticatorAvailable,
} from '@/services/passkeyApi';
import { useAuth } from '@/context/AuthContext';
import { pfetch } from '@/lib/p';

// ---------------------------------------------------------------------------
// State & Action types
// ---------------------------------------------------------------------------

interface PasskeyState {
    lockStatus: LockStatus;
    /** access_token lives ONLY here — never written to any browser storage */
    accessToken: string | null;
    hasPin: boolean;
    hasBiometrics: boolean;
    /** True if the device hardware supports biometric verification */
    biometricAvailable: boolean;
    /**
     * Flips to true once getDeviceStatus() resolves.
     * RDB.tsx reads this to extend the SplashScreen window.
     */
    bootReady: boolean;
}

interface PasskeyContextType extends PasskeyState {
    /** Call on mount (inside RDB.tsx). Resolves device tier and flips bootReady. */
    initialize: () => Promise<void>;

    /** One-time PIN creation for a new device */
    setupPin: (pin: string) => Promise<void>;

    /** Offer biometric enrollment after PIN setup */
    enrollBiometric: () => Promise<UnlockResult>;

    /** User explicitly skips biometric enrollment */
    skipBiometricEnrollment: () => void;

    /** Trigger WebAuthn/biometric unlock */
    unlockWithBiometric: () => Promise<UnlockResult>;

    /** Trigger PIN unlock — returns full UnlockResult so UI can handle LOCKED_OUT / sessionRevoked */
    unlockWithPin: (pin: string) => Promise<UnlockResult>;

    /** Called by the OTP success handler to hand over the initial session token */
    setAccessToken: (token: string) => void;

    /** Force-lock: wipes accessToken and transitions to LOCKED */
    triggerLock: () => void;

    /** Explicitly transition to UNLOCKED — call after the success animation finishes */
    confirmUnlock: () => void;

    /** Call after a successful PIN setup to mark hasPin=true and unlock without re-fetching */
    confirmSetup: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const PasskeyContext = createContext<PasskeyContextType | undefined>(undefined);

/**
 * Standalone-mode fallback: when no PasskeyProvider exists (Next.js renders
 * ProtectedLayout directly without RDB.tsx), return a bypass that keeps the
 * gate transparent so the host app's own auth takes over.
 */
const STANDALONE_BYPASS: PasskeyContextType = {
    lockStatus: 'UNLOCKED',
    accessToken: null,
    hasPin: false,
    hasBiometrics: false,
    biometricAvailable: false,
    bootReady: true,
    initialize: async () => {},
    setupPin: async () => {},
    enrollBiometric: async () => ({ success: false, error: 'WEBAUTHN_FAILED' }),
    skipBiometricEnrollment: () => {},
    unlockWithBiometric: async () => ({ success: false, error: 'WEBAUTHN_FAILED' }),
    unlockWithPin: async () => ({ success: false, error: 'WRONG_PIN' }),
    setAccessToken: () => {},
    triggerLock: () => {},
    confirmUnlock: () => {},
    confirmSetup: () => {},
};

export function usePasskey(): PasskeyContextType {
    const ctx = useContext(PasskeyContext);
    // In standalone Next.js mode, PasskeyProvider doesn't exist in the tree.
    // Return a bypass so PasskeyGate renders children transparently.
    return ctx ?? STANDALONE_BYPASS;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface PasskeyProviderProps {
    children: React.ReactNode;
}

export function PasskeyProvider({ children }: PasskeyProviderProps) {
    const { userData, loginStep, setLoginStep, handleLoginResponse } = useAuth();
    const userId = userData?.user?.id || userData?.id || undefined;

    const [lockStatus, setLockStatus] = useState<LockStatus>('BOOTING');
    const [accessToken, setAccessTokenState] = useState<string | null>(null);
    const [hasPin, setHasPin] = useState(false);
    const [hasBiometrics, setHasBiometrics] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [bootReady, setBootReady] = useState(false);

    // Keep a ref to the inactivity timer ID so triggerLock can clear it
    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Set to true by confirmUnlock/confirmSetup so the next initialize() call
    // triggered by a userId change doesn't reset lockStatus back to LOCKED.
    const skipNextInitializeRef = useRef(false);

    // ---------------------------------------------------------------------------
    // initialize — called once on mount from RDB.tsx
    // ---------------------------------------------------------------------------

    const initialize = useCallback(async () => {
        // If confirmUnlock/confirmSetup was just called (step auth completed),
        // skip reinitializing so lockStatus stays UNLOCKED.
        if (skipNextInitializeRef.current) {
            skipNextInitializeRef.current = false;
            setBootReady(true);
            return;
        }
        // Reset to BOOTING so PasskeyGate hides the gate while we re-check
        // device status. Without this, a stale lockStatus (e.g. SETUP_REQUIRED
        // from before login) would flash the wrong screen on the protected route.
        setLockStatus('BOOTING');
        try {
            const [status, platformAvailable] = await Promise.all([
                getDeviceStatus(),
                isPlatformAuthenticatorAvailable(),
            ]);

            setHasPin(status.hasPin);
            setHasBiometrics(status.hasBiometricEnrolled);
            setBiometricAvailable(platformAvailable);

            if (!status.hasPin) {
                setLockStatus('SETUP_REQUIRED');
            } else {
                setLockStatus('LOCKED');
            }
        } catch (err) {
            console.error('[PasskeyContext] initialize error:', err);
            // On error default to LOCKED so the user is always prompted
            setLockStatus('LOCKED');
        } finally {
            setBootReady(true);
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Token handoff
    // ---------------------------------------------------------------------------

    const setAccessToken = useCallback((token: string) => {
        setAccessTokenState(token);
    }, []);

    // ---------------------------------------------------------------------------
    // Setup flow
    // ---------------------------------------------------------------------------

    const setupPin = useCallback(async (pin: string) => {
        const result = await apiSetupPin(pin);
        if (result.success || result.error === 'ALREADY_SET') {
            setHasPin(true);
        }
    }, []);

    const enrollBiometric = useCallback(async (): Promise<UnlockResult> => {
        const result = await registerBiometric(userId);
        if (result.success) {
            setHasBiometrics(true);
        }
        // Map BiometricEnrollResult to UnlockResult shape for uniform handling
        return {
            success: result.success,
            error: result.success
                ? undefined
                : result.error === 'USER_CANCELLED'
                  ? 'WEBAUTHN_CANCELLED'
                  : result.error === 'NOT_SUPPORTED'
                    ? 'WEBAUTHN_FAILED'
                    : 'WEBAUTHN_FAILED',
        };
    }, [userId]);

    const skipBiometricEnrollment = useCallback(() => {
        setLockStatus('UNLOCKED');
    }, []);

    // ---------------------------------------------------------------------------
    // Unlock flows
    // ---------------------------------------------------------------------------

    const unlockWithBiometric = useCallback(async (): Promise<UnlockResult> => {
        const result = await verifyBiometric();
        if (result.success) {
            // Access token is no longer returned by passkeyApi — backend cookie (rdb_at) is the source of truth
            setLockStatus('UNLOCKED');
        }
        return result;
    }, []);

    const unlockWithPin = useCallback(async (pin: string): Promise<UnlockResult> => {
        // Mid-login path: rdb_at doesn't exist yet — call step endpoint (uses rdb_step).
        // Guard with !userData: if the user is already fully authenticated, a
        // stale loginStep must not reroute us to /step/passcode/verify (which
        // would 401 with STEP_TOKEN_MISSING because rdb_step is cleared once
        // a full session exists).
        if (loginStep?.status === 'requires_passcode' && !userData) {
            const res = await pfetch('sv', { passcode: pin }, {
                headers: { 'X-Step-Token': loginStep.stepToken },
            });

            if (res.status === 401) {
                // Either the rdb_step cookie is missing (proxy returns
                // STEP_TOKEN_MISSING) or the backend rejected the stepToken.
                // In both cases the mid-login flow can't continue — clear
                // state and signal the UI to redirect to /auth.
                setLoginStep(null);
                await pfetch('st', { stepToken: '' });
                return { success: false, error: 'STEP_EXPIRED' };
            }

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.valid === false) {
                return { success: false, error: 'WRONG_PIN', failedAttempts: data.failedAttempts };
            }

            // Returns active | requires_approval — AuthContext handles routing.
            // Set flag before handleLoginResponse so the userId-change effect that
            // fires initialize() is skipped and lockStatus stays UNLOCKED.
            skipNextInitializeRef.current = true;
            await handleLoginResponse(data);
            setLockStatus('UNLOCKED');
            return { success: true };
        }

        // Normal app-unlock path: user already logged in, rdb_at present.
        // Do NOT call setLockStatus('UNLOCKED') here — the caller (PasskeyGate)
        // does it via confirmUnlock() after the 1-second green animation.
        const result = await apiUnlockWithPin(pin);
        if (result.sessionRevoked) {
            setAccessTokenState(null);
            setLockStatus('LOCKED');
        }
        return result;
    }, [loginStep, handleLoginResponse, setLoginStep, userData]);

    // ---------------------------------------------------------------------------
    // Inactivity lock
    // ---------------------------------------------------------------------------

    const confirmUnlock = useCallback(() => {
        skipNextInitializeRef.current = true;
        setLockStatus('UNLOCKED');
    }, []);

    const confirmSetup = useCallback(() => {
        skipNextInitializeRef.current = true;
        setHasPin(true);
        setLockStatus('UNLOCKED');
    }, []);

    const triggerLock = useCallback(() => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
        }
        setAccessTokenState(null);
        setLockStatus('LOCKED');
        // Signal other tabs via localStorage storage event
        if (typeof window !== 'undefined') {
            localStorage.setItem('rdb_passkey_locked', Date.now().toString());
        }
    }, []);

    // Listen for cross-tab lock signals
    useEffect(() => {
        const handleStorageEvent = (e: StorageEvent) => {
            if (e.key === 'rdb_passkey_locked') {
                setAccessTokenState(null);
                setLockStatus((prev) => (prev === 'UNLOCKED' ? 'LOCKED' : prev));
            }
        };
        window.addEventListener('storage', handleStorageEvent);
        return () => window.removeEventListener('storage', handleStorageEvent);
    }, []);

    // ---------------------------------------------------------------------------
    // Self-initialize on mount and whenever the logged-in user identity changes
    // (login → userId appears, logout → userId disappears). Minor data refreshes
    // (refreshUser) update userData.user fields but keep the same userId and must
    // NOT re-run initialize() — that would reset lockStatus back to LOCKED even
    // while the user is already unlocked.
    // ---------------------------------------------------------------------------

    // Use a sentinel that can never match a real userId so first mount always runs initialize().
    const prevUserIdRef = useRef<string | undefined>('__unset__');
    useEffect(() => {
        const newUserId = userData?.user?.id ?? (userData as any)?.id ?? undefined;
        if (prevUserIdRef.current === newUserId) return;
        prevUserIdRef.current = newUserId;
        initialize();
    }, [initialize, userData]);

    // ---------------------------------------------------------------------------
    // Context value
    // ---------------------------------------------------------------------------

    const value: PasskeyContextType = {
        lockStatus,
        accessToken,
        hasPin,
        hasBiometrics,
        biometricAvailable,
        bootReady,
        initialize,
        setupPin,
        enrollBiometric,
        skipBiometricEnrollment,
        unlockWithBiometric,
        unlockWithPin,
        setAccessToken,
        triggerLock,
        confirmUnlock,
        confirmSetup,
    };

    return <PasskeyContext.Provider value={value}>{children}</PasskeyContext.Provider>;
}
