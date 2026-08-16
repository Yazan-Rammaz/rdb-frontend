export interface ReceiptData {
    referenceCode: string;
    createdAt: string;
    status: string;
    senderAccountNumber: string;
    senderMaskedName: string;
    senderFirstName?: string;
    recipientAccountNumber: string;
    recipientMaskedName: string;
    recipientFirstName?: string;
    amount: string;
    currency: string;
    purposeLabel: string;
    inputMethod?: 'MANUAL' | 'QR';
}
