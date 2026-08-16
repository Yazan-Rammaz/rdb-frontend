'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore, type PurposeOption } from '@/context/StoreContext';
import { api } from '@/api';

export type { PurposeOption };

/**
 * Transfer purposes, cached in the store.
 *
 * ─── Reference migration to `@/api` ─────────────────────────────────────────
 * This hook previously called `actions.transactions.getTransferPurposes()` and
 * then had to work out what came back:
 *
 *     const result = await actions.transactions.getTransferPurposes();
 *     const mapped = mapPurposes(result);              // result: any
 *     if (mapped.length > 0) setPurposes(mapped);
 *     else if (result && 'error' in result) setError(result.error);
 *
 * Three problems, all of which the typed layer removes:
 *
 *   1. `result` was `any`, so `mapPurposes` guarded with `Array.isArray` at
 *      runtime. A shape change in the backend would surface as an empty list,
 *      not a compile error.
 *   2. Failure arrived two different ways — an `error` property on the result,
 *      or a thrown exception — so both a branch and a try/catch were needed, and
 *      "succeeded but returned nothing" was indistinguishable from "failed".
 *   3. It went through Server Actions, which do not refresh an expired token.
 *      The same call from an `apiFetch` screen would silently recover; here the
 *      user just saw an error.
 *
 * The `api` layer never throws and returns a discriminated union, so there is
 * one branch, no try/catch, and `res.data` is typed.
 */
export function useTransferPurposes() {
    const { purposes: storePurposes, setPurposes, isLoadingPurposes } = useStore();
    const [error, setError] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    // Abort an in-flight request if the component unmounts, so a late response
    // cannot setState on something that is gone.
    const abortRef = useRef<AbortController | null>(null);

    const fetchPurposes = useCallback(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsFetching(true);
        setError(null);

        const res = await api.transfers.purposes({ signal: controller.signal });

        if (controller.signal.aborted) return;

        if (!res.ok) {
            // A cancelled request is not a failure the user should see.
            if (res.error.status !== 0) setError(res.error.message);
            setIsFetching(false);
            return;
        }

        setPurposes(res.data.map((p): PurposeOption => ({ id: p.id, label: p.name })));
        setIsFetching(false);
    }, [setPurposes]);

    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    // Fall back to fetching when the store has nothing and no preload is running.
    useEffect(() => {
        if (storePurposes.length === 0 && !isLoadingPurposes && !isFetching) {
            void fetchPurposes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storePurposes.length, isLoadingPurposes]);

    return {
        purposes: storePurposes,
        isLoading: isLoadingPurposes || (isFetching && storePurposes.length === 0),
        error: storePurposes.length > 0 ? null : error,
        retry: fetchPurposes,
    };
}
