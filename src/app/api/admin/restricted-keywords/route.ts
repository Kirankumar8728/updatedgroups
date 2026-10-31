import { NextRequest, NextResponse } from 'next/server';
import { 
  getRestrictedKeywords, 
  addRestrictedKeyword, 
  removeRestrictedKeyword, 
  resetRestrictedKeywords,
  setRestrictedKeywords 
} from '@/src/lib/restricted-keywords-dal';
import { requireAdmin } from '@/src/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const keywords = getRestrictedKeywords();
    return NextResponse.json({ success: true, keywords }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get restricted keywords' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json();
    const { action, keyword, keywords: incomingKeywords } = body;

    let keywords: string[];
    if (Array.isArray(incomingKeywords)) {
      keywords = setRestrictedKeywords(incomingKeywords);
    } else if (action === 'add') {
      if (!keyword || !keyword.trim()) {
        return NextResponse.json({ success: false, error: 'Keyword is required' }, { status: 400 });
      }
      keywords = addRestrictedKeyword(keyword.trim());
    } else if (action === 'remove') {
      if (!keyword || !keyword.trim()) {
        return NextResponse.json({ success: false, error: 'Keyword is required' }, { status: 400 });
      }
      keywords = removeRestrictedKeyword(keyword.trim());
    } else if (action === 'reset') {
      keywords = resetRestrictedKeywords();
    } else {
      keywords = getRestrictedKeywords();
    }

    return NextResponse.json({
      success: true,
      keywords,
      message: 'Restricted keywords updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update restricted keywords' },
      { status: 500 }
    );
  }
}
