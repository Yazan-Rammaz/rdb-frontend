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
};

/** Full client-side table: every opcode with its real route. */
export const OP_ROUTES: Record<string, OpRoute> = { ...GATEWAY_OP_ROUTES, ...PROXY_OP_ROUTES };
