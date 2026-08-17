import { request } from '../client';
import { normalizeUser } from '../helpers/profile';
import type { ApiResult, RequestOptions } from '../types/common';
import type { ProfileResponse, UpdateProfileBody, UploadPhotoResponse } from '../types/profile';

/**
 * The signed-in user's profile.
 *
 * `me` and `update` both hit NestJS `/users/me` by its real name, so the generic
 * `[...path]` proxy carries them — same as `banking.assets()` or `transfers`.
 * They used to go to bespoke handlers under `app/api/profile/`, which existed
 * for two reasons: to translate the invented paths `/profile/me` and
 * `/profile/update` into `/users/me`, and to keep an `rdb_user` cookie in sync.
 * Nothing read that cookie, so once the paths matched, both handlers were doing
 * nothing the proxy does not already do and were deleted.
 *
 * The response shaping they also did now lives in `helpers/profile.ts`.
 *
 * With uploadPhoto pointed at its real endpoint too, app/api/profile is gone
 * entirely — profile owns no server routes.
 */
export const profile = {
    me: async (o?: RequestOptions): Promise<ApiResult<ProfileResponse>> => {
        const res = await request<unknown>({ path: '/users/me', options: o });
        return res.ok ? { ok: true, data: normalizeUser(res.data) } : res;
    },

    /**
     * Normalised like `me`: NestJS answers a PATCH with the updated user, and a
     * caller should not have to care which of the two endpoints it came from.
     */
    update: async (
        body: UpdateProfileBody,
        o?: RequestOptions,
    ): Promise<ApiResult<ProfileResponse>> => {
        const res = await request<unknown>({
            path: '/users/me',
            method: 'PATCH',
            body,
            options: o,
        });
        return res.ok ? { ok: true, data: normalizeUser(res.data) } : res;
    },

    /**
     * Photo upload, straight to NestJS `/media/upload/direct` by its real name.
     *
     * The multipart body survives the generic proxy untouched: it forwards the
     * raw arrayBuffer and copies Content-Type verbatim, so the boundary the
     * browser generated still matches. Content-Type is deliberately not set
     * here — FormData must generate it.
     *
     * `type` is the media kind the endpoint expects ('image', 'video', …),
     * derived from the file's MIME. This was built server-side purely because
     * the request had to pass through a handler anyway; it is a one-line
     * transform of an argument the caller already holds.
     */
    uploadPhoto: (file: File, o?: RequestOptions): Promise<ApiResult<UploadPhotoResponse>> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', file.type?.split('/')[0] || 'image');
        return request({ path: '/media/upload/direct', method: 'POST', formData, options: o });
    },
};
