'use client';

import { useAuth } from '@/context/AuthContext';
import { getPersistedLanguage, persistLanguage } from '@/i18n';

/**
 * Full logout: revoke the session, wipe local state, reload into /auth.
 *
 * Shared by the profile "Logout" item and the lock screen's "switch account"
 * link so both leave the device in exactly the same state.
 *
 * The UI language survives: it is a device preference, not account data, and
 * the next person to sign in on this device should see the language last used.
 */
export function useLogout(): () => Promise<void> {
    const { removeAuthCookies } = useAuth();

    return async () => {
        await removeAuthCookies();
        const language = getPersistedLanguage();
        localStorage.clear();
        localStorage.removeItem('rdb_passcode');
        localStorage.removeItem('rdb_passkey_locked');
        if (language) persistLanguage(language);
        window.location.reload();
    };
}
