'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePasskey } from '@/context/PasskeyContext';
import { useResetPasscode } from '@/context/ResetPasscodeContext';
import { useSessionTakeover } from '@/context/SessionTakeoverContext';
import { useRouter } from 'next/navigation';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useToast } from '@/context/ToastContext';
import PasscodeScreen from '@/components/auth/screens/PasscodeScreen';
import SessionTakeoverOverlay from '@/components/layout/SessionTakeoverOverlay';
import { Page } from '@/scaling';

interface PasskeyGateProps {
    children: React.ReactNode;
}

/**
 * 6 minutes of *inactivity* → trigger lock. This is purely a UI inactivity gate
 * (mouse/key/touch); it is intentionally decoupled from access-token expiry/401 —
 * the token is kept alive independently via proactive + reactive refresh.
 */
const IDLE_TIMEOUT_MS = process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS
    ? Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS)
    : 360_000;

/**
 * PasskeyGate — full-screen auth gate driven by PasskeyContext's lockStatus state machine.
 *
 * BOOTING          → null (SplashScreen above is still visible)
 * SETUP_REQUIRED   → one-time PIN creation
 * LOCKED           → full-screen unlock overlay (PIN first, biometric via icon)
 * UNLOCKED         → render children; idle timer is active
 *
 * Biometrics are never offered as a setup step. There used to be a second
 * SETUP_REQUIRED phase — a "Set Up Face ID / Skip for now" screen — shown right
 * after the PIN was created. Enrollment now happens the first time the user taps
 * the biometric icon on the LOCKED screen, which already enrolls on demand when
 * none is registered. One prompt, at the moment the user asks for it.
 */
