import { NextRequest, NextResponse } from 'next/server';
import { NEST_BASE, COOKIES, backendFetch, cookieOptions, safeJson, notGateway } from '@/lib/edgeProxy';


/**
 * Proxy for /api/sessions/* (passcode, passkey/WebAuthn, step-up). Ported from the
 * Worker's sessions.ts:
 *  - step endpoints authenticate with the rdb_step cookie or X-Step-Token header;
 *    everything else with rdb_at.
 *  - rdb_st is forwarded as X-Session-Token.
 *  - passkey endpoints forward the full cookie jar to NestJS (so its session
 *    middleware can persist the WebAuthn challenge) AND relay Set-Cookie back.
 *  - when a step completes (status === 'active'), rdb_st is minted and rdb_step cleared.
 *
 * These cookies are all JWT-shaped (cookie-safe chars), so the NextRequest/Response
 * cookie APIs are used directly here.
 */
async function proxy(req: NextRequest): Promise<NextResponse> {
    const blocked = notGateway(req);
    if (blocked) return blocked;
    const { pathname } = req.nextUrl;
    const sub = pathname.replace(/^\/api\/sessions\/?/, '');
    const pathParts = sub.split('/').filter(Boolean);

    // Strip the [...path] catch-all segment Next.js injects into the query (key `path`)
    // so NestJS's strict validation doesn't reject it.
    const params = new URLSearchParams(req.nextUrl.searchParams);
    params.delete('path');
    const qs = params.toString();
    const search = qs ? `?${qs}` : '';

    const isPasskeyEndpoint = pathParts[0] === 'passkey';
    const isStepEndpoint = pathParts[0] === 'step';

    const token = isStepEndpoint
        ? (req.headers.get('x-step-token') ?? req.cookies.get(COOKIES.step)?.value)
        : req.cookies.get(COOKIES.access)?.value;

    if (!token) {
        return NextResponse.json(
            {
                error: isStepEndpoint ? 'STEP_TOKEN_MISSING' : 'NO_SESSION',
                message: isStepEndpoint
                    ? 'Step token cookie missing or expired'
                    : 'Not authenticated',
            },
            { status: 401 },
        );
    }

    const sessionToken = req.cookies.get(COOKIES.session)?.value ?? '';
    const method = req.method;
    const backendPath = '/sessions/' + pathParts.join('/') + search;
    const body = method !== 'GET' ? await req.text() : undefined;

    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(sessionToken ? { 'X-Session-Token': sessionToken } : {}),
    };
    // WebAuthn: forward all cookies so NestJS can persist the challenge.
    if (isPasskeyEndpoint) {
        const cookie = req.headers.get('cookie');
        if (cookie) headers['Cookie'] = cookie;
    }

    let upstream: Response;
    try {
        upstream = await backendFetch(NEST_BASE, backendPath, {
            method,
            headers,
            ...(body ? { body } : {}),
        });
    } catch (err) {
        console.error('[sessions] backendFetch threw:', err);
        return NextResponse.json({ error: 'Backend unavailable', detail: String(err) }, { status: 502 });
    }

    const data = await safeJson(upstream);
    const res = NextResponse.json(data, { status: upstream.status });

    // WebAuthn: relay Set-Cookie from NestJS back to the browser.
    if (isPasskeyEndpoint) {
        const setCookieRaw = upstream.headers.get('set-cookie');
        if (setCookieRaw) res.headers.append('set-cookie', setCookieRaw);
    }

    // Step completed → mint rdb_st, clear rdb_step.
    if (data['sessionToken'] && data['status'] === 'active') {
        res.cookies.set(COOKIES.session, data['sessionToken'] as string, cookieOptions(24 * 60 * 60));
        res.cookies.set(COOKIES.step, '', cookieOptions(0));
    }

    return res;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
