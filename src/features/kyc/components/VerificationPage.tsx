'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useVerification } from '@/features/kyc/context/VerificationContext';
import { api } from '@/features/kyc/services/kycApi';
import { createKycService } from '@/features/kyc/services';
import { KycHttpError } from '@/features/kyc/services/httpKycService';
import type { FaceCapture } from '@/features/kyc/services/faceCapture';
import type { LivenessResult } from '@/features/kyc/types/verification';
import { KycVerificationStatus } from '@/core/types/auth';
import { Page } from '@/scaling';
import IntroScreen from './screens/IntroScreen';
import IDCaptureScreen from './screens/IDCaptureScreen';
import IDSummaryScreen from './screens/IDSummaryScreen';
import FaceMatchScreen, { type EnrolmentInput } from './screens/FaceMatchScreen';
import SuccessScreen from './screens/SuccessScreen';
import ContactSupportScreen from './screens/ContactSupportScreen';
import {
    FaceLivenessScreen,
    type Credentials,
    type LivenessSource,
} from './screens/FaceLivenessScreen';

const transition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

/**
 * rdb's KYC enrolment, on the root dashboard's screens.
 *
 *     intro → ID front → ID back → summary → face (AWS Face Liveness)
 *           → face vs ID → submit → success
 *
 * Document first, as rdb always has been. The face step is the same AWS
 * Rekognition Face Liveness check root runs at sign-in — streamed video, judged
 * by AWS — opened on the Worker's enrolment routes (`/liveness-aws`,
 * `/liveness-credentials`), which are gated on the KYC session rdb's backend
 * issues. The face that is compared to the ID and submitted is the reference
 * image AWS selected from that session, not a frame the page picked.
 *
 * Nothing on rdb's backend changes: the submit is the same `/kyc/submit`
 * payload as before, through the Worker, which signs it.
 */
