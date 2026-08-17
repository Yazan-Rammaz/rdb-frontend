/**
 * Request bodies and responses for `endpoints/profile.ts`.
 *
 * All three call NestJS by its real route names — `/users/me` for the read and
 * the write, `/media/upload/direct` for the photo — so the generic `[...path]`
 * proxy carries them and profile owns no server routes of its own.
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
