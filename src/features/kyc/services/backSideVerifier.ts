import type { IDDocument } from '@/features/kyc/types/verification';

// Minimal two-row Levenshtein distance.
function levenshtein(a: string, b: string): number {
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const curr = [i];
        for (let j = 1; j <= b.length; j++) {
            curr[j] =
                a[i - 1] === b[j - 1]
                    ? prev[j - 1]
                    : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
        }
        prev = curr;
    }
    return prev[b.length];
}

function digitsOnly(s: string): string {
    return s.replace(/\D/g, '');
}

/** Normalize a name for loose comparison: uppercase, strip diacritics, keep letters only. */
function normalizeName(s: string): string {
    return s
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z]/g, '');
}

/**
 * Which rule decided, and how. Never the compared values: those are a national
 * number, a document number and a surname, and they must not reach the console.
 * Dev builds only — `NODE_ENV` is inlined at build time, so this is dead code
 * in production.
 */
function logDecision(rule: string, decision: 'ACCEPT' | 'REJECT'): void {
    if (process.env.NODE_ENV === 'production') return;
    // eslint-disable-next-line no-console -- dev-only, rule + verdict, no field values
    console.log(`[backSideVerifier] decision: ${rule} → ${decision}`);
}

/**
 * Verify that the back side belongs to the same physical document as the front.
 *
 * Reads structured fields only. The KYC Worker parses the back-side MRZ itself
 * and fills `nationalNumber`, `documentNumber` and `lastName` from it when the
 * card carries no structured value, so there is no raw OCR text to parse here.
 *
 * Strategy (in priority order):
 *  1. National number comparison (11-digit, fuzzy ≤1 char) — highest confidence
 *  2. Document number comparison — high confidence
 *  3. Last name comparison — medium confidence
 *  4. If nothing is comparable → verified=true (can't block what we can't check)
 */
export function verifyBackMatchesFront(
    frontData: Partial<IDDocument>,
    backExtracted: Partial<IDDocument>,
): { verified: boolean; reason?: string } {
    const backNatNum = digitsOnly(backExtracted.nationalNumber ?? '');
    const frontNatNum = digitsOnly(frontData.nationalNumber ?? '');

    const backDocNum = digitsOnly(
        (backExtracted.documentNumber ?? '').replace(/[^A-Z0-9]/gi, ''),
    );
    const frontDocNum = digitsOnly(
        (frontData.documentNumber ?? '').replace(/[^A-Z0-9]/gi, ''),
    );

    const backLastName = normalizeName(backExtracted.lastName ?? '');
    const frontLastName = normalizeName(frontData.lastName ?? '');

    if (backNatNum.length >= 8 && frontNatNum.length >= 8) {
        const match =
            backNatNum === frontNatNum || levenshtein(backNatNum, frontNatNum) <= 1;
        logDecision('nationalNumber', match ? 'ACCEPT' : 'REJECT');
        return match
            ? { verified: true }
            : {
                  verified: false,
                  reason: 'The ID number on the back does not match the front. Please use the back of the same document.',
              };
    }

    if (backDocNum.length >= 6 && frontDocNum.length >= 6) {
        const match =
            backDocNum === frontDocNum || levenshtein(backDocNum, frontDocNum) <= 1;
        logDecision('documentNumber', match ? 'ACCEPT' : 'REJECT');
        return match
            ? { verified: true }
            : {
                  verified: false,
                  reason: 'The document number on the back does not match the front. Please use the back of the same document.',
              };
    }

    if (backLastName.length >= 2 && frontLastName.length >= 2) {
        const match =
            backLastName === frontLastName || levenshtein(backLastName, frontLastName) <= 1;
        logDecision('lastName', match ? 'ACCEPT' : 'REJECT');
        return match
            ? { verified: true }
            : {
                  verified: false,
                  reason: 'The name on the back does not match the front. Please use the back of the same document.',
              };
    }

    logDecision('nothing to compare (unverifiable)', 'ACCEPT');
    return { verified: true };
}
