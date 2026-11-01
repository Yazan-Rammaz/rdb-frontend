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
    /** Picks the "received" headline and amount label. Defaults to OUT. */
    direction?: 'IN' | 'OUT';
    /** Overrides the default "Transfer | Send" type value. */
    typeLabel?: string;
    /** Extra grid cells (fee, tax, note) shown only when the caller has them. */
    extraRows?: { label: string; value: string }[];
}
