import { NextResponse } from 'next/server';
import { getAdsTxtServer } from '@/src/lib/server-scripts-persistence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const content = getAdsTxtServer();
  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
