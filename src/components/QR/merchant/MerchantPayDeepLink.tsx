'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useScanner } from '@/context/ScannerContext';
import { useAuth } from '@/context/AuthContext';
import { usePasskey } from '@/context/PasskeyContext';
import {
    MERCHANT_PAY_PARAM,
    extractMerchantCode,
    stashMerchantCode,
    takeStashedMerchantCode,
} from '@/lib/merchantPayment';

/**
 * Opens the merchant order a customer arrived for.
 *
 * Two ways in, and both end here:
 *   signed in    →  /home?mrcpay={code} renders, the code is read off the URL
 *   signed out   →  middleware bounces to /auth, the code is stashed on the way
 *                   past, and replayed once /home finally renders
 *
 * Split deliberately into rescue and replay, because they need opposite
 * timing. Rescuing has to happen the instant the URL is seen, before any
 * redirect can drop it. Replaying has to wait for a session that can actually
 * pay — looking the order up while the app is still locked answers "Merchant
 * payment request not found", which reads to the customer as a broken link
 * rather than a screen that arrived too early.
 */
export default function MerchantPayDeepLink() {
    const pathname = usePathname();
    const { userData } = useAuth();
    const { lockStatus } = usePasskey();
    const { openMerchantPayment } = useScanner();

    // Rescue: take the code out of the URL wherever it lands, including on a
    // protected page that is not /home, and clear the address bar so a later
    // refresh cannot replay it.
    useEffect(() => {
        const fromUrl = extractMerchantCode(window.location.search);
        if (!fromUrl) return;
        stashMerchantCodeAndCleanUrl(fromUrl);
    }, [pathname]);

    // Replay: once per mount. Reopening the sheet on every render would trap
    // the customer in an order they already dismissed.
    const handledRef = useRef(false);

    useEffect(() => {
        if (handledRef.current) return;

        // Home only — the sheet belongs over the home screen, not over settings
        // or a transaction the user had opened.
        if (pathname !== '/home') return;

        // A session that can pay: signed in AND past the passcode. PasskeyGate
        // renders children in more than one branch, so being mounted is not on
        // its own proof that the lock is cleared.
        if (!userData || lockStatus !== 'UNLOCKED') return;

        const code = takeStashedMerchantCode();
        if (!code) return;

        handledRef.current = true;
        openMerchantPayment(code);
    }, [pathname, userData, lockStatus, openMerchantPayment]);

    return null;
}

function stashMerchantCodeAndCleanUrl(code: string): void {
    // Synchronous, and before the URL is touched: a redirect can fire in the
    // same tick, and an awaited write would lose the code it was rescuing.
    stashMerchantCode(code);

    try {
        const url = new URL(window.location.href);
        url.searchParams.delete(MERCHANT_PAY_PARAM);
        url.searchParams.delete(`/${MERCHANT_PAY_PARAM}`);
        // replaceState rather than a router navigation: this must not add a
        // history entry, and must not remount the tree under an open sheet.
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch {
        // A URL we cannot parse is one we cannot clean — the code is already
        // stashed, and the once-per-mount guard stops it reopening.
    }
}
