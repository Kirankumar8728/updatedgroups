import { NextResponse } from 'next/server';
import { processAndStoreImageLocally } from '@/src/lib/local-image-processor';
import { updateGroup } from '@/src/lib/groups-dal';

export async function POST(req: Request) {
  const { url, platform, groupTitle, isAdult, groupId } = await req.json();
  
  if (isAdult) {
    return NextResponse.json({ url });
  }

  try {
    const result = await processAndStoreImageLocally(url, platform, groupTitle, false);
    if (result.success && result.imageUrl) {
      if (groupId) {
        await updateGroup(groupId, { imageUrl: result.imageUrl });
      }
      return NextResponse.json({ url: result.imageUrl });
    }
    throw new Error(result.error || 'Failed to process image');
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
