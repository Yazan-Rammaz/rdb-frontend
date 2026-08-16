/**
 * Request bodies and responses for `endpoints/paymentRequests.ts`.
 *
 * Re-exported from `core/types/payment-requests.ts` rather than redeclared —
 * PaymentRequest and PaymentRequestLookup are already accurate there, and a
 * second copy would drift.
 */

export type {
    PaymentRequest,
    PaymentRequestStatus,
    PaymentRequestLookup,
    EncryptedRequestCode,
    CreatePaymentRequestInput,
    FulfillPaymentRequestInput,
    CancelPaymentRequestInput,
} from '@/core/types/payment-requests';
