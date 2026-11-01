/**
 * One status table for the receipt, read by both the on-screen receipt
 * (SuccessReceipt) and the captured image (DownloadView), so the two can never
 * disagree about what a status looks like.
 *
 * Colours are the ones the transaction details strip already used — no new
 * palette. Icons are chosen in the components (React nodes don't belong here).
 */
export type ReceiptTone = 'success' | 'pending' | 'expired' | 'failed';

export const RECEIPT_TONES: Record<ReceiptTone, { bg: string; accent: string }> = {
    success: { bg: '#F4FFFA', accent: '#2DB56D' },
    pending: { bg: '#FFFBF2', accent: '#F5A623' },
    expired: { bg: '#F7F7F7', accent: '#8D8D8D' },
    failed: { bg: '#FFF5F5', accent: '#FF4D4D' },
};

/** FAILED and anything unrecognised read as failed: never show green by default. */
export function getReceiptTone(status: string): ReceiptTone {
    switch (status.toUpperCase()) {
        case 'COMPLETED':
            return 'success';
        case 'PENDING':
            return 'pending';
        case 'EXPIRED':
            return 'expired';
        default:
            return 'failed';
    }
}
