import { NextRequest, NextResponse } from 'next/server';
import { GATEWAY_OP_ROUTES } from '@/lib/opcodeMap';
import { POST as sessionComplete } from '../auth/session-complete/route';
import { POST as saveStepToken } from '../auth/save-step-token/route';
import { POST as saveSessionToken } from '../auth/save-session-token/route';
import { POST as refresh } from '../auth/refresh/route';
import { POST as logout } from '../auth/logout/route';
import { GET as wsToken } from '../auth/token/route';
import { GET as sessionsGet, POST as sessionsPost, DELETE as sessionsDelete } from '../sessions/[...path]/route';

/**
 * Opaque API gateway ("p" = proxy). Single public endpoint: POST /api/p.
 *
 * The operation is a short opcode in the JSON body ({ o, d }), mapped here back
 * onto the ORIGINAL route handlers — invoked directly as functions with a
 * synthesized NextRequest, so cookies / Set-Cookie / status codes behave
 * exactly as before. The original named routes are gated behind the internal
 * X-PG marker header (set only here) and answer 404 to direct external hits,
 * so neither the Network tab nor an endpoint scanner sees descriptive names.
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

/** Marker header proving a request was synthesized by this gateway.
 * Kept in sync with notGateway() in edgeProxy.ts. Not exported: Next route
 * modules may only export HTTP-method handlers + route config. */
const PG_HEADER = 'x-pg';

export async function POST(req: NextRequest): Promise<NextResponse> {
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
