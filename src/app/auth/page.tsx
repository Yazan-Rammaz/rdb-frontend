'use client';
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import EnterPhoneScreen from '@/components/auth/screens/EnterPhone';
import GetStartedScreen from '@/components/auth/screens/GetStarted';
import SelectMethod from '@/components/auth/screens/SelectMethod';
import EnterPin from '@/components/auth/screens/EnterPin';
import TermsScreen from '@/components/auth/screens/Terms';
import AuthSuccessScreen from '@/components/auth/screens/AuthSuccess';
import PasscodeScreen from '@/components/auth/screens/PasscodeScreen';
import RegistrationStatusScreen from '@/components/auth/screens/RegistrationStatusScreen';
import EnterNameScreen from '@/components/auth/screens/EnterNameScreen';
import QrLoginScreen from '@/components/auth/screens/QrLogin';
import ApprovalWaitingScreen from '@/components/auth/screens/ApprovalWaiting';
import {
    saveAuthFlowState,
    loadAuthFlowState,
    clearAuthFlowState,
    getCachedAuthFlowState,
} from '@/lib/authFlowCookie';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePasskey } from '@/context/PasskeyContext';
import { useActions } from '@/hooks/useActions';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/I18nContext';
import { useStore } from '@/context/StoreContext';
import { useRDBConfig } from '@/context/RDBContext';
import { setupPin, unlockWithPin, getDeviceId } from '@/services/passkeyApi';
import { ResetPasscodeProvider, useResetPasscode } from '@/context/ResetPasscodeContext';
import ResetPasscodeOverlay from '@/components/resetPasscode/ResetPasscodeOverlay';
import { Page } from '@/scaling';
import { pfetch } from '@/lib/p';

type AuthStep =
    | 'get-started'
    | 'terms'
    | 'enter-phone'
    | 'select-method'
    | 'enter-pin'
    | 'already-registered'
    | 'not-registered'
    | 'login-success'
    | 'signup-success'
    | 'enter-name'
    | 'set-passcode'
    | 'enter-passcode'
    | 'qr-login';

// Hoisted to module scope so it can be used in useState lazy initializers.
const RESUMABLE_STEPS: readonly AuthStep[] = [
    'terms',
    'enter-phone',
    'select-method',
    'enter-pin',
    'already-registered',
    'not-registered',
    'login-success',
    'signup-success',
    'enter-name',
    'set-passcode',
    'enter-passcode',
];
const POST_AUTH_STEPS: readonly AuthStep[] = [
    'enter-name',
    'set-passcode',
    'enter-passcode',
    'login-success',
    'signup-success',
    'already-registered',
];

const transition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

/**
 * The auth page hosts its own ResetPasscodeProvider + overlay so "Forgot
 * Passcode" works from the MID-LOGIN passcode step (scenarios #2/#4 in
 * RESET_PASSCODE_WEB_INTEGRATION.md): quiz directly (no OTP), authenticated by
 * the login stepToken. The idle-lock entry lives in the protected layout.
 */
export default function AuthPage() {
    return (
        <ResetPasscodeProvider>
            <AuthPageInner />
            <ResetPasscodeOverlay />
        </ResetPasscodeProvider>
    );
}

