/** All possible fields extracted from a scanned QR string */
export interface ParsedQR {
    /** Raw scanned string */
    raw: string;
    /** Receiver account name (required) */
    accountName: string;
    /** Receiver account number (required) */
    accountNumber: string;
    /** Currency symbol e.g. "USD" (required) */
    currency: string;
    /** Amount — if present the sender cannot change it */
    amount?: string;
    /** Reference / invoice ID */
    reference?: string;
    /** Purpose ID (e.g. "work", "service") */
    purpose?: string;
    /** Validity ID (e.g. "3m", "1h", "Always") */
    validity?: string;
    /** Note from the receiver */
    note?: string;
    /** Payment-request code, carried in the clear — present on PAYREQ: QR */
    requestCode?: string;
    /** Merchant order code — present when the QR is a shop's, paid via /merchant/payments */
    merchantCode?: string;
    /** Requester account number embedded in the PAYREQ: payload */
    requesterAccount?: string;
    /** Request type e.g. "Payement Request" */
    type?: string;
}

/** Account info returned by getAccountByBalanceId API */
export interface AccountData {
    accountName: string;
    accountNumber: string;
    username: string;
    profilePicture: string;
    currency: string;
    initials: string;
}

/** Validation result for a scanned QR */
export type QRValidationResult =
    | { valid: true; data: ParsedQR }
    | {
          valid: false;
          error:
              | 'invalid_format'
              | 'missing_account_info'
              | 'missing_account_number'
              | 'missing_account_name'
              | 'missing_currency'
              | 'missing_both';
      };
