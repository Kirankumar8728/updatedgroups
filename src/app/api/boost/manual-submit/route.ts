import { NextRequest, NextResponse } from 'next/server';
import { getGroupById } from '@/src/lib/groups-dal';
import { getBoostPlanById } from '@/src/utils/boostPlans';
import { addManualPromotion } from '@/src/lib/promotions-store';
import { ManualPromotionRequest } from '@/src/types';
import { getGroupUrlPath } from '@/src/utils/helpers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      groupId,
      planId,
      personName,
      customerPhone,
      customerEmail,
      utrNumber,
      customAmount,
      customDurationLabel,
      siteOrigin: clientOrigin,
    } = body;

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    if (!personName || !personName.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const plan = planId ? getBoostPlanById(planId) : null;
    const amount = plan ? plan.price : Number(customAmount || 99);
    const durationLabel = plan ? plan.durationLabel : (customDurationLabel || 'Custom');
    const durationMinutes = plan ? plan.durationMinutes : 60;
    const durationMs = plan ? plan.durationMs : durationMinutes * 60 * 1000;
    const planName = plan ? plan.name : `Custom Boost (${durationLabel})`;

    const promoId = `promo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const upiId = '872808728@ybl';
    const whatsappNumber = '+918328208263';

    // Construct website listing URL for the group
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
    const defaultOrigin = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://grouplinks.app';
    const resolvedOrigin = (clientOrigin || (host ? `${proto}://${host}` : defaultOrigin)).replace(/\/+$/, '');
    const websiteGroupUrl = `${resolvedOrigin}${getGroupUrlPath(group)}`;

    const newRequest: ManualPromotionRequest = {
      id: promoId,
      groupId: group.id,
      groupTitle: group.title,
      groupUrl: websiteGroupUrl,
      personName: personName.trim(),
      customerPhone: customerPhone ? customerPhone.trim() : undefined,
      customerEmail: customerEmail ? customerEmail.trim() : undefined,
      planId: planId || 'custom',
      planName,
      promotedTimePeriod: durationLabel,
      durationMinutes,
      durationMs,
      amount,
      upiId,
      whatsappNumber,
      utrNumber: utrNumber ? utrNumber.trim() : undefined,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    addManualPromotion(newRequest);

    // Format readable timestamp for WhatsApp message
    const formattedDate = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Build the WhatsApp direct message text sharing our website group page URL
    const waText = 
`🚀 *GroupLinks Promotion Payment Submitted*

📌 *Group Title:* ${group.title}
🔗 *Website Listing URL:* ${websiteGroupUrl}
👤 *Person Name:* ${personName.trim()}
💰 *Payment Amount:* ₹${amount}
⏱️ *Promoted Period:* ${durationLabel} (${planName})
📅 *Payment Time:* ${formattedDate}
${utrNumber && utrNumber.trim() ? `🔢 *UTR / Ref No:* ${utrNumber.trim()}\n` : ''}🆔 *Request Ref:* #${promoId}

I have initiated/completed the payment of ₹${amount} via UPI (872808728@ybl). Please verify and activate my group boost!`;

    const whatsappUrl = `https://wa.me/918328208263?text=${encodeURIComponent(waText)}`;

    return NextResponse.json({
      success: true,
      promotion: newRequest,
      whatsappUrl,
      whatsappMessage: waText,
      upiId,
      whatsappNumber,
    });
  } catch (error: any) {
    console.error('Error submitting manual promotion:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit promotion request' }, { status: 500 });
  }
}
