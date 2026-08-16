import type * as banking from '../actions/banking';
import type * as media from '../actions/media';
import type * as transactions from '../actions/transactions';
import type * as wallets from '../actions/wallets';
import type * as auth from '../actions/auth';
import type * as paymentRequests from '../actions/payment-requests';
import type * as verification from '../actions/verification';

export type RDBActions = {
    banking: typeof banking;
    media: typeof media;
    transactions: typeof transactions;
    wallets: typeof wallets;
    auth: typeof auth;
    paymentRequests: typeof paymentRequests;
    verification: typeof verification;
};