export default function VerificationPage() {
    const {
        currentStep,
        direction,
        goTo,
        kycSessionId,
        setKycSessionId,
        setLivenessResult,
    } = useVerification();
    const router = useRouter();

    // ── Mount: already verified? open a KYC session ─────────────────────────
    // Same as rdb's previous page. A VERIFIED or PENDING record has nothing to
    // do here (the backend refuses a resubmit while pending), so both go home.
    const checkedRef = useRef(false);
    useEffect(() => {
        if (checkedRef.current) return;
        checkedRef.current = true;
        void (async () => {
            const statusRes = await api.kyc.status();
            const status = statusRes.ok ? statusRes.data.status : undefined;
            if (status === KycVerificationStatus.VERIFIED || status === 'pending') {
                router.push('/home');
                return;
            }
            const sessionRes = await api.kyc.startSession();
            if (sessionRes.ok && sessionRes.data.sessionId) {
                setKycSessionId(sessionRes.data.sessionId);
            } else {
                // Not fatal: the face step opens one on demand.
                console.warn('[kyc] session fetch failed on mount');
            }
        })();
    }, [router, setKycSessionId]);

    // The session id is read inside async callbacks the AWS SDK holds on to, so
    // a ref keeps them from closing over a stale value.
    const sessionRef = useRef<string | null>(kycSessionId);
    useEffect(() => {
        sessionRef.current = kycSessionId;
    }, [kycSessionId]);

    const ensureSession = useCallback(async (): Promise<string> => {
        if (sessionRef.current) return sessionRef.current;
        const res = await api.kyc.startSession();
        if (!res.ok || !res.data.sessionId) {
            throw new KycHttpError(
                `Session start failed: ${res.ok ? 'no sessionId' : res.error.message}`,
                res.ok ? undefined : res.error.status,
            );
        }
        sessionRef.current = res.data.sessionId;
        setKycSessionId(res.data.sessionId);
        return res.data.sessionId;
    }, [setKycSessionId]);

    /**
     * Enrolment liveness. Memoised — FaceLivenessScreen opens a new AWS session
     * whenever this object changes identity.
     */
    const enrolSource = useMemo<LivenessSource>(
        () => ({
            start: async () => {
                await ensureSession();
                const res = await api.kyc.livenessSession();
                if (!res.ok || !res.data.sessionId) {
                    throw new KycHttpError(
                        `Liveness session failed: ${res.ok ? 'no sessionId' : res.error.message}`,
                        res.ok ? undefined : res.error.status,
                    );
                }
                return res.data;
            },
            credentials: async () => {
                const kycSession = await ensureSession();
                const res = await api.kyc.livenessCredentials<Credentials>(kycSession);
                if (!res.ok) {
                    // A 401 here is the KYC session — expired or already spent.
                    // Drop it, so the retry the screen offers opens a fresh one
                    // instead of being refused identically.
                    if (res.error.status === 401) {
                        sessionRef.current = null;
                        setKycSessionId(null);
                    }
                    throw new Error('Could not get liveness credentials');
                }
                return res.data;
            },
        }),
        [ensureSession, setKycSessionId],
    );

    /** The still the screen captured, kept for display beside AWS's image. */
    const captureRef = useRef<FaceCapture | null>(null);

    const onFaceCaptured = useCallback(
        (capture: FaceCapture | null) => {
            captureRef.current = capture;
            if (!capture) return;
            // Provisional — replaced by AWS's reference image in onSession once
            // the verdict is in. Set now so the checking glass has a face.
            setLivenessResult({
                isLive: false,
                faceImageData: capture.stored,
                displayImageData: capture.display === capture.stored ? undefined : capture.display,
                timestamp: Date.now(),
            });
        },
        [setLivenessResult],
    );

    /**
     * The stream is done — ask the Worker what AWS decided.
     *
     * The verdict is read server-side from the session id; the browser only
     * ever learns the outcome. The face kept for the match and the submit is
     * AWS's reference image: the frame the liveness check actually judged.
     */
    const onSession = useCallback(
        async (sessionId: string): Promise<{ error?: string } | void> => {
            const res = await api.kyc.livenessResult(sessionId);
            if (!res.ok) {
                throw new KycHttpError(`Liveness result failed: ${res.error.message}`, res.error.status);
            }
            const { status, confidence, livenessImageData } = res.data;
            // Only whether AWS finished the check. The score is not judged
            // here: it rides the submit as `livenessConfidence` and the
            // backend applies KYC_MIN_LIVENESS to it.
            if (status !== 'SUCCEEDED') {
                return { error: `liveness ${status} (${Math.round(confidence ?? 0)})` };
            }
            const capture = captureRef.current;
            const face = livenessImageData ?? capture?.stored;
            if (!face) return { error: 'no face image returned' };
            setLivenessResult({
                isLive: true,
                faceImageData: face,
                // Show the screen's own still (sharper, mirrored to match the
                // preview) while the bytes compared and submitted are AWS's.
                displayImageData: capture?.display ?? capture?.stored,
                // Only the AWS liveness score is known here; FaceMatchScreen forwards
                // it as `livenessConfidence` on the submit.
                metrics: { confidence } as LivenessResult['metrics'],
                timestamp: Date.now(),
            });
        },
        [setLivenessResult],
    );

    /**
     * Submit to rdb's backend through the Worker — the same payload rdb has
     * always sent. The backend decides approve / pending / reject; a rejection
     * comes back as an error so the screen shows its failure state.
     */
    const onEnroll = useCallback(
        async (input: EnrolmentInput): Promise<{ error?: string } | void> => {
            const { idDocument, selfie, selfieVsIdScore, livenessConfidence } = input;
            let kycSession: string;
            try {
                kycSession = await ensureSession();
            } catch (err) {
                return { error: err instanceof Error ? err.message : 'session failed' };
            }
            const idNumber = idDocument.nationalNumber || idDocument.documentNumber || '';
            // A KYC session is single-use: once this submit reaches the backend
            // it is spent, so any retry must open a new one.
            sessionRef.current = null;
            setKycSessionId(null);
            try {
                const res = await createKycService().submitVerification({
                    kycSessionId: kycSession,
                    frontImageData: idDocument.frontImageData,
                    backImageData: idDocument.backImageData || undefined,
                    selfieImageData: selfie,
                    selfieVsIdScore,
                    livenessConfidence,
                    extracted: {
                        idType: idDocument.idType,
                        country: idDocument.country,
                        // The person's name — NOT `idName`, which is the
                        // document-type label ("PASSPORT").
                        name: idDocument.name ?? idDocument.idName,
                        nationalNumber: idNumber,
                        documentNumber: idNumber,
                        birthday: idDocument.birthday,
                        expiryDate: idDocument.expiryDate,
                    },
                });
                const status = res.kycRequest?.status;
                if (status === 'rejected') {
                    return {
                        error:
                            (res.kycRequest as { rejectionReason?: string } | undefined)
                                ?.rejectionReason ?? 'rejected',
                    };
                }
                await input.onAccepted?.();
                goTo('success', 1);
            } catch (err) {
                return { error: err instanceof Error ? err.message : 'submit failed' };
            }
        },
        [ensureSession, setKycSessionId, goTo],
    );

    const variants = {
        enter: { x: direction * 100 + '%', opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: direction * -100 + '%', opacity: 0 },
    };

    const renderStep = () => {
        switch (currentStep) {
            case 'intro':
                // rdb's intro, not root's — on rdb's own spacing scale (kyc.css).
                return (
                    <div className="rdb-spacing h-full">
                        <IntroScreen />
                    </div>
                );
            case 'id-capture-front':
            case 'id-capture-back':
                return <IDCaptureScreen />;
            case 'id-summary':
                return <IDSummaryScreen />;
            case 'face-reverify':
                // Keyed on nothing that changes mid-check. The PASSED cache
                // inside the screen is keyed by this id, so it must be unique
                // per visit to the step — a retry from the match screen
                // resets the session and comes back through here.
                return (
                    <FaceLivenessScreen
                        challengeId={`enrol:${enrolVisit.current}`}
                        source={enrolSource}
                        onSession={onSession}
                        onFaceCaptured={onFaceCaptured}
                        onPassed={async () => {
                            goTo('face-match', 1);
                        }}
                    />
                );
            case 'face-match':
                return <FaceMatchScreen onEnroll={onEnroll} />;
            case 'success':
                return <SuccessScreen />;
            case 'contact-support':
                return <ContactSupportScreen />;
            default:
                return <IntroScreen />;
        }
    };

    // A fresh PASSED key per visit to the face step (see above).
    const enrolVisit = useRef(0);
    const lastStep = useRef(currentStep);
    if (currentStep !== lastStep.current) {
        if (currentStep === 'face-reverify') enrolVisit.current += 1;
        lastStep.current = currentStep;
    }

    return (
        // rdb's page shell, as before: the 430 XD canvas, fitted to the screen.
        // `kyc-scope` re-points Tailwind's spacing at that canvas so root's
        // classNames render at rdb's scale — see kyc.css.
        <Page variant="scaled" outerBg={currentStep === 'intro' ? 'intro' : undefined}>
            <main className="xd-fit-screen fixed inset-0 overflow-hidden">
                <div className="kyc-scope overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={currentStep}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="thin-scroll absolute inset-0 w-full h-full overflow-y-auto"
                >
                    {renderStep()}
                </motion.div>
            </AnimatePresence>
                </div>
            </main>
        </Page>
    );
}
