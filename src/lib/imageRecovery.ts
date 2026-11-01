/**
 * Reloads the images that failed while the app was offline.
 *
 * Every icon is its own request, sent when its `<img>` mounts. A screen opened
 * without a connection gets broken images, and they stay broken after the
 * connection returns: the browser does not retry a failed image, and React
 * leaves the element alone because its `src` prop never changed.
 *
 * Failures are tracked from the `error` event rather than by scanning for
 * `naturalWidth === 0`, which is also what a healthy SVG without intrinsic
 * dimensions reports.
 */

const broken = new Set<HTMLImageElement>();

function handleError(event: Event): void {
    if (event.target instanceof HTMLImageElement) broken.add(event.target);
}

function handleLoad(event: Event): void {
    if (event.target instanceof HTMLImageElement) broken.delete(event.target);
}

/** Start tracking failed images; returns the function that stops it. */
export function trackBrokenImages(): () => void {
    // `error` and `load` do not bubble, so they are caught in the capture phase.
    document.addEventListener('error', handleError, true);
    document.addEventListener('load', handleLoad, true);
    return () => {
        document.removeEventListener('error', handleError, true);
        document.removeEventListener('load', handleLoad, true);
        broken.clear();
    };
}

/**
 * Ask the browser to fetch each failed image again. One that fails again fires
 * `error` and is tracked for the next reconnect.
 */
export function retryBrokenImages(): void {
    const images = Array.from(broken);
    broken.clear();
    images.forEach((img) => {
        if (!img.isConnected) return;
        const src = img.getAttribute('src');
        // data: and blob: never touched the network, so a retry cannot fix them.
        if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
        // Setting `src`, even to the same value, makes the browser load it again.
        img.setAttribute('src', src);
    });
}
