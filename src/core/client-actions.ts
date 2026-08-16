// ─── Toggle via env: NEXT_PUBLIC_USE_SERVER_ACTIONS ("true" / anything else) ───
// Inlined at BUILD time (NEXT_PUBLIC_*): set it in .env / .env.local / CI env,
// not in wrangler [vars] alone — runtime vars can't affect an already-built bundle.
const USE_SERVER_ACTIONS = process.env.NEXT_PUBLIC_USE_SERVER_ACTIONS === 'true';
// ────────────────────────────────────────────────────────────────────────────────
// When false: passes null → useActions() falls back to `core` (direct client fetch)
// When true:  passes server actions (Next.js 'use server' functions)

import {
    getSupportedAssets,
    getCurrencies,
    GetBanks,
    CreateBankDeposit,
    GetBankDeposits,
    CalculateFees,
    UploadMedia,
    GetWalletBalance,
    GetAccountBalance,
    GetJournalEntries,
    GetFinancialLedger,
    GetTransactions,
    CheckoutOrder,
    checkWallet,
    createWallet,
    sendOtp,
    reSendOtp,
    verifyOtp,
    verifyMe,
    savePasscode,
    verifyPasscode,
    updateUserProfile,
    createQrSession,
    refreshQrToken,
    getAccountByBalanceId,
    validateRecipientAccount,
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
        getSupportedAssets,
        getCurrencies,
        GetBanks,
        CreateBankDeposit,
        GetBankDeposits,
        CalculateFees,
        getAccountByBalanceId,
        validateRecipientAccount,
        lookupAccountByPhone,
    },
    media: {
        UploadMedia,
    },
    transactions: {
        GetWalletBalance,
        GetAccountBalance,
        GetJournalEntries,
        GetFinancialLedger,
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
        sendOtp,
        reSendOtp,
        verifyOtp,
        verifyMe,
        savePasscode,
        verifyPasscode,
        updateUserProfile,
        createQrSession,
        refreshQrToken,
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
