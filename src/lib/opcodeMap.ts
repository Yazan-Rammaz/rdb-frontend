/**
 * Single source of truth for the opaque-gateway opcode table, shared by the
 * client (src/lib/p.ts) and the server (lib/opcodeGateway, reached through the
 * /api/[...path] catch-all).
 *
 * Toggled by `NEXT_PUBLIC_OPAQUE_API` (build-time inlined, default ON):
 *   - ON  → clients POST each opcode to a random-hash path (`/api/<24 hex>`);
 *           the named routes behind the gateway 404 to direct hits.
 *   - OFF → clients call the real descriptive endpoints and the named routes
 *           answer directly — use this for local debugging so the Network tab
 *           shows meaningful names. Set `NEXT_PUBLIC_OPAQUE_API=false` in
 *           `.env.local` and rebuild/restart dev.
 *
 * This module is client-safe: paths and methods only, no server imports.
 */

export const OPAQUE_API = process.env.NEXT_PUBLIC_OPAQUE_API !== 'false';

export interface OpRoute {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    path: (d?: unknown) => string;
}

/** Ops handled by dedicated Next route handlers (dispatched via lib/opcodeGateway). */
export const GATEWAY_OP_ROUTES: Record<string, OpRoute> = {
    sc: { method: 'POST', path: () => '/api/auth/session-complete' },
    st: { method: 'POST', path: () => '/api/auth/save-step-token' },
    ss: { method: 'POST', path: () => '/api/auth/save-session-token' },
    rf: { method: 'POST', path: () => '/api/auth/refresh' },
    lo: { method: 'POST', path: () => '/api/auth/logout' },
    tk: { method: 'GET', path: () => '/api/auth/token' },
    ps: { method: 'GET', path: () => '/api/sessions/passcode/status' },
    pc: { method: 'POST', path: () => '/api/sessions/passcode/set' },
    pv: { method: 'POST', path: () => '/api/sessions/passcode/verify' },
    sv: { method: 'POST', path: () => '/api/sessions/step/passcode/verify' },
    sa: {
        method: 'GET',
        path: (d) => `/api/sessions/step/approval/${encodeURIComponent((d as { id?: string })?.id ?? '')}`,
    },
    kl: { method: 'GET', path: () => '/api/sessions/passkey/list' },
    ko: { method: 'POST', path: () => '/api/sessions/passkey/register-options' },
    kr: { method: 'POST', path: () => '/api/sessions/passkey/register' },
    ka: { method: 'POST', path: () => '/api/sessions/passkey/auth-options' },
    kv: { method: 'POST', path: () => '/api/sessions/passkey/verify' },
    dc: { method: 'DELETE', path: () => '/api/sessions/current' },
};

/**
 * Ops that resolve to endpoints the /api/[...path] catch-all proxies (NestJS
 * reset-passcode, KYC worker re-verify) rather than to a local route handler.
 * Keep opcodes DISTINCT from GATEWAY_OP_ROUTES.
 */
export const PROXY_OP_ROUTES: Record<string, OpRoute> = {
    ri: { method: 'POST', path: () => '/api/auth/reset-passcode/init' },
    ro: { method: 'POST', path: () => '/api/auth/reset-passcode/send-otp' },
    rv: { method: 'POST', path: () => '/api/auth/reset-passcode/verify-otp' },
    rq: { method: 'GET', path: () => '/api/auth/reset-passcode/questions' },
    ra: { method: 'POST', path: () => '/api/auth/reset-passcode/answers' },
    rc: { method: 'POST', path: () => '/api/auth/reset-passcode/complete' },
    si: { method: 'POST', path: () => '/api/auth/reset-passcode/step/init' },
    so: { method: 'POST', path: () => '/api/auth/reset-passcode/step/send-otp' },
    sw: { method: 'POST', path: () => '/api/auth/reset-passcode/step/verify-otp' },
    sq: { method: 'GET', path: () => '/api/auth/reset-passcode/step/questions' },
    sn: { method: 'POST', path: () => '/api/auth/reset-passcode/step/answers' },
    sp: { method: 'POST', path: () => '/api/auth/reset-passcode/step/complete' },
    vs: { method: 'POST', path: () => '/api/kyc/reverify/start' },
    vv: { method: 'POST', path: () => '/api/kyc/reverify/verify' },

    // ─── Money ───────────────────────────────────────────────────────────────
    // Transfers and balances. These were the last endpoints whose real names
    // travelled openly while auth and session names were hidden — a split that
    // followed the old Cloudflare Worker boundary rather than any policy.
    //
    // Unlike every op above, some of these carry data in the path: a query
    // string, or an account number. `d` is the opcode payload, so the path
    // function builds them. Called with no argument (as the catch-all does when
    // enumerating paths to hide) each must still yield a usable base — hence the
    // `?? ''` and the empty-object defaults.
    tp: { method: 'GET', path: () => '/api/transfer-purpose?type=ALL' },
    // Account number is encoded, so one containing a slash cannot alter the path.
    // Keep the literal directly after `=>`: check-bundle-opacity.mjs scrapes these
    // paths, and anything between the arrow and the quote hides the route from it.
    tl: {
        method: 'GET',
        path: (d) =>
            `/api/transfers/lookup-account/${encodeURIComponent(
                (d as { accountNumber?: string })?.accountNumber ?? '',
            )}`,
    },
    tv: { method: 'POST', path: () => '/api/transfers/verify' },
    ts: { method: 'POST', path: () => '/api/transfers/send' },
    wb: { method: 'GET', path: (d) => `/api/wallets/myAcounts${queryString(d)}` },
    fl: { method: 'GET', path: (d) => `/api/financial-ledger${queryString(d)}` },
};

/**
 * Serialise an opcode payload into a query string.
 *
 * Undefined and null are dropped, matching the api client's own `buildUrl`, so
 * an omitted filter means "unset" rather than the literal string "undefined".
 */
function queryString(d: unknown): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries((d ?? {}) as Record<string, unknown>)) {
        if (v === undefined || v === null) continue;
        params.append(k, String(v));
    }
    const s = params.toString();
    return s ? `?${s}` : '';
}

/** Full client-side table: every opcode with its real route. */
export const OP_ROUTES: Record<string, OpRoute> = { ...GATEWAY_OP_ROUTES, ...PROXY_OP_ROUTES };
