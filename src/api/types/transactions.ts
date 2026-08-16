/**
 * Request bodies and responses for `endpoints/transactions.ts`.
 *
 * These re-export the existing definitions in `core/types` rather than
 * redeclaring them. FinancialLedgerItem alone has 25 fields, and the wallet
 * envelope nests wallets inside balances — hand-copying that is how a type ends
 * up subtly wrong and then drifts. One definition, re-exported, cannot diverge.
 *
 * The request types below are new, because the actions expressed them as loose
 * function parameters rather than a shape.
 */

export type {
    FinancialLedgerApi,
    FinancialLedgerItem,
    GetWalletBalancesApi,
} from '@/core/types/api';

// ─── Requests ────────────────────────────────────────────────────────────────

export interface WalletBalanceQuery {
    currencySymbol: string;
}

export interface LedgerQuery {
    /** Zero-based. The backend's first page is 0, not 1. */
    page?: number;
    limit?: number;
    /** Filter to a single asset, e.g. 'USD'. Omit for all. */
    assetSymbol?: string;
}
