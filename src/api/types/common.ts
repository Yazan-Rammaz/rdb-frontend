/**
 * Shapes shared by every endpoint.
 *
 * Request bodies and responses live beside the endpoint that uses them, in
 * `src/api/types/<domain>.ts`. Only things genuinely common belong here.
 */

/**
 * The result of any API call.
 *
 * A discriminated union rather than a `data` + `error` bag: TypeScript then
 * refuses to let a caller read `.data` without first checking `ok`, which is the
 * mistake that produces "cannot read property of undefined" in production.
 *
 *   const res = await api.banking.assets();
 *   if (!res.ok) return showError(res.error);
 *   res.data.currencies.forEach(...)          // narrowed, no optional chaining needed
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface ApiError {
    /** HTTP status, or 0 when the request never reached the server. */
    status: number;
    /** Human-readable message, safe to surface to the user. */
    message: string;
    /** Machine-readable code from the backend, when it sends one. */
    code?: string;
    /** Field-level validation errors, keyed by field name. */
    fields?: Record<string, string[]>;
}

/** Standard cursor/offset pagination accepted by list endpoints. */
export interface PageParams {
    page?: number;
    limit?: number;
}

/** Envelope list endpoints return. */
export interface Paginated<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

/** Options every call accepts. */
export interface RequestOptions {
    /** Abort the request — pass an AbortController signal. */
    signal?: AbortSignal;
    /** Extra headers. Content-Type and auth are handled for you. */
    headers?: Record<string, string>;
    /**
     * Skip the built-in refresh-on-401 retry and report the 401 as-is.
     *
     * Almost nothing wants this. The one caller that does is AuthContext's
     * bootstrap, which runs its own refresh so it can tell a dead refresh token
     * ('unauthenticated' → log out) from an unreachable backend ('transient' →
     * keep the session and retry when the network returns). The built-in retry
     * collapses those two into a bare 401, and treating a transient 401 as a
     * logout is the exact regression the retry loop was written to fix.
     */
    skipRefresh?: boolean;
}
