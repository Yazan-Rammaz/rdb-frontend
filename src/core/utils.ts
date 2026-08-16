import { FetchResponse } from "./types";
import { resolveAuthToken } from "./auth/resolve-token";
import { initialData } from '@/config/runtime';
import { pfetch } from "@/lib/p";

// --- Silent token refresh (client-side only) -------------------------------
// Access tokens are ~15 min. On a 401 we rotate the token via /api/auth/refresh
// and retry the request once. Rotation triggers server-side reuse-detection if
// the same refresh token is sent twice, so refreshes MUST be serialized.

/**
 * Outcome of a token refresh:
 *  - `refreshed`       — got a fresh access token; retry the request.
 *  - `unauthenticated` — the refresh token is genuinely dead (401) → hard logout.
 *  - `transient`       — network drop / 5xx / backend unavailable → KEEP the session,
 *                        do NOT log out; the proactive timer / next call retries.
 */
export type RefreshResult = 'refreshed' | 'unauthenticated' | 'transient';

let refreshPromise: Promise<RefreshResult> | null = null;
let loggingOut = false;

/** Read the readable (non-httpOnly) access-token expiry cookie (epoch ms). */
export function readAccessTokenExpiry(): number | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)rdb_at_exp=(\d+)/);
  return m ? Number(m[1]) : null;
}

async function performRefresh(): Promise<RefreshResult> {
  try {
    const res = await pfetch("rf");
    if (res.ok) return 'refreshed';
    // Only a 401 means the refresh token is dead / reused / revoked → session over.
    if (res.status === 401) return 'unauthenticated';
    // 5xx, 502 "Backend unavailable", proxy errors → transient; keep the session.
    return 'transient';
  } catch {
    // Network error (offline, dropped mobile connection) → transient, NOT fatal.
    return 'transient';
  }
}

/**
 * Single-flight access-token refresh. Serializes refreshes within the tab (one
 * in-flight promise) and across tabs (Web Locks API when available) so two
 * callers never send the same rotated refresh token — which would trip server
 * reuse-detection and revoke the entire session.
 *
 * Cross-tab dedup: we snapshot the expiry before acquiring the lock; if it moved
 * forward by the time we hold the lock, another tab already refreshed — we reuse
 * its result instead of rotating again.
 */
