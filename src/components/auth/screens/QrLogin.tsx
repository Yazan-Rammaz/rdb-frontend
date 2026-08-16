'use client';
import { api } from '@/api';
import { refreshQrToken } from '@/api/helpers/qrLogin';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslation } from '@/context/I18nContext';
import { FlexibleSpace } from '@/scaling';
import { RdbIcon } from '../../icons';
import { CustomQRCode } from '@/components/ui/CustomQR';
import { useAuthLinkSocket } from '@/hooks/useAuthLinkSocket';
import closeSvg from '@/assets/icons/auth/close.svg';

interface QrLoginScreenProps {
    /** Called with the NestJS sessionToken once the phone approves the login. */
    onApproved: (sessionToken: string) => void;
    onCancel?: () => void;
}

// No 'expired' state: an expired attempt auto-regenerates (→ 'loading' → 'pending')
// rather than parking on a manual retry screen.
type QrStatus = 'loading' | 'pending' | 'scanned' | 'rejected' | 'error';

interface QrSession {
    linkId: string;
    qrToken: string;
    subscribeSecret: string;
    refreshIntervalMs: number;
}

interface ScannedInfo {
    sameCity?: boolean;
    webCity?: string | null;
    appCity?: string | null;
}

const QR_CARD = '#FCFCFC';

