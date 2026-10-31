import { getPool } from './src/lib/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkGroup() {
  const pool = getPool();
  if (!pool) {
    console.log('MySQL not configured');
    return;
  }
  try {
    const [rows] = await pool.query('SELECT id, slug, title, imageUrl, bannerUrl FROM groups_dir WHERE slug = ? OR id = ?', ['ddddddd', 'ddddddd']);
    console.log('Group data:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error querying MySQL:', err);
  } finally {
    await pool.end();
  }
}

checkGroup();
