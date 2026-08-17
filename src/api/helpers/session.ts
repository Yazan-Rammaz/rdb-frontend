import type { PasscodeStatusResponse, PasskeyListResponse } from '../types/session';

/**
 * Read `enabled` off a passcode-status body.
 *
 * The backend answers either `{ enabled }` or `{ data: { enabled } }` depending
 * on the deployment. Two call sites (the auth page's resume check and
 * getDeviceStatus) each open-coded `body?.data?.enabled ?? body?.enabled ?? false`
 * against an `any`; this keeps that logic in one typed place.
 *
 * Defaults to false: a malformed body must not read as "passcode enabled".
 */
export function passcodeEnabled(body: PasscodeStatusResponse | undefined | null): boolean {
    return body?.data?.enabled ?? body?.enabled ?? false;
}

/** Same wrapped-or-bare handling for the passkey list. */
export function passkeyList(body: PasskeyListResponse | undefined | null): unknown[] {
    if (Array.isArray(body)) return body;
    if (body && Array.isArray(body.data)) return body.data;
    return [];
}
