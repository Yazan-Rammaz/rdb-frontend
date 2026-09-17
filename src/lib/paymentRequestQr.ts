/**
 * The payment-request QR format.
 *
 *     PAYREQ:{requestCode}|{requesterAccountNumber}
 *
 * The code is carried in the clear. It used to be AES-GCM encrypted with the
 * requester's account number as the key, which bought nothing: the key was
 * printed after the `|` in the same QR, because that is how the payer's app
 * rebuilt it. Anyone holding the image held the key.
 *
 * What actually protects a request is server-side and unchanged — `lookup`
 * requires authentication, and `fulfill` is step-up gated. The QR carries a
 * pointer; the backend supplies the amount, purpose and requester name, and
 * decides who may act on them.
 *
 * NestJS never saw the ciphertext either way: it is handed the plain
 * `requestCode` in the lookup path, exactly as it always was.
 */

export const PAYREQ_PREFIX = 'PAYREQ:';

/** Builds the QR string shown on the receive screen. */
export function buildPaymentRequestQr(requestCode: string, accountNumber: string): string {
    return `${PAYREQ_PREFIX}${requestCode}|${accountNumber}`;
}
