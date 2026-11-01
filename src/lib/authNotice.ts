/**
 * A message for the /auth page from a screen that is about to leave for it —
 * "your session expired" from the lock screen, "your login expired" from the
 * reset-passcode flow. Both leave by navigation (one of them by a full reload),
 * so the message cannot ride along in React state.
 *
 * sessionStorage, read once: the notice belongs to this tab and this bounce,
 * not to the next visit. Only a known key is stored, never text — the auth page
 * translates it, and nothing else can put words on that screen.
 */

const STORAGE_KEY = 'rdb_auth_notice';
/** A bounce takes a second; anything older is a leftover from an abandoned tab. */
const NOTICE_TTL_MS = 60_000;

export type AuthNotice = 'sessionExpired' | 'loginExpired';

const NOTICES: readonly AuthNotice[] = ['sessionExpired', 'loginExpired'];

export function setAuthNotice(notice: AuthNotice): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ notice, at: Date.now() }));
    } catch {
        // Private mode or a full quota — the redirect still happens, just silently.
    }
}

/** Returns the pending notice once, clearing it as it goes. */
export function takeAuthNotice(): AuthNotice | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(STORAGE_KEY);

        const parsed = JSON.parse(raw) as { notice?: string; at?: number };
        if (typeof parsed?.at !== 'number' || Date.now() - parsed.at > NOTICE_TTL_MS) return null;
        return NOTICES.find((n) => n === parsed.notice) ?? null;
    } catch {
        return null;
    }
}
