'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore, mapPurposes, type PurposeOption } from '@/context/StoreContext';
import { useActions } from '@/hooks/useActions';

export type { PurposeOption };

export function useTransferPurposes() {
    const { purposes: storePurposes, setPurposes, isLoadingPurposes } = useStore();
    const actions = useActions();
    const [error, setError] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    const fetchPurposes = useCallback(async () => {
        setIsFetching(true);
        setError(null);
        try {
            const result = await actions.transactions.getTransferPurposes();
            const mapped = mapPurposes(result);
            if (mapped.length > 0) {
                setPurposes(mapped);
            } else if (result && 'error' in result) {
                setError(result.error);
            }
        } catch {
            setError('Failed to load purposes. Please try again.');
        } finally {
            setIsFetching(false);
        }
    }, [actions, setPurposes]);

    // If store has no purposes and preload isn't loading, fetch as fallback
    useEffect(() => {
        if (storePurposes.length === 0 && !isLoadingPurposes && !isFetching) {
            fetchPurposes();
        }
    }, [storePurposes.length, isLoadingPurposes]);

    return {
        purposes: storePurposes,
        isLoading: isLoadingPurposes || (isFetching && storePurposes.length === 0),
        error: storePurposes.length > 0 ? null : error,
        retry: fetchPurposes,
    };
}
