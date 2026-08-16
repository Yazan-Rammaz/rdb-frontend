/** Request bodies and responses for `endpoints/wallets.ts`. */

// ─── Models ──────────────────────────────────────────────────────────────────

export interface Wallet {
    id: string;
    accountNumber: string;
    subtype: 'MAIN' | string;
    currencySymbol: string;
}

export interface Balance {
    assetId: string;
    /**
     * Minor units as a string (piastres, cents), NOT a number.
     * Money must never round-trip through a JS float — 0.1 + 0.2 is the reason.
     * Format at the edge, compute with a decimal library.
     */
    amount: string;
    currencySymbol: string;
    /** Decimal places for display. */
    scale: number;
}

export interface Account {
    id: string;
    accountNumber: string;
    currencySymbol: string;
    balance?: Balance;
}

// ─── Requests ────────────────────────────────────────────────────────────────

export interface ListAccountsQuery {
    currencySymbol: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export type WalletListResponse = Wallet[];
export type AccountListResponse = Account[];
export type BalanceResponse = Balance;
