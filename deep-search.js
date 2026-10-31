import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), '.data', 'nexus-groups.json');
try {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const matches = data.filter(g => 
    (g.slug && g.slug.includes('ddddddd')) || 
    (g.id && g.id.includes('ddddddd')) ||
    (g.imageUrl && g.imageUrl.includes('ddddddd')) ||
    (g.title && g.title.includes('ddddddd'))
  );
  
  if (matches.length > 0) {
    console.log('Matches found:', JSON.stringify(matches.map(g => ({
      id: g.id,
      slug: g.slug,
      title: g.title,
      imageUrl: g.imageUrl,
      updatedAt: g.updatedAt
    })), null, 2));
  } else {
    console.log('No matches found for "ddddddd" in entire store');
  }
} catch (err) {
  console.error('Error:', err);
}
