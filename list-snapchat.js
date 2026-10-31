import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), '.data', 'nexus-groups.json');
try {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const snapchat = data.filter(g => g.platform === 'snapchat');
  console.log('Snapchat groups:', JSON.stringify(snapchat.map(g => ({
    id: g.id,
    slug: g.slug,
    title: g.title,
    imageUrl: g.imageUrl
  })), null, 2));
} catch (err) {
  console.error('Error:', err);
}
