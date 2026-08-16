/**
 * Opaque API gateway client ("p" = proxy).
 *
 * Every session/auth call goes to the gateway with the operation as a short
 * opcode in the body — so the Network tab never shows descriptive endpoint
 * names (/api/auth/session-complete, /api/sessions/passcode/verify, ...).
 *
 * The path is a FRESH random 24-hex segment per request (`/api/<hash>`), so
 * even the gateway itself doesn't appear as a constant, fingerprintable name.
 * The catch-all route (src/app/api/[...path]/route.ts) recognizes the shape
 * and dispatches to the gateway (src/app/api/p/route.ts), which maps the
 * opcode back onto the original route handler — behavior (cookies, status
 * codes, bodies) is IDENTICAL to calling the named route directly.
 *
 * Returns the raw Response — call sites keep using res.ok / res.json().
 */

import { OPAQUE_API, OP_ROUTES } from '@/lib/opcodeMap';

/** 24 lowercase hex chars — must stay in sync with GATEWAY_PATH in the catch-all. */
function gatewayPath(): string {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return `/api/${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function pfetch(
    o: string,
    d?: unknown,
    init?: { headers?: Record<string, string>; signal?: AbortSignal },
): Promise<Response> {
    // Real-API mode (NEXT_PUBLIC_OPAQUE_API=false): call the descriptive
    // endpoint directly so the Network tab is debuggable. Same handlers, same
    // cookies, same responses — only the URL shape differs.
    if (!OPAQUE_API) {
        const route = OP_ROUTES[o];
        if (route) {
            const hasBody = route.method === 'POST' || route.method === 'PATCH';
            return fetch(route.path(d), {
                method: route.method,
                headers: {
                    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
                    ...(init?.headers ?? {}),
                },
                ...(hasBody ? { body: JSON.stringify(d ?? {}) } : {}),
                cache: 'no-store',
                ...(init?.signal ? { signal: init.signal } : {}),
            });
        }
    }
    return fetch(gatewayPath(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        body: JSON.stringify(d === undefined ? { o } : { o, d }),
        cache: 'no-store',
        ...(init?.signal ? { signal: init.signal } : {}),
    });
}
