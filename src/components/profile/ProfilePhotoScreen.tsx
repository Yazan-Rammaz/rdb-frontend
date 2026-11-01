'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import defaultProfile from '@/assets/icons/profile/defaultprofile.svg';
import galleryIcon from '@/assets/icons/profile/gallery.svg';
import cameraIcon from '@/assets/icons/profile/camear.svg';
import deleteIcon from '@/assets/icons/profile/delete.svg';
import addPhotoIcon from '@/assets/icons/profile/add_photo.svg';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type PhotoView = 'display' | 'crop' | 'review';

interface ProfilePhotoScreenProps {
    currentUrl?: string;
    onBack: () => void;
    onSave: (dataUrl: string) => void;
}

export default function ProfilePhotoScreen({
    currentUrl,
    onBack,
    onSave,
}: ProfilePhotoScreenProps) {
    const [view, setView] = useState<PhotoView>('display');
    const [photoUrl, setPhotoUrl] = useState<string | undefined>(currentUrl);
    const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
    const [showOptions, setShowOptions] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // crop state
    const [rawImage, setRawImage] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const imgContainerRef = useRef<HTMLDivElement>(null);
    // frame position (top-left corner, in CSS px relative to image container)
    const [frame, setFrame] = useState({ x: 0, y: 0, size: 200 });
    const frameDragRef = useRef({ dragging: false, startX: 0, startY: 0, frameX: 0, frameY: 0 });
    // image display info (computed when image loads)
    const [imgDisplay, setImgDisplay] = useState({ x: 0, y: 0, w: 0, h: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const hasPhoto = !!photoUrl;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setRawImage(ev.target?.result as string);
            setView('crop');
            setShowOptions(false);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const getAppScale = () =>
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-scale')) || 1;

    // When image loads, compute its contain-fit rect inside the container and center the frame
    const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        imgRef.current = img;
        const container = imgContainerRef.current;
        if (!container) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const ir = img.naturalWidth / img.naturalHeight;
        let dw = cw, dh = cw / ir;
        if (dh > ch) { dh = ch; dw = ch * ir; }
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;
        setImgDisplay({ x: dx, y: dy, w: dw, h: dh });
        const size = Math.min(dw, dh) * 0.8;
        setFrame({ x: dx + (dw - size) / 2, y: dy + (dh - size) / 2, size });
    };

    // Frame drag
    const onFramePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        frameDragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, frameX: frame.x, frameY: frame.y };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onFramePointerMove = (e: React.PointerEvent) => {
        if (!frameDragRef.current.dragging) return;
        const s = getAppScale();
        const container = imgContainerRef.current;
        if (!container) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const dx = (e.clientX - frameDragRef.current.startX) / s;
        const dy = (e.clientY - frameDragRef.current.startY) / s;
        const nx = Math.max(imgDisplay.x, Math.min(imgDisplay.x + imgDisplay.w - frame.size, frameDragRef.current.frameX + dx));
        const ny = Math.max(imgDisplay.y, Math.min(imgDisplay.y + imgDisplay.h - frame.size, frameDragRef.current.frameY + dy));
        setFrame((f) => ({ ...f, x: nx, y: ny }));
    };
    const onFramePointerUp = () => { frameDragRef.current.dragging = false; };

    // Corner resize — which corner: 'tl'|'tr'|'bl'|'br'
    const resizeRef = useRef({ active: false, corner: '', startX: 0, startY: 0, startFrame: { x: 0, y: 0, size: 0 } });
    const onCornerDown = (e: React.PointerEvent, corner: string) => {
        e.stopPropagation();
        resizeRef.current = { active: true, corner, startX: e.clientX, startY: e.clientY, startFrame: { ...frame } };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onCornerMove = (e: React.PointerEvent) => {
        if (!resizeRef.current.active) return;
        const s = getAppScale();
        const { corner, startX, startY, startFrame } = resizeRef.current;
        const dx = (e.clientX - startX) / s;
        const dy = (e.clientY - startY) / s;
        const delta = corner === 'br' || corner === 'tr' ? dx : -dx;
        const newSize = Math.max(60, Math.min(
            Math.min(imgDisplay.w, imgDisplay.h),
            startFrame.size + delta
        ));
        let nx = startFrame.x;
        let ny = startFrame.y;
        if (corner === 'tl') { nx = startFrame.x + (startFrame.size - newSize); ny = startFrame.y + (startFrame.size - newSize); }
        if (corner === 'tr') { ny = startFrame.y + (startFrame.size - newSize); }
        if (corner === 'bl') { nx = startFrame.x + (startFrame.size - newSize); }
        nx = Math.max(imgDisplay.x, Math.min(imgDisplay.x + imgDisplay.w - newSize, nx));
        ny = Math.max(imgDisplay.y, Math.min(imgDisplay.y + imgDisplay.h - newSize, ny));
        setFrame({ x: nx, y: ny, size: newSize });
    };
    const onCornerUp = () => { resizeRef.current.active = false; };

    // Crop and go to review
    const handleCropDone = () => {
        const img = imgRef.current;
        if (!img || imgDisplay.w === 0) return;
        const scaleX = img.naturalWidth / imgDisplay.w;
        const scaleY = img.naturalHeight / imgDisplay.h;
        const sx = (frame.x - imgDisplay.x) * scaleX;
        const sy = (frame.y - imgDisplay.y) * scaleY;
        const sw = frame.size * scaleX;
        const sh = frame.size * scaleY;
        const OUT = 800;
        const canvas = canvasRef.current!;
        canvas.width = OUT;
        canvas.height = OUT;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT, OUT);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCroppedDataUrl(dataUrl);
        setView('review');
    };

    // Confirm review → actually save
    const handleConfirm = () => {
        if (!croppedDataUrl) return;
        setPhotoUrl(croppedDataUrl);
        onSave(croppedDataUrl);
        setView('display');
        setShowOptions(false);
        setCroppedDataUrl(null);
    };

    const handleDelete = () => {
        setPhotoUrl(undefined);
        onSave('');
        setShowOptions(false);
        setShowDeleteConfirm(false);
    };

    // ── Crop view ────────────────────────────────────────────────────────────
    if (view === 'crop') {
        const HANDLE = 14;
        return (
            <div className="w-full h-full bg-black flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-xd-28 pt-xd-14 pb-xd-10">
                    <button onClick={() => setView('display')} className="flex items-center text-white">
                        <ChevronLeft className="w-xd-22 h-xd-22" />
                    </button>
                    <span className="text-xd-16 font-medium text-white">Profile Photo</span>
                    <button onClick={handleCropDone} className="text-xd-16 font-medium text-[#3066CC]">
                        Done
                    </button>
                </div>

                {/* Image + moveable crop frame */}
                <div
                    ref={imgContainerRef}
                    className="flex-1 relative overflow-hidden select-none"
                    onPointerMove={frameDragRef.current.dragging ? onFramePointerMove : onCornerMove}
                    onPointerUp={() => { onFramePointerUp(); onCornerUp(); }}
                >
                    {rawImage && (
                        <img
                            src={rawImage}
                            alt=""
                            draggable={false}
                            onLoad={onImgLoad}
                            style={{
                                position: 'absolute',
                                left: imgDisplay.x,
                                top: imgDisplay.y,
                                width: imgDisplay.w,
                                height: imgDisplay.h,
                                userSelect: 'none',
                                pointerEvents: 'none',
                            }}
                        />
                    )}

                    {/* Dim outside frame using 4 overlay rects */}
                    {imgDisplay.w > 0 && <>
                        {/* top */}
                        <div className="absolute bg-black/50 pointer-events-none" style={{ left: imgDisplay.x, top: imgDisplay.y, width: imgDisplay.w, height: frame.y - imgDisplay.y }} />
                        {/* bottom */}
                        <div className="absolute bg-black/50 pointer-events-none" style={{ left: imgDisplay.x, top: frame.y + frame.size, width: imgDisplay.w, height: imgDisplay.y + imgDisplay.h - frame.y - frame.size }} />
                        {/* left */}
                        <div className="absolute bg-black/50 pointer-events-none" style={{ left: imgDisplay.x, top: frame.y, width: frame.x - imgDisplay.x, height: frame.size }} />
                        {/* right */}
                        <div className="absolute bg-black/50 pointer-events-none" style={{ left: frame.x + frame.size, top: frame.y, width: imgDisplay.x + imgDisplay.w - frame.x - frame.size, height: frame.size }} />
                    </>}

                    {/* Crop frame */}
                    {imgDisplay.w > 0 && (
                        <div
                            className="absolute border-2 border-white cursor-move touch-none"
                            style={{ left: frame.x, top: frame.y, width: frame.size, height: frame.size, borderRadius: 16 }}
                            onPointerDown={onFramePointerDown}
                            onPointerMove={onFramePointerMove}
                            onPointerUp={onFramePointerUp}
                        >
                            {/* Corner handles */}
                            {(['tl','tr','bl','br'] as const).map((c) => (
                                <div
                                    key={c}
                                    className="absolute bg-white touch-none"
                                    style={{
                                        width: HANDLE, height: HANDLE, borderRadius: 3,
                                        top: c.startsWith('t') ? -HANDLE/2 : undefined,
                                        bottom: c.startsWith('b') ? -HANDLE/2 : undefined,
                                        left: c.endsWith('l') ? -HANDLE/2 : undefined,
                                        right: c.endsWith('r') ? -HANDLE/2 : undefined,
                                        cursor: c === 'tl' || c === 'br' ? 'nwse-resize' : 'nesw-resize',
                                    }}
                                    onPointerDown={(e) => onCornerDown(e, c)}
                                    onPointerMove={onCornerMove}
                                    onPointerUp={onCornerUp}
                                />
                            ))}
                            {/* Grid lines */}
                            <div className="absolute inset-0 pointer-events-none" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                                {[0,1,2,3,4,5,6,7,8].map((i) => (
                                    <div key={i} style={{ border: '0.5px solid rgba(255,255,255,0.3)' }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <canvas ref={canvasRef} className="hidden" />
            </div>
        );
    }

    // ── Review view ──────────────────────────────────────────────────────────
    if (view === 'review') {
        return (
            <div className="w-full h-full bg-white flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-center relative px-xd-28 pt-xd-14 pb-xd-10">
                    <button onClick={() => setView('crop')} className="absolute left-xd-20 flex items-center text-[#1D1D1D]">
                        <ChevronLeft className="w-xd-22 h-xd-22" />
                    </button>
                    <span className="text-xd-16 font-medium text-[#1D1D1D]">Profile Photo</span>
                    <button onClick={handleConfirm} className="absolute right-xd-20 text-xd-16 font-medium text-[#3066CC]">
                        Save
                    </button>
                </div>

                {/* Preview in rounded frame */}
                <div className="flex-1 flex flex-col items-center justify-start pt-xd-35">
                    <div className="relative overflow-hidden m-2 size-xd-350 rounded-xd-20">
                        {croppedDataUrl && (
                            <img
                                src={croppedDataUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Display view ─────────────────────────────────────────────────────────
    return (
        <>
            <div className="w-full h-full bg-white flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-center relative px-xd-28 pt-xd-14 border-[#f0f0f0]">
                    <button
                        onClick={onBack}
                        className="absolute left-xd-20 flex items-center text-[#1D1D1D]"
                    >
                        <ChevronLeft className="w-xd-22 h-xd-22" />
                    </button>
                    <span className="text-xd-16 font-medium text-[#1D1D1D]">Profile Photo</span>
                </div>

                {/* Photo area */}
                <div className="flex-1 flex flex-col items-center justify-start pt-xd-35">
                    <div className="relative overflow-hidden m-2 size-xd-350 rounded-xd-20">
                        {photoUrl ? (
                            <img
                                src={photoUrl}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Image
                                src={defaultProfile}
                                alt="Default"
                                fill
                                className="object-contain"
                            />
                        )}

                        {/* Button overlay at bottom of photo */}
                        <button
                            onClick={() => setShowOptions((v) => !v)}
                            className="absolute bottom-0 left-0 right-0 h-xd-35 bg-[#404040] flex items-center justify-center gap-xd-8"
                        >
                            <Image
                                src={addPhotoIcon}
                                alt=""
                                width={18}
                                height={18}
                                className="object-contain"
                            />
                            <span className="text-[#FCFCFC] text-xd-14">
                                {hasPhoto ? 'Edit Profile Photo' : 'Add Profile Photo'}
                            </span>
                        </button>
                    </div>

                    {/* Options row */}
                    {showOptions && (
                        <div className="flex items-center justify-center gap-xd-40 mt-xd-15">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-xd-6"
                            >
                                <Image
                                    src={galleryIcon}
                                    alt="Choose"
                                    width={20}
                                    height={20}
                                    className="object-contain size-xd-20"
                                />
                                <span className="text-xd-11 text-[#1D1D1D]">Choose</span>
                            </button>
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="flex flex-col items-center gap-xd-6"
                            >
                                <Image
                                    src={cameraIcon}
                                    alt="Take Photo"
                                    width={20}
                                    height={20}
                                    className="object-contain size-xd-20"
                                />
                                <span className="text-xd-11 text-[#1D1D1D]">Take Photo</span>
                            </button>
                            {hasPhoto && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex flex-col items-center gap-xd-6"
                                >
                                    <Image
                                        src={deleteIcon}
                                        alt="Remove"
                                        width={20}
                                        height={20}
                                        className="object-contain size-xd-20"
                                    />
                                    <span className="text-xd-11 text-[#1D1D1D]">Remove</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleFileChange}
            />

            <ConfirmDialog
                open={showDeleteConfirm}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                title="Remove Photo"
                message="Are you sure you want to remove your profile photo?"
                confirmLabel="Remove"
                cancelLabel="Cancel"
            />
        </>
    );
}
