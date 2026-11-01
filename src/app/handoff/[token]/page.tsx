import { PhoneCamera } from '@/features/kyc/handoff/PhoneCamera';

/**
 * What the KYC camera hand-off QR opens on the phone — ported from root.
 *
 * Public on purpose (the middleware matcher does not cover it): the room id in
 * the URL is the whole capability — it lets the holder offer a camera to one
 * capture step for two minutes, once. No cookie, no token, no backend call; the
 * frames are still judged by liveness / the document scanner on the desktop.
 *
 * ⚠️ https only: getUserMedia needs a secure context, so on a LAN use
 * `npm run dev:mobile`.
 */
export default async function HandoffPage({
    params,
    searchParams,
}: {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ c?: string }>;
}) {
    const { token } = await params;
    const { c } = await searchParams;
    // Front camera for a face, back camera for a document.
    const facing = c === 'user' ? 'user' : 'environment';
    return (
        <div className="kyc-scope h-dvh w-full">
            <PhoneCamera room={token} facing={facing} />
        </div>
    );
}
