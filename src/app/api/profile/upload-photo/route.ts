import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { NEST_BASE, COOKIES, backendFetch, safeJson } from '@/lib/edgeProxy';


/** POST /api/profile/upload-photo — forwards a multipart upload to NestJS /media/upload/direct. */
export async function POST(req: NextRequest) {
    const jar = await cookies();
    const token = jar.get(COOKIES.access)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const upstreamForm = new FormData();
    upstreamForm.append('file', file);
    upstreamForm.append('type', file.type?.split('/')[0] ?? 'image');

    let res: Response;
    try {
        // No Content-Type header — fetch sets the multipart boundary for FormData.
        res = await backendFetch(NEST_BASE, '/media/upload/direct', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: upstreamForm,
        });
    } catch {
        return NextResponse.json({ error: 'Upload failed' }, { status: 502 });
    }

    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
}
