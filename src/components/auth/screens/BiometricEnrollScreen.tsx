'use client';

interface BiometricEnrollScreenProps {
    onEnroll: () => Promise<void>;
    onSkip: () => void;
    isLoading: boolean;
    error: string | null;
}

export default function BiometricEnrollScreen({
    onEnroll,
    onSkip,
    isLoading,
    error,
}: BiometricEnrollScreenProps) {
    return (
        <div className="w-full h-full items-center flex flex-col bg-[#F4FFF4]">
            {/* Top half — heading */}
            <div className="h-1/2 w-xd-430 flex items-end px-xd-40">
                <div className="mb-xd-50">
                    <h2 className="text-xd-30 font-bold text-[#1D1D1D]">Set up Biometrics</h2>
                    <p className="text-xd-16 font-medium text-[#1D1D1D] mt-xd-5">
                        Use Face ID, fingerprint, or Windows Hello for faster, more secure access.
                    </p>
                </div>
            </div>

            {/* Bottom half — actions */}
            <div className="h-1/2 flex items-start px-xd-30">
                <div className=" w-full flex flex-col items-center gap-xd-20">
                    {isLoading ? (
                        /* Loading state */
                        <div className="flex flex-col items-center gap-xd-20">
                            <div className="w-12 h-12 rounded-full border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
                            <p className="text-xd-14 font-medium text-[#8E8E8E]">
                                Waiting for biometric…
                            </p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <p className="text-xd-14 font-medium text-red-500 text-center">
                                    {error}
                                </p>
                            )}

                            {/* Primary action */}
                            <button
                                onClick={onEnroll}
                                className="w-xd-390 h-xd-60 p-xd-20 rounded-xd-20 cursor-pointer text-[#1D1D1D] bg-white font-bold text-xd-16"
                            >
                                {error ? 'Try Again' : 'Set Up Face ID / Biometrics'}
                            </button>

                            {/* Secondary link */}
                            <button
                                onClick={onSkip}
                                className="text-xd-14 font-medium text-[#8E8E8E] underline"
                            >
                                Skip for now
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
