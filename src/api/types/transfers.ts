/** Request bodies and responses for `endpoints/transfers.ts`. */

// ─── Models ──────────────────────────────────────────────────────────────────

export interface TransferPurpose {
    id: string;
    name: string;
    type: string;
}

export interface ResolvedRecipient {
    accountNumber: string;
    /** Display name the sender confirms before committing. */
    fullName: string;
    currencySymbol: string;
}

// ─── Requests ────────────────────────────────────────────────────────────────

/**
 * `verify` is deliberately a separate call from `send`. It resolves the
 * recipient and quotes the fee so the sender confirms a real name and a real
 * total before money moves — never a blind submit.
 */
export interface VerifyTransferBody {
    toAccountNumber: string;
    /** Minor units, as a string. See the note on Balance.amount. */
    amount: string;
    currencySymbol: string;
    purposeId?: string;
}

export interface SendTransferBody extends VerifyTransferBody {
    /** Proof returned by `verify` — the backend rejects a send without it. */
    verificationToken: string;
    note?: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface VerifyTransferResponse {
    recipient: ResolvedRecipient;
    /** Minor units. */
    fee: string;
    /** amount + fee, minor units. */
    total: string;
    /** Pass to `send`. Short-lived. */
    verificationToken: string;
}

/**
 * A send can complete or be stopped for step-up auth. The union stops a caller
 * treating a challenge as a completed transfer.
 */
export type SendTransferResponse =
    | { status: 'completed'; transactionId: string; reference: string }
    | { status: 'step_up_required'; challengeId: string; method: 'face' | 'otp'; reason?: string };

export type TransferPurposeListResponse = TransferPurpose[];
export type LookupAccountResponse = ResolvedRecipient;
