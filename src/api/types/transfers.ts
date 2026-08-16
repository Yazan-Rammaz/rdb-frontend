/**
 * Request bodies and responses for `endpoints/transfers.ts`.
 *
 * These mirror what NestJS actually sends and accepts — they were corrected
 * against `core/types/transfer.ts` and the action implementations after an
 * earlier draft guessed at the shapes and got them wrong.
 *
 * Note `amount` is a plain `number`, not minor units as a string. That is the
 * existing wire contract, and the API layer's job is to describe the backend
 * honestly, not to impose a different convention on it. Changing the
 * representation is a backend decision.
 */

// ─── Models ──────────────────────────────────────────────────────────────────

// Re-exported, not redeclared — core/types/transfer.ts already defines it and
// the transfer screens import it from there. Imported as well, since
// `export ... from` does not put the name in local scope for the alias below.
import type { TransferPurpose } from '@/core/types/transfer';
export type { TransferPurpose };

export interface RecipientAccountDetails {
    found: boolean;
    accountNumber: string;
    name: string;
    /** Derived client-side from `name`. */
    maskedName?: string;
}

interface Party {
    accountNumber: string;
    name: string;
}

interface Currency {
    symbol: string;
    name: string;
}

// ─── Requests ────────────────────────────────────────────────────────────────

/**
 * `verify` is a separate call from `send` on purpose: the sender confirms a
 * resolved recipient name and the amount before any money moves.
 */
export interface VerifyTransferBody {
    toAccountNumber: string;
    assetSymbol: string;
    assetType: string;
    amount: number;
}

export interface SendTransferBody {
    toAccountNumber: string;
    assetSymbol: string;
    assetType: string;
    amount: number;
    purposeId: string;
    note?: string;
    /** How the recipient was entered — typed by hand or scanned. */
    inputMethod: 'MANUAL' | 'QR';
    /**
     * Client-generated, stable across retries of the SAME transfer.
     * A retry after a timeout must reuse it, or the user is charged twice.
     */
    idempotencyKey: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface VerifyTransferResponse {
    valid: boolean;
    sender: Party & { availableBalance: number };
    receiver: Party;
    currency: Currency;
    amount: number;
}

export interface TransferResult {
    transferId: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    sender: Party & { balanceAfter: number };
    receiver: Party;
    currency: Currency;
    amount: number;
    purpose: string;
    note?: string;
    /** ISO 8601. */
    createdAt: string;
}

export type TransferPurposeListResponse = TransferPurpose[];
export type LookupAccountResponse = RecipientAccountDetails;

/**
 * A send either completes or is stopped for step-up auth — both arrive as
 * HTTP 200, so the distinction lives in the body.
 *
 * NestJS signals the gate two ways: a `stepUp` object, or the convenience
 * booleans `requireFaceVerification` / `requireOtpVerification` alongside a
 * top-level `challengeId`. Both are modelled here rather than only the tidy one,
 * because `extractStepUp` in useStepUp already handles both and a response
 * taking the second form must not be mistaken for a completed transfer.
 *
 * `status: 'PENDING'` inside TransferResult is a different thing: the transfer
 * was accepted and is settling. A step-up means it was not accepted at all.
 */
export interface StepUpRequirement {
    method: 'face' | 'otp';
    challengeId: string;
    reason?: string;
}

export type SendTransferResponse =
    | TransferResult
    | { stepUp: StepUpRequirement }
    | {
          requireFaceVerification?: boolean;
          requireOtpVerification?: boolean;
          challengeId: string;
          reason?: string;
      };
