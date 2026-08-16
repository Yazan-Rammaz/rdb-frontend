/**
 * KYC Status Enums
 */
export enum KycRequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    EXPIRED = 'expired',
}

export enum KycVerificationStatus {
    NOT_SUBMITTED = 'not_submitted',
    PENDING = 'pending',
    VERIFIED = 'verified',
    REJECTED = 'rejected',
    EXPIRED = 'expired',
}

export interface KycStatusResponse {
    status: KycVerificationStatus | string;
    statusLabel: string;
    expiresAt: string | null;
    rejectionReason: string | null;
}

/**
 * Auth: User
 */
export interface User {
    id: string;
    firstName: string;
    displayId: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    profilePictureURL: string;
    userType: string;
    ratingStats: any;
    browserInfo: any;
    locationInfo: any;
    guestToken: any;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    isBlocked: boolean;
    blockReason: string;
    blockedAt: string;
    isTwoFactorEnabled: boolean;
    language: string;
    createdAt: string;
    updatedAt: string;
    address: {
        id: string;
        userId: string;
        countryId: {
            id: string;
            name: string;
            nameAr: string;
            code: string;
        };
        regionId: {
            id: string;
            name: string;
            nameAr: string;
        };
        cityId: {
            id: string;
            name: string;
            nameAr: string;
        };
        address1: string;
        address2: string;
        zipCode: string;
        createdAt: string;
        updatedAt: string;
    };
    kycVerification: {
        status: string;
        expiresAt: string;
    };
    hasPasscode?: boolean;
    kycRequest?: {
        id: string;
        status: string;
        fullName?: string;
        documentType?: string;
        nationalIdNumber?: string;
        nationalityCountry?: { name: string; flagImageUrl?: string };
        documentFrontImageUrl?: string;
        rejectionReason?: string | null;
    } | null;
}

export interface UserData extends User {
    user: User;
    accessToken: {
        token: string;
        expiresAt: string;
    };
    refreshToken: {
        token: string;
        expiresAt: string;
    };
}
/**
 * Auth: Send OTP
 */
export interface SendOtpRequest {
    phoneNumber: string;
    channel: 'sms' | 'whatsapp';
    email?: string;
}

export interface SendOtpResponse {
    message: string;
    msegatId?: number | string;
    sessionInfo?: string;
    provider?: string;
}

/**
 * Auth: Verify OTP
 */
export interface VerifyOtpRequest {
    phoneNumber: string;
    otpCode: string;
    msegatId?: number | string;
    sessionInfo?: string;
    type: 'signIn' | 'signUp';
}

export interface VerifyOtpResponse extends UserData {
    status?: 'authenticated' | 'existing_user' | 'new_user';
}
