'use server';

import * as coreLogic from '../core/index';

export const GetBanks = async (args: any) => await coreLogic.GetBanks(args);
export const CreateBankDeposit = async (args: any) => await coreLogic.CreateBankDeposit(args);
export const GetBankDeposits = async (args: any) => await coreLogic.GetBankDeposits(args);
export const CalculateFees = async (args: any) => await coreLogic.CalculateFees(args);
export const UploadMedia = async (args: any) => await coreLogic.UploadMedia(args);
export const GetAccountBalance = async (args: any) => await coreLogic.GetAccountBalance(args);
export const getAccountByBalanceId = async (args: any) =>
    await coreLogic.getAccountByBalanceId(args);
export const lookupAccountByPhone = async (args: any) => await coreLogic.lookupAccountByPhone(args);
export const GetJournalEntries = async (args: any) => await coreLogic.GetJournalEntries(args);
export const GetTransactions = async (args: any) => await coreLogic.GetTransactions(args);
export const CheckoutOrder = async (args: any) => await coreLogic.CheckoutOrder(args);
export const checkTransferBalance = async (args: any) => await coreLogic.checkTransferBalance(args);
export const getPaymentRequest = async (args: any) => await coreLogic.getPaymentRequest(args);
export const createPaymentRequest = async (args: any) => await coreLogic.createPaymentRequest(args);
export const lookupPaymentRequest = async (args: any) => await coreLogic.lookupPaymentRequest(args);
export const fulfillPaymentRequest = async (args: any) =>
    await coreLogic.fulfillPaymentRequest(args);
export const cancelPaymentRequest = async (args: any) => await coreLogic.cancelPaymentRequest(args);
export const getWsAccessToken = async (cookieName?: string) =>
    await coreLogic.getWsAccessToken(cookieName);
export const checkWallet = async (args: any) => await coreLogic.checkWallet(args);
export const createWallet = async (args: any) => await coreLogic.createWallet(args);
export const sendOtp = async (args: any) => await coreLogic.sendOtp(args);
export const reSendOtp = async (args: any) => await coreLogic.reSendOtp(args);
export const verifyOtp = async (args: any) => await coreLogic.verifyOtp(args);
export const verifyMe = async (args: any) => await coreLogic.verifyMe(args);
export const createQrSession = async (args: any) => await coreLogic.createQrSession(args);
export const refreshQrToken = async (args: any) => await coreLogic.refreshQrToken(args);
export const savePasscode = async (args: any) => await coreLogic.savePasscode(args);
export const verifyPasscode = async (args: any) => await coreLogic.verifyPasscode(args);
export const updateUserProfile = async (args: any) => await coreLogic.updateUserProfile(args);
export const detectFace = async (args: any) => await coreLogic.detectFace(args);
export const captureID = async (args: any) => await coreLogic.captureID(args);
export const matchFaceToID = async (args: any) => await coreLogic.matchFaceToID(args);
export const startVideoCall = async (args: any) => await coreLogic.startVideoCall(args);
export const endVideoCall = async (args: any) => await coreLogic.endVideoCall(args);

export async function getServerActions() {
    return {
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
    } as const;
}
