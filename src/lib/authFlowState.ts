/**
 * Where the user is in the sign-in / sign-up flow, so a page refresh resumes
 * that step instead of starting over at Get Started.
 *
 * The record lives in sessionStorage: it survives a reload and dies with the
 * tab. Progress belongs to the tab that made it — a tab closed half-way through
 * a login (on a shared device, say) must not be resumable by whoever opens
 * /auth next. Nothing secret goes in: no OTP digits, no passcode, no tokens
 * (the mid-login step token stays in the httpOnly `rdb_step` cookie).
 *
 * The middleware cannot read sessionStorage, and it needs to know a flow is in
 * progress so it lets /auth load for a user who already has a session but has
 * not finished onboarding (name, passcode). A value-less session cookie carries
 * just that. A stale one is harmless: the page finds no record, finishes the
 * flow and goes to /home.
 */

/** Presence flag the middleware checks. Same name as the old encrypted
 * cookie, so clearing the flag also expires any left over from older builds. */
export const AUTH_FLOW_COOKIE = 'rdb_af';
const STORAGE_KEY = 'rdb_af';

export interface AuthFlowState {
    step: string;
    phone?: string;
    authType?: 'signIn' | 'signUp';
    method?: 'sms' | 'whatsapp';
    sessionInfo?: string;
    /** A login waiting for approval from the phone app. */
    approval?: { requestId: string; expiresAt: string };
}

function writeFlag(on: boolean): void {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = on
        ? `${AUTH_FLOW_COOKIE}=1; path=/; SameSite=Strict${secure}`
        : `${AUTH_FLOW_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict${secure}`;
}

export function saveAuthFlowState(state: AuthFlowState): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        writeFlag(true);
    } catch {
        // Storage disabled or full: the flow still works, it just won't resume.
    }
}

export function loadAuthFlowState(): AuthFlowState | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as AuthFlowState) : null;
    } catch {
        return null;
    }
}

export function clearAuthFlowState(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to clear if storage is unavailable.
    }
    writeFlag(false);
}
