import { fetchServerData, processResponse } from '../utils';
import type {
    PaymentRequest,
    PaymentRequestLookup,
    CreatePaymentRequestInput,
    FulfillPaymentRequestInput,
    CancelPaymentRequestInput,
} from '../types';

export async function createPaymentRequest(
    input: CreatePaymentRequestInput & { token?: string; authCookieName?: string; baseUrl?: string; local?: string }
): Promise<PaymentRequest | { error: string }> {
    const { token, authCookieName, baseUrl: _baseUrl, local: _local, ...body } = input;
    const response = await fetchServerData({
        method: 'POST',
        url: '/payment-requests',
        body,
        token,
        authCookieName,
    });
    return processResponse<PaymentRequest>(response);
}

export async function lookupPaymentRequest(
    input: { code: string; token?: string; authCookieName?: string; baseUrl?: string; local?: string }
): Promise<PaymentRequestLookup | { error: string }> {
    const { code, token, authCookieName } = input;
    const response = await fetchServerData({
        method: 'GET',
        url: `/payment-requests/lookup/${encodeURIComponent(code)}`,
        token,
        authCookieName,
    });
    return processResponse<PaymentRequestLookup>(response);
}

export async function fulfillPaymentRequest(
    input: FulfillPaymentRequestInput & { token?: string; authCookieName?: string; baseUrl?: string; local?: string }
): Promise<PaymentRequest | { error: string }> {
    const { id, token, authCookieName, baseUrl: _baseUrl, local: _local, ...body } = input;
    const response = await fetchServerData({
        method: 'POST',
        url: `/payment-requests/${encodeURIComponent(id)}/fulfill`,
        body,
        token,
        authCookieName,
    });
    return processResponse<PaymentRequest>(response);
}

export async function cancelPaymentRequest(
    input: CancelPaymentRequestInput & { token?: string; authCookieName?: string; baseUrl?: string; local?: string }
): Promise<PaymentRequest | { error: string }> {
    const { id, token, authCookieName, baseUrl: _baseUrl, local: _local, ...body } = input;
    const response = await fetchServerData({
        method: 'PATCH',
        url: `/payment-requests/${encodeURIComponent(id)}/cancel`,
        body,
        token,
        authCookieName,
    });
    return processResponse<PaymentRequest>(response);
}
