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
     * Keeps its own route handler, and needs to: it is a genuine remap to a
     * different NestJS endpoint (`/media/upload/direct`) plus a rebuilt
     * multipart body with a `type` field derived from the file's MIME. That is
     * work the path-stripping proxy cannot do.
     *
     * Multipart also cannot ride the opcode gateway, whose envelope is JSON.
     */
    uploadPhoto: (file: File, o?: RequestOptions): Promise<ApiResult<UploadPhotoResponse>> => {
        const formData = new FormData();
        formData.append('file', file);
        return request({ path: '/profile/upload-photo', method: 'POST', formData, options: o });
    },
};
