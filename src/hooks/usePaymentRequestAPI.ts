'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/I18nContext';
import { api, isNetworkError } from '@/api';
import type { ApiResult } from '@/api';
import { isOffline } from '@/lib/networkStatus';
import { resolvePaymentRequestLookup } from '@/api/helpers/paymentRequests';
import type {
    CreatePaymentRequestInput,
    FulfillPaymentRequestInput,
    CancelPaymentRequestInput,
    MerchantPayInput,
    MerchantPayResponse,
    PaymentRequest,
    ResolvedPaymentRequest,
} from '@/core/types';

/**
 * A failed call. `network` is set when no response arrived (connection or
 * timeout) — nothing was toasted, and callers must stay silent too: the
 * offline pill is the message.
 */
export type PaymentRequestFailure = { error: string; network?: true };

const RETRY_CONFIG = {
    maxAttempts: 3,
    delays: [1000, 2000, 4000],
};

/**
 * Payment-request calls with automatic retry on transient failures.
 *
 * Retries up to 3 times with backoff (1s, 2s, 4s), then toasts and gives up.
 * The public shape is `T | { error: string; network?: true }`; `network` marks
 * a failure with no response, which is never toasted.
 *
 * ─── What migrating to @/api fixed here ─────────────────────────────────────
 * Retry used to be driven by thrown exceptions, and "don't retry a client
 * error" was decided by regex-matching the error MESSAGE for a 4xx-looking
 * number:
 *
 *     if (/\b4\d{2}\b/.test(lastError.message)) throw lastError;
 *
 * Any message containing a 3-digit number starting with 4 matched — including
 * amounts. "Insufficient balance: 450 USD" would be read as a client error, and
 * a genuinely transient failure carrying such a message would never be retried.
 *
 * The API layer returns a real status, so the decision is now made on the status.
 */
export function usePaymentRequestAPI() {
    const { toast } = useToast();
    const { t, tr } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);

    const withRetry = useCallback(
        async <T,>(
            operation: () => Promise<ApiResult<T>>,
            operationName: string,
        ): Promise<T | PaymentRequestFailure> => {
            setIsLoading(true);
            let lastMessage = '';

            for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
                const res = await operation();

                if (res.ok) {
                    setIsLoading(false);
                    return res.data;
                }

                lastMessage = res.error.message;

                // A network failure is never toasted — the offline pill says it.
                // No retry on a timeout (a POST may have landed; only the user
                // re-sends it) nor once offline (it would fail the same way).
                if (res.error.status === 0) {
                    const giveUp =
                        !isNetworkError(res.error) || // ABORTED: the caller cancelled
                        res.error.code === 'TIMEOUT' ||
                        isOffline() ||
                        attempt === RETRY_CONFIG.maxAttempts - 1;
                    if (giveUp) {
                        setIsLoading(false);
                        return { error: lastMessage, network: true };
                    }
                }

                // 4xx means the request itself is wrong — a retry sends the same
                // wrong request. Only network failures (status 0) and 5xx are
                // worth repeating.
                const isRetryable = res.error.status === 0 || res.error.status >= 500;
                if (!isRetryable) {
                    setIsLoading(false);
                    toast.error(lastMessage);
                    return { error: lastMessage };
                }

                if (attempt < RETRY_CONFIG.maxAttempts - 1) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, RETRY_CONFIG.delays[attempt]),
                    );
                }
            }

            setIsLoading(false);
            const message =
                lastMessage || tr('home.qr.operations.failed', { operation: operationName });
            toast.error(message);
            return { error: message };
        },
        [toast, tr],
    );

    return {
        isLoading,
        createPaymentRequest: (
            input: CreatePaymentRequestInput,
        ): Promise<PaymentRequest | PaymentRequestFailure> =>
            withRetry(() => api.paymentRequests.create(input), t.home.qr.operations.create),
        /**
         * Looks a code up and says which kind of thing it turned out to be —
         * a person's request or a merchant order. Callers must branch on
         * `kind` before paying: the two settle through different endpoints.
         *
         * A body that resolves to neither is reported as an error rather than
         * returned half-formed, so no caller can pay against a missing id.
         */
        lookupPaymentRequest: async (
            code: string,
        ): Promise<ResolvedPaymentRequest | PaymentRequestFailure> => {
            const res = await withRetry(
                () => api.paymentRequests.lookup(code),
                t.home.qr.operations.lookup,
            );
            if ('error' in res) return res;

            const resolved = resolvePaymentRequestLookup(res);
            if (!resolved) {
                const message = t.home.qr.operations.unreadable;
                toast.error(message);
                return { error: message };
            }
            return resolved;
        },
        fulfillPaymentRequest: (
            input: FulfillPaymentRequestInput,
        ): Promise<PaymentRequest | PaymentRequestFailure> =>
            withRetry(() => api.paymentRequests.fulfill(input), t.home.qr.operations.fulfill),
        /**
         * Pays a merchant order. Retries carry the caller's idempotencyKey
         * unchanged — that is what makes repeating a 5xx safe rather than a
         * second charge.
         */
        payMerchantPayment: (
            input: MerchantPayInput,
        ): Promise<MerchantPayResponse | PaymentRequestFailure> =>
            withRetry(() => api.merchant.pay(input), t.home.qr.operations.merchantPay),
        cancelPaymentRequest: (
            input: CancelPaymentRequestInput,
        ): Promise<PaymentRequest | PaymentRequestFailure> =>
            withRetry(() => api.paymentRequests.cancel(input), t.home.qr.operations.cancel),
    };
}
