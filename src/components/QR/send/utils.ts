import type { ParsedQR, QRValidationResult } from './types';
import { PAYREQ_PREFIX } from '@/lib/paymentRequestQr';
import { extractMerchantCode } from '@/lib/merchantPayment';

/**
 * Parse a scanned QR string into structured data.
 *
 * Supports four formats:
 *  1. Merchant order:  MERPAY:mp.{code}, mp.{code}, or a URL with ?mrcpay=mp.{code}
 *  2. Payment request: PAYREQ:{requestCode}|{accountNumber}
 *  3. Full URL:        https://example.com?ana=xxx&anu=xxx&cu=USD
 *  4. Query-only:      ana=xxx&anu=xxx&cu=USD
 */
function extractParams(raw: string): URLSearchParams | null {
    // Try as a full URL first
    try {
        const url = new URL(raw);
        return url.searchParams;
    } catch {
        // Not a URL — treat the entire string as a query string
    }

    // Try as bare query params (with or without leading "?")
    const normalized = raw.startsWith('?') ? raw : `?${raw}`;
    try {
        return new URLSearchParams(normalized.slice(1));
    } catch {
        return null;
    }
}

function nonEmpty(value: string | null | undefined): string | undefined {
    if (!value || value.trim() === '' || value === 'null') return undefined;
    return value.trim();
}

/**
 * Validate and parse a scanned QR value.
 * Returns a discriminated union so callers get type-safe access.
 */
export function validateQR(raw: string): QRValidationResult {
    if (!raw) {
        return { valid: false, error: 'invalid_format' };
    }

    // --- Merchant order: MERPAY:mp.{code}, mp.{code}, or a ?mrcpay= URL ---
    // Checked before the account-QR branch: a merchant link is a URL with query
    // params, so the address parser below would otherwise claim it and reject it
    // for missing ana/anu/cu.
    const merchantCode = extractMerchantCode(raw);
    if (merchantCode) {
        const parsed: ParsedQR = {
            raw,
            accountName: '',
            accountNumber: '',
            currency: '',
            merchantCode,
        };
        return { valid: true, data: parsed };
    }

    // --- Payment Request QR: PAYREQ:{requestCode}|{accountNumber} ---
    if (raw.startsWith(PAYREQ_PREFIX)) {
        const payload = raw.slice(PAYREQ_PREFIX.length);
        // Split on the LAST pipe: the account number is the tail, and this
        // survives a request code that ever contains one.
        const pipeIdx = payload.lastIndexOf('|');

        if (pipeIdx < 0) {
            // Malformed PAYREQ payload — no pipe separator
            return { valid: false, error: 'invalid_format' };
        }

        const requestCode = payload.slice(0, pipeIdx);
        const requesterAccount = payload.slice(pipeIdx + 1);

        if (!requestCode || !requesterAccount) {
            return { valid: false, error: 'invalid_format' };
        }

        const parsed: ParsedQR = {
            raw,
            accountName: '',
            accountNumber: '',
            currency: '',
            requestCode,
            requesterAccount,
        };
        return { valid: true, data: parsed };
    }

    // --- Regular account QR: query params ---
    const params = extractParams(raw);
    if (!params) {
        return { valid: false, error: 'invalid_format' };
    }

    const accountName = nonEmpty(params.get('ana'));
    const accountNumber = nonEmpty(params.get('anu'));
    const currency = nonEmpty(params.get('cu'));

    if (!accountName && !accountNumber && !currency) {
        return { valid: false, error: 'missing_both' };
    }
    if (!accountName && !accountNumber) {
        return { valid: false, error: 'missing_account_info' };
    }
    if (!accountName) {
        return { valid: false, error: 'missing_account_name' };
    }
    if (!accountNumber) {
        return { valid: false, error: 'missing_account_number' };
    }
    if (!currency) {
        return { valid: false, error: 'missing_currency' };
    }

    const parsed: ParsedQR = {
        raw,
        accountName,
        accountNumber,
        currency,
        amount: nonEmpty(params.get('am')),
        reference: nonEmpty(params.get('ri')),
        purpose: nonEmpty(params.get('pi')),
        validity: nonEmpty(params.get('vi')),
        note: nonEmpty(params.get('no')),
    };

    return { valid: true, data: parsed };
}
