import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), '.data', 'nexus-groups.json');
try {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // Sort by updatedAt or createdAt desc
  const recent = data
    .filter(g => g.updatedAt || g.createdAt)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5);
    
  console.log('Recent 5 groups:', JSON.stringify(recent.map(g => ({
    id: g.id,
    slug: g.slug,
    title: g.title,
    imageUrl: g.imageUrl,
    updatedAt: g.updatedAt,
    createdAt: g.createdAt
  })), null, 2));
} catch (err) {
  console.error('Error reading JSON store:', err);
}