function AuthPageInner() {
    const actions = useActions();
    const router = useRouter();
    const {
        saveAuthCookies,
        userData,
        updateUser,
        isLoading: isAuthLoading,
        refreshUser,
        loginStep,
        setLoginStep,
        handleLoginResponse,
        setPartialUserPhone,
    } = useAuth();
    const { unlockWithPin: stepUnlockWithPin, confirmSetup, confirmUnlock } = usePasskey();
    const { start: startPasscodeReset } = useResetPasscode();
    const { toast } = useToast();
    const { t, tr } = useTranslation();
    const { preloadData } = useStore();
    const { handleUnauthenticated } = useRDBConfig();
    // Read cached auth-flow state synchronously so the first render already
    // shows the correct step (cache is populated during the splash window by
    // ClientProviders).
    const cached = getCachedAuthFlowState();
    const initial = cached && RESUMABLE_STEPS.includes(cached.step as AuthStep) ? cached : null;
    const [authType, setAuthType] = useState<'signIn' | 'signUp'>(initial?.authType ?? 'signUp');
    const [isValidPin, setIsValidPin] = useState<'notvalid' | 'valid' | ''>('');
    const [step, setStep] = useState<AuthStep>((initial?.step as AuthStep) ?? 'get-started');
    // Cache is `undefined` only if preload hasn't finished yet. Treat that as
    // "needs async hydration"; otherwise we already have the correct state.
    const [hydrated, setHydrated] = useState(cached !== undefined);
    const [direction, setDirection] = useState(1);
    const [phone, setPhone] = useState(initial?.phone ?? '');
    const [sessionInfo, setSessionInfo] = useState(initial?.sessionInfo ?? '');
    const [method, setMethod] = useState<'sms' | 'whatsapp' | ''>(initial?.method ?? '');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState<
        'send-phone' | 'send-pin' | 'resend-pin' | 'verify-pin' | ''
    >('');
    // Post-passcode navigation is driven from a committed effect instead of inline
    // in the async success callback. On Cloudflare Pages (next-on-pages) a
    // `router.push('/home')` issued mid-callback — right as session/complete flips
    // userData and the loginStep→null transition re-renders — was being dropped,
    // stranding the user on the /auth passcode screen (it worked in `next dev` but
    // not in the edge production build). Flipping this flag and navigating from an
    // effect fires the replace after the render commits, the same reliable path the
    // post-refresh redirect already uses.
    const [navigateHome, setNavigateHome] = useState(false);
    const navigatedHomeRef = useRef(false);

    // Restore phone as display hint when enter-passcode is reached with no userData.
    // phone is recovered from the auth flow cookie, partialUserPhone is React state (lost on refresh).
    useEffect(() => {
        if (step === 'enter-passcode' && !userData && phone) {
            setPartialUserPhone(phone);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, phone]);

    // If authenticated and not in a post-auth step, redirect to /home.
    useEffect(() => {
        if (!hydrated) return;
        if (!isAuthLoading && userData && !POST_AUTH_STEPS.includes(step)) {
            router.replace('/home');
        }
    }, [hydrated, isAuthLoading, userData, router, step]);

    // Passcode-success navigation (see navigateHome declaration above). Runs from a
    // committed effect so the soft navigation isn't dropped by the edge build; the
    // goHome watchdog hard-navigates if the soft navigation is dropped anyway.
    useEffect(() => {
        if (navigateHome && userData && !navigatedHomeRef.current) {
            navigatedHomeRef.current = true;
            goHome(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigateHome, userData, router]);

    // If we land on set-passcode but the backend already has a passcode for
    // this user (e.g. after a refresh between save and redirect), switch to
    // enter-passcode. Response envelope is { message, data: { enabled } }.
    useEffect(() => {
        if (!hydrated || step !== 'set-passcode') return;
        let cancelled = false;
        (async () => {
            try {
                const res = await pfetch('ps');
                if (!res.ok) return;
                const body = await res.json().catch(() => ({}) as any);
                const enabled = body?.data?.enabled ?? body?.enabled ?? false;
                if (!cancelled && enabled) {
                    goTo('enter-passcode');
                }
            } catch {
                // network/parse error — stay on set-passcode
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, step]);

    // Store verified user data for passcode step
    const verifiedUserRef = useRef<any>(null);
    // session/complete is started the moment the passcode is verified correct, so the
    // green success animation isn't blocked by that network round-trip. handlePasscodeSuccess
    // awaits this before navigating so /home always has userData (cookies) ready.
    const pendingSessionCompleteRef = useRef<Promise<void> | null>(null);

    // Restore auth flow state from encrypted cookie on mount (handles page refresh).
    // We must hydrate before the first render of the AnimatePresence — otherwise the
    // GetStarted screen flashes and AnimatePresence animates to the saved step.
    useEffect(() => {
        let cancelled = false;
        loadAuthFlowState()
            .then((saved) => {
                if (cancelled) return;
                if (saved && RESUMABLE_STEPS.includes(saved.step as AuthStep)) {
                    if (saved.phone) setPhone(saved.phone);
                    if (saved.authType) setAuthType(saved.authType);
                    if (saved.method) setMethod(saved.method);
                    if (saved.sessionInfo) setSessionInfo(saved.sessionInfo);
                    setStep(saved.step as AuthStep);
                }
            })
            .finally(() => {
                if (!cancelled) setHydrated(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // Persist step to encrypted cookie whenever it changes to a resumable step.
    // Skip until hydrated so the initial 'get-started' default doesn't overwrite
    // the saved cookie before we've had a chance to read it.
    useEffect(() => {
        if (!hydrated) return;
        if (RESUMABLE_STEPS.includes(step)) {
            saveAuthFlowState({
                step,
                phone,
                authType,
                method: method || undefined,
                sessionInfo: sessionInfo || undefined,
            });
        } else {
            clearAuthFlowState();
        }
    }, [hydrated, step, phone, authType, method, sessionInfo]);

    // Lock body scroll: prevents iOS Safari from scrolling the document when
    // the software keyboard opens. position:fixed on <body> is the only
    // reliable cross-platform way to prevent keyboard-induced scroll.
    useEffect(() => {
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
    }, []);

    // Legacy passcode gate removed — PasskeyGate on ProtectedLayout handles
    // lock/unlock for all protected routes. The auth page only handles OTP flow.

    // Approval polling for requires_approval loginStep
    useEffect(() => {
        if (loginStep?.status !== 'requires_approval') return;
        const { requestId } = loginStep;
        const interval = setInterval(async () => {
            const res = await pfetch('sa', { id: requestId }, {
                headers: loginStep.stepToken ? { 'X-Step-Token': loginStep.stepToken } : {},
            }).catch(() => null);
            if (!res) return;
            const data = await res.json().catch(() => ({}));
            if (data.status === 'approved' || (data.sessionToken && data.status === 'active')) {
                clearInterval(interval);
                // The login was approved from the app — that approval IS the
                // unlock, so don't make PasskeyGate re-prompt for the passcode.
                // Set the skip flag (via confirmUnlock) BEFORE handleLoginResponse
                // so the userId-change effect's initialize() is skipped (no race).
                confirmUnlock();
                await handleLoginResponse(data);
                goHome();
            } else if (data.status === 'rejected' || data.status === 'expired') {
                clearInterval(interval);
                setLoginStep(null);
                toast.error(t.auth.otp.verificationFailed);
            }
        }, 2000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loginStep]);

    const goTo = (nextStep: AuthStep, dir = 1) => {
        setDirection(dir);
        setStep(nextStep);
    };

    const preloadHomeData = () => {
        void preloadData(actions, handleUnauthenticated);
    };

    // Post-login navigation to /home. IMPORTANT: nothing may start the store
    // preload burst before or during this navigation. The navigation runs as a
    // React transition needing ~450ms of uninterrupted rendering; every preload
    // response that lands mid-transition is an urgent context update that
    // RESTARTS the transition, so a burst of 6-8 API responses starves it
    // forever and the user freezes on the passcode screen (the long-standing
    // "frozen /auth" bug on the Cloudflare build). The protected layout starts
    // the preload after arrival instead (see PreloadStore in its layout.tsx),
    // and ClientProviders skips its auto-preload while on /auth.
    const goHome = (replace = false) => {
        if (replace) router.replace('/home');
        else router.push('/home');
    };

    const saveSessionTokenIfPresent = async (data: any) => {
        const st = data?.sessionToken;
        if (st) {
            await pfetch('ss', { sessionToken: st });
        }
    };

    // After login success: save cookies → /home (or enter-passcode if step pending).
    // After signup success: save cookies → enter-name step.
    const handleAfterSuccess = async () => {
        if (step === 'signup-success') {
            const data = verifiedUserRef.current || userData;
            if (data) {
                const success = await saveAuthCookies(data);
                if (success) {
                    await saveSessionTokenIfPresent(data);
                    refreshUser().catch(() => {});
                    preloadHomeData();
                    goTo('enter-name');
                } else {
                    toast.error(t.auth.otp.saveAuthFailed);
                }
            }
            return;
        }

        // signIn with requires_passcode: session/complete not yet done — ask for passcode
        if (loginStep?.status === 'requires_passcode') {
            goTo('enter-passcode');
            return;
        }

        // Normal signIn: cookies already set via verifyOtp response
        const data = verifiedUserRef.current || userData;
        if (data) {
            const success = await saveAuthCookies(data);
            if (success) {
                await saveSessionTokenIfPresent(data);
                refreshUser().catch(() => {});
                clearAuthFlowState();
                goHome();
            } else {
                toast.error(t.auth.otp.saveAuthFailed);
            }
        }
    };

    const [enterNameLoading, setEnterNameLoading] = useState(false);

    const handleEnterName = async (name: string) => {
        setEnterNameLoading(true);
        try {
            const parts = name.trim().split(/\s+/);
            const firstName = parts[0];
            const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
            await pfetch('pu', lastName ? { firstName, lastName } : { firstName });
            // Reflect the new name locally so the welcome screen greets the user
            // by name instead of falling back to "User".
            const currentUser = userData?.user ?? userData;
            if (currentUser) {
                await updateUser({
                    ...currentUser,
                    firstName,
                    lastName: lastName ?? '',
                });
            }
        } catch {
            // non-fatal — proceed anyway
        } finally {
            setEnterNameLoading(false);
        }
        goTo('set-passcode');
    };

    const handleSendPhone = () => {
        goTo('select-method');
    };

    const changeNumber = () => {
        setMethod('');
        goTo('enter-phone', -1);
    };

    const changeMethod = () => {
        goTo('select-method', -1);
    };

    const handleSelectMethod = async (selectedMethod: 'sms' | 'whatsapp') => {
        setMethod(selectedMethod);
        setLoading('send-pin');
        const sendOtpRes = await actions.auth.sendOtp({
            phoneNumber: `+${phone}`,
            channel: selectedMethod,
            type: authType,
        });
        setLoading('');
        if ('error' in sendOtpRes) {
            toast.error(tr('auth.otp.sendError', { error: sendOtpRes.error }));
            return;
        }
        if (sendOtpRes.sessionInfo) {
            setSessionInfo(sendOtpRes.sessionInfo);
            setPin('');
            goTo('enter-pin');
            toast.success(
                tr('auth.otp.sentSuccess', {
                    method: selectedMethod === 'sms' ? 'SMS' : 'WhatsApp',
                }),
            );
        } else {
            toast.warn(t.auth.otp.unexpectedError);
        }
    };

    const handleVerifyPin = async (pinValue: string) => {
        setLoading('verify-pin');
        const verifyOtpRes = await actions.auth.verifyOtp({
            phoneNumber: `+${phone}`,
            otpCode: pinValue,
            sessionInfo,
            type: authType,
            deviceId: getDeviceId(),
            deviceInfo: {
                userAgent: navigator.userAgent,
                browser: 'web',
                os: navigator.platform,
            },
        });

        if ('error' in verifyOtpRes) {
            setLoading('');
            if (verifyOtpRes.error.includes('Invalid') || verifyOtpRes.error.includes('expired')) {
                setIsValidPin('notvalid');
                toast.error(t.auth.otp.invalidExpired);
                setTimeout(() => {
                    setIsValidPin('');
                    setPin('');
                }, 1500);
            } else if (
                authType === 'signIn' &&
                (verifyOtpRes.error.toLowerCase().includes('not found') ||
                    verifyOtpRes.error.toLowerCase().includes('not registered') ||
                    verifyOtpRes.error.toLowerCase().includes('no account') ||
                    verifyOtpRes.error.toLowerCase().includes('does not exist'))
            ) {
                goTo('not-registered');
            } else {
                toast.error(verifyOtpRes.error || t.auth.otp.verificationFailed);
            }
            return;
        }

        const res = verifyOtpRes as any;

        // Session step required.
        if (res.status === 'requires_passcode' || res.status === 'requires_approval') {
            setLoading('');
            await handleLoginResponse(res);
            if (res.status === 'requires_passcode') {
                // Store phone so PasscodeScreen can display it while userData is null
                setPartialUserPhone(phone);
                // Show the green success state with the entered code still visible
                // (matches the res.user branch); clear the code only when navigating
                // away, so the numbers don't disappear during the success animation.
                setIsValidPin('valid');
                setTimeout(() => {
                    setIsValidPin('');
                    setPin('');
                    if (authType === 'signUp') {
                        // Existing user attempting sign-up: show already-registered screen
                        // Continue → login-success → enter-passcode
                        goTo('already-registered');
                    } else {
                        goTo('login-success');
                    }
                }, 1000);
            } else {
                // requires_approval: no success animation shown here — clear the code
                // and let handleLoginResponse hand off to the approval-waiting screen.
                setPin('');
                setIsValidPin('');
            }
            return;
        }

        if (res.user) {
            setIsValidPin('valid');
            setLoading('');
            verifiedUserRef.current = res;

            // Exchange sessionToken for rdb_at/rdb_rt cookies so authenticated
            // endpoints (e.g. /sessions/passcode/set) work immediately.
            if (res.sessionToken) {
                handleLoginResponse({ status: 'active', sessionToken: res.sessionToken }).catch(
                    () => {},
                );
            }

            const status = res.status;

            setTimeout(() => {
                if (status === 'authenticated') {
                    goTo('login-success');
                } else if (status === 'existing_user') {
                    goTo('already-registered');
                } else if (status === 'new_user') {
                    goTo('signup-success');
                } else {
                    goTo('login-success');
                }
            }, 1000);
        } else {
            setLoading('');
            setIsValidPin('notvalid');
            toast.error(t.auth.otp.verificationFailed);
            setTimeout(() => {
                setIsValidPin('');
                setPin('');
            }, 1500);
        }
    };

    // Flow 3: Already registered screen → proceed to login-success
    const handleAlreadyRegisteredContinue = () => {
        goTo('login-success');
    };

    const handleAlreadyRegisteredCancel = async () => {
        if (verifiedUserRef.current) {
            await saveAuthCookies(verifiedUserRef.current);
            await saveSessionTokenIfPresent(verifiedUserRef.current);
        }
        refreshUser().catch(() => {});
        clearAuthFlowState();
        goHome();
    };

    const handleClose = () => {
        setPhone('');
        setPin('');
        setMethod('');
        setIsValidPin('');
        setLoading('');
        goTo('get-started', -1);
    };

    // Cancel an in-progress app-approval login: drop the step, clear its cookie and
    // flow state, and return to the auth start screen (a clean slate).
    const handleApprovalCancel = () => {
        setLoginStep(null);
        pfetch('st', { stepToken: '' }).catch(() => {});
        clearAuthFlowState();
        setPhone('');
        setPin('');
        setMethod('');
        setIsValidPin('');
        setLoading('');
        goTo('get-started', -1);
    };

    // QR web login: phone approved → exchange sessionToken for cookies (reuses the
    // same path as OTP login) and go home. Mirrors the normal signIn completion.
    const handleQrApproved = async (sessionToken: string) => {
        try {
            // The phone approved this web login — treat that approval as the
            // unlock so PasskeyGate doesn't ask for the passcode again. Flag must
            // be set BEFORE handleLoginResponse (which changes userData and would
            // otherwise trigger initialize() → LOCKED).
            confirmUnlock();
            await handleLoginResponse({ status: 'active', sessionToken });
            refreshUser().catch(() => {});
            clearAuthFlowState();
            goHome();
        } catch {
            toast.error(t.auth.otp.saveAuthFailed);
            goTo('get-started', -1);
        }
    };

    const handleSavePasscode = async (passcode: string): Promise<boolean> => {
        try {
            const result = await setupPin(passcode);
            if (!result.success) return false;
            if (loginStep?.status === 'requires_passcode') {
                const stepResult = await stepUnlockWithPin(passcode);
                if (!stepResult.success) return false;
            }
            // Mark PasskeyContext as hasPin=true + UNLOCKED so PasskeyGate
            // doesn't redirect back to set-passcode on the next protected route.
            confirmSetup();
            return true;
        } catch (error) {
            console.error('handleSavePasscode Error:', error);
            return false;
        }
    };

    const handleSavePasscodeFailed = () => {
        toast.error('Failed to save passcode. Please try again.');
    };

    // After set-passcode completes → save auth and go home
    const handlePasscodeDone = async () => {
        // Step flow: session/complete already ran inside handleSavePasscode,
        // so userData + cookies are already set. Just navigate home.
        if (!loginStep && userData) {
            refreshUser().catch(() => {});
            clearAuthFlowState();
            goHome();
            return;
        }
        const data = verifiedUserRef.current || userData;
        if (data) {
            const loginSuccess = await saveAuthCookies(data);
            if (loginSuccess) {
                await saveSessionTokenIfPresent(data);
                refreshUser().catch(() => {});
                clearAuthFlowState();
                goHome();
            } else {
                toast.error(t.auth.otp.saveAuthFailed);
            }
        }
    };

    // Flow 2: Not registered → go to terms to create account
    const handleNotRegisteredCreate = () => {
        setAuthType('signUp');
        setPin('');
        setIsValidPin('');
        goTo('terms', -1);
    };

    // Verify passcode locally via passkeyApi (SHA-256 hash compare). Used on
    // /auth's enter-passcode step (returning user with an existing passcode).
    const handleVerifyPasscode = async (passcode: string): Promise<boolean> => {
        // Mid-login step (loginStep still in memory): verify against the step endpoint
        // with the X-Step-Token header. On success, START session/complete but DON'T
        // await it — returning true here fires the green success animation immediately,
        // and handlePasscodeSuccess awaits the in-flight promise before navigating.
        if (loginStep?.status === 'requires_passcode') {
            let res: Response;
            try {
                res = await pfetch('sv', { passcode }, {
                    headers: { 'X-Step-Token': loginStep.stepToken },
                });
            } catch {
                res = new Response(null, { status: 502 });
            }

            // 401 = step token missing/expired (not a wrong passcode) → restart login.
            if (res.status === 401) {
                setLoginStep(null);
                toast.error('Session expired. Please log in again.');
                return false;
            }

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.valid === false) return false; // wrong passcode → red shake

            // confirmUnlock sets skipNextInitializeRef=true BEFORE handleLoginResponse
            // calls setUserDataState — so the userId-change effect that triggers
            // initialize() sees the flag and skips, keeping lockStatus UNLOCKED.
            confirmUnlock();
            pendingSessionCompleteRef.current = handleLoginResponse(data);
            return true;
        }

        // After page refresh on enter-passcode: loginStep is lost but rdb_step cookie
        // may still exist. Try the step endpoint first; fall back to regular unlock
        // only if the backend says there is no step token (STEP_TOKEN_MISSING).
        if (step === 'enter-passcode') {
            let stepRes: Response;
            try {
                stepRes = await pfetch('sv', { passcode });
            } catch {
                stepRes = new Response(null, { status: 502 });
            }

            const stepData = await stepRes.json().catch(() => ({}));

            if (stepRes.ok) {
                // Same non-blocking handoff as the in-memory branch above: start
                // session/complete now, await it in handlePasscodeSuccess.
                confirmUnlock();
                pendingSessionCompleteRef.current = handleLoginResponse(stepData);
                return true;
            }

            // Step endpoint rejected with STEP_TOKEN_MISSING → no step in progress,
            // fall through to regular unlock (normal passcode entry from home-lock)
            const noStepToken =
                stepData?.error === 'STEP_TOKEN_MISSING' || stepData?.error === 'NO_SESSION';
            if (!noStepToken) {
                // Token existed but passcode was wrong (or expired step)
                return false;
            }
        }

        // Normal app-lock enter-passcode: rdb_at present, verify via /passcode/verify
        const result = await unlockWithPin(passcode);
        return result.success;
    };

    const handlePasscodeSuccess = async () => {
        // Both paths (mid-login step and normal enter-passcode) end here after the
        // 1s success animation. session/complete was kicked off the moment the passcode
        // verified correct, so it has usually already resolved during the animation —
        // this await is normally instant. We still await it so /home always has userData
        // (cookies) ready and AuthProtected doesn't bounce us back to /auth.
        if (pendingSessionCompleteRef.current) {
            await pendingSessionCompleteRef.current.catch(() => {});
            pendingSessionCompleteRef.current = null;
        }
        // refreshUser() is deliberately NOT called here: its /me response lands as
        // an urgent context update that competes with the pending /auth → /home
        // transition below and can starve it indefinitely (the request for /home
        // never gets issued at all — see PreloadStore in the protected layout,
        // which runs refreshUser() once we've actually landed on a protected route).
        clearAuthFlowState();
        // Defer the actual navigation to the committed effect above — see the
        // navigateHome comment for why an inline router.push is dropped in prod.
        setNavigateHome(true);
    };

    const currentVariants = {
        enter: { x: direction * 100 + '%', opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: direction * -100 + '%', opacity: 0 },
    };

    // Don't intercept requires_passcode while on set-passcode (signup creates PIN first),
    // login-success (showing success animation before passcode entry), or enter-passcode
    // (handled through the normal AnimatePresence step flow).
    if (
        loginStep?.status === 'requires_passcode' &&
        step !== 'enter-pin' &&
        step !== 'already-registered' &&
        step !== 'set-passcode' &&
        step !== 'login-success' &&
        step !== 'enter-passcode'
    ) {
        return (
            <Page variant="scaled" outerBg="passcode">
                <main className="xd-fit-screen fixed inset-0 overflow-hidden">
                    <PasscodeScreen
                        mode="enter"
                        onVerifyPasscode={handleVerifyPasscode}
                        onSuccess={handlePasscodeSuccess}
                        onForgotPasscode={() => startPasscodeReset('step')}
                    />
                </main>
            </Page>
        );
    }

    // Approval waiting screen (NestJS session step)
    if (loginStep?.status === 'requires_approval') {
        return (
            <Page variant="scaled">
                <main className="xd-fit-screen fixed inset-0 overflow-hidden">
                    <ApprovalWaitingScreen
                        expiresAt={loginStep.expiresAt}
                        onCancel={handleApprovalCancel}
                    />
                </main>
            </Page>
        );
    }

    return (
        <Page
            variant="scaled"
            outerBg={
                step === 'enter-passcode' || step === 'enter-name'
                    ? 'passcode'
                    : step === 'already-registered'
                      ? 'already-registered'
                      : step === 'not-registered'
                        ? 'not-registered'
                        : undefined
            }
        >
            <main className="xd-fit-screen fixed inset-0 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                    {hydrated && (
                        <motion.div
                            key={step}
                            variants={currentVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={transition}
                            className="inset-0 w-full h-full"
                        >
                            {step === 'get-started' && (
                                <GetStartedScreen
                                    onNewCustomer={() => {
                                        setAuthType('signUp');
                                        goTo('terms');
                                    }}
                                    onExistingAccount={() => {
                                        setAuthType('signIn');
                                        goTo('enter-phone');
                                    }}
                                    onScanQr={() => goTo('qr-login')}
                                    onLater={() => router.push('/home')}
                                />
                            )}

                            {step === 'terms' && (
                                <TermsScreen
                                    onAgree={() => goTo('enter-phone')}
                                    onLater={() => router.push('/home')}
                                />
                            )}

                            {step === 'enter-phone' && (
                                <EnterPhoneScreen
                                    authType={authType}
                                    onSubmit={handleSendPhone}
                                    phone={phone}
                                    setPhone={setPhone}
                                    loading={loading === 'send-phone'}
                                    onClose={handleClose}
                                />
                            )}

                            {step === 'select-method' && (
                                <SelectMethod
                                    changeNumber={changeNumber}
                                    setMethod={handleSelectMethod}
                                    method={method}
                                    phone={phone}
                                    authType={authType}
                                    loading={loading === 'send-pin'}
                                    onClose={handleClose}
                                />
                            )}

                            {step === 'enter-pin' && (
                                <EnterPin
                                    changeMethod={changeMethod}
                                    changeNumber={changeNumber}
                                    onClose={handleClose}
                                    onSubmit={handleVerifyPin}
                                    phone={phone}
                                    method={method}
                                    isValidPin={isValidPin}
                                    pin={pin}
                                    authType={authType}
                                    setPin={setPin}
                                    setSessionInfo={setSessionInfo}
                                    loading={loading}
                                    setLoading={setLoading}
                                />
                            )}

                            {step === 'already-registered' && (
                                <RegistrationStatusScreen
                                    variant="already-registered"
                                    phone={phone}
                                    onLoginAndContinue={handleAlreadyRegisteredContinue}
                                    onCancel={handleAlreadyRegisteredCancel}
                                />
                            )}

                            {step === 'not-registered' && (
                                <RegistrationStatusScreen
                                    variant="not-registered"
                                    phone={phone}
                                    onCreateAccount={handleNotRegisteredCreate}
                                    onCancel={() => router.push('/home')}
                                />
                            )}

                            {(step === 'login-success' || step === 'signup-success') && (
                                <AuthSuccessScreen
                                    variant={step === 'login-success' ? 'login' : 'signup'}
                                    onDone={handleAfterSuccess}
                                    delayMs={1500}
                                />
                            )}

                            {step === 'qr-login' && (
                                <QrLoginScreen
                                    onApproved={handleQrApproved}
                                    onCancel={() => goTo('get-started', -1)}
                                />
                            )}

                            {step === 'enter-name' && (
                                <EnterNameScreen
                                    onSubmit={handleEnterName}
                                    loading={enterNameLoading}
                                />
                            )}

                            {step === 'set-passcode' && (
                                <PasscodeScreen
                                    mode="set"
                                    onSavePasscode={handleSavePasscode}
                                    onDone={handlePasscodeDone}
                                    onSaveFailed={handleSavePasscodeFailed}
                                />
                            )}

                            {step === 'enter-passcode' && (
                                <PasscodeScreen
                                    mode="enter"
                                    onVerifyPasscode={handleVerifyPasscode}
                                    onSuccess={handlePasscodeSuccess}
                                    onForgotPasscode={() => startPasscodeReset('step')}
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </Page>
    );
}
