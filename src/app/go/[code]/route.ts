import { NextRequest, NextResponse } from 'next/server';
import { getSiteUrl } from '@/src/lib/rank';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { code } = await context.params;
    const cleanCode = (code || '').trim();

    const baseUrl = getSiteUrl().replace(/\/+$/, '');
    const targetUrl = `${baseUrl}/?ref=${encodeURIComponent(cleanCode)}`;

    return NextResponse.redirect(targetUrl, { status: 307 });
  } catch {
    return NextResponse.redirect('/', { status: 307 });
  }
}
