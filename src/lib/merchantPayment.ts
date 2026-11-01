/**
 * Merchant payment codes — recognising them, and not losing one across a login.
 *
 * A customer reaches a merchant order three ways, and all end at the same place:
 *
 *   scanning the shop's QR            →  MERPAY:{code}, or the bare code
 *   opening /home?mrcpay={code}       →  the shop linked them in from the web
 *
 * The second is why this file holds more than a regex. That link can land on a
 * signed-out browser, which the middleware bounces to /auth; by the time the
 * person is back on /home the query is long gone. Losing it means they came to
 * pay a specific order and arrived at a generic home screen, so the code is
 * stashed on the way past and replayed once they are actually able to pay.
 */

/** Query parameter a merchant uses to link a customer into the app. */
export const MERCHANT_PAY_PARAM = 'mrcpay';

/** Merchant codes are prefixed, which is what makes a bare scan recognisable. */
export const MERCHANT_CODE_PREFIX = 'mp.';

/**
 * QR prefix a shop's own app prints — `MERPAY:mp.{code}` — mirroring `PAYREQ:`
 * for person-to-person requests. It states which lookup path the code belongs
 * to before a single request is made.
 *
 * Strictly speaking it is redundant: the payload is always an `mp.` code, which
 * this app already recognises bare. It is honoured because it is what the shop
 * prints, and a scanner that rejects the shop's own QR is the wrong end of that
 * argument.
 *
 * Read-only: nothing here builds one. The shop's app is the only issuer.
 */
export const MERCHANT_QR_PREFIX = 'MERPAY:';

const STORAGE_KEY = 'rdb_pending_mrcpay';

/**
 * How long a stashed code stays worth replaying.
 *
 * Long enough to sign in, pass a passcode, and recover from a mistyped one;
 * short enough that a code found in a tab tomorrow does not silently open a
 * payment screen. The order's own expiry is the real authority — this only
 * governs whether the app bothers to look it up.
 */
const STASH_TTL_MS = 30 * 60 * 1000;

/** Reads a merchant code out of anything a scanner or a URL bar can produce. */
export function extractMerchantCode(raw: string): string | null {
    const value = raw.trim();
    if (!value) return null;

    // MERPAY:mp.{code} — the shop app's QR. Unwrapping leaves exactly the code
    // the deep link carries, so both arrive at lookup identically. Handed on
    // untouched: a payload missing its `mp.` would be the issuer's to fix, and
    // guessing the prefix back on here would invent a code nobody minted.
    if (value.startsWith(MERCHANT_QR_PREFIX)) {
        const code = value.slice(MERCHANT_QR_PREFIX.length).trim();
        return code || null;
    }

    // A bare code, scanned directly off the shop's QR.
    if (value.startsWith(MERCHANT_CODE_PREFIX)) return value;

    const params = readParams(value);
    if (!params) return null;

    // `/mrcpay` is tolerated alongside `mrcpay`: a link written as
    // `/home?/mrcpay=…` parses to the slashed key, and a printed QR carrying
    // that typo cannot be corrected after the fact.
    const code = params.get(MERCHANT_PAY_PARAM) ?? params.get(`/${MERCHANT_PAY_PARAM}`);
    return code?.trim() ? code.trim() : null;
}

function readParams(value: string): URLSearchParams | null {
    try {
        return new URL(value).searchParams;
    } catch {
        // Not an absolute URL — try the query part of a bare path or string.
        const queryStart = value.indexOf('?');
        if (queryStart < 0) return null;
        try {
            return new URLSearchParams(value.slice(queryStart + 1));
        } catch {
            return null;
        }
    }
}

// ─── Surviving the login bounce ──────────────────────────────────────────────

/**
 * sessionStorage, not a cookie: a payment the person is part-way through
 * belongs to the tab they started it in. A cookie would follow them into every
 * other tab and outlive the intent.
 */
export function stashMerchantCode(code: string): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ code, at: Date.now() }),
        );
    } catch {
        // Private mode or a full quota — the in-URL path still works.
    }
}

/**
 * Returns a stashed code once, clearing it as it goes.
 *
 * Reading is destructive on purpose: replaying the same code after the sheet
 * has been opened would reopen it on every later navigation to /home.
 */
export function takeStashedMerchantCode(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(STORAGE_KEY);

        const parsed = JSON.parse(raw) as { code?: string; at?: number };
        if (!parsed?.code || typeof parsed.at !== 'number') return null;
        if (Date.now() - parsed.at > STASH_TTL_MS) return null;
        return parsed.code;
    } catch {
        return null;
    }
}

export function clearStashedMerchantCode(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to do — an unreadable stash is already as good as cleared.
    }
}
