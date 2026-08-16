'use client';

import { useCallback, useState } from 'react';
import { useActions } from './useActions';
import { useToast } from '@/context/ToastContext';
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
 * Hook for making payment request API calls with automatic retry logic
 * Retries 3 times with exponential backoff (1s, 2s, 4s) on transient failures
 * Shows error toast notifications on final failure
 */
export function usePaymentRequestAPI() {
    const actions = useActions();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const withRetry = useCallback(
        async <T,>(operation: () => Promise<T>, operationName: string): Promise<T> => {
            setIsLoading(true);
            let lastError: Error | null = null;

            for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
                try {
                    const result = await operation();
                    setIsLoading(false);
                    return result;
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));

                    // Do not retry client errors (4xx)
                    if (/\b4\d{2}\b/.test(lastError.message)) {
                        setIsLoading(false);
                        throw lastError;
                    }

                    if (attempt < RETRY_CONFIG.maxAttempts - 1) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, RETRY_CONFIG.delays[attempt]),
                        );
                    }
                }
            }

            setIsLoading(false);
            const errorMessage = lastError?.message || `${operationName} failed. Please try again.`;
            toast.error(errorMessage);
            throw lastError;
        },
        [actions, toast],
    );

    return {
        isLoading,
        createPaymentRequest: (
            input: CreatePaymentRequestInput,
        ): Promise<PaymentRequest | { error: string }> =>
            withRetry(
                () => actions.paymentRequests.createPaymentRequest(input),
                'Create payment request',
            ),
        lookupPaymentRequest: (
            code: string,
        ): Promise<PaymentRequestLookup | { error: string }> =>
            withRetry(
                () => actions.paymentRequests.lookupPaymentRequest({ code }),
                'Lookup payment request',
            ),
        fulfillPaymentRequest: (
            input: FulfillPaymentRequestInput,
        ): Promise<PaymentRequest | { error: string }> =>
            withRetry(
                () => actions.paymentRequests.fulfillPaymentRequest(input),
                'Fulfill payment',
            ),
        cancelPaymentRequest: (
            input: CancelPaymentRequestInput,
        ): Promise<PaymentRequest | { error: string }> =>
            withRetry(
                () => actions.paymentRequests.cancelPaymentRequest(input),
                'Cancel payment',
            ),
    };
}
