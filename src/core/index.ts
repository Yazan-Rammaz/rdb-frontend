/**
 * Core Assembler
 * Groups all internal actions into a structured 'core' object.
 */

import * as banking from './actions/banking';
import * as media from './actions/media';
import * as transactions from './actions/transactions';
import * as wallets from './actions/wallets';
import * as auth from './actions/auth';
import * as paymentRequests from './actions/payment-requests';
import * as websocket from './actions/websocket';
import * as verification from './actions/verification';

// Grouping into a single core object
export const core = {
    banking: { ...banking },
    media: { ...media },
    transactions: { ...transactions },
    wallets: { ...wallets },
    auth: { ...auth },
    paymentRequests: { ...paymentRequests },
    websocket: { ...websocket },
    verification: { ...verification },
};

// Exporting namespaces for modular imports
export { banking, media, transactions, wallets, auth, paymentRequests, websocket, verification };

/**
 * Individual Flat Exports
 * Essential for Next.js "use server" compatibility in the host application.
 * This allows the parent app to import specific functions directly.
 */

export {
    GetBanks,
    CreateBankDeposit,
    GetBankDeposits,
    CalculateFees,
    getAccountByBalanceId,
    lookupAccountByPhone,
} from './actions/banking';

export { UploadMedia } from './actions/media';

export {
    GetAccountBalance,
    GetJournalEntries,
    GetTransactions,
    CheckoutOrder,
    checkTransferBalance,
    getPaymentRequest,
} from './actions/transactions';

export { checkWallet, createWallet } from './actions/wallets';

export {
    sendOtp,
    reSendOtp,
    verifyOtp,
    verifyMe,
    savePasscode,
    verifyPasscode,
    updateUserProfile,
    createQrSession,
    refreshQrToken,
} from './actions/auth';

export {
    createPaymentRequest,
    lookupPaymentRequest,
    fulfillPaymentRequest,
    cancelPaymentRequest,
} from './actions/payment-requests';

export { getWsAccessToken } from './actions/websocket';

export {
    detectFace,
    captureID,
    matchFaceToID,
    startVideoCall,
    endVideoCall,
} from './actions/verification';

export type {
    ConnectionState,
    WalletEventType,
    BalanceUpdatePayload,
    BalanceSnapshotPayload,
    DepositEventPayload,
    WithdrawalEventPayload,
    TransferEventPayload,
    MerchantEventPayload,
    PaymentRequestEventPayload,
    LedgerEventPayload,
    AuthenticatedPayload,
    WSErrorPayload,
    WSContextType,
} from './types/websocket';