export default function PasskeyGate({ children }: PasskeyGateProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { start: startPasscodeReset } = useResetPasscode();
    const { takeoverSince } = useSessionTakeover();

    const {
        lockStatus,
        hasBiometrics,
        biometricAvailable,
        setupPin,
        enrollBiometric,
        skipBiometricEnrollment,
        unlockWithBiometric,
        unlockWithPin,
        triggerLock,
        confirmUnlock,
    } = usePasskey();

    // ── LOCKED overlay state ─────────────────────────────────────────────
    const [biometricLoading, setBiometricLoading] = useState(false);
    const biometricInFlightRef = useRef(false);
    // إذا تم الدخول بالـ PIN، أوقف auto-trigger للبصمة
    const biometricAutoDisabledRef = useRef(false);
    // Lockout: absolute timestamp (ms) when the lockout expires
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);

    // ── Idle timer (T012) — only runs while UNLOCKED ─────────────────────
    useIdleTimer(IDLE_TIMEOUT_MS, triggerLock, lockStatus === 'UNLOCKED');

    // ── Lock body scroll: prevents iOS keyboard-induced document scroll ──
    useEffect(() => {
        const needsLock = lockStatus === 'SETUP_REQUIRED' || lockStatus === 'LOCKED';
        if (!needsLock) return;
        const body = document.body;
        const html = document.documentElement;
        const prev = {
            bodyPos: body.style.position,
            bodyW: body.style.width,
            bodyH: body.style.height,
            bodyOv: body.style.overflow,
            htmlOv: html.style.overflow,
        };
        body.style.position = 'fixed';
        body.style.width = '100%';
        body.style.height = '100%';
        body.style.overflow = 'hidden';
        html.style.overflow = 'hidden';
        return () => {
            body.style.position = prev.bodyPos;
            body.style.width = prev.bodyW;
            body.style.height = prev.bodyH;
            body.style.overflow = prev.bodyOv;
            html.style.overflow = prev.htmlOv;
        };
    }, [lockStatus]);

    // ── Reset LOCKED overlay state when app transitions to LOCKED ────────
    useEffect(() => {
        if (lockStatus === 'LOCKED') {
            setLockoutUntil(null);
        }
    }, [lockStatus]);

    // ── Auto-trigger biometric on LOCKED if credential already enrolled ──
    useEffect(() => {
        if (
            lockStatus === 'LOCKED' &&
            hasBiometrics &&
            biometricAvailable &&
            !lockoutUntil &&
            !biometricAutoDisabledRef.current
        ) {
            // Small delay: prevents AbortError from React StrictMode double-invoke
            // and from navigation transitions landing on LOCKED simultaneously.
            const id = setTimeout(() => triggerBiometric(), 0);
            return () => clearTimeout(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lockStatus, hasBiometrics, biometricAvailable]);

    // ── Lockout countdown (T011) ─────────────────────────────────────────
    useEffect(() => {
        if (!lockoutUntil) return;

        const tick = () => {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
            if (remaining <= 0) {
                setLockoutUntil(null);
                setLockoutSecondsLeft(0);
            } else {
                setLockoutSecondsLeft(remaining);
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [lockoutUntil]);

    const triggerBiometric = useCallback(async () => {
        if (biometricInFlightRef.current) return;
        biometricInFlightRef.current = true;
        setBiometricLoading(true);
        const result = await unlockWithBiometric();
        setBiometricLoading(false);
        biometricInFlightRef.current = false;
        if (!result.success && result.error !== 'WEBAUTHN_CANCELLED') {
            console.error('[PasskeyGate] biometric unlock failed:', result.error);
            toast.error('Biometric authentication failed. Please use your PIN.');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unlockWithBiometric, toast]);

    // ── PIN verify handler (T010 + T011) ─────────────────────────────────
    const handleVerifyPin = useCallback(
        async (pin: string): Promise<boolean> => {
            const result = await unlockWithPin(pin);

            if (result.success) {
                biometricAutoDisabledRef.current = true; // أوقف auto-trigger للبصمة
                return true;
            }

            if (result.sessionRevoked) {
                // 10 failed attempts — context already wiped the token; redirect to OTP
                router.push('/auth');
                return false;
            }

            if (result.error === 'STEP_EXPIRED' || result.error === 'SESSION_EXPIRED') {
                // Step token expired (mid-login) or the session is gone (token refresh
                // failed) — restart login rather than showing a wrong-PIN error.
                toast.error('Session expired. Please log in again.');
                router.push('/auth');
                return false;
            }

            if (result.error === 'LOCKED_OUT' && result.lockoutRemainingMs) {
                setLockoutUntil(Date.now() + result.lockoutRemainingMs);
            }

            return false;
        },
        [unlockWithPin, router, toast],
    );

    // ── SESSION TAKEOVER: a newer web login replaced this session ────────
    // Takes precedence over every gate state (including LOCKED) so a locked tab
    // shows the "logged in via the web" screen instead of the unlock screen.
    if (takeoverSince !== null) {
        return (
            <div className="fixed inset-0 z-9999 w-full h-svh">
                <SessionTakeoverOverlay since={takeoverSince} />
            </div>
        );
    }

    // ── BOOTING: splash is still visible above, render nothing ───────────
    if (lockStatus === 'BOOTING') {
        return null;
    }

    // ── SETUP_REQUIRED: one-time PIN creation ────────────────────────────
    if (lockStatus === 'SETUP_REQUIRED') {
        return (
            <div className="fixed inset-0 z-9999 w-full h-svh">
                <PasscodeScreen
                    mode="set"
                    onSavePasscode={async (pin: string) => {
                        await setupPin(pin);
                        return true;
                    }}
                    // Setup is complete once the PIN exists — no biometric step.
                    onDone={skipBiometricEnrollment}
                />
            </div>
        );
    }

    // ── LOCKED: frosted-glass overlay over the blurred page ─────────────────
    if (lockStatus === 'LOCKED') {
        return (
            <>
                {/* page content behind, pointer events disabled */}
                <div className="pointer-events-none select-none" aria-hidden>
                    {children}
                </div>
                <div className="fixed inset-0 z-9999 w-full h-svh">
                    <div className="absolute inset-0 backdrop-blur-sm bg-white/30" />
                    <div className="absolute inset-0">
                        {lockoutUntil ? (
                            /* Lockout countdown screen */
                            <div className="w-full h-full flex flex-col items-center justify-center px-xd-30">
                                <h2 className="text-xd-30 font-bold text-[#1D1D1D] text-center">
                                    Too many attempts
                                </h2>
                                <p className="text-xd-16 font-medium text-[#8E8E8E] mt-xd-10 text-center">
                                    Try again in{' '}
                                    <span className="text-[#1D1D1D] font-bold">
                                        {lockoutSecondsLeft}s
                                    </span>
                                </p>
                            </div>
                        ) : (
                            <PasscodeScreen
                                mode="enter"
                                onVerifyPasscode={handleVerifyPin}
                                onSuccess={confirmUnlock}
                                onForgotPasscode={() => startPasscodeReset('idle')}
                                onUseBiometric={
                                    biometricAvailable
                                        ? async () => {
                                              if (hasBiometrics) {
                                                  await triggerBiometric();
                                              } else {
                                                  const enrollResult = await enrollBiometric();
                                                  if (enrollResult.success) {
                                                      skipBiometricEnrollment();
                                                  } else if (enrollResult.error !== 'WEBAUTHN_CANCELLED') {
                                                      toast.error('Biometric setup failed. Please use your PIN.');
                                                  }
                                              }
                                          }
                                        : undefined
                                }
                            />
                        )}
                    </div>
                </div>
            </>
        );
    }

    // ── UNLOCKED: render the protected children ───────────────────────────
    return <>{children}</>;
}
