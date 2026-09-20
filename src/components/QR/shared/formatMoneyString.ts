/**
 * Groups a decimal money STRING for display without ever parsing it.
 *
 * Merchant amounts arrive as decimal strings ("1850.00") precisely so money
 * never round-trips through a float — turning one into a Number to format it
 * hands that back. So the digits here are the server's, untouched; only
 * separators are inserted.
 *
 * Deliberately not locale-driven: Arabic's group and decimal marks belong with
 * Arabic-Indic digits, and pairing them with the Latin digits the server sent
 * reads worse than the plain form every locale already understands.
 */
export function formatMoneyString(value: string | number | null | undefined): string {
    const raw = typeof value === 'number' ? String(value) : value?.trim();
    if (!raw) return '';

    const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(raw);
    // Not a plain decimal — show exactly what was sent rather than mangle it.
    if (!match) return raw;

    const [, sign, whole, fraction] = match;
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${sign}${grouped}${fraction ? `.${fraction}` : ''}`;
}
