'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { api } from '@/api';
import type { ApiResult } from '@/api';
import type {
    CreatePaymentRequestInput,
    FulfillPaymentRequestInput,
    CancelPaymentRequestInput,
    PaymentRequest,
    PaymentRequestLookup,
} from '@/core/types';

const RETRY_CONFIG = {
    maxAttempts: 3,
    delays: [1000, 2000, 4000],
};

/**
 * Payment-request calls with automatic retry on transient failures.
 *
 * Retries up to 3 times with backoff (1s, 2s, 4s), then toasts and gives up.
 * The public shape is still `T | { error: string }`, so callers are unchanged.
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
    const [isLoading, setIsLoading] = useState(false);

    const withRetry = useCallback(
        async <T,>(
            operation: () => Promise<ApiResult<T>>,
            operationName: string,
        ): Promise<T | { error: string }> => {
            setIsLoading(true);
            let lastMessage = '';

            for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
                const res = await operation();

                if (res.ok) {
                    setIsLoading(false);
                    return res.data;
                }

                lastMessage = res.error.message;

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
            const message = lastMessage || `${operationName} failed. Please try again.`;
            toast.error(message);
            return { error: message };
        },
        [toast],
    );

    return {
        isLoading,
        createPaymentRequest: (
            input: CreatePaymentRequestInput,
        ): Promise<PaymentRequest | { error: string }> =>
            withRetry(() => api.paymentRequests.create(input), 'Create payment request'),
        lookupPaymentRequest: (
            code: string,
        ): Promise<PaymentRequestLookup | { error: string }> =>
            withRetry(() => api.paymentRequests.lookup(code), 'Lookup payment request'),
        fulfillPaymentRequest: (
            input: FulfillPaymentRequestInput,
        ): Promise<PaymentRequest | { error: string }> =>
            withRetry(() => api.paymentRequests.fulfill(input), 'Fulfill payment'),
        cancelPaymentRequest: (
            input: CancelPaymentRequestInput,
        ): Promise<PaymentRequest | { error: string }> =>
            withRetry(() => api.paymentRequests.cancel(input), 'Cancel payment'),
    };
}
