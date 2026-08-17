import type { User } from '../types/profile';

/**
 * Normalise a user payload from `/users/me`.
 *
 * Two quirks the backend can present, both previously handled inside the
 * `app/api/profile/me` route handler:
 *
 *  - the user may arrive bare or wrapped in a `{ data }` envelope;
 *  - the id may be `id` or Mongo's `_id`. Every screen reads `user.id`, so a
 *    payload carrying only `_id` would leave it undefined.
 *
 * This is the entire reason profile had a dedicated server handler rather than
 * going through the generic proxy like every other endpoint. It is client-side
 * shaping, so it belongs here.
 */
export function normalizeUser(payload: unknown): User {
    const body = (payload ?? {}) as Record<string, unknown>;
    const raw = ((body.data ?? body) ?? {}) as Record<string, unknown>;
    return { ...raw, id: raw.id ?? raw._id } as User;
}
