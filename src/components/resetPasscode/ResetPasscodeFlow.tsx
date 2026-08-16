'use client';

import { useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useResetPasscode } from '@/context/ResetPasscodeContext';
import { useStepUp } from '@/hooks/useStepUp';
import { usePasskey } from '@/context/PasskeyContext';
import { useAuth } from '@/context/AuthContext';
import { clearAuthFlowState } from '@/lib/authFlowCookie';
import { useToast } from '@/context/ToastContext';
import { useUniversalRouter } from '@/hooks/useUniversalRouter';
import {
    resetPasscodeApi,
    createStepResetPasscodeApi,
    StepExpiredError,
    type QuizQuestion,
    type ResetAnswer,
    type ResetLockout,
} from '@/services/resetPasscode/resetPasscodeApi';

import ForgetPasscodeIntro from './screens/ForgetPasscodeIntro';
import ResetEnterPhone from './screens/ResetEnterPhone';
import ResetSelectMethod from './screens/ResetSelectMethod';
import ResetEnterOtp from './screens/ResetEnterOtp';
import QuizScreen from './screens/QuizScreen';
import QuizFailOnce from './screens/QuizFailOnce';
import QuizLockout from './screens/QuizLockout';
import ResetSetPasscode from './screens/ResetSetPasscode';
import { pfetch } from '@/lib/p';

type ResetStep =
    | 'intro'
    | 'enter-phone'
    | 'select-method'
    | 'enter-otp'
    | 'quiz'
    | 'fail-once'
    | 'lockout'
    | 'set-passcode';

const transition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

