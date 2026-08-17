import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    FinancialLedgerApi,
    GetWalletBalancesApi,
    LedgerQuery,
    WalletBalanceQuery,
} from '../types/transactions';

/** Balances and transaction history. */
export const transactions = {
    /**
     * Wallets and balances for one currency.
     *
     * The path is `/wallets/myAcounts` — the misspelling is the backend's and is
     * load-bearing. Do not "fix" it here.
     *
     * → GET /wallets/myAcounts (op 'wb')
     */
    walletBalance: (
        q: WalletBalanceQuery,
        o?: RequestOptions,
    ): Promise<ApiResult<GetWalletBalancesApi>> => request({ op: 'wb', body: { ...q }, options: o }),

    /**
     * Paginated statement.
     *
     * `page` is zero-based, matching the backend. Undefined filters are dropped
     * by the client, so an omitted assetSymbol means "all assets" rather than
     * sending `assetSymbol=undefined`.
     *
     * → GET /financial-ledger (op 'fl')
     */
    ledger: (q: LedgerQuery = {}, o?: RequestOptions): Promise<ApiResult<FinancialLedgerApi>> =>
        request({
            op: 'fl',
            // The opcode payload becomes the query string (see `fl` in
            // lib/opcodeMap.ts), which drops undefined the same way the client's
            // own buildUrl does — so an omitted assetSymbol still means
            // "all assets".
            body: { page: q.page ?? 0, limit: q.limit ?? 10, assetSymbol: q.assetSymbol },
            options: o,
        }),
};
