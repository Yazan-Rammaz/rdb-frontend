import type {
    MerchantPaymentLookup,
    PaymentRequestLookup,
    PaymentRequestLookupResponse,
    ResolvedPaymentRequest,
} from '../types/paymentRequests';

/**
 * Settles what a lookup actually returned.
 *
 * `GET /payment-requests/lookup/{code}` answers two different things — a
 * person-to-person request, paid with `payment-requests/{id}/fulfill`, and a
 * merchant order, paid with `merchant/payments/{id}/pay`. Getting that wrong
 * means calling the wrong endpoint with the right id, so the decision lives
 * here rather than being re-derived at each call site.
 *
 * Three shapes are accepted, in this order:
 *   `{ kind: 'MERCHANT', merchant: {…} }`  the documented merchant response
 *   `{ kind: 'USER', user: {…} }`          the symmetric person-to-person one
 *   a bare `PaymentRequestLookup`          what the backend returned before
 *                                          `kind` existed
 *
 * The last case is why a missing `kind` resolves to USER rather than failing:
 * an older deployment must keep paying person-to-person requests. A body
 * carrying `merchant` is treated as MERCHANT even without `kind`, because
 * nothing else produces that field.
 *
 * Returns null when the body carries no usable id — the caller shows "could
 * not read this request" rather than posting a payment to `undefined`.
 */
export function resolvePaymentRequestLookup(
    body: PaymentRequestLookupResponse | null | undefined,
): ResolvedPaymentRequest | null {
    if (!body) return null;

    const asMerchant = body as { kind?: string; merchant?: MerchantPaymentLookup };
    if (asMerchant.kind === 'MERCHANT' || asMerchant.merchant) {
        const merchant = asMerchant.merchant;
        if (!merchant?.id) return null;
        return { kind: 'MERCHANT', merchant };
    }

    const asUser = body as { user?: PaymentRequestLookup } & Partial<PaymentRequestLookup>;
    const request = asUser.user ?? (asUser as PaymentRequestLookup);
    if (!request?.id) return null;
    return { kind: 'USER', request };
}

/**
 * Whether a merchant order can still be paid.
 *
 * `payable` is the backend's own verdict and wins outright — it knows about
 * states the client cannot see. The status and expiry checks only catch a body
 * that omitted the field entirely.
 */
export function isMerchantPayable(merchant: MerchantPaymentLookup): boolean {
    if (typeof merchant.payable === 'boolean') return merchant.payable;
    if (merchant.status && merchant.status !== 'PENDING') return false;
    if (merchant.expiresAt && Date.parse(merchant.expiresAt) <= Date.now()) return false;
    return true;
}