export default function ResetPasscodeFlow() {
    const { close, entry } = useResetPasscode();
    const { satisfyStepUp, runStepUp } = useStepUp();
    const { confirmUnlock } = usePasskey();
    const { loginStep, setLoginStep } = useAuth();
    const { toast } = useToast();
    const router = useUniversalRouter();

    // Pick the endpoint set by entry point (doc §0.1). The mid-login set carries
    // the 10-min login stepToken as its bearer; the idle set rides on rdb_at.
    const isStepEntry = entry === 'step';
    const api = useMemo(() => {
        if (!isStepEntry) return resetPasscodeApi;
        const stepToken =
            loginStep?.status === 'requires_passcode' ? loginStep.stepToken : undefined;
        return createStepResetPasscodeApi(stepToken);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStepEntry]);

    // Any step/* call returning 401 = the login step token expired (doc §5).
    // Restart the login: clear the mid-login state so the auth page returns to
    // the start (a fresh OTP mints a new stepToken). Counters are server-side
    // durable, so the user dodges nothing by restarting.
    const handleStepExpired = () => {
        toast.error('Your login session expired. Please log in again.');
        setLoginStep(null);
        clearAuthFlowState();
        pfetch('st', { stepToken: '' }).catch(() => {});
        close();
        // The auth page tracks its screen in LOCAL state ('enter-passcode'), which
        // survives setLoginStep(null) — leaving the user on a passcode screen whose
        // step token we just cleared (it can never verify). Hard-navigate so the
        // whole auth flow resets to the start (phone → OTP → fresh stepToken).
        window.location.assign('/auth');
    };

    const [step, setStep] = useState<ResetStep>('intro');
    const [direction, setDirection] = useState(1);

    // ── Non-verified branch state ────────────────────────────────────────
    const [phone, setPhone] = useState('');
    const [method, setMethod] = useState<'sms' | 'whatsapp' | ''>('');
    const [otp, setOtp] = useState('');
    const [otpValid, setOtpValid] = useState<'valid' | 'notvalid' | ''>('');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [quizKey, setQuizKey] = useState(0);
    const [lockout, setLockout] = useState<ResetLockout | null>(null);
    const resetTokenRef = useRef<string | undefined>(undefined);
    // Mid-login face branch only: the single-use face proof, held in memory and
    // sent as X-Face-Step-Token on complete. NEVER written to the rdb_step
    // cookie here — mid-login that cookie holds the LOGIN session stepToken.
    const faceTokenRef = useRef<string | undefined>(undefined);

    // ── Loading flags ────────────────────────────────────────────────────
    const [initLoading, setInitLoading] = useState(false);
    const [methodLoading, setMethodLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState<'verify-pin' | 'resend-pin' | ''>('');

    const goTo = (next: ResetStep, dir = 1) => {
        setDirection(dir);
        setStep(next);
    };

    // ── Intro → init → branch ────────────────────────────────────────────
    const handleStart = async () => {
        setInitLoading(true);
        // Every (re)start is a fresh challenge — drop any stale face proof
        // (single-use; a replay would 403 at complete anyway).
        faceTokenRef.current = undefined;
        try {
            const res = await api.init();
            if (res.lockout) {
                setLockout(res.lockout);
                goTo('lockout');
                return;
            }
            if (res.isVerified && res.stepUp) {
                if (isStepEntry) {
                    // Mid-login face branch (scenario #4): hold the proof in
                    // memory only and deliver it on complete via the
                    // X-Face-Step-Token header. satisfyStepUp's cookie save is
                    // forbidden here — rdb_step carries the login stepToken.
                    // A failed/locked-out/expired capture keeps the user on the
                    // intro: retrying runs init again, which issues a fresh
                    // challenge with a fresh attempt budget.
                    const outcome = await runStepUp(res.stepUp);
                    if (outcome.ok && outcome.stepToken) {
                        faceTokenRef.current = outcome.stepToken;
                        goTo('set-passcode');
                    } else {
                        toast.error('Identity verification was not completed.');
                    }
                    return;
                }
                // Idle-lock face branch: proof persisted to rdb_step (free
                // there); the proxy forwards it to complete as X-Step-Token.
                const ok = await satisfyStepUp(res.stepUp);
                if (ok) {
                    goTo('set-passcode');
                } else {
                    toast.error('Identity verification was not completed.');
                }
                return;
            }
            if (isStepEntry) {
                // Mid-login, not verified (scenario #2): the login OTP just passed,
                // so the phone is already verified — skip OTP, go straight to the
                // quiz. (Verified users never reach here: the server returns the
                // face branch above, and step/questions would 409 for them.)
                const q = await api.getQuestions();
                if (!q.questions.length) {
                    toast.error('Could not load the security questions. Please try again.');
                    return;
                }
                setQuestions(q.questions);
                goTo('quiz');
                return;
            }
            goTo('enter-phone');
        } catch (err) {
            if (err instanceof StepExpiredError) {
                handleStepExpired();
                return;
            }
            toast.error('Could not start passcode reset. Please try again.');
        } finally {
            setInitLoading(false);
        }
    };

    // ── Phone → method → OTP ─────────────────────────────────────────────
    const handleSubmitPhone = () => goTo('select-method');

    const handleSelectMethod = async (m: 'sms' | 'whatsapp') => {
        setMethod(m);
        setMethodLoading(true);
        const res = await api.sendOtp(`+${phone}`, m);
        setMethodLoading(false);
        if (!res.ok) {
            toast.error(res.error ?? 'Could not send the code. Please try again.');
            return;
        }
        setOtp('');
        goTo('enter-otp');
        toast.success(`Code sent via ${m === 'sms' ? 'SMS' : 'WhatsApp'}`);
    };

    const handleResendOtp = async () => {
        if (!method) return;
        setOtpLoading('resend-pin');
        await api.sendOtp(`+${phone}`, method);
        setOtpLoading('');
    };

    const handleVerifyOtp = async (code: string) => {
        setOtpLoading('verify-pin');
        const res = await api.verifyOtp(`+${phone}`, code);
        if (!res.ok) {
            setOtpLoading('');
            setOtpValid('notvalid');
            setTimeout(() => {
                setOtpValid('');
                setOtp('');
            }, 1200);
            return;
        }
        setOtpValid('valid');
        // Load the quiz, then advance.
        const q = await api.getQuestions();
        setOtpLoading('');
        if (!q.questions.length) {
            setOtpValid('');
            toast.error('Could not load the security questions. Please try again.');
            return;
        }
        setQuestions(q.questions);
        setOtpValid('');
        setTimeout(() => goTo('quiz'), 600);
    };

    // ── Quiz → grade ─────────────────────────────────────────────────────
    const handleSubmitAnswers = async (answers: ResetAnswer[]) => {
        let res;
        try {
            res = await api.submitAnswers(answers);
        } catch (err) {
            if (err instanceof StepExpiredError) {
                handleStepExpired();
                return;
            }
            toast.error('Could not submit your answers. Please try again.');
            return;
        }
        if (res.success) {
            resetTokenRef.current = res.resetToken;
            goTo('set-passcode');
            return;
        }
        if (res.lockedUntil) {
            setLockout({
                lockedUntil: res.lockedUntil,
                nextLockoutHours: res.lockoutHours ?? 0,
            });
            goTo('lockout');
            return;
        }
        // One attempt left.
        goTo('fail-once');
    };

    const handleRetryQuiz = async () => {
        let q;
        try {
            q = await api.getQuestions();
        } catch (err) {
            if (err instanceof StepExpiredError) {
                handleStepExpired();
                return;
            }
            q = { questions: [], attemptsRemaining: 0 };
        }
        // Empty set = the reset session expired (15-min TTL → 409) or a backend
        // error. Entering the quiz with no questions would render a blank screen
        // with no way out — restart from the intro instead.
        if (!q.questions.length) {
            toast.error('Your reset session expired. Please start again.');
            goTo('intro', -1);
            return;
        }
        setQuestions(q.questions);
        setQuizKey((k) => k + 1);
        goTo('quiz', -1);
    };

    const handleLockoutExpired = () => {
        setLockout(null);
        goTo('intro', -1);
    };

    // ── Set new passcode → complete → home ───────────────────────────────
    // The backend `complete` endpoint overwrites the passcode server-side,
    // authorised by exactly one proof: the quiz resetToken (body), the idle
    // face step token (rdb_step cookie → X-Step-Token), or the mid-login face
    // proof (X-Face-Step-Token header). PIN verification is server-side bcrypt
    // — there is no local hash to update, and `/sessions/passcode/set` would
    // reject with ALREADY_SET. A 403 (replayed/expired proof) surfaces as
    // `success: false` → onSaveFailed toast; the user restarts from the intro.
    const handleSaveNewPasscode = async (passcode: string): Promise<boolean> => {
        try {
            const res = await api.complete(passcode, resetTokenRef.current, faceTokenRef.current);
            if (res.success) faceTokenRef.current = undefined; // consumed server-side
            return res.success;
        } catch (err) {
            if (err instanceof StepExpiredError) {
                handleStepExpired();
            }
            return false;
        }
    };

    const handleNewPasscodeDone = () => {
        if (isStepEntry) {
            // Mid-login: the session isn't ACTIVE yet. Per doc §0.1, return the
            // user to the login passcode step — entering the NEW passcode there
            // submits to /sessions/step/passcode/verify and finishes the login.
            close();
            toast.success('Passcode updated — enter your new passcode to continue.');
            return;
        }
        confirmUnlock();
        close();
        router.push('/home');
    };

    const variants = {
        enter: { x: direction * 100 + '%', opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: direction * -100 + '%', opacity: 0 },
    };

    return (
        <div className="w-full h-full relative overflow-hidden bg-white">
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={step === 'quiz' ? `quiz-${quizKey}` : step}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="absolute inset-0 w-full h-full"
                >
                    {step === 'intro' && (
                        <ForgetPasscodeIntro
                            loading={initLoading}
                            onStart={handleStart}
                            onClose={close}
                        />
                    )}

                    {step === 'enter-phone' && (
                        <ResetEnterPhone
                            phone={phone}
                            setPhone={setPhone}
                            onSubmit={handleSubmitPhone}
                            onClose={close}
                        />
                    )}

                    {step === 'select-method' && (
                        <ResetSelectMethod
                            phone={phone}
                            method={method}
                            setMethod={handleSelectMethod}
                            changeNumber={() => goTo('enter-phone', -1)}
                            loading={methodLoading}
                            onClose={close}
                        />
                    )}

                    {step === 'enter-otp' && (
                        <ResetEnterOtp
                            phone={phone}
                            method={method}
                            pin={otp}
                            setPin={setOtp}
                            isValidPin={otpValid}
                            loading={otpLoading}
                            onSubmit={handleVerifyOtp}
                            onResend={handleResendOtp}
                            changeNumber={() => goTo('enter-phone', -1)}
                            changeMethod={() => goTo('select-method', -1)}
                            onClose={close}
                        />
                    )}

                    {step === 'quiz' && (
                        <QuizScreen
                            questions={questions}
                            onComplete={handleSubmitAnswers}
                            onClose={close}
                        />
                    )}

                    {step === 'fail-once' && (
                        <QuizFailOnce onRetry={handleRetryQuiz} onClose={close} />
                    )}

                    {step === 'lockout' && lockout && (
                        <QuizLockout
                            lockedUntil={lockout.lockedUntil}
                            onExpired={handleLockoutExpired}
                            onClose={close}
                        />
                    )}

                    {step === 'set-passcode' && (
                        <ResetSetPasscode
                            onSavePasscode={handleSaveNewPasscode}
                            onDone={handleNewPasscodeDone}
                            onSaveFailed={() =>
                                toast.error('Could not set your new passcode. Please try again.')
                            }
                        />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
