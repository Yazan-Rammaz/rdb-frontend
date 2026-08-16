import { apiFetch, apiFetchOp } from '@/core/utils';
import type { ApiError, ApiResult, RequestOptions } from './types/common';

/**
 * The one way this app talks to its backend.
 *
 * Every endpoint module under `endpoints/` calls `request()`. Nothing else
 * should call `fetch` directly, and no component should ever build a URL.
 *
 * ─── Why one client ─────────────────────────────────────────────────────────
 * There used to be four browser→server paths: apiFetch, apiFetchOp, pfetch, and
 * Server Actions via useActions(). A component picked one largely by which era
 * it was written in — and they did not behave alike. Only the apiFetch pair
 * refreshed an expired token, so the same operation could silently recover in
 * one screen and log the user out in another.
 *
 * This wraps apiFetch (and apiFetchOp for opaque routing), so refresh-on-401 is
 * guaranteed for every call rather than depending on which helper was chosen.
 *
 * ─── Opaque routing ─────────────────────────────────────────────────────────
 * An endpoint can be reached by name (`/api/users/me`) or through the opcode
 * gateway, which keeps the endpoint name out of the client bundle and the
 * Network tab. That is a routing detail, not something a call site should think
 * about: pass `op` and the client handles it.
 */

/** Never throws. Failures come back as `{ ok: false }` so callers must handle them. */
export async function request<T>(spec: {
    /** Path under /api, e.g. '/users/me'. Ignored when `op` is set. */
    path: string;
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    /** JSON body. Omit for GET. */
    body?: unknown;
    /** Query params. Undefined and null values are dropped. */
    query?: Record<string, string | number | boolean | undefined | null>;
    /** Opcode — routes through the opaque gateway instead of `path`. */
    op?: string;
    options?: RequestOptions;
}): Promise<ApiResult<T>> {
    const { path, method = 'GET', body, query, op, options } = spec;

    try {
        const res = op
            ? await apiFetchOp(op, body, {
                  headers: options?.headers,
                  signal: options?.signal,
              })
            : await apiFetch(buildUrl(path, query), {
                  method,
                  headers: {
                      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                      ...options?.headers,
                  },
                  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
                  signal: options?.signal,
              });

        return await toResult<T>(res);
    } catch (err) {
        // Network failure, DNS, or an aborted request — the call never reached a
        // server, so there is no status to report.
        return {
            ok: false,
            error: {
                status: 0,
                message:
                    err instanceof DOMException && err.name === 'AbortError'
                        ? 'Request cancelled.'
                        : 'Could not reach the server. Check your connection.',
            },
        };
    }
}

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

    return { status, message, code: b.code, fields: b.errors };
}

function defaultMessage(status: number): string {
    if (status === 401) return 'Your session has expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to do that.';
    if (status === 404) return 'Not found.';
    if (status === 429) return 'Too many attempts. Please wait and try again.';
    if (status >= 500) return 'Something went wrong on our side. Please try again.';
    return 'Request failed.';
}
