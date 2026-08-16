import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    LedgerQuery,
    LedgerResponse,
    TransactionListResponse,
} from '../types/transactions';

/** Statement and transaction history. */
export const transactions = {
    ledger: (q: LedgerQuery = {}, o?: RequestOptions): Promise<ApiResult<LedgerResponse>> =>
        // Undefined filters are dropped by the client, so callers can pass an
        // options object straight through without pruning it first.
        request({ path: '/financial-ledger', query: { ...q }, options: o }),

    list: (o?: RequestOptions): Promise<ApiResult<TransactionListResponse>> =>
        request({ path: '/wallets/my/transactions', options: o }),

    journalEntries: (o?: RequestOptions): Promise<ApiResult<TransactionListResponse>> =>
        request({ path: '/wallets/my/journal-entries', options: o }),
};
