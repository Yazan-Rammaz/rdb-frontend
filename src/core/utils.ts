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
 * opaque opcode gateway (pfetch) instead of a named URL. Used by the passcode /
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
