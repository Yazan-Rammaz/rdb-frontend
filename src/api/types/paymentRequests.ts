/** Request bodies and responses for `endpoints/paymentRequests.ts`. */

// ─── Models ──────────────────────────────────────────────────────────────────

export type PaymentRequestStatus = 'pending' | 'fulfilled' | 'cancelled' | 'expired';

export interface PaymentRequest {
    id: string;
    /** Short code the payer scans or types. */
    code: string;
    status: PaymentRequestStatus;
    /** Minor units, as a string. */
    amount: string;
    currencySymbol: string;
    requester: { fullName: string; accountNumber: string };
    note?: string;
    expiresAt?: string;
}

// ─── Requests ────────────────────────────────────────────────────────────────

export interface CreatePaymentRequestBody {
    amount: string;
    currencySymbol: string;
    note?: string;
}

export interface FulfillPaymentRequestBody {
    /** Wallet the payer settles from. */
    fromAccountNumber: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export type CreatePaymentRequestResponse = PaymentRequest;
export type LookupPaymentRequestResponse = PaymentRequest;

export type FulfillPaymentRequestResponse =
    | { status: 'completed'; transactionId: string }
    | { status: 'step_up_required'; challengeId: string; method: 'face' | 'otp' };
