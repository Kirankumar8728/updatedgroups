import { NextRequest, NextResponse } from 'next/server';
import { REALTIME_NO_CACHE_HEADERS } from '@/src/lib/cache-control';
import { sanitizeInput } from '@/src/lib/security';
import { sendGroupFeedbackEmail } from '@/src/lib/email';
import { getGroups, updateGroup } from '@/src/lib/groups-dal';
import { getCategoryFallbackImage } from '@/src/utils/categoryImages';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = sanitizeInput(body.name || '').trim();
    const email = sanitizeInput(body.email || '').trim();
    const groupUrl = sanitizeInput(body.groupUrl || '').trim();
    const imageUrl = sanitizeInput(body.imageUrl || '').trim();
    const description = sanitizeInput(body.description || '').trim();

    if (!name || !email || !description) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and description are required.' },
        { status: 400, headers: REALTIME_NO_CACHE_HEADERS }
      );
    }

    // Find and temporarily unlink infringing image from matching group
    const result = await getGroups({ limit: 5000 });
    const allGroups = result.groups || [];
    let matchedGroup: any = null;

    if (groupUrl) {
      const cleanTarget = groupUrl.toLowerCase().trim();
      matchedGroup = allGroups.find(g => (g.url && g.url.toLowerCase().includes(cleanTarget)) || cleanTarget.includes(g.url.toLowerCase()));
    }
    if (!matchedGroup && imageUrl) {
      const cleanImg = imageUrl.toLowerCase().trim();
      matchedGroup = allGroups.find(g => g.imageUrl && g.imageUrl.toLowerCase() === cleanImg);
    }

    if (matchedGroup) {
      const fallbackImg = getCategoryFallbackImage(matchedGroup.category, false, matchedGroup.title);
      await updateGroup(matchedGroup.id, {
        originalImageUrl: (matchedGroup.imageUrl && !matchedGroup.imageUrl.startsWith('data:') && !matchedGroup.imageUrl.includes('local-server')) ? matchedGroup.imageUrl : matchedGroup.originalImageUrl,
        imageUrl: fallbackImg,
        dmcaStatus: 'pending_review',
        dmcaReason: description,
        dmcaClaimantEmail: email,
        dmcaClaimantName: name,
        dmcaClaimantAt: new Date().toISOString(),
      });
      console.log('[DMCA Takedown] Infringing image unlinked and sent to Master Admin review for group:', matchedGroup.id);
    }

    const emailDetails = `
Claimant Name: ${name}
Claimant Email: ${email}
Listing URL: ${groupUrl || 'Not provided'}
Infringing Image URL: ${imageUrl || 'Not provided'}
Matched Group ID: ${matchedGroup ? matchedGroup.id : 'None matched'}
Action Taken: Infringing image temporarily unlinked and replaced with category fallback image pending Master Admin review (24-hour response window before permanent takedown).

Declaration & Details:
${description}
    `.trim();

    // Dispatch DMCA notices to dmca@grouplinks.app, grouplinks@yahoo.com, and kirankumar8728@outlook.com
    const targetRecipients = ['dmca@grouplinks.app', 'grouplinks@yahoo.com', 'kirankumar8728@outlook.com'];
    for (const recipient of targetRecipients) {
      process.env.ADMIN_EMAIL = recipient;
      await sendGroupFeedbackEmail({
        feedbackType: 'other',
        message: emailDetails,
        userEmail: email,
        groupTitle: groupUrl ? `[DMCA NOTICE] ${groupUrl}` : 'DMCA Takedown Notice',
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'DMCA removal notice received. Infringing image unlinked and queued for Master Admin review (24-hour response window).',
    }, { status: 200, headers: REALTIME_NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('[DMCA API Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to submit DMCA request.' },
      { status: 500, headers: REALTIME_NO_CACHE_HEADERS }
    );
  }
}
