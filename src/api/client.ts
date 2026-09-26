import { apiFetch } from '@/core/utils';
import { networkStatus } from '@/lib/networkStatus';
import type { ApiError, ApiResult, NetworkErrorCode, RequestOptions } from './types/common';

/**
 * The one way this app talks to its backend.
 *
 * Every endpoint module under `endpoints/` calls `request()`. Nothing else
 * should call `fetch` directly, and no component should ever build a URL.
 *
 * ─── Why one client ─────────────────────────────────────────────────────────
 * There used to be four browser→server paths: apiFetch, apiFetchOp, pfetch and
 * Server Actions via useActions(). A component picked one largely by which era
 * it was written in — and they did not behave alike. Only the apiFetch pair
 * refreshed an expired token, so the same operation could silently recover in
 * one screen and log the user out in another.
 *
 * This wraps apiFetch, so refresh-on-401 is guaranteed for every call rather
 * than depending on which helper was chosen.
 *
 * Endpoints are addressed by their real path. There was an opcode gateway that
 * routed some of them through a random-hash URL to keep endpoint names out of
 * the bundle; it was removed deliberately. It was obfuscation rather than
 * access control — every endpoint still requires the httpOnly auth cookie —
 * and it cost a second routing table, a synthesized-request dispatcher, and
 * endpoint modules that could not name the route they called.
 */

/**
 * Upper bound for any single request, uploads included. `fetch` has no timeout
 * of its own, so on a link that is "up" but passes nothing a request would
 * otherwise hang until the OS gives up.
 *
 * Chosen so it cannot cut short a request that succeeds today: the backend sits
 * behind Cloudflare, which fails any origin response slower than 100 s (HTTP
 * 524), and the ceiling also has to cover the upload that precedes it — a ~5 MB
 * KYC/photo body at ~0.5 Mbps is ~80 s. 100 + 80 = 180 s; 300 s leaves margin.
 *
 * This only guarantees a spinner ends. Telling the user is the stall watchdog's
 * job (`networkStatus.watch()`), which reacts within seconds.
 */
const REQUEST_CEILING_MS = 300_000;

/** Never throws. Failures come back as `{ ok: false }` so callers must handle them. */
export async function request<T>(spec: {
    /** Path under /api, e.g. '/users/me'. */
    path: string;
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    /** JSON body. Omit for GET. */
    body?: unknown;
    /**
     * Multipart body. Mutually exclusive with `body`. Content-Type is left
     * unset so fetch writes the boundary itself.
     */
    formData?: FormData;
    /** Query params. Undefined and null values are dropped. */
    query?: Record<string, string | number | boolean | undefined | null>;
    options?: RequestOptions;
}): Promise<ApiResult<T>> {
    const { path, method = 'GET', body, formData, query, options } = spec;

    // The ceiling and the caller's signal both abort the same controller. Plain
    // AbortController + setTimeout rather than AbortSignal.any/timeout: `any`
    // needs Safari 17.4+, and older iPhones are in scope.
    //
    // The ceiling also rejects `ceilingHit`, raced against the whole call: on a
    // 401 apiFetch awaits the shared token refresh, which deliberately carries
    // no signal (aborting a rotation half-way could burn the refresh token), so
    // the abort alone would not end this request. The refresh keeps running and
    // settles on its own; only this caller stops waiting for it.
    const controller = new AbortController();
    let timedOut = false;
    let rejectCeiling: (reason: unknown) => void = () => {};
    const ceilingHit = new Promise<never>((_, reject) => {
        rejectCeiling = reject;
    });
    ceilingHit.catch(() => {}); // fires after the race may have settled
    const ceiling = setTimeout(() => {
        timedOut = true;
        controller.abort();
        rejectCeiling(new Error('Request ceiling reached'));
    }, REQUEST_CEILING_MS);
    const callerSignal = options?.signal;
    const onCallerAbort = () => controller.abort();
    if (callerSignal?.aborted) controller.abort();
    else callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
    // No watchdog on uploads: a large body saturating the uplink can starve the
    // probe and would report a working connection as offline.
    const stopWatchdog = formData ? () => {} : networkStatus.watch();

    try {
        const hasJsonBody = body !== undefined;
        const res = await Promise.race([
            apiFetch(buildUrl(path, query), {
                method,
                headers: {
                    // Never set Content-Type for FormData — the browser must
                    // append its own multipart boundary.
                    ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
                    ...options?.headers,
                },
                ...(hasJsonBody ? { body: JSON.stringify(body) } : {}),
                ...(formData ? { body: formData } : {}),
                signal: controller.signal,
            }),
            ceilingHit,
        ]);
        networkStatus.reportResponse();

        return await toResult<T>(res);
    } catch {
        // Network failure, DNS, the ceiling, or the caller's abort — no response
        // arrived, so there is no status to report; `code` says which it was.
        const code: NetworkErrorCode = timedOut
            ? 'TIMEOUT'
            : callerSignal?.aborted
              ? 'ABORTED'
              : 'NETWORK';
        // Settle the connectivity state before returning, so a caller that has
        // lost the status (a wrapper that returns only a message) can still
        // check isOffline(). Callers holding the ApiError use isNetworkError().
        if (code !== 'ABORTED') await networkStatus.reportFailure();
        return { ok: false, error: { status: 0, code, message: NETWORK_MESSAGES[code] } };
    } finally {
        clearTimeout(ceiling);
        stopWatchdog();
        callerSignal?.removeEventListener('abort', onCallerAbort);
    }
}

