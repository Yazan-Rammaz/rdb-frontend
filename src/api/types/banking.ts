/**
 * Request bodies and responses for `endpoints/banking.ts`.
 *
 * Corrected against `core/types/api.ts`, `core/types/models.ts` and the action
 * implementations — an earlier draft guessed these shapes.
 */

// ─── Models ──────────────────────────────────────────────────────────────────

export interface AssetItem {
    id: string;
    name: string;
    displayName: string;
    symbol: string;
    symbolImageUrl: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Bank {
    id: string;
    name: string;
    logoUrl?: string;
}

export interface BankDeposit {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    amount: number;
    currencySymbol: string;
    createdAt: string;
}

// ─── Requests ────────────────────────────────────────────────────────────────

export interface CreateBankDepositBody {
    bankId: string;
    amount: number;
    currencySymbol: string;
    /** Upload the receipt first, then send the URL it returns. */
    receiptImageUrl?: string;
}

export interface CalculateFeesBody {
    bankId: string;
    amount: number;
    currencySymbol: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

/**
 * `/assets/supported` returns both lists in one envelope rather than a flat
 * array — the UI shows currencies and metals as separate groups.
 */
export interface SupportedAssetsResponse {
    currencies: AssetItem[];
    metals: AssetItem[];
}

export interface FeeQuote {
    fee: number;
    total: number;
}

export type BankListResponse = Bank[];
export type BankDepositListResponse = BankDeposit[];
export type CreateBankDepositResponse = BankDeposit;
