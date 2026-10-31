import { NextResponse } from 'next/server';
import { getContentSettings } from '@/src/lib/content-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getContentSettings();
  return NextResponse.json({
    hideAdultContent: settings.hideAdultContent,
    substitutionCategory: (settings as any).substitutionCategory || 'General',
    updatedAt: (settings as any).updatedAt || new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
    },
  });
}
