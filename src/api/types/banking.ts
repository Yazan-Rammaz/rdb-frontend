/** Request bodies and responses for `endpoints/banking.ts`. */

// ─── Models ──────────────────────────────────────────────────────────────────

export interface Asset {
    id: string;
    symbol: string;
    name: string;
    /** Decimal places for display. */
    scale: number;
}

export interface Bank {
    id: string;
    name: string;
    logoUrl?: string;
}

export interface BankDeposit {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    /** Minor units, as a string. */
    amount: string;
    currencySymbol: string;
    createdAt: string;
}

// ─── Requests ────────────────────────────────────────────────────────────────

export interface CreateBankDepositBody {
    bankId: string;
    amount: string;
    currencySymbol: string;
    /** Upload receipt first; send the returned URL. */
    receiptImageUrl?: string;
}

export interface CalculateFeesBody {
    bankId: string;
    amount: string;
    currencySymbol: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface FeeQuote {
    /** Minor units. */
    fee: string;
    /** amount + fee, minor units. */
    total: string;
}

export type AssetListResponse = Asset[];
export type BankListResponse = Bank[];
export type BankDepositListResponse = BankDeposit[];
export type CreateBankDepositResponse = BankDeposit;
