/**
 * Types for `endpoints/resetPasscode.ts`.
 *
 * The response models live in `services/resetPasscode/resetPasscodeApi.ts`
 * beside the ResetPasscodeApi contract that documents them, and are re-exported
 * here rather than redeclared — same rule as the other type modules.
 */

import type {
    ResetAnswer,
    ResetAnswersResponse,
    ResetCompleteResponse,
    ResetInitResponse,
    ResetQuestionsResponse,
    ResetSendOtpResponse,
    ResetVerifyOtpResponse,
} from '@/services/resetPasscode/resetPasscodeApi';

export type {
    ResetAnswer,
    ResetAnswersResponse,
    ResetCompleteResponse,
    ResetInitResponse,
    ResetQuestionsResponse,
    ResetSendOtpResponse,
    ResetVerifyOtpResponse,
};

/**
 * Which endpoint set to call.
 *
 * `idle` — signed in, locked out of the app; Bearer is the access token.
 * `step` — mid-login, no access token yet; Bearer is the login stepToken.
 */
export type ResetSet = 'idle' | 'step';
