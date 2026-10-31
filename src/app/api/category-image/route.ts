import { NextRequest, NextResponse } from 'next/server';
import { getCategoryFallbackImage } from '@/src/utils/categoryImages';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const isBanner = searchParams.get('isBanner') === 'true' || searchParams.get('banner') === 'true';
    const title = searchParams.get('title') || undefined;

    const dataUri = getCategoryFallbackImage(category, isBanner, title);
    const svgContent = decodeURIComponent(dataUri.replace(/^data:image\/svg\+xml;utf8,/, ''));

    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400, immutable',
      },
    });
  } catch {
    const fallbackDataUri = getCategoryFallbackImage('Default', false, 'Community');
    const svgContent = decodeURIComponent(fallbackDataUri.replace(/^data:image\/svg\+xml;utf8,/, ''));
    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
}
