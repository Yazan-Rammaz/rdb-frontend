import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    CancelPaymentRequestInput,
    CreatePaymentRequestInput,
    FulfillPaymentRequestInput,
    PaymentRequest,
    PaymentRequestLookupResponse,
} from '../types/paymentRequests';

/** Request-money: create a code, look it up, pay it, or cancel it. */
export const paymentRequests = {
    create: (
        body: CreatePaymentRequestInput,
        o?: RequestOptions,
    ): Promise<ApiResult<PaymentRequest>> =>
        request({ path: '/payment-requests', method: 'POST', body, options: o }),

    /**
     * Resolves a short code to the request it stands for.
     *
     * The code goes in the path, so it is encoded here — a caller passing one
     * containing a slash must not be able to reach a different route.
     *
     * Answers two different things: a person-to-person request (`kind: 'USER'`)
     * or a merchant order (`kind: 'MERCHANT'`), which are paid through
     * different endpoints. Do not read this result directly — pass it through
     * `resolvePaymentRequestLookup` in `api/helpers/paymentRequests.ts`, which
     * settles the shape and the missing-kind case in one place.
     */
    lookup: (code: string, o?: RequestOptions): Promise<ApiResult<PaymentRequestLookupResponse>> =>
        request({ path: `/payment-requests/lookup/${encodeURIComponent(code)}`, options: o }),

    /**
     * Pays a request. Like a transfer, this can come back gated on step-up —
     * callers must check with extractStepUp before treating it as settled.
     */
    fulfill: (
        input: FulfillPaymentRequestInput & { id: string },
        o?: RequestOptions,
    ): Promise<ApiResult<PaymentRequest>> => {
        const { id, ...body } = input;
        return request({
            path: `/payment-requests/${encodeURIComponent(id)}/fulfill`,
            method: 'POST',
            body,
            options: o,
        });
    },

    cancel: (
        input: CancelPaymentRequestInput & { id: string },
        o?: RequestOptions,
    ): Promise<ApiResult<PaymentRequest>> => {
        const { id, ...body } = input;
        return request({
            path: `/payment-requests/${encodeURIComponent(id)}/cancel`,
            method: 'PATCH',
            body,
            options: o,
        });
    },
};
