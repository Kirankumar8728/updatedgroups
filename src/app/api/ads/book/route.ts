import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[AD BOOKING REQUEST]', body);
    return NextResponse.json({
      success: true,
      message: 'Ad booking request received. Our team will contact you shortly.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit booking' }, { status: 500 });
  }
}
