import { apiFetch, apiFetchOp } from '@/core/utils';
import { pfetch } from '@/lib/p';
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

interface CommonSpec {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    /** JSON body. Omit for GET. */
    body?: unknown;
    options?: RequestOptions;
}

interface PathSpec extends CommonSpec {
    /** Path under /api, e.g. '/users/me'. */
    path: string;
    op?: never;
    /**
     * Multipart body. Mutually exclusive with `body`. Path-routed only: the
     * opcode gateway's envelope is JSON `{o, d}`, so a file has no way through
     * it. Content-Type is left unset so fetch writes the boundary itself.
     */
    formData?: FormData;
    /** Query params. Undefined and null values are dropped. */
    query?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Opcode-routed call.
 *
 * On the wire everything is one payload — the `d` in `{o, d}` — but which part
 * of the request it becomes is decided server-side by the opcode's entry in
 * `lib/opcodeMap.ts`: a JSON body, a query string, or a path segment. Naming all
 * three `body` made GET calls read as though they were sending one, and made an
 * opcode call look nothing like the path-routed call beside it.
 *
 * So the three are named for what they become. `request()` folds whichever is
 * set into `d`; they are alternatives, not combinable.
 */
interface OpSpec extends CommonSpec {
    /** Opcode — routes through the opaque gateway. */
    op: string;
    /** Becomes a query string, e.g. `?page=0&limit=10`. */
    query?: Record<string, string | number | boolean | undefined | null>;
    /** Interpolated into the path, e.g. an account number or an id. */
    params?: Record<string, string | number>;
    /**
     * Forbidden alongside `op`, and the reason is not style.
     *
     * `path` used to be accepted here and ignored, declared next to the opcode
     * as documentation of where the call lands. It is a string literal in a
     * client module, so it shipped: the production bundle carried
     * `{path:"/auth/reset-passcode/init",op:"ri"}` and friends — handing a
     * reader the complete opcode-to-endpoint mapping in one place, which is
     * precisely what routing through the gateway exists to withhold.
     * (`lib/opcodeMap.ts` holds the same table but is tree-shaken out of the
     * client build, so it does not leak.)
     *
     * `never` makes the leak a compile error rather than a habit.
     */
    path?: never;
    formData?: never;
}

/** Never throws. Failures come back as `{ ok: false }` so callers must handle them. */
export async function request<T>(spec: PathSpec | OpSpec): Promise<ApiResult<T>> {
    const { method = 'GET', body, options } = spec;
    const op = 'op' in spec ? spec.op : undefined;
    const path = 'path' in spec ? spec.path : undefined;
    const formData = 'formData' in spec ? spec.formData : undefined;
    const query = 'query' in spec ? spec.query : undefined;

    try {
        let res: Response;
        if (op) {
            // body / query / params are three names for one wire field: the `d`
            // of `{o, d}`. Which one a call uses says what the opcode's route
            // does with it — the gateway decides that, not the client.
            const payload = body ?? query ?? ('params' in spec ? spec.params : undefined);
            // pfetch is the same transport apiFetchOp uses, minus the retry —
            // see RequestOptions.skipRefresh for the one case that needs it.
            res = options?.skipRefresh
                ? await pfetch(op, payload, { headers: options.headers, signal: options.signal })
                : await apiFetchOp(op, payload, {
                      headers: options?.headers,
                      signal: options?.signal,
                  });
        } else {
            const hasJsonBody = body !== undefined;
            // Non-null: the union guarantees a path whenever `op` is absent.
            res = await apiFetch(buildUrl(path!, query), {
                method,
                headers: {
                    // Never set Content-Type for FormData — the browser must
                    // append its own multipart boundary.
                    ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
                    ...options?.headers,
                },
                ...(hasJsonBody ? { body: JSON.stringify(body) } : {}),
                ...(formData ? { body: formData } : {}),
                signal: options?.signal,
            });
        }

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
