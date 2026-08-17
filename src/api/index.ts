import { auth } from './endpoints/auth';
import { banking } from './endpoints/banking';
import { kyc } from './endpoints/kyc';
import { paymentRequests } from './endpoints/paymentRequests';
import { profile } from './endpoints/profile';
import { transactions } from './endpoints/transactions';
import { transfers } from './endpoints/transfers';

/**
 * The app's API surface.
 *
 *   import { api } from '@/api';
 *
 *   const res = await api.transactions.walletBalance({ currencySymbol: 'USD' });
 *   if (!res.ok) return toast(res.error.message);
 *   setBalances(res.data);
 *
 * Calls never throw and never return a bare `any`. `ApiResult` is a
 * discriminated union, so TypeScript will not let you read `.data` before
 * checking `.ok`.
 */
export const api = {
    auth,
    banking,
    kyc,
    paymentRequests,
    profile,
    transactions,
    transfers,
};

export type { ApiError, ApiResult, Paginated, PageParams, RequestOptions } from './types/common';

export type * from './types/auth';
export type * from './types/banking';
export type * from './types/kyc';
export type * from './types/paymentRequests';
export type * from './types/profile';
export type * from './types/transactions';
export type * from './types/transfers';
