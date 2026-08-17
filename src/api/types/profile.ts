/**
 * Request bodies and responses for `endpoints/profile.ts`.
 *
 * These three do not hit NestJS paths directly. They go to Next route handlers
 * under `app/api/profile/`, which proxy to NestJS *and* keep the `rdb_user`
 * cookie in sync — re-reading `/users/me` after a PATCH and preserving the
 * locally-tracked `kycRequest` field. That bookkeeping is why profile has its
 * own handlers instead of falling through the generic `[...path]` proxy.
 */

// Re-exported, not redeclared — core/types/auth.ts already defines User and the
// profile screens import it from there.
import type { User } from '@/core/types/auth';
export type { User };

// ─── Requests ────────────────────────────────────────────────────────────────

/**
 * Every field is optional: callers PATCH only what changed (a name edit sends
 * two fields, removing a photo sends one empty string).
 *
 * `profilePictureURL: ''` is the documented way to clear a photo — not
 * `undefined`, which would be omitted from the JSON and leave it untouched.
 */
export interface UpdateProfileBody {
    firstName?: string;
    lastName?: string;
    profilePictureURL?: string;
    language?: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export type ProfileResponse = User;

/** `POST /api/profile/upload-photo` → the stored file's public URL. */
export interface UploadPhotoResponse {
    url: string;
}
