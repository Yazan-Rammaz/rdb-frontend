/** Request bodies and responses for `endpoints/transactions.ts`. */

import type { PageParams } from './common';

// ─── Models ──────────────────────────────────────────────────────────────────

export interface LedgerEntry {
    id: string;
    /** Minor units, as a string. */
    amount: string;
    currencySymbol: string;
    direction: 'credit' | 'debit';
    description?: string;
    /** ISO 8601. */
    createdAt: string;
    counterparty?: { name?: string; accountNumber?: string };
}

// ─── Requests ────────────────────────────────────────────────────────────────

export interface LedgerQuery extends PageParams {
    /** ISO date, inclusive. */
    from?: string;
    /** ISO date, inclusive. */
    to?: string;
    currencySymbol?: string;
    direction?: 'credit' | 'debit';
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface LedgerResponse {
    items: LedgerEntry[];
    total: number;
    page: number;
    limit: number;
}

export type TransactionListResponse = LedgerEntry[];
