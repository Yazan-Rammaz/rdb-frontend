import { pfetch } from '@/lib/p';

export async function getWsAccessToken(_cookieName?: string): Promise<string | null> {
    try {
        const res = await pfetch('tk');
        if (!res.ok) return null;
        const data = await res.json();
        return data?.token ?? null;
    } catch {
        return null;
    }
}