/**
 * The request got no response because of the connection (or the ceiling), not
 * because the caller cancelled it. True whatever the probe concluded, so a
 * short blip is silenced too. Screens show nothing for it — the offline pill is
 * the message — and must never render `error.message` for it.
 */
export function isNetworkError(error: ApiError): boolean {
    return error.status === 0 && error.code !== 'ABORTED';
}

/** For logs only — no screen shows a status-0 message; the offline pill does. */
const NETWORK_MESSAGES: Record<NetworkErrorCode, string> = {
    NETWORK: 'Could not reach the server. Check your connection.',
    TIMEOUT: 'The request timed out.',
    ABORTED: 'Request cancelled.',
};

function buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined | null>,
): string {
    const base = `/api${path.startsWith('/') ? path : `/${path}`}`;
    if (!query) return base;

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
        // Drop undefined/null so callers can pass optional filters straight
        // through without assembling the string themselves.
        if (v === undefined || v === null) continue;
        params.append(k, String(v));
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}

async function toResult<T>(res: Response): Promise<ApiResult<T>> {
    // 204 and empty bodies are success with nothing to parse.
    const text = await res.text();
    const parsed: unknown = text ? safeJson(text) : null;

    if (res.ok) return { ok: true, data: parsed as T };

    return { ok: false, error: toError(res.status, parsed) };
}

function safeJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        // A non-JSON error body (an HTML gateway page, say) is still useful as a
        // message — better than discarding it and reporting nothing.
        return { message: text.slice(0, 200) };
    }
}

function toError(status: number, body: unknown): ApiError {
    const b = (body ?? {}) as {
        message?: string | string[];
        error?: string;
        code?: string;
        errors?: Record<string, string[]>;
    };

    // NestJS sends `message` as a string for single errors and an array for
    // validation failures; both need flattening before display.
    const message = Array.isArray(b.message)
        ? b.message.join(', ')
        : (b.message ?? b.error ?? defaultMessage(status));

    // Our own route handlers put a machine-readable discriminator in `error`
    // alongside a human `message` — STEP_TOKEN_MISSING and NO_SESSION from
    // sessions/[...path] are branched on by the login flow. Without this they
    // would be dropped (b.message wins for `message`, and `code` only ever read
    // b.code), so a caller could not tell the two apart. Only SCREAMING_SNAKE is
    // taken as a code; a prose `error` string is left to `message`.
    const code = b.code ?? (typeof b.error === 'string' && /^[A-Z][A-Z0-9_]*$/.test(b.error)
        ? b.error
        : undefined);

    return { status, message, code, fields: b.errors, body };
}

function defaultMessage(status: number): string {
    if (status === 401) return 'Your session has expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to do that.';
    if (status === 404) return 'Not found.';
    if (status === 429) return 'Too many attempts. Please wait and try again.';
    if (status >= 500) return 'Something went wrong on our side. Please try again.';
    return 'Request failed.';
}
