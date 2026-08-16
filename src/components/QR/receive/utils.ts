import type { SelectOption } from '../shared/types';

export function maskString(str: string): string {
    return str
        .split(' ')
        .map((word) => (word.length > 0 ? word[0] + '*'.repeat(word.length - 1) : ''))
        .join(' ');
}

export function buildValidityLabel(
    validityId: string,
    validities: SelectOption[],
): string {
    const base = validities.find((v) => v.id === validityId)?.label ?? validityId;
    if (validityId === 'Always') return base;

    const minutesMap: Record<string, number> = {
        '1m': 1,
        '3m': 3,
        '15m': 15,
        '1h': 60,
        '24h': 1440,
    };
    const minutes = minutesMap[validityId];
    if (!minutes) return base;

    const expiry = new Date(Date.now() + minutes * 60 * 1000);
    const hh = expiry.getHours().toString().padStart(2, '0');
    const mm = expiry.getMinutes().toString().padStart(2, '0');
    const day = expiry.getDate();
    const month = expiry.toLocaleString('en-US', { month: 'long' });
    const year = expiry.getFullYear();

    return `${base} Until ${hh}:${mm} | ${day} ${month} ${year}`;
}

export function getPurposeLabel(
    purposeId: string,
    purposes: SelectOption[],
): string {
    return purposes.find((p) => p.id === purposeId)?.label ?? purposeId;
}
