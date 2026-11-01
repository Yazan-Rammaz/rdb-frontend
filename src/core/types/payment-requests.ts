// Payment Request API Types
// Defines all types for payment request creation, lookup, fulfillment, and cancellation

export type PaymentRequestStatus = 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';

export interface PaymentRequest {
    id: string;
    requesterId: string;
    requesterAccountId: string;
    requesterAccountNumber: string;
    payerId: string | null;
    payerAccountId: string | null;
    assetType: string;
    assetId: string;
    assetSymbol: string;
    amount: number;
    purposeId: string;
    note?: string;
    reference?: string;
    requestCode: string;
    expiresAt: string;
    isPermanent: boolean;
    status: PaymentRequestStatus;
    financialLedgerInId: string;
    accountTransferId: string | null;
    journalEntryId: string | null;
    fulfilledAt: string | null;
    cancelledAt: string | null;
    cancellationReason: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentRequestLookup {
    id: string;
    requesterAccountNumber: string;
    requesterAccountName: string;
    purpose: {
        id: string;
        name: string;
    };
    assetType: string;
    assetSymbol: string;
    amount: number;
    note?: string;
    reference?: string;
    requestCode: string;
    expiresAt: string;
    isPermanent: boolean;
    status: PaymentRequestStatus;
    createdAt: string;
}

// ─── Merchant payments ───────────────────────────────────────────────────────

/**
 * What a lookup turned out to be.
 *
 * The same `GET /payment-requests/lookup/{code}` answers both a person asking a
 * friend for money and a shop asking a customer to pay an order — but they are
 * paid through different endpoints and read differently on screen, so the
 * response discriminates.
 */
export type PaymentRequestKind = 'MERCHANT' | 'USER';

/**
 * A merchant's request, as returned under `merchant` on a MERCHANT lookup.
 *
 * Note `amount` and `feeAmount` are STRINGS here ("100.00"), where the
 * person-to-person `PaymentRequestLookup.amount` is a number. Sent as decimal
 * strings so money never round-trips through a float. Do not `parseFloat` them
 * for display — format the string.
 */
export interface MerchantPaymentLookup {
    id: string;
    /** 'PENDING' when it can still be paid; also PAID / EXPIRED / CANCELLED. */
    status: string;
    /** The backend's own verdict. Authoritative — do not re-derive it from status + expiresAt. */
    payable: boolean;
    merchantName: string;
    /** The shop's order id. What the customer sees on their receipt. */
    orderRef: string;
    amount: string;
    feeAmount: string;
    assetType: string;
    assetSymbol: string;
    /** Pre-localized by the merchant; pick by current language, fall back to en. */
    description?: { en?: string; ar?: string };
    expiresAt: string;
}

/** Receipt for a completed merchant payment — not the shape `fulfill` returns. */
export interface MerchantPayResponse {
    status: string;
    paymentRequestId: string;
    orderRef: string;
    merchantName: string;
    amount: string;
    assetSymbol: string;
    receiptNumber: string;
    paidAt: string;
    accountTransferId: string;
    /** Where the shop wants the customer sent afterwards. Optional. */
    successUrl?: string;
}

export interface MerchantPayInput {
    id: string;
    idempotencyKey: string;
}

/** Raw lookup body, before `resolvePaymentRequestLookup` sorts out which kind it is. */
export type PaymentRequestLookupResponse =
    | ({ kind?: 'MERCHANT' } & { merchant: MerchantPaymentLookup })
    | ({ kind?: 'USER'; user?: PaymentRequestLookup } & Partial<PaymentRequestLookup>);

/** Normalized lookup — what callers actually branch on. */
export type ResolvedPaymentRequest =
    | { kind: 'MERCHANT'; merchant: MerchantPaymentLookup }
    | { kind: 'USER'; request: PaymentRequestLookup };

export interface CreatePaymentRequestInput {
    accountNumber: string;
    assetType: string;
    assetSymbol: string;
    amount: number;
    purposeId: string;
    note?: string;
    reference?: string;
    expiryMinutes?: number;
    isPermanent: boolean;
    idempotencyKey: string;
}

export interface FulfillPaymentRequestInput {
    id: string;
    accountNumber: string;
    idempotencyKey: string;
    note?: string;
}

export interface CancelPaymentRequestInput {
    id: string;
    reason: string;
}
