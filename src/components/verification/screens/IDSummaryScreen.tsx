'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { useVerification } from '@/context/VerificationContext';
import { useTranslation } from '@/context/I18nContext';
import { useRouter } from 'next/navigation';
import { createKycService } from '@/services/kyc';
import ExitConfirmDialog from '../ExitConfirmDialog';
import liveDetectIdSvg from '@/assets/icons/verification/live-detect-id.svg';
import shieldSvg from '@/assets/icons/verification/shield.svg';
import FlexibleSpace from '@/scaling/FlexibleSpace';

export default function IDSummaryScreen() {
    const { t } = useTranslation();
    const {
        goTo,
        idDocument,
        livenessResult,
        setIdDocument,
        markCompleted,
    } = useVerification();
    const router = useRouter();
    const [showExitDialog, setShowExitDialog] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [submitError, setSubmitError] = React.useState<string | null>(null);

    const kycService = React.useRef(createKycService());
    const isPassport = (idDocument?.idType ?? '').toLowerCase().includes('passport');

    const fields = [
        {
            label: t.verification.fields.idType,
            value: idDocument?.idName || idDocument?.idType || '—',
        },
        { label: t.verification.fields.country, value: idDocument?.country || '—' },
        { label: t.verification.fields.name, value: idDocument?.name || '—' },
        {
            label: isPassport
                ? t.verification.fields.passportNumber
                : t.verification.fields.nationalNumber,
            value: idDocument?.nationalNumber || idDocument?.documentNumber || '—',
        },
        { label: t.verification.fields.birthday, value: idDocument?.birthday || '—' },
    ];

    async function handleSubmit() {
        if (!idDocument) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            // await kycService.current.submitVerification({
            //     frontImageData: idDocument.frontImageData,
            //     backImageData: idDocument.backImageData,
            //     selfieImageData: livenessResult?.faceImageData ?? undefined,
            //     extracted: {
            //         idType: idDocument.idType,
            //         country: idDocument.country,
            //         name: idDocument.name,
            //         nationalNumber: idDocument.nationalNumber,
            //         birthday: idDocument.birthday,
            //     },
            // });
            markCompleted('id-summary');
            goTo('face-detection', 1);
        } catch (err) {
            setSubmitError(
                err instanceof Error
                    ? err.message
                    : t.verification.summary.submitFailed,
            );
        } finally {
            setSubmitting(false);
        }
    }
    // Rejecting the scanned details always returns to the front-ID capture. It
    // never routes to contact-support on a count: the backend decides when a
    // person has run out of attempts.
    const handleFailure = useCallback(() => {
        setIdDocument(null);
        goTo('id-capture-front', -1);
    }, [setIdDocument, goTo]);
    return (
        <div className="flex flex-col h-full bg-white px-xd-20">
            <ExitConfirmDialog
                open={showExitDialog}
                onCancel={() => setShowExitDialog(false)}
                onConfirm={() => router.push('/home')}
            />

            {/* Close button */}
            <div className="flex absolute top-xd-50 end-xd-30 justify-end mb-2">
                <button
                    onClick={() => setShowExitDialog(true)}
                    className="text-red-400 hover:text-red-600"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                            d="M5 5L15 15M15 5L5 15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
            </div>

            <FlexibleSpace size={100} share={0.4} />
            {/* Header */}
            <h1 className="text-xd-30 font-bold text-center text-[#1D1D1D] mb-xd-5">
                {t.verification.title}
            </h1>
            <div className="flex items-center justify-center gap-2 mb-xd-11">
                <Image
                    src={liveDetectIdSvg}
                    alt=""
                    className="object-contain w-xd-20 h-xd-20"
                />
                <span className="text-xd-16 font-medium text-[#1D1D1D]">
                    {t.verification.liveDetection}
                </span>
            </div>

            {/* ID thumbnails */}
            {isPassport ? (
                <div className="flex justify-center mb-4">
                    <div className="text-center">
                        <p className="text-xd-12 text-[#8D8D8D] mb-xd-4">
                            {t.verification.passport}
                        </p>
                        <div className="w-xd-193 h-xd-109 rounded-xd-15 overflow-hidden bg-gray-100 border border-gray-100">
                            {idDocument?.frontImageData ? (
                                <img
                                    src={idDocument.frontImageData}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-200" />
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mb-4">
                    {/* <div className="flex mb-xd-4">
                        <p className="text-xd-12 text-[#8D8D8D] flex-1 text-center">
                            {t.verification.frontSide}
                        </p>
                        <p className="text-xd-12 text-[#8D8D8D] flex-1 text-center">
                            {t.verification.backSide}
                        </p>
                    </div> */}
                    <div className="flex gap-xd-5">
                        <div className=" w-xd-193 h-xd-109 rounded-xd-15 overflow-hidden bg-gray-100 border border-gray-100">
                            {idDocument?.frontImageData ? (
                                <img
                                    src={idDocument.frontImageData}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-200" />
                            )}
                        </div>
                        <div className=" w-xd-193 h-xd-109 rounded-xd-15 overflow-hidden bg-gray-100 border border-gray-100">
                            {idDocument?.backImageData ? (
                                <img
                                    src={idDocument.backImageData}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-200" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Information Detected heading */}
            <div className="flex justify-center items-center gap-2 mb-4">
                <Image
                    src={liveDetectIdSvg}
                    alt=""
                    className="object-contain shrink-0 w-xd-20 h-xd-20"
                />
                <span className="text-xd-16 font-medium text-[#1D1D1D]">
                    {t.verification.informationDetected}
                </span>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-xd-5 mb-4">
                {fields.map(({ label, value }) => (
                    <div
                        key={label}
                        className="h-xd-55 w-xd-390 bg-[#FCFCFC] p-xd-10 rounded-xd-15"
                    >
                        <p className="text-xd-12 text-[#8D8D8D] pb-xd-3">{label}</p>
                        <p className="text-xd-14 text-[#1D1D1D]">{value}</p>
                    </div>
                ))}
            </div>
            <FlexibleSpace size={90} share={0.7} />
            <div className="mt-auto flex items-center flex-col justify-end">
                {/* Privacy badge */}
                <div className="flex items-center flex-col justify-center gap-2 mb-xd-12">
                    <Image
                        src={shieldSvg}
                        alt=""
                        className="w-xd-15 h-xd-15 object-contain"
                    />
                    <span className="text-xd-12 text-[#388CFF]">
                        {t.verification.privacySafe}
                    </span>
                </div>

                {/* Submission error */}
                {submitError && (
                    <p className="text-xd-12 text-[#E53E3E] text-center mb-3 px-2">{submitError}</p>
                )}

                {/* CTAs */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="mb-xd-30 w-xd-390 h-xd-60 py-4 rounded-xd-20 border border-dashed border-[#5D5C5D]/50 text-[#1D1D1D] text-xd-16 font-medium disabled:opacity-50"
                >
                    {t.verification.summary.correctNext}
                </button>
                <button
                    onClick={handleFailure}
                    disabled={submitting}
                    className="w-full text-center text-sm text-[#388CFF] hover:underline mb-2 disabled:opacity-40"
                >
                    {t.verification.summary.incorrectRetry}
                </button>
            </div>
            <FlexibleSpace size={35} share={0} />
        </div>
    );
}
