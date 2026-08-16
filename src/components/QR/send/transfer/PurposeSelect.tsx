'use client';

import React, { useEffect, useRef } from 'react';
import Select from '@/components/ui/Select';
import { useTransferPurposes } from '@/hooks/useTransferPurposes';
import { useTranslation } from '@/context/I18nContext';
import Image from 'next/image';
import NoteIcon from '@/assets/icons/home/transfer/note.svg';

interface PurposeSelectProps {
    selectedId: string | null;
    onSelect: (id: string, name: string) => void;
    note: string;
    onChangeNote: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PurposeSelect: React.FC<PurposeSelectProps> = ({
    selectedId,
    onSelect,
    note,
    onChangeNote,
}) => {
    const { tr } = useTranslation();
    const { purposes, isLoading, error, retry } = useTransferPurposes();
    const noteRef = useRef<HTMLInputElement>(null);


    const borderColor = 'border-[#d3d3d35e]';
    if (isLoading) {
        return (
            <div className="flex flex-col gap-xd-8 px-xd-8">
                <span className="text-xd-11 text-[#8D8D8D] font-medium">
                    {tr('send.purpose_select_label')}
                </span>
                <div className="flex gap-xd-8">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-xd-32 w-xd-112 rounded-full bg-gray-100 animate-pulse shrink-0"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col gap-xd-8 px-xd-8">
                <span className="text-xd-11 text-[#8D8D8D] font-medium">
                    {tr('send.purpose_select_label')}
                </span>
                <div className="flex items-center gap-xd-8">
                    <span className="text-xd-12 text-red-500">{error}</span>
                    <button
                        onClick={retry}
                        className="px-xd-12 py-xd-4 rounded-full text-xd-12 font-medium bg-[#F8F8F8] text-[#1D1D1D] border border-[#E8E8E8] hover:bg-gray-100 shrink-0"
                    >
                        {tr('common.retry')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex rounded-xd-15 px-xd-12 py-xd-6 min-h-xd-96
                border ${borderColor} bg-[#FFFFFF]
             flex-col gap-xd-6 `}
        >
            <Select
                required
                hideRequired
                label={tr('send.purpose_select_label')}
                options={purposes}
                value={selectedId ?? undefined}
                onChange={(id) => {
                    const opt = purposes.find((o) => o.id === id);
                    if (opt) onSelect(id, opt.label);
                }}
                variant="tag"
            />

            {/* Note field */}
            <div className="mt-xd-4 flex items-center gap-xd-8 px-xd-8">
                <Image
                    width={16}
                    height={16}
                    src={NoteIcon}
                    alt="Note Icon"
                    className="size-xd-16"
                />
                <input
                    ref={noteRef}
                    type="text"
                    value={note}
                    onChange={onChangeNote}
                    placeholder={tr('send.note_placeholder')}
                    className="flex-1 text-xd-12 text-[#1D1D1D] placeholder:text-[#CCCCCC] bg-transparent focus:outline-0"
                />
            </div>
        </div>
    );
};

export default PurposeSelect;
