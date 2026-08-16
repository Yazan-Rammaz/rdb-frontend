'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserData } from '@/core/types/auth';
import {
    setAuthCookies,
    updateUserDataCookie,
} from '@/core/auth/secure-cookies';
import { clearAuthFlowState } from '@/lib/authFlowCookie';
import { refreshAccessToken } from '@/core/utils';
import { pfetch } from '@/lib/p';
import { useUniversalRouter } from '@/hooks/useUniversalRouter';

// Shapes the NestJS session login/step endpoints can return
export type LoginApiResponse =
    // Step endpoints return only sessionToken on success; session/complete gives the rest
    | { status: 'active' | 'approved'; sessionToken: string; sessionId?: string }
    | {
          status: 'requires_passcode';
          stepToken: string;
          user?: {
              id?: string;
              phoneNumber?: string;
              email?: string;
              firstName?: string;
              lastName?: string;
              profilePictureURL?: string;
              kycVerification?: { status?: string };
          };
      }
    | { status: 'requires_approval'; stepToken: string; requestId: string; expiresAt: string };

// stepToken held in memory only — short-lived (10 min), never persisted
export type LoginStep =
    | {
          status: 'requires_passcode';
          stepToken: string;
          user?: {
              id?: string;
              phoneNumber?: string;
              email?: string;
              firstName?: string;
              lastName?: string;
              profilePictureURL?: string;
              kycVerification?: { status?: string };
          };
      }
    | { status: 'requires_approval'; requestId: string; expiresAt: string; stepToken: string }
    | null;

