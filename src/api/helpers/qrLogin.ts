import { api } from '..';

/**
 * Result of rotating a QR login token.
 *
 * `expired` is deliberately its own case rather than an error: the link is gone
 * and the caller regenerates a fresh QR, which is normal flow, not a failure to
 * report to the user.
 */
export type QrRefreshResult =
    | { qrToken: string; expiresAt?: string }
    | { expired: true }
    | { error: string };

/**
 * Rotates the qrToken for a live login attempt.
 *
 * The 410/404 → expired mapping lives here rather than in the endpoint module,
 * for the same reason `resolveRecipient` does: endpoints describe the wire
 * contract, helpers interpret it. Leaving it at the call site would mean every
 * caller has to remember which status codes mean "regenerate" instead of "show
 * an error" — and getting that wrong strands the user on a dead QR.
 */
export async function refreshQrToken(
    linkId: string,
    subscribeSecret: string,
    options?: { signal?: AbortSignal },
): Promise<QrRefreshResult> {
    const res = await api.auth.refreshQrToken({ linkId, subscribeSecret }, options);

    if (!res.ok) {
        if (res.error.status === 410 || res.error.status === 404) return { expired: true };
        return { error: res.error.message };
    }

    if (!res.data?.qrToken) return { error: 'refresh failed' };

    return { qrToken: res.data.qrToken, expiresAt: res.data.expiresAt };
}
