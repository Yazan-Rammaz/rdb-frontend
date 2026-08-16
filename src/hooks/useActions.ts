import { useRDBContext } from '@/context/RDBContext';
import { core } from '@/core';
import { RDBActions } from '@/core/types/actions';

/**
 * Universal Action Resolver
 *
 * Automatically selects the best execution strategy:
 * 1. Server Actions: If provided via Context (Standalone Mode)
 * 2. Core Logic: Fallback for Client-side/Library Mode
 *
 * This ensures "use server" files are NEVER imported in the library bundle.
 */
export function useActions(): RDBActions {
    const { actions } = useRDBContext();

    // Runtime decision:
    // - In Standalone App: actions is populated with serverActions
    // - In Library Mode: actions is null (unless host provides them), so we fallback to core
    return actions || core;
}
