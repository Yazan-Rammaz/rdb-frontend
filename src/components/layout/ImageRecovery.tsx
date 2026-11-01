'use client';

import { useEffect } from 'react';
import { useOnReconnect } from '@/hooks/useIsOnline';
import { retryBrokenImages, trackBrokenImages } from '@/lib/imageRecovery';

/**
 * Mounted once in the root layout: images that failed to load while offline
 * are loaded again when the connection returns. Renders nothing.
 */
export default function ImageRecovery() {
    useEffect(() => trackBrokenImages(), []);
    useOnReconnect(retryBrokenImages);
    return null;
}
