'use client';

import { CustomQRCode } from '@/components/ui/CustomQR';

export function QRCodeDisplay({ value, size, bg }: { value: string; size: number; bg?: string }) {
    return <CustomQRCode value={value} size={size} errorCorrectionLevel="L" bg={bg} />;
}