interface AuthContextType {
    isUnlocked: boolean;
    unlock: () => void;
    lock: () => void;
    userData: UserData | null;
    setUserData: (user: UserData | null) => void;
    saveAuthCookies: (fullUserData: UserData) => Promise<boolean>;
    removeAuthCookies: () => Promise<void>;
    updateUser: (user: User) => Promise<boolean>;
    refreshUser: () => Promise<void>;
    checkAuth: () => Promise<boolean>;
    isLoading: boolean;
    loginStep: LoginStep;
    setLoginStep: (step: LoginStep) => void;
    handleLoginResponse: (result: LoginApiResponse) => Promise<void>;
    /** Phone number stored during mid-login (requires_passcode) so PasscodeScreen can display it */
    partialUserPhone: string | null;
    setPartialUserPhone: (phone: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: React.ReactNode;
    useCookies?: boolean;
    userData?: UserData | null;
}

export function AuthProvider({
    children,
    useCookies = true,
    userData: initialUserData,
}: AuthProviderProps) {
    const [isUnlocked, setIsUnlocked] = useState(false);
    // Start loading=true when we need to check cookies, so AuthProtected waits
    const [isLoading, setIsLoading] = useState(useCookies);
    const [userData, setUserDataState] = useState<UserData | null>(initialUserData || null);
    const [loginStep, setLoginStep] = useState<LoginStep>(null);
    const [partialUserPhone, setPartialUserPhone] = useState<string | null>(null);

    // log user data changes
    useEffect(() => {
        console.log('AuthContext - userData changed:', userData);
    }, [userData]);

    // Silent-refresh hard failure (token refresh returned 401) dispatches this from
    // the fetch layer. Clear auth state WITHOUT a page reload — AuthProtected then
    // SPA-routes to /auth. Cookies were already cleared by /api/auth/logout.
    useEffect(() => {
        const onExpired = () => {
            setUserDataState(null);
            setIsUnlocked(false);
            setPartialUserPhone(null);
            clearAuthFlowState();
        };
        window.addEventListener('rdb:session-expired', onExpired);
        return () => window.removeEventListener('rdb:session-expired', onExpired);
    }, []);

    // A full session implies no mid-login step is active — keep loginStep
    // consistent so PasskeyContext doesn't reroute unlocks through /step/*.
    useEffect(() => {
        if (userData && loginStep !== null) {
            setLoginStep(null);
        }
    }, [userData, loginStep]);

    // Load user data only if useCookies = true (standalone mode)
    useEffect(() => {
        if (!useCookies) {
            return;
        }

        let cancelled = false;

        const fetchMe = async (): Promise<Response | null> => {
            try {
                return await pfetch('me');
            } catch {
                // Network error (offline, dropped connection) → transient, not a logout.
                return null;
            }
        };

        // Backoff cap for the transient-retry loop. We never *give up* on a transient
        // failure — instead we wait for the network to return (the `online` event) and
        // retry, using this capped backoff only as a fallback poll for environments
        // where `navigator.onLine` is unreliable.
        const RETRY_BASE_MS = 1500;
        const RETRY_MAX_MS = 30_000;

        // Resolve after `delay` ms OR as soon as the browser reports it's back online,
        // whichever comes first. Also resolves immediately on unmount so the loop exits.
        const waitForRetry = (delay: number): Promise<void> =>
            new Promise((resolve) => {
                if (cancelled) return resolve();
                let done = false;
                const finish = () => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    window.removeEventListener('online', finish);
                    resolve();
                };
                const timer = setTimeout(finish, delay);
                // Retry the instant connectivity is restored, without waiting out the backoff.
                window.addEventListener('online', finish, { once: true });
            });

        // One attempt. Returns the tri-state outcome; sets userData on success.
        const attemptOnce = async (): Promise<'ok' | 'unauthenticated' | 'transient'> => {
            let res = await fetchMe();

            // Access token may have expired (~15 min). Try ONE silent refresh, then
            // re-fetch. The refresh result is itself tri-state.
            let refreshTransient = false;
            if (res && res.status === 401) {
                const refreshed = await refreshAccessToken();
                if (refreshed === 'refreshed') {
                    res = await fetchMe();
                } else if (refreshed === 'unauthenticated') {
                    return 'unauthenticated'; // refresh token dead/reused/revoked
                } else {
                    refreshTransient = true; // backend unreachable during refresh
                }
            }

            if (res && res.ok) {
                const freshUser = await res.json();
                setUserDataState({
                    user: freshUser,
                    accessToken: { token: '', expiresAt: '' },
                    refreshToken: { token: '', expiresAt: '' },
                } as UserData);
                return 'ok';
            }

            // A 401 that survived a *successful* refresh = truly unauthenticated.
            // (A 401 after a transient refresh is NOT definitive — retry instead.)
            if (res && res.status === 401 && !refreshTransient) return 'unauthenticated';

            // network null, 5xx, or refresh 'transient'
            return 'transient';
        };

        // Distinguish a genuine "logged out" (dead refresh token) from a transient
        // backend/network blip. The OLD code wiped userData on BOTH, so one flaky
        // /profile/me on reload bounced the user to /auth (or stranded the lock screen
        // on the "User" placeholder). Now we only wipe on a confirmed unauthenticated;
        // a transient failure keeps the session and retries WHEN THE NETWORK RETURNS,
        // not for a fixed number of tries. The splash stays up meanwhile (isLoading is
        // only cleared once we reach a definitive outcome), so the user is never shown
        // a false logout during an outage.
        const loadUserData = async () => {
            let backoff = RETRY_BASE_MS;
            try {
                while (!cancelled) {
                    const outcome = await attemptOnce();
                    if (cancelled) return;
                    if (outcome === 'ok') return;
                    if (outcome === 'unauthenticated') {
                        setUserDataState(null);
                        return;
                    }
                    // transient → wait for connectivity, then retry. Don't wipe the session.
                    console.warn(
                        '[AuthContext] /profile/me transient failure — will retry when the network returns',
                    );
                    await waitForRetry(backoff);
                    backoff = Math.min(backoff * 2, RETRY_MAX_MS);
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            } finally {
                // Only reached on a definitive outcome (ok / unauthenticated) or unmount —
                // NOT between transient retries, so the splash never flashes a logout.
                if (!cancelled) setIsLoading(false);
            }
        };
        loadUserData();

        return () => {
            cancelled = true;
        };
    }, [useCookies]);

    // set loading to false once we have user data (either from props or cookies)
    useEffect(() => {
        if (initialUserData) {
            setIsLoading(false);
            setUserDataState(initialUserData);
        }
    }, [initialUserData]);
    const setUserData = (newUser: UserData | null) => setUserDataState(newUser);

    const saveAuthCookies = async (fullUserData: UserData): Promise<boolean> => {
        setIsUnlocked(true);

        if (useCookies) {
            try {
                // Best-effort server-side cookie write — only works in Server Action context.
                // The Worker already sets rdb_at / rdb_rt / rdb_user in session-complete,
                // so this is intentionally non-blocking: we never gate on its success.
                setAuthCookies(fullUserData).catch(() => {});
            } catch {
                // ignore — cookies were set by the Worker
            }
        }

        setUserDataState(fullUserData);
        return true;
    };

    const removeAuthCookies = async (): Promise<void> => {
        setUserDataState(null);
        setIsUnlocked(false);
        setPartialUserPhone(null);
        clearAuthFlowState();

        if (!useCookies) return;

        try {
            // Worker route deletes all auth cookies server-side (clearAuthCookies uses
            // next/headers which is server-only and silently fails on the client).
            await pfetch('lo');
        } catch (error) {
            console.error('removeAuthCookies error:', error);
        }
    };

    const updateUser = async (user: User): Promise<boolean> => {
        if (userData) {
            setUserDataState({ ...userData, user });
        }
        if (!useCookies) return true;

        try {
            const result = await updateUserDataCookie(user);
            return result.success;
        } catch (error) {
            console.error('updateUser error:', error);
            return false;
        }
    };

    const refreshUser = async (): Promise<void> => {
        try {
            let res = await pfetch('me');
            // Silent token refresh on an expired access token, then retry once.
            if (res.status === 401 && (await refreshAccessToken()) === 'refreshed') {
                res = await pfetch('me');
            }
            if (res.ok) {
                const freshUser = await res.json();
                setUserDataState((prev) =>
                    prev
                        ? { ...prev, user: freshUser }
                        : ({
                              user: freshUser,
                              accessToken: { token: '', expiresAt: '' },
                              refreshToken: { token: '', expiresAt: '' },
                          } as UserData),
                );
            }
        } catch {
            // non-fatal
        }
    };

    const handleLoginResponse = useCallback(async (result: LoginApiResponse): Promise<void> => {
        if (result.status === 'active' || result.status === 'approved') {
            // Exchange the sessionToken for accessToken + refreshToken + user
            try {
                const completeRes = await pfetch('sc', { sessionToken: result.sessionToken });
                if (completeRes.ok) {
                    const completeData = await completeRes.json();
                    await saveAuthCookies(completeData);
                    setPartialUserPhone(null);
                    if (completeData.sessionToken) {
                        await pfetch('ss', { sessionToken: completeData.sessionToken });
                    }
                }
            } catch (err) {
                console.error('[AuthContext] session/complete error:', err);
            }
            setLoginStep(null);
            return;
        }
        // Store stepToken in memory AND persist to rdb_step cookie so it survives refresh
        if (result.status === 'requires_passcode') {
            setLoginStep({
                status: 'requires_passcode',
                stepToken: result.stepToken,
                user: result.user,
            });
            pfetch('st', { stepToken: result.stepToken }).catch(() => {});
        } else if (result.status === 'requires_approval') {
            setLoginStep({
                status: 'requires_approval',
                requestId: result.requestId,
                expiresAt: result.expiresAt,
                stepToken: result.stepToken,
            });
            pfetch('st', { stepToken: result.stepToken }).catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAuth = useCallback(async (): Promise<boolean> => {
        // Trust in-memory userData — populated by me-cached on mount and by saveAuthCookies on login.
        // isAuthenticated() uses next/headers which only works server-side.
        return !!userData;
    }, [userData]);

    return (
        <AuthContext.Provider
            value={{
                isUnlocked,
                unlock: () => setIsUnlocked(true),
                lock: () => setIsUnlocked(false),
                userData,
                setUserData,
                saveAuthCookies,
                removeAuthCookies,
                updateUser,
                refreshUser,
                checkAuth,
                isLoading,
                loginStep,
                setLoginStep,
                handleLoginResponse,
                partialUserPhone,
                setPartialUserPhone,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}

// AuthProtected lives in its own file to avoid a circular dep with PasskeyContext
export { AuthProtected } from '@/components/layout/AuthProtected';
