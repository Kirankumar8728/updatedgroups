import { NextRequest, NextResponse } from 'next/server';
import { addTagToGroup } from '@/src/lib/groups-dal';
import { sanitizeInput } from '@/src/lib/security';
import { checkRateLimitAsync, rateLimitResponse } from '@/src/lib/rate-limit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const rateCheck = await checkRateLimitAsync(req, {
      limit: 20,
      windowMs: 60 * 1000,
      keyPrefix: 'tag_add',
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, 'Too many tags added. Please slow down.', 20);
    }

    const { id } = await params;
    const body = await req.json();
    if (!body.tag || typeof body.tag !== 'string') {
      return NextResponse.json({ error: 'Valid tag is required' }, { status: 400 });
    }

    const cleanTag = sanitizeInput(body.tag).trim().slice(0, 30);
    if (!cleanTag) {
      return NextResponse.json({ error: 'Valid tag is required' }, { status: 400 });
    }

    const updated = await addTagToGroup(id, cleanTag);
    if (!updated) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, customTags: updated.customTags, group: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
