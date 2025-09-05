import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: { params: { alert_id: string } }
) {
  try {
    const alertId = ctx.params.alert_id;
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const url = `${apiBase}/api/alerts/${encodeURIComponent(alertId)}/download_pack`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'demo_key',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Backend error ${res.status}` }, { status: res.status });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/zip',
        'Content-Disposition': res.headers.get('Content-Disposition') || `attachment; filename=${alertId}_pack.zip`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}

