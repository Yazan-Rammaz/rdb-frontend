'use client';

/**
 * Observe — session/error collector for rdb.
 *
 * The collector itself is vendored in ./sdk.js. This module is the only place
 * that configures it, so there is one answer to "what does rdb send".
 *
 * What it captures out of the box: console.warn/error, uncaught errors,
 * unhandled rejections, and every `fetch` with method, path, status and
 * duration. All of rdb's backend traffic goes through `apiFetch` → native
 * `fetch` (src/api/client.ts), so patching fetch covers the whole API surface;
 * nothing here depends on axios, which the browser bundle does not use.
 *
 * Request and response bodies and headers are captured too — pinned on below,
 * with an exclusion list for the routes that carry credentials and documents.
 *
 * What it still cannot see on its own: the error text a user actually read.
 * A handled 400 looks like any other 400 from the outside — see
 * `reportUserError` below, and ToastContext, which calls it for every toast.
 *
 * `captureBodies`, `captureHeaders` and `denyBodyPaths` are all pinned here —
 * see the notes on each below.
 */

import { observe, screenMessage, setCorrelation, note } from './sdk';

export { screenMessage, setCorrelation, note };

const OBSERVE_URL =
    process.env.NEXT_PUBLIC_OBSERVE_URL ?? 'https://ramaaz-observe.yazan-adnof.workers.dev';
const OBSERVE_KEY = process.env.NEXT_PUBLIC_OBSERVE_KEY ?? 'pk_rdb_e0e69287e4f90d5dd0d40172';

/** Kill switch: set NEXT_PUBLIC_OBSERVE=off to ship a build that sends nothing. */
const ENABLED = process.env.NEXT_PUBLIC_OBSERVE !== 'off';

/**
 * Tier 1 — nothing captured in either direction. Both halves of the exchange
 * are the problem here: the request carries a document or a token, and so does
 * the reply. These still appear in the timeline with method, path, status and
 * duration; only the payload is withheld.
 *
 *   kyc/*                  ID photographs, selfie frames, liveness video in;
 *                          extracted name, date of birth and document number out
 *   media/upload/*         the same images on their way to storage
 *   auth/token             answers with the raw rdb_at access token (see
 *                          src/app/api/auth/token/route.ts)
 *   auth/session-complete  answers with accessToken AND refreshToken verbatim
 *   auth/save-*, auth/qr/* session and step tokens, both directions
 *
 * Patterns are unanchored on purpose: `redactPath` hands over a bare pathname
 * for same-origin calls and origin+pathname for absolute URLs, and both should
 * match. Long path segments arrive as `[id]`, so match on prefixes only.
 */
const DENY_BODY_PATHS: RegExp[] = [
    /\/api\/kyc\//,
    /\/api\/media\/upload/,
    /\/api\/auth\/(token|session-complete|save-|qr\/)/,
];

/**
 * Tier 2 — request withheld, response kept.
 *
 * Every route here takes a credential and answers with a diagnosis, and the
 * diagnosis is the whole reason to look. `/sessions/passcode/verify` reports a
 * wrong PIN as `{ valid: false }` under HTTP 200; deny the response too and a
 * failed unlock is indistinguishable from a successful one. Same for the
 * reset-passcode quiz, which returns `attemptsRemaining`.
 *
 * What stays out: the PIN, the OTP, the quiz answers, the new passcode, and the
 * WebAuthn assertion payloads.
 *
 * Several of these responses can also carry a sessionToken on success — the
 * mid-login step verify answers with a full LoginApiResponse. That is covered
 * by the key-name redactor patched into scrub(), which masks any JSON value
 * under a token-shaped key, so it does not need a tier-1 entry.
 */
const DENY_REQUEST_BODY_PATHS: RegExp[] = [
    /\/api\/sessions\/(step\/)?passcode/,
    /\/api\/sessions\/passkey/,
    /\/api\/auth\/phone\//,
    /\/api\/auth\/reset-passcode/,
];

/**
 * Starts the collector. Idempotent — the SDK ignores a second call, so a
 * double-mount in React StrictMode is harmless.
 */
export function startObserve(): void {
    if (!ENABLED) return;
    observe({
        url: OBSERVE_URL,
        key: OBSERVE_KEY,

        // Pinned on, which makes the matching dashboard toggles a no-op: from
        // here on, bodies and headers are decided in this file and nowhere else.
        // Turning them off again is an edit + a deploy, not a click.
        //
        // Pinned rather than toggled because a toggle cannot win the race that
        // matters: remote config is fetched after the hooks are installed, so
        // every request a page fires on load — the ones that break a session —
        // is already recorded body-less by the time the config lands.
        //
        // What this ships: request and response payloads for the whole API,
        // minus the two deny tiers below. That is account numbers, balances,
        // transaction history and profile details, truncated at `maxBody`
        // (2000 chars) and passed through the SDK's scrubber, which masks JWTs,
        // signed URLs, data: URIs and long opaque tokens. Authorization, Cookie
        // and X-Step-Token headers arrive as [redacted] — the SDK drops those
        // by name before they leave the browser.
        captureBodies: true,
        captureHeaders: true,

        denyBodyPaths: DENY_BODY_PATHS,
        denyRequestBodyPaths: DENY_REQUEST_BODY_PATHS,
    });
}

/**
 * Report a failure the user was SHOWN.
 *
 * The collector sees HTTP status codes, not screens. Two cases it cannot infer:
 *   - a 4xx that the UI handles gracefully (a wrong passcode, a rejected quiz
 *     answer) — the person read a sentence, the log shows a routine 400
 *   - a 200 carrying a refusal in the body, which is how the reset-passcode
 *     endpoints answer a wrong answer
 *
 * Error toasts call this already (see ToastContext). Call it by hand wherever
 * an error is rendered inline instead — form fields, full-screen failure
 * states, disabled-with-a-reason buttons.
 *
 * @param shown  the exact text on screen — this is the sentence the user will
 *               quote back to you
 * @param diag   whatever the screen could not show: status, code, attempts left
 */
export function reportUserError(shown: string, diag?: Record<string, unknown>): void {
    if (!ENABLED) return;
    screenMessage(shown);
    // console.error is mirrored by the collector, so `diag` rides along with it
    // and stays attached to the same session.
    console.error(`[shown to user] ${shown}`, diag ?? {});
}
