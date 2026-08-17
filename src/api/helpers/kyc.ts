import type { CurrentKycResponse } from '../types/kyc';

/**
 * Peel the `kycRequest` wrappers off a `GET /api/kyc/current` payload.
 *
 * NestJS returns `{ kycRequest: {...} }` and the KYC Worker wraps that again,
 * so the record arrives as `{ kycRequest: { kycRequest: {...} } }`. The depth is
 * incidental rather than contractual — either side could stop double-wrapping —
 * so this unwraps as many layers as are present instead of indexing a fixed
 * number deep.
 *
 * Two call sites read this payload and only one of them handled the double
 * nesting; the other read `d.kycRequest ?? d` and landed on the wrapper object,
 * so its document URLs were undefined. Hence one shared helper.
 */
export function unwrapKycRequest(
    payload: CurrentKycResponse | null | undefined,
): Record<string, unknown> | null {
    let rec = (payload ?? null) as Record<string, unknown> | null;
    while (rec && typeof rec.kycRequest === 'object' && rec.kycRequest !== null) {
        rec = rec.kycRequest as Record<string, unknown>;
    }
    return rec;
}
