'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface UseCameraOptions {
    /** Desired facing mode. On desktop, 'environment' is automatically overridden to 'user'. */
    facingMode: 'user' | 'environment';
    width?: number;
    height?: number;
}

interface UseCameraReturn {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    isActive: boolean;
    error: string | null;
    /**
     * Whether the video preview should be CSS-mirrored (scaleX(-1)).
     * True for front-facing cameras (facingMode 'user') on any device.
     * False for back cameras (facingMode 'environment') on mobile.
     *
     * The captured frame is ALWAYS the raw, non-mirrored image regardless of
     * this flag — ctx.drawImage() reads native pixel data, not CSS transforms.
     */
    shouldMirror: boolean;
    /**
     * Starts the stream. Never throws — resolves with `null` on success, or with
     * the human-readable reason it failed (the same string put on `error`).
     *
     * Returning the reason lets a caller fail its own flow with the real cause.
     * Callers that only want the preview can keep ignoring the result; the
     * message is still on `error` for them.
     */
    startCamera: () => Promise<string | null>;
    stopCamera: () => void;
    captureFrame: () => string | null;
}

/**
 * Turn a getUserMedia rejection into something a user can act on.
 *
 * Everything except NotAllowedError used to collapse into "Please check your
 * device", which hid the three failures that actually happen in the field: no
 * camera present, the camera already held by another app, and an insecure
 * origin. The final fallback keeps the DOMException name so an unrecognised
 * failure is still identifiable from a screenshot.
 */
function describeCameraError(err: unknown): string {
    if (!(err instanceof DOMException)) {
        return err instanceof Error
            ? `Could not start the camera: ${err.message}`
            : 'Could not start the camera.';
    }
    switch (err.name) {
        case 'NotAllowedError':
            return 'Camera permission denied. Please allow camera access in your browser settings.';
        case 'NotFoundError':
        case 'OverconstrainedError':
            return 'No camera found on this device.';
        case 'NotReadableError':
            return 'The camera is already in use by another app. Close it and try again.';
        case 'SecurityError':
            return 'Camera blocked on an insecure connection. Open this page over HTTPS.';
        case 'AbortError':
            return 'The camera stopped unexpectedly. Please try again.';
        default:
            return `Could not start the camera (${err.name}).`;
    }
}

/**
 * Returns true when running on a touch-capable mobile/tablet device.
 * Checked once per hook call; safe to call on the server (returns false).
 */
function isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return (
        navigator.maxTouchPoints > 1 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    );
}

export function useCamera({
    facingMode: requestedFacing,
    width = 1500,
    height = 900,
}: UseCameraOptions): UseCameraReturn {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isMobile = isMobileDevice();

    const shouldMirror = !isMobile ? true : requestedFacing === 'user';

    const effectiveFacing: 'user' | 'environment' = !isMobile ? 'user' : requestedFacing;

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsActive(false);
    }, []);

    const startCamera = useCallback(async (): Promise<string | null> => {
        setError(null);

        // Browsers only expose mediaDevices on a secure context. Over plain
        // http:// on a LAN address it is simply undefined, and reaching for
        // .getUserMedia there throws a TypeError whose message says nothing
        // about the real cause.
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            const message =
                'Camera unavailable on this connection. Open this page over HTTPS or on localhost.';
            console.error('[useCamera] mediaDevices.getUserMedia is not available');
            setError(message);
            setIsActive(false);
            return message;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: effectiveFacing,
                    width: { ideal: width },
                    height: { ideal: height },
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsActive(true);
            return null;
        } catch (err) {
            const message = describeCameraError(err);
            console.error('[useCamera] startCamera failed:', err);
            setError(message);
            setIsActive(false);
            return message;
        }
    }, [effectiveFacing, width, height]);

    /**
     * Captures the current video frame to a JPEG data URL.
     * Uses ctx.drawImage() which reads raw pixel data — CSS transforms (including
     * the mirror scaleX(-1)) have no effect on the captured image.  The result
     * is always the correctly-oriented frame suitable for OCR and face matching.
     */
    const captureFrame = useCallback((): string | null => {
        if (!videoRef.current || !canvasRef.current) return null;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8);
    }, []);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    return {
        videoRef,
        canvasRef,
        isActive,
        error,
        shouldMirror,
        startCamera,
        stopCamera,
        captureFrame,
    };
}
