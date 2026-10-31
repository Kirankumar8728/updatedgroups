import { NextResponse } from 'next/server';
import { getVapidKeys } from '@/src/lib/push-notifications';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { publicKey } = getVapidKeys();
    return NextResponse.json({
      success: true,
      publicKey: publicKey || null
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
