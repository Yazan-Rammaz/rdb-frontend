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

export interface EncryptedRequestCode {
    encryptedData: Uint8Array;
    iv: Uint8Array;
    qrData: string;
}

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
