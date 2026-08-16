import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    CreatePaymentRequestBody,
    CreatePaymentRequestResponse,
    FulfillPaymentRequestBody,
    FulfillPaymentRequestResponse,
    LookupPaymentRequestResponse,
} from '../types/paymentRequests';

/** Request-money: create a code, look it up, pay it, or cancel it. */
export const paymentRequests = {
    create: (
        body: CreatePaymentRequestBody,
        o?: RequestOptions,
    ): Promise<ApiResult<CreatePaymentRequestResponse>> =>
        request({ path: '/payment-requests', method: 'POST', body, options: o }),

    lookup: (code: string, o?: RequestOptions): Promise<ApiResult<LookupPaymentRequestResponse>> =>
        request({ path: `/payment-requests/lookup/${encodeURIComponent(code)}`, options: o }),

    fulfill: (
        id: string,
        body: FulfillPaymentRequestBody,
        o?: RequestOptions,
    ): Promise<ApiResult<FulfillPaymentRequestResponse>> =>
        request({
            path: `/payment-requests/${encodeURIComponent(id)}/fulfill`,
            method: 'POST',
            body,
            options: o,
        }),

    cancel: (id: string, o?: RequestOptions): Promise<ApiResult<void>> =>
        request({
            path: `/payment-requests/${encodeURIComponent(id)}/cancel`,
            method: 'PATCH',
            options: o,
        }),
};
