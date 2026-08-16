import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    AccountListResponse,
    BalanceResponse,
    ListAccountsQuery,
    WalletListResponse,
} from '../types/wallets';

/** Wallets, accounts and balances. */
export const wallets = {
    list: (o?: RequestOptions): Promise<ApiResult<WalletListResponse>> =>
        request({ path: '/wallets', query: { subtype: 'MAIN' }, options: o }),

    accounts: (q: ListAccountsQuery, o?: RequestOptions): Promise<ApiResult<AccountListResponse>> =>
        request({ path: '/wallets/myAcounts', query: { ...q }, options: o }),

    balance: (assetId: string, o?: RequestOptions): Promise<ApiResult<BalanceResponse>> =>
        // encodeURIComponent belongs here, not at the call site — a caller
        // passing an id with a slash should not be able to alter the path.
        request({ path: `/wallets/my/balances/${encodeURIComponent(assetId)}`, options: o }),
};
