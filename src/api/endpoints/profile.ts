import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type { ProfileResponse, UpdateProfileBody, UploadPhotoResponse } from '../types/profile';

/**
 * The signed-in user's profile.
 *
 * `me` and `update` are the app's first opcode-routed endpoints. Their Next
 * handlers are gated by `notGateway()`, which answers 404 to any request
 * missing the internal `x-pg` header — so the opcode is not a preference here,
 * it is the only way in when NEXT_PUBLIC_OPAQUE_API is on (it is, in `.env`).
 * Calling the descriptive path directly works locally and 404s in production,
 * which is exactly the bug that motivated centralising these calls.
 *
 * `path` is still declared on the opcode calls: `request()` ignores it when
 * `op` is set, but it documents where the call lands and matches the opcode
 * table in `lib/opcodeMap.ts`.
 */
export const profile = {
    me: (o?: RequestOptions): Promise<ApiResult<ProfileResponse>> =>
        request({ path: '/profile/me', op: 'me', options: o }),

    update: (
        body: UpdateProfileBody,
        o?: RequestOptions,
    ): Promise<ApiResult<ProfileResponse>> =>
        request({ path: '/profile/update', method: 'PATCH', op: 'pu', body, options: o }),

    /**
     * Multipart, so it cannot be routed through the opcode gateway — its
     * envelope is JSON. This is the one profile route reachable by its real
     * name; it has no `notGateway()` guard for that reason.
     *
     * The server derives the `type` field from the file's MIME type, so callers
     * pass the File and nothing else.
     */
    uploadPhoto: (file: File, o?: RequestOptions): Promise<ApiResult<UploadPhotoResponse>> => {
        const formData = new FormData();
        formData.append('file', file);
        return request({ path: '/profile/upload-photo', method: 'POST', formData, options: o });
    },
};
