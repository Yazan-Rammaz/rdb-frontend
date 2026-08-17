import { api } from '@/api';

export async function getWsAccessToken(_cookieName?: string): Promise<string | null> {
    const res = await api.session.wsToken();
    return res.ok ? (res.data.token ?? null) : null;
}
