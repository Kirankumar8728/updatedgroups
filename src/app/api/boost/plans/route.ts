import { NextResponse } from 'next/server';
import { BOOST_PLANS } from '@/src/utils/boostPlans';

export async function GET() {
  return NextResponse.json({
    success: true,
    plans: BOOST_PLANS,
  });
}
