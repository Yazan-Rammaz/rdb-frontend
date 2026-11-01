/**
 * The client-ID QR format.
 *
 *     ID {displayId}
 *
 * Shown on the profile screen so a client can identify themselves. It is NOT
 * a payment QR: it carries no wallet number, no name and no currency, so the
 * scanner can never send money to it. It does look like one, though, and
 * clients photograph it and scan it expecting to pay — so the scanner
 * recognises it and says what it is instead of a generic "invalid QR".
 */

export const CLIENT_ID_QR_PREFIX = 'ID ';

/** Builds the QR string shown on the profile screens. */
export function buildClientIdQr(displayId: string): string {
    return `${CLIENT_ID_QR_PREFIX}${displayId}`;
}

/**
 * True when a scanned value is a client-ID QR.
 *
 * Matches the `ID {displayId}` payload, and also a bare number: older profile
 * thumbnails encoded the ID without the prefix, and a lone number is never a
 * payment QR, so calling it a client ID is the most useful reading of it.
 */
export function isClientIdQr(raw: string): boolean {
    const value = raw.trim();
    return /^ID\s+[A-Za-z0-9-]+$/.test(value) || /^\d[\d-]*$/.test(value);
}
