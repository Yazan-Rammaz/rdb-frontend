'use client';

import { useCallback } from 'react';

const ALGORITHM = { name: 'AES-GCM', length: 256 };

/**
 * Hook for encrypting and decrypting payment request codes using AES-GCM.
 *
 * @param secret - The requester's account number, used as the AES-GCM key.
 *   On encrypt (receive side): the requester passes their own account number.
 *   On decrypt (scan side): the payer extracts the account number from the QR payload.
 *
 * QR payload format: `PAYREQ:{base64(iv+ciphertext)}|{accountNumber}`
 */
export function usePaymentRequestEncryption(secret: string) {
    /**
     * Encrypts a plaintext requestCode and returns the full PAYREQ QR string.
     * Format: `PAYREQ:{base64(iv[12]+ciphertext)}|{secret}`
     */
    const encrypt = useCallback(
        async (plaintext: string): Promise<string> => {
            const keyData = new TextEncoder().encode(secret.padEnd(32, '\0').slice(0, 32));
            const key = await window.crypto.subtle.importKey('raw', keyData, ALGORITHM, false, [
                'encrypt',
            ]);

            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const ciphertext = new Uint8Array(
                await window.crypto.subtle.encrypt(
                    { ...ALGORITHM, iv },
                    key,
                    new TextEncoder().encode(plaintext),
                ),
            );

            // Combine IV + ciphertext and base64-encode
            const combined = new Uint8Array(iv.length + ciphertext.length);
            combined.set(iv, 0);
            combined.set(ciphertext, iv.length);
            const base64 = btoa(String.fromCharCode(...combined));

            return `PAYREQ:${base64}|${secret}`;
        },
        [secret],
    );

    /**
     * Decrypts a PAYREQ QR string.
     * Accepts the full `PAYREQ:{base64}|{accountNumber}` string.
     * Uses the embedded account number (or the hook's `secret`) as the AES-GCM key.
     */
    const decrypt = useCallback(
        async (qrString: string): Promise<string> => {
            // Parse `PAYREQ:{base64}|{accountNumber}`
            const withoutPrefix = qrString.startsWith('PAYREQ:')
                ? qrString.slice('PAYREQ:'.length)
                : qrString;

            const pipeIdx = withoutPrefix.lastIndexOf('|');
            const base64 = pipeIdx >= 0 ? withoutPrefix.slice(0, pipeIdx) : withoutPrefix;
            const accountNumber = pipeIdx >= 0 ? withoutPrefix.slice(pipeIdx + 1) : secret;

            const decryptionSecret = accountNumber || secret;

            const combined = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            const iv = combined.slice(0, 12);
            const encryptedData = combined.slice(12);

            const keyData = new TextEncoder().encode(
                decryptionSecret.padEnd(32, '\0').slice(0, 32),
            );
            const key = await window.crypto.subtle.importKey('raw', keyData, ALGORITHM, false, [
                'decrypt',
            ]);

            const decrypted = await window.crypto.subtle.decrypt(
                { ...ALGORITHM, iv },
                key,
                encryptedData,
            );

            return new TextDecoder().decode(decrypted);
        },
        [secret],
    );

    return { encrypt, decrypt };
}
