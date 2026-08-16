// Formats a login event timestamp: relative for recent events (< 48h),
// absolute date+time for older ones. See specs/login-history (Clarify Q3).

export function formatLoginTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return 'Unknown';

    const diffMs = Date.now() - then;
    const mins = Math.floor(diffMs / 60_000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    if (days < 2) return 'Yesterday';

    // Older than ~48h → absolute date + time.
    return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
