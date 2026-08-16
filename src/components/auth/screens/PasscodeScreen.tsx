'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import PinInputs from '@/components/ui/PinInputs';
import { useTranslation } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { FlexibleSpace } from '@/scaling';
import fingerprintIcon from '@/assets/icons/auth/fingerprint.svg';
import faceidIcon from '@/assets/icons/auth/faceid.svg';
import passkeyIcon from '@/assets/icons/auth/passkey.svg';
import verifiedIcon from '@/assets/icons/verification/verified-big.svg';
import notVerifiedIcon from '@/assets/icons/verification/not-verified.svg';

type BiometricType = 'fingerprint' | 'faceid' | 'passkey';

function detectBiometricType(): BiometricType {
    if (typeof navigator === 'undefined') return 'passkey';
    const ua = navigator.userAgent.toLowerCase();

    // iPhone / iPad / macOS → Face ID
    if (/iphone|ipad|macintosh/.test(ua)) return 'faceid';

    // Android → fingerprint
    if (/android/.test(ua)) return 'fingerprint';

    // Windows / Linux → passkey (Windows Hello)
    return 'passkey';
}

type PasscodeScreenProps =
    | {
          mode: 'set';
          onSavePasscode: (passcode: string) => Promise<boolean>;
          onDone?: () => void;
          onSaveFailed?: () => void;
      }
    | {
          mode: 'enter';
          onVerifyPasscode: (passcode: string) => Promise<boolean>;
          onSuccess?: () => void;
          /** When provided, renders a biometric button below the PIN inputs */
          onUseBiometric?: () => void;
          /** When provided, the "Forget Passcode ?" label becomes a button that opens the reset flow */
          onForgotPasscode?: () => void;
      };

type SetStep = 'set' | 'reenter' | 'saving' | 'done';