export function refreshAccessToken(): Promise<RefreshResult> {
  if (!refreshPromise) {
    const expBefore = readAccessTokenExpiry();
    const attempt = async (): Promise<RefreshResult> => {
      const expAfter = readAccessTokenExpiry();
      if (expBefore != null && expAfter != null && expAfter > expBefore) {
        return 'refreshed'; // another tab refreshed while we waited for the lock
      }
      return performRefresh();
    };
    const run = async (): Promise<RefreshResult> =>
      typeof navigator !== "undefined" && navigator.locks?.request
        ? ((await navigator.locks.request("rdb-token-refresh", attempt)) as RefreshResult)
        : attempt();
    refreshPromise = run().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Refresh failed → session is gone. Clear cookies server-side, then signal the app
 * to drop auth state and SPA-navigate to /auth. We dispatch an event instead of
 * `window.location.href` so there is NO full-page reload (AuthProvider listens and
 * clears userData; AuthProtected then routes to /auth via the SPA router).
 */
function hardLogout(): void {
  if (typeof window === "undefined" || loggingOut) return;
  // While the web-to-web takeover overlay is up, the session is already dead but we
  // intentionally keep the page in place (no SPA redirect) until the user refreshes.
  // A manual refresh clears this in-memory flag, so the normal auth bootstrap then
  // routes to Get Started.
  if ((window as unknown as { __rdbSessionTakeover?: boolean }).__rdbSessionTakeover) return;
  loggingOut = true;
  pfetch("lo")
    .catch(() => {})
    .finally(() => {
      window.dispatchEvent(new CustomEvent("rdb:session-expired"));
      // Re-arm after the redirect settles (no reload happens to reset this module).
      setTimeout(() => {
        loggingOut = false;
      }, 5000);
    });
}

// Endpoints where a 401 is NOT an expired access token (login + step-token flows),
// so refreshing/retrying would be wrong.
const SKIP_REFRESH_PREFIXES = ["/api/auth/", "/api/sessions/step/"];

/**
 * Client fetch wrapper with the same silent-refresh contract as fetchServerData,
 * for the direct `fetch('/api/...')` call sites that bypass it (profile, passcode
 * unlock, device status, etc.). On a 401 for an authenticated endpoint it runs a
 * single-flight refresh, retries once, and hard-logs-out if the refresh itself
 * fails. Pass the full `/api/...` path.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  let res = await fetch(input, init);
  if (
    res.status === 401 &&
    typeof window !== "undefined" &&
    !SKIP_REFRESH_PREFIXES.some((p) => input.startsWith(p))
  ) {
    const result = await refreshAccessToken();
    if (result === 'refreshed') {
      res = await fetch(input, init);
    } else if (result === 'unauthenticated') {
      hardLogout();
    }
    // 'transient' (network/5xx) → keep the session; return the 401 so the caller
    // can surface a retryable error instead of being logged out.
  }
  return res;
}

// Opcodes whose 401 is NOT an expired access token (login/step + cookie-setters,
// plus the reset-passcode sets, where a step 401 means the login stepToken
// expired), so the silent-refresh retry must be skipped — mirrors
// SKIP_REFRESH_PREFIXES.
const SKIP_REFRESH_OPS = new Set([
  'sc', 'st', 'ss', 'rf', 'lo', 'tk', 'sv', 'sa',
  'ri', 'ro', 'rv', 'rq', 'ra', 'rc',
  'si', 'so', 'sw', 'sq', 'sn', 'sp',
]);

/**
 * Gateway-aware apiFetch: same silent-refresh contract, but routes through the
 * opaque /api/p gateway (pfetch) instead of a named URL. Used by the passcode /
 * passkey / device-status call sites so their endpoint names never appear in the
 * Network tab.
 */
export async function apiFetchOp(
  o: string,
  d?: unknown,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
): Promise<Response> {
  let res = await pfetch(o, d, init);
  if (res.status === 401 && typeof window !== 'undefined' && !SKIP_REFRESH_OPS.has(o)) {
    const result = await refreshAccessToken();
    if (result === 'refreshed') {
      res = await pfetch(o, d, init);
    } else if (result === 'unauthenticated') {
      hardLogout();
    }
  }
  return res;
}

/**
 * Universal fetch wrapper for RDB API requests.
 * Handles headers, multi-part data, and standardized error responses.
 *
 * Auth token resolution:
 * 1. If `token` is provided directly, use it (backward compat / testing)
 * 2. Otherwise, resolve from cookie using `authCookieName` (defaults to 'rdb_at')
 */
export async function fetchServerData<T>({
  url,
  method = "GET",
  body,
  headers = {},
  token,
  authCookieName,
}: {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  local?: string;
  token?: string; // Optional direct token override (backward compat / testing)
  authCookieName?: string; // Cookie name to resolve auth token from (default: 'rdb_at')
}): Promise<FetchResponse<T> & { status: number }> {
  const authToken = token || (await resolveAuthToken(authCookieName));
  const local = initialData.Locale || "en-gb";

  // On the client, route through the Next.js proxy → Worker (which adds auth from cookie).
  // On the server, call the backend URL directly with the resolved token.
  // In local dev the server side goes through the local-proxy (scripts/local-proxy.mjs,
  // started alongside `next dev` — see apps/frontend's own "dev" script): a direct Node
  // fetch to the underscore NestJS hostname intermittently fails TLS handshake (SSL
  // alert 40) depending on which Cloudflare edge node answers, since underscores are
  // invalid in a DNS/SNI hostname. The proxy's plain `https.request` to the same host
  // is likewise not guaranteed safe long-term, but is the code path actually observed
  // to work reliably today; only workerd (prod) tolerates the underscore host directly.
  const isClient = typeof window !== 'undefined';
  const devProxyBase =
    process.env.NODE_ENV !== 'production' ? 'http://localhost:8789' : null;
  const baseUrl = isClient ? '' : (devProxyBase ?? initialData.BaseUrl ?? '');
  const fetchUrl = isClient ? `/api${url}` : `${baseUrl}${url}`;

  if (!isClient && !baseUrl) {
    throw new Error("Base URL is not configured in environment variables");
  }

  // Underscore-aware fetch (server-side only): the NestJS hostname
  // (trydos_wallet_develop.ramaaz.dev) contains underscores, which are invalid
  // in DNS hostnames; workerd (Cloudflare Workers — where server actions run)
  // needs the Host header set explicitly for these. Mirrors edgeProxy.backendFetch.
  const serverHostname = !isClient ? new URL(fetchUrl).hostname : "";
  const needsHostHeader = serverHostname.includes("_");

  const execute = async (): Promise<FetchResponse<T> & { status: number }> => {
    try {
      // 1. Prepare dynamic headers
      const finalHeaders: Record<string, string> = {
        "Accept-Language": local,
        // On client, the proxy reads rdb_at cookie and adds auth — no header needed here
        ...(!isClient && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(needsHostHeader ? { Host: serverHostname } : {}),
        ...headers,
      };

      // 2. Handle Content-Type Logic
      if (finalHeaders["ContentType"] === "MULTIPART") {
        delete finalHeaders["ContentType"];
        delete finalHeaders["Content-Type"];
      } else if (!finalHeaders["Content-Type"] && !(body instanceof FormData)) {
        finalHeaders["Content-Type"] = "application/json";
      }

      const response = await fetch(fetchUrl, {
        method,
        headers: finalHeaders,
        body: body instanceof FormData ? body : JSON.stringify(body),
        cache: "no-store", // Ensures fresh data for banking/wallet operations
      });

      // 3. Handle Empty Responses (204 No Content)
      if (response.status === 204) {
        return {
          error: null,
          success: true,
          data: null as any,
          status: 204,
        };
      }

      const result = await response.json();

      // 4. Standardize the response format
      return {
        success: response.ok,
        data: result.data || result,
        error: !response.ok
          ? result.message || result.error || "Unknown Error"
          : null,
        status: response.status,
      };
    } catch (error: any) {
      console.error("Fetch Error:", error);
      return {
        success: false,
        data: null as any,
        error: error.message || "Network Request Failed",
        status: 500,
      };
    }
  };

  let res = await execute();

  // 5. Client-side silent refresh: on a 401 for an authenticated endpoint, rotate
  // the access token once (single-flight) and retry. Skip /auth/* (login, OTP,
  // refresh) where a 401 is a genuine failure, not an expired access token.
  if (isClient && res.status === 401 && !url.startsWith("/auth")) {
    const result = await refreshAccessToken();
    if (result === 'refreshed') {
      res = await execute();
    } else if (result === 'unauthenticated') {
      hardLogout();
    }
    // 'transient' (network/5xx) → don't log out; return the original 401 result.
  }

  return res;
}

/**
 * Standardized Response Handler
 * Centralizes the logic for handling 401 Unauthenticated errors and extraction of data.
 */
export async function processResponse<T>(
  response: any,
  logContext?: { scenario: string; userId?: string },
): Promise<T | { error: string }> {
  // 1. Priority Check: Authentication failure
  if (response?.status === 401) {
    return { error: "UNAUTHENTICATED", ...response };
  }

  // 2. Error Handling
  if (response?.error) {
    return { error: response.error };
  }

  // 3. Success: Return extracted data
  return response?.data;
}
