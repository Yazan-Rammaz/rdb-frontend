/**
 * Converts an HTMLCanvasElement to a Blob (PNG).
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob from canvas'));
        }, 'image/png');
    });
}

/**
 * Share a QR code image using the native share sheet (Web Share API Level 2).
 * Falls back to clipboard copy + toast on unsupported platforms.
 *
 * @param canvas  The rendered html2canvas result
 * @param title   Share sheet title (e.g. "Deposit QR — 100-708")
 * @param text    Optional descriptive text shown in the share sheet
 * @returns       'shared' | 'copied' | 'dismissed'
 */
export async function shareQRImage(
    canvas: HTMLCanvasElement,
    title: string,
    text?: string,
): Promise<'shared' | 'copied' | 'dismissed'> {
    const blob = await canvasToBlob(canvas);
    const file = new File([blob], 'deposit-qr.png', { type: 'image/png' });

    // Web Share API Level 2 — works on iOS Safari, Android Chrome, macOS Safari
    if (navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({
                title,
                text,
                files: [file],
            });
            return 'shared';
        } catch (err: any) {
            // User dismissed the share sheet
            if (err?.name === 'AbortError') return 'dismissed';
            // Fall through to clipboard fallback
        }
    }

    // Fallback: copy image to clipboard (works on desktop Chrome/Edge/Firefox)
    try {
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
        ]);
        return 'copied';
    } catch {
        // Last resort: copy the QR text value
        return 'dismissed';
    }
}