export default function QrLoginScreen({ onApproved, onCancel }: QrLoginScreenProps) {
    const { t } = useTranslation();
    const [status, setStatus] = useState<QrStatus>('loading');
    const [session, setSession] = useState<QrSession | null>(null);
    const [qrToken, setQrToken] = useState<string>('');
    const [scanned, setScanned] = useState<ScannedInfo | null>(null);
    // Guards against re-firing completion if a `qr:approved` event is replayed
    // on websocket reconnect (events are "latest state", not exactly-once).
    const completedRef = useRef(false);
    // Guards the initial auto-start so React StrictMode's double-mount (dev)
    // doesn't create two orphaned QR sessions. The retry button still calls
    // startSession() directly, so it's unaffected.
    const autoStartedRef = useRef(false);

    // ── Create / regenerate a QR session ──────────────────────────────────────
    const startSession = useCallback(async () => {
        setStatus('loading');
        setScanned(null);
        completedRef.current = false;
        try {
            // Send the web device info so the phone's approval screen + the
            // qr:scanned event can show which device is logging in. Mirrors the
            // deviceInfo shape used by the OTP login flow.
            const deviceInfo =
                typeof navigator !== 'undefined'
                    ? { browser: 'web', os: navigator.platform, userAgent: navigator.userAgent }
                    : undefined;
            const res = await api.auth.createQrSession({ deviceInfo });
            if (!res.ok) throw new Error(res.error.message);

            const data = res.data;
            // The shape check stays: a 200 carrying an incomplete session would
            // otherwise render a QR that can never be claimed.
            if (!data?.linkId || !data?.qrToken || !data?.subscribeSecret) {
                throw new Error('malformed session response');
            }
            setSession({
                linkId: data.linkId,
                qrToken: data.qrToken,
                subscribeSecret: data.subscribeSecret,
                refreshIntervalMs: data.refreshIntervalMs ?? 60000,
            });
            setQrToken(data.qrToken);
            setStatus('pending');
        } catch {
            setSession(null);
            setStatus('error');
        }
    }, []);

    useEffect(() => {
        if (autoStartedRef.current) return;
        autoStartedRef.current = true;
        startSession();
    }, [startSession]);

    // ── Rotate the QR image on the backend's interval while still pending ──────
    useEffect(() => {
        if (status !== 'pending' || !session) return;
        const id = setInterval(async () => {
            // The helper maps 410/404 → { expired: true }; see api/helpers/qrLogin.
            const result = await refreshQrToken(session.linkId, session.subscribeSecret);
            // expired → the whole 5-min login attempt is gone (NOT just the 75s
            // qrToken — every refresh mints a fresh token, so token-level expiry
            // never surfaces here). It can't be revived, so auto-regenerate a
            // brand-new session. startSession() flips status to 'loading', which
            // tears down this interval via the cleanup below and reconnects the
            // socket with the new linkId.
            if ('expired' in result) {
                startSession();
                return;
            }
            // error (network blip / 400 / 409) → keep showing the current code;
            // the socket drives terminal state and the next tick retries.
            if ('qrToken' in result) {
                setQrToken(result.qrToken);
            }
        }, session.refreshIntervalMs);
        return () => clearInterval(id);
    }, [status, session, startSession]);

    // ── Realtime updates over the /auth-link socket ───────────────────────────
    useAuthLinkSocket(session?.linkId ?? null, session?.subscribeSecret ?? null, {
        onScanned: (p) => {
            setScanned({ sameCity: p.sameCity, webCity: p.webCity, appCity: p.appCity });
            setStatus('scanned');
        },
        onApproved: (p) => {
            if (completedRef.current) return;
            completedRef.current = true;
            onApproved(p.sessionToken);
        },
        onRejected: () => setStatus('rejected'),
        // The 5-min cap usually surfaces as a 410 on the next refresh poll, but if
        // the socket delivers qr:expired first, treat it the same: regenerate.
        onExpired: () => startSession(),
    });

    // Manual retry only for terminal states a user must act on: a phone-side
    // rejection, or a hard error creating/reviving a session. Expiry is handled
    // automatically (regenerate), so it never lands here.
    const showRetry = status === 'rejected' || status === 'error';
    const retryMessage = status === 'rejected' ? t.auth.qrLogin.rejected : t.auth.qrLogin.error;

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {/* Close button */}
            <div className="flex absolute justify-end right-xd-30 top-xd-30">
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="w-xd-24 h-xd-24 flex items-center justify-center"
                    >
                        <Image
                            src={closeSvg}
                            alt="close"
                            width={16}
                            height={16}
                            className="object-contain"
                        />
                    </button>
                )}
            </div>

            <FlexibleSpace size={120} share={0.34} />

            {/* Logo */}
            <div className="hidden flex flex-col items-center">
                <RdbIcon className="w-xd-120 h-xd-86" />
            </div>

            <FlexibleSpace size={34} share={0.06} />

            <div className="flex flex-col items-center px-xd-24">
                <h2 className="text-xd-26 font-bold text-[#1D1D1D] text-center">
                    {t.auth.qrLogin.title}
                </h2>

                <FlexibleSpace size={26} share={0.03} />

                {/* QR card */}
                <div
                    className="relative w-xd-280 h-xd-280 rounded-xd-20 border border-dashed border-[#C3C3C3] flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: QR_CARD }}
                >
                    {/* QR stays on screen once generated. While we wait for the
                        phone to approve (scanned), it's only dimmed — never hidden. */}
                    {(status === 'pending' || status === 'scanned') && qrToken && (
                        <div
                            className={`transition-opacity duration-300 ${
                                status === 'scanned' ? 'opacity-30' : 'opacity-100'
                            }`}
                        >
                            <CustomQRCode value={qrToken} size={232} bg={QR_CARD} />
                        </div>
                    )}

                    {status === 'loading' && (
                        <span className="w-7 h-7 rounded-full border-2 border-[#388CFF] border-t-transparent animate-spin" />
                    )}

                    {/* Laser scan line sweeping up/down over the dimmed QR until the
                        user confirms on their phone. Mirrors the ID-capture scanner. */}
                    {status === 'scanned' && (
                        <motion.div
                            className="absolute left-0 right-0 pointer-events-none z-20"
                            style={{
                                height: '3px',
                                background:
                                    'linear-gradient(90deg, transparent 0%, rgba(56,140,255,0.95) 50%, transparent 100%)',
                                boxShadow: '0 0 14px 3px rgba(56,140,255,0.6)',
                            }}
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    )}

                    {showRetry && (
                        <button
                            onClick={startSession}
                            className="flex flex-col items-center gap-xd-12 px-xd-24 text-center"
                        >
                            <p className="text-xd-14 font-medium text-[#1D1D1D] leading-[1.4]">
                                {retryMessage}
                            </p>
                            <span className="text-xd-13 text-[#388CFF] underline">
                                {t.auth.qrLogin.refresh}
                            </span>
                        </button>
                    )}
                </div>

                <FlexibleSpace size={26} share={0.03} />

                {status === 'scanned' ? (
                    <p className="text-xd-14 leading-[1.5] w-xd-360 text-center font-medium text-[#1D1D1D]">
                        {t.auth.qrLogin.scanned}
                    </p>
                ) : (
                    <p className="text-xd-13 leading-[1.6] w-xd-360 text-center font-normal text-[#5D5C5D]">
                        {t.auth.qrLogin.instruction}
                    </p>
                )}

                {/* Soft same-city warning (informational only — never blocks) */}
                {status === 'scanned' && scanned?.sameCity === false && (
                    <p className="text-xd-12 mt-xd-12 text-center font-medium text-[#D89B00]">
                        {t.auth.qrLogin.differentCity}
                    </p>
                )}
            </div>

            <FlexibleSpace grow />
        </div>
    );
}
