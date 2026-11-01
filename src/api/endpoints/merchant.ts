import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type { MerchantPayInput, MerchantPayResponse } from '../types/paymentRequests';

/**
 * Merchant payments — paying a shop's order.
 *
 * Separate from `paymentRequests` because the backend puts it somewhere else:
 * a person-to-person request is settled with
 * `POST /payment-requests/{id}/fulfill`, a merchant order with
 * `POST /merchant/payments/{id}/pay`. Same lookup endpoint finds both; only the
 * `kind` on the response says which of these to call.
 *
 * The two also answer differently — `fulfill` returns a `PaymentRequest`,
 * `pay` returns a receipt (`receiptNumber`, `paidAt`, and a `successUrl` back
 * into the shop).
 */
export const merchant = {
    /**
     * Pays a merchant order.
     *
     * `idempotencyKey` is required: this moves money, and a retry after a
     * dropped response must not charge the customer twice.
     */
    pay: (
        input: MerchantPayInput,
        o?: RequestOptions,
    ): Promise<ApiResult<MerchantPayResponse>> => {
        const { id, ...body } = input;
        return request({
            path: `/merchant/payments/${encodeURIComponent(id)}/pay`,
            method: 'POST',
            body,
            options: o,
        });
    },
};
