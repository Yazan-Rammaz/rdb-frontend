import { auth } from './endpoints/auth';
import { banking } from './endpoints/banking';
import { kyc } from './endpoints/kyc';
import { loginHistory } from './endpoints/loginHistory';
import { paymentRequests } from './endpoints/paymentRequests';
import { profile } from './endpoints/profile';
import { resetPasscode } from './endpoints/resetPasscode';
import { session } from './endpoints/session';
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
    loginHistory,
    paymentRequests,
    profile,
    resetPasscode,
    session,
    transactions,
    transfers,
};

export type { ApiError, ApiResult, Paginated, PageParams, RequestOptions } from './types/common';

export type * from './types/auth';
export type * from './types/banking';
export type * from './types/kyc';
export type * from './types/loginHistory';
export type * from './types/paymentRequests';
export type * from './types/profile';
export type * from './types/resetPasscode';
export type * from './types/session';
export type * from './types/transactions';
export type * from './types/transfers';
