// ─── Toggle via env: NEXT_PUBLIC_USE_SERVER_ACTIONS ("true" / anything else) ───
// Inlined at BUILD time (NEXT_PUBLIC_*): set it in .env / .env.local / CI env,
// not in wrangler [vars] alone — runtime vars can't affect an already-built bundle.
const USE_SERVER_ACTIONS = process.env.NEXT_PUBLIC_USE_SERVER_ACTIONS === 'true';
// ────────────────────────────────────────────────────────────────────────────────
// When false: passes null → useActions() falls back to `core` (direct client fetch)
// When true:  passes server actions (Next.js 'use server' functions)

import {
    GetBanks,
    CreateBankDeposit,
    GetBankDeposits,
    CalculateFees,
    UploadMedia,
    GetAccountBalance,
    GetJournalEntries,
    GetTransactions,
    CheckoutOrder,
    checkWallet,
    createWallet,
    verifyMe,
    savePasscode,
    verifyPasscode,
    updateUserProfile,
    getAccountByBalanceId,
    lookupAccountByPhone,
    checkTransferBalance,
    getPaymentRequest,
    createPaymentRequest,
    lookupPaymentRequest,
    fulfillPaymentRequest,
    cancelPaymentRequest,
    getWsAccessToken,
    detectFace,
    captureID,
    matchFaceToID,
    startVideoCall,
    endVideoCall,
} from '@/core/server';

const serverOnlyActions = {
    banking: {
        GetBanks,
        CreateBankDeposit,
        GetBankDeposits,
        CalculateFees,
        getAccountByBalanceId,
        lookupAccountByPhone,
    },
    media: {
        UploadMedia,
    },
    transactions: {
        GetAccountBalance,
        GetJournalEntries,
        GetTransactions,
        CheckoutOrder,
        checkTransferBalance,
        getPaymentRequest,
    },
    wallets: {
        checkWallet,
        createWallet,
    },
    auth: {
        verifyMe,
        savePasscode,
        verifyPasscode,
        updateUserProfile,
    },
    paymentRequests: {
        createPaymentRequest,
        lookupPaymentRequest,
        fulfillPaymentRequest,
        cancelPaymentRequest,
    },
    websocket: {
        getWsAccessToken,
    },
    verification: {
        detectFace,
        captureID,
        matchFaceToID,
        startVideoCall,
        endVideoCall,
    },
};

export const serverActions = USE_SERVER_ACTIONS ? serverOnlyActions : null;