export default function PasscodeScreen(props: PasscodeScreenProps) {
    const { t } = useTranslation();
    const { userData, partialUserPhone, loginStep } = useAuth();

    // ── Set mode state ──────────────────────────────────────────────
    const [setStep, setSetStep] = useState<SetStep>('set');
    const [passcode, setPasscode] = useState('');
    const [setValue, setSetValue] = useState('');
    const [reenterValue, setReenterValue] = useState('');
    const [setIsValid, setSetIsValid] = useState<'valid' | 'notvalid' | ''>('');
    // Mismatch message shown under the inputs on the 'set' step (same slot as the
    // "Set Passcode" label) after a failed re-enter.
    const [setError, setSetError] = useState('');

    // ── Enter mode state ────────────────────────────────────────────
    const [enterValue, setEnterValue] = useState('');
    const [enterIsValid, setEnterIsValid] = useState<'valid' | 'notvalid' | ''>('');
    const [loading, setLoading] = useState(false);

    // ── Set mode handlers ───────────────────────────────────────────
    const handleSetComplete = (value: string) => {
        setSetError('');
        setPasscode(value);
        setSetStep('reenter');
        setSetValue('');
        setReenterValue('');
    };

    const onDoneRef = useRef(props.mode === 'set' ? props.onDone : undefined);
    useEffect(() => {
        if (props.mode === 'set') onDoneRef.current = props.onDone;
    });

    const handleReenterComplete = async (value: string) => {
        if (props.mode !== 'set') return;
        if (value === passcode) {
            setSetIsValid('valid');
            setSetStep('saving');
            const ok = await props.onSavePasscode(passcode);
            if (ok) {
                setSetStep('done');
                setTimeout(() => onDoneRef.current?.(), 2000);
            } else {
                props.onSaveFailed?.();
                setPasscode('');
                setSetValue('');
                setReenterValue('');
                setSetIsValid('');
                setSetStep('set');
            }
        } else {
            // Re-entered passcode didn't match. Show the shake feedback, then
            // return to the 'set' step with a mismatch message under the inputs
            // (same slot as the "Set Passcode" label).
            setSetIsValid('notvalid');
            setTimeout(() => {
                setSetError(t.auth.setPasscode.mismatch);
                setPasscode('');
                setSetValue('');
                setReenterValue('');
                setSetIsValid('');
                setSetStep('set');
            }, 700);
        }
    };

    // ── Enter mode handler ──────────────────────────────────────────
    const onSuccessRef = useRef(props.mode === 'enter' ? props.onSuccess : undefined);
    useEffect(() => {
        if (props.mode === 'enter') onSuccessRef.current = props.onSuccess;
    });

    const handleEnterComplete = async (value: string) => {
        if (props.mode !== 'enter') return;
        setLoading(true);
        const ok = await props.onVerifyPasscode(value);
        setLoading(false);
        if (ok) {
            setEnterIsValid('valid');
            setTimeout(() => onSuccessRef.current?.(), 1000);
        } else {
            setEnterIsValid('notvalid');
            setTimeout(() => {
                setEnterIsValid('');
                setEnterValue('');
            }, 700);
        }
    };

    // ── Render ──────────────────────────────────────────────────────
    if (props.mode === 'set') {
        const slideVariants = {
            enter: { x: '100%', opacity: 0 },
            center: { x: 0, opacity: 1 },
            exit: { x: '-100%', opacity: 0 },
        };
        const slideTrans = {
            duration: 0.35,
            ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
        };

        const displayName =
            [
                userData?.user?.firstName ?? userData?.firstName,
                userData?.user?.lastName ?? userData?.lastName,
            ]
                .filter(Boolean)
                .join(' ') ||
            userData?.user?.kycRequest?.fullName ||
            'User';

        if (setStep === 'done') {
            return (
                <div className="outer-bg-login w-full h-full flex justify-center items-center bg-[#E0FFEE]">
                    <div className="w-xd-430 h-full items-start flex flex-col">
                        <div className="h-1/2 flex flex-col justify-end px-xd-40">
                            <div>
                                <h2 className="text-xd-30 font-bold text-[#1D1D1D]">Welcome !</h2>
                                <p className="text-xd-16 font-medium text-[#1D1D1D] mt-xd-5">
                                    {displayName}
                                </p>
                            </div>{' '}
                            <p className="text-xd-12 text-[#1D1D1D] mt-xd-4">
                                Enjoy With Our Services
                            </p>
                            <FlexibleSpace size={80} />
                        </div>
                        <div className="h-1/2 flex flex-col items-center px-xd-40">
                            <FlexibleSpace grow />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="outer-bg-passcode w-full h-full relative overflow-hidden bg-[#F4FFF4]">
                <AnimatePresence mode="wait" initial={false}>
                    <div className="flex h-full justify-center items-center w-full">
                        <motion.div
                            key={setStep}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={slideTrans}
                            className="inset-0 w-fit h-full items-start flex flex-col"
                        >
                            <div className="h-1/2 flex flex-col justify-end px-xd-35">
                                <div>
                                    <h2 className="text-xd-30 font-bold text-[#1D1D1D]">
                                        {setStep === 'saving'
                                            ? t.auth.setPasscode.titleDone
                                            : 'Set Passcode !'}
                                    </h2>
                                    <p className="text-xd-16 font-medium text-[#1D1D1D] mt-xd-5">
                                        Last Step And Enjoy Our Services
                                    </p>
                                </div>
                                <FlexibleSpace size={130} share={0.2} />
                            </div>
                            <div className="h-1/2 flex flex-col items-center px-xd-15">
                                <div className="w-full">
                                    {setStep === 'set' && (
                                        <PinInputs
                                            value={setValue}
                                            onChange={setSetValue}
                                            onComplete={handleSetComplete}
                                            disabled={false}
                                            isValidPin=""
                                            label={setError || t.auth.setPasscode.setLabel}
                                            labelTone={setError ? 'error' : 'default'}
                                        />
                                    )}
                                    {(setStep === 'reenter' || setStep === 'saving') && (
                                        <PinInputs
                                            value={reenterValue}
                                            onChange={setReenterValue}
                                            onComplete={handleReenterComplete}
                                            disabled={
                                                setStep === 'saving' || setIsValid === 'valid'
                                            }
                                            isValidPin={setStep === 'saving' ? 'valid' : setIsValid}
                                            label={
                                                setStep === 'saving'
                                                    ? t.auth.setPasscode.doneLabel
                                                    : t.auth.setPasscode.reenterLabel
                                            }
                                        />
                                    )}
                                </div>
                                <FlexibleSpace grow />
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>
            </div>
        );
    }

    const stepUser = loginStep?.status === 'requires_passcode' ? loginStep.user : undefined;
    const displayName =
        [
            userData?.user?.firstName ?? userData?.firstName ?? stepUser?.firstName,
            userData?.user?.lastName ?? userData?.lastName ?? stepUser?.lastName,
        ]
            .filter(Boolean)
            .join(' ') ||
        userData?.user?.kycRequest?.fullName ||
        partialUserPhone ||
        'User';
    const avatarUrl = userData?.user?.profilePictureURL ?? stepUser?.profilePictureURL;
    const kycSt = (
        userData?.user?.kycVerification?.status ?? stepUser?.kycVerification?.status
    )?.toLowerCase();
    const isVerified = kycSt === 'verified' || kycSt === 'approved' || kycSt === 'passed';

    return (
        <div className="w-full h-full relative overflow-hidden">
            {/* Layer 1 — avatar, painted before the blur so backdrop-blur blurs it */}
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none">
                <div className=" mb-xd-370">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt=""
                            className="w-xd-194 h-xd-190 rounded-xd-15 object-cover"
                        />
                    ) : (
                        <div className="w-xd-194 h-xd-190 rounded-xd-15 bg-gray-400 flex items-center justify-center">
                            <span className="text-white font-bold" style={{ fontSize: 64 }}>
                                {(displayName ?? '?')[0].toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Layer 2 — blur + tint, blurs avatar and page behind */}
            <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/20 pointer-events-none" />

            {/* Layer 3 — content, above blur */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                <div
                    style={{ marginTop: 'calc(120 * var(--xd-unit))' }}
                    className="flex flex-col items-center gap-xd-5"
                >
                    {/* Verified badge */}
                    <Image
                        src={isVerified ? verifiedIcon : notVerifiedIcon}
                        alt={isVerified ? 'Verified' : 'Not Verified'}
                        width={23}
                        height={23}
                        className="object-contain"
                    />

                    {/* Name */}
                    {displayName && (
                        <p className="text-xd-18 text-[#1D1D1D] mb-xd-14">{displayName}</p>
                    )}

                    {/* Label above inputs */}
                    <p className="text-xd-12 font-bold text-[#1D1D1D] mb-xd-3">
                        {t.auth.enterPasscode.label}
                    </p>

                    {/* PIN inputs */}
                    <PinInputs
                        value={enterValue}
                        onChange={setEnterValue}
                        onComplete={handleEnterComplete}
                        disabled={loading || enterIsValid === 'valid'}
                        isValidPin={enterIsValid}
                        label=""
                        autoFocus={false}
                    />
                    {/* Forgot-passcode action (static label when no handler is wired) */}
                    {props.onForgotPasscode ? (
                        <button
                            onClick={props.onForgotPasscode}
                            className="text-xd-11 font-medium text-[#388CFF] mb-xd-3 underline"
                        >
                            {t.auth.enterPasscode.forgotLabel}
                        </button>
                    ) : (
                        <p className="text-xd-11 font-medium text-[#1D1D1D] mb-xd-3">
                            {t.auth.enterPasscode.forgotLabel}
                        </p>
                    )}
                    {props.mode === 'enter' && props.onUseBiometric && (
                        <BiometricButton onPress={props.onUseBiometric} />
                    )}
                    <FlexibleSpace size={60} />
                </div>
            </div>
        </div>
    );
}

// ── Biometric shortcut button ────────────────────────────────────────
// Picks fingerprint (Android) or face-id (iOS/macOS/Windows) based on
// the actual device, not CSS media queries.

const BIOMETRIC_CONFIG: Record<BiometricType, { icon: typeof fingerprintIcon; label: string }> = {
    fingerprint: { icon: fingerprintIcon, label: 'Use Fingerprint' },
    faceid: { icon: faceidIcon, label: 'Use Face ID' },
    passkey: { icon: passkeyIcon, label: 'Use Biometrics' },
};

function BiometricButton({ onPress }: { onPress: () => void }) {
    const type = useMemo(detectBiometricType, []);
    const { icon, label } = BIOMETRIC_CONFIG[type];

    return (
        <button onClick={onPress} className="mt-xd-5 flex flex-col items-center gap-xd-5">
            <div className="w-xd-60 h-xd-60 rounded-full bg-white flex items-center justify-center">
                <Image
                    src={icon}
                    alt={label}
                    width={32}
                    height={32}
                    className="object-contain"
                    style={{ filter: 'invert(0.1)' }}
                />
            </div>
            <span className="text-xd-12 font-medium text-[#8E8E8E]">{label}</span>
        </button>
    );
}
