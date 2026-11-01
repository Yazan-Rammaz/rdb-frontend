/**
 * Validation for an identity-document number typed by hand — today the
 * recipient's ID on a transfer to a phone number that has no account.
 *
 * The number may come off a national ID (digits) or a passport (letters and
 * digits), from any country, so the rule is deliberately loose: it rejects what
 * cannot be a document number, not what merely looks unusual. The server is the
 * authority on whether the document exists.
 */

/** Matches `kycConfig.backVerifier.documentNumberMinLength`. */
export const ID_NUMBER_MIN_LENGTH = 6;

/** UI cap. No document number the bank accepts is longer. */
export const ID_NUMBER_MAX_LENGTH = 20;

export type IdNumberIssue = 'empty' | 'too-short' | 'too-long';

/**
 * The one canonical form: ASCII letters and digits, upper-cased. Spaces and
 * hyphens are how a number is printed, not part of it, so `n 012-345` and
 * `N012345` are the same document.
 *
 * Whatever this returns is what gets validated *and* what gets sent.
 */
export function normalizeIdNumber(raw: string): string {
    return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** Why the value is not an acceptable ID number, or `null` if it is. */
export function idNumberIssue(raw: string): IdNumberIssue | null {
    const value = normalizeIdNumber(raw);
    if (!value) return 'empty';
    if (value.length < ID_NUMBER_MIN_LENGTH) return 'too-short';
    if (value.length > ID_NUMBER_MAX_LENGTH) return 'too-long';
    return null;
}
