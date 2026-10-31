import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), '.data', 'nexus-groups.json');
try {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const group = data.find(g => g.slug === 'ddddddd' || g.id === 'ddddddd');
  if (group) {
    console.log('Group found:', JSON.stringify({
      id: group.id,
      slug: group.slug,
      imageUrl: group.imageUrl,
      bannerUrl: group.bannerUrl,
      updatedAt: group.updatedAt
    }, null, 2));
  } else {
    console.log('Group not found in JSON store');
    // Show total count
    console.log('Total groups in store:', data.length);
  }
} catch (err) {
  console.error('Error reading JSON store:', err);
}
