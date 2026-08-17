import { NextRequest, NextResponse } from 'next/server';
import { GATEWAY_OP_ROUTES } from '@/lib/opcodeMap';
import { PG_HEADER } from '@/lib/edgeProxy';
import { POST as sessionComplete } from '@/app/api/auth/session-complete/route';
import { POST as saveStepToken } from '@/app/api/auth/save-step-token/route';
import { POST as saveSessionToken } from '@/app/api/auth/save-session-token/route';
import { POST as refresh } from '@/app/api/auth/refresh/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as wsToken } from '@/app/api/auth/token/route';
import {
    GET as sessionsGet,
    POST as sessionsPost,
    DELETE as sessionsDelete,
} from '@/app/api/sessions/[...path]/route';

/**
 * Opaque API gateway.
 *
 * The operation is a short opcode in the JSON body (`{ o, d }`), mapped back
 * onto the ORIGINAL route handlers — invoked directly as functions with a
 * synthesized NextRequest, so cookies / Set-Cookie / status codes behave
 * exactly as if the client had called the named route. Those named routes are
 * gated behind the internal X-PG marker (set only here) and answer 404 to
 * direct external hits, so neither the Network tab nor an endpoint scanner sees
 * descriptive names.
 *
 * ─── Why this is a lib module and not a route ───────────────────────────────
 * This used to be `app/api/p/route.ts`, which made POST /api/p a real, public
 * endpoint. Nothing ever called it: with OPAQUE_API on the client posts to a
 * random `/api/<24-hex>` path that the catch-all recognises, and with it off
 * the client calls the descriptive routes directly. So the URL existed purely
 * as a side effect of where the code lived — a fixed, guessable name that
 * accepted any opcode, in a layer whose entire job is hiding endpoint names.
 * It was also the one gateway file that could not carry notGateway(), since it
 * is what stamps the marker that check looks for.
 *
 * Living in lib/ there is no route, nothing to guess, and nothing to guard.
 * It also lifts the Next constraint that a route module may only export HTTP
 * method handlers, which is why the marker header had to be duplicated before.
 *
 * Opcode table:
 *   sc → POST   /api/auth/session-complete
 *   st → POST   /api/auth/save-step-token
 *   ss → POST   /api/auth/save-session-token
 *   rf → POST   /api/auth/refresh
 *   lo → POST   /api/auth/logout
 *   tk → GET    /api/auth/token
 *   ps → GET    /api/sessions/passcode/status
 *   pc → POST   /api/sessions/passcode/set
 *   pv → POST   /api/sessions/passcode/verify
 *   sv → POST   /api/sessions/step/passcode/verify
 *   sa → GET    /api/sessions/step/approval/{d.id}
 *   kl → GET    /api/sessions/passkey/list
 *   ko → POST   /api/sessions/passkey/register-options
 *   kr → POST   /api/sessions/passkey/register
 *   ka → POST   /api/sessions/passkey/auth-options
 *   kv → POST   /api/sessions/passkey/verify
 *   dc → DELETE /api/sessions/current
 */

type Handler = (req: NextRequest) => Promise<NextResponse> | NextResponse;

// Method + path per opcode live in the shared map (src/lib/opcodeMap.ts) so
// the client can call the real endpoints in NEXT_PUBLIC_OPAQUE_API=false mode.
const HANDLERS: Record<string, Handler> = {
    sc: sessionComplete,
    st: saveStepToken,
    ss: saveSessionToken,
    rf: refresh,
    lo: logout,
    tk: wsToken,
    ps: sessionsGet,
    pc: sessionsPost,
    pv: sessionsPost,
    sv: sessionsPost,
    sa: sessionsGet,
    kl: sessionsGet,
    ko: sessionsPost,
    kr: sessionsPost,
    ka: sessionsPost,
    kv: sessionsPost,
    dc: sessionsDelete,
};

// PG_HEADER is imported rather than declared here so it cannot drift from the
// notGateway() check that reads it. It lives in edgeProxy because the dependency
// has to run that way: this module imports the route handlers, and those import
// edgeProxy — declaring it here and importing it there would close the cycle.

/**
 * Dispatch an opcode payload to its real handler.
 *
 * Called only by the `/api/[...path]` catch-all, after it recognises a
 * random-hash gateway request. An unknown opcode answers 404, matching what a
 * request to any other nonexistent path would return.
 */
export async function dispatchOpcode(req: NextRequest): Promise<NextResponse> {
    let payload: { o?: string; d?: unknown } = {};
    try {
        payload = await req.json();
    } catch {
        // fall through to 404 below
    }
    const route = GATEWAY_OP_ROUTES[payload.o ?? ''];
    const handler = HANDLERS[payload.o ?? ''];
    if (!route || !handler) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Rebuild the request as if the client had called the original named route.
    // Forward all incoming headers (Cookie, X-Step-Token, Accept-Language, ...)
    // and stamp the internal marker so the gated handler accepts it.
    const url = new URL(route.path(payload.d), req.url);
    const headers = new Headers(req.headers);
    headers.set(PG_HEADER, '1');
    headers.set('content-type', 'application/json');
    headers.delete('content-length');

    const hasBody = route.method === 'POST' || route.method === 'PATCH';
    const inner = new NextRequest(url, {
        method: route.method,
        headers,
        ...(hasBody ? { body: JSON.stringify(payload.d ?? {}) } : {}),
    });

    return handler(inner);
}
