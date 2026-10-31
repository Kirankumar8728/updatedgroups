import { getPool } from '@/src/lib/db';

// In-memory fallback if MySQL is disconnected or pending
const memoryStats = new Map<string, { upvotes: number; shares: number; clicks: number }>();

export async function getStatsBatch(ids: string[]): Promise<Record<string, { upvotes: number; shares: number; clicks: number }>> {
  if (!ids || ids.length === 0) return {};
  const map: Record<string, { upvotes: number; shares: number; clicks: number }> = {};
  for (const id of ids) {
    map[id] = { upvotes: 0, shares: 0, clicks: 0 };
  }

  const pool = getPool();
  if (pool) {
    try {
      const placeholders = ids.map(() => '?').join(',');
      const [rows]: any = await pool.query(
        `SELECT id, slug, upvotes, shares, clicks FROM groups_dir WHERE id IN (${placeholders}) OR slug IN (${placeholders})`,
        [...ids, ...ids]
      );
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const stats = {
            upvotes: Number(row.upvotes) || 0,
            shares: Number(row.shares) || 0,
            clicks: Number(row.clicks) || 0,
          };
          if (row.id) map[row.id] = stats;
          if (row.slug) map[row.slug] = stats;
        }
        return map;
      }
    } catch (err: any) {
      console.warn('[stats-db] getStatsBatch MySQL notice:', err?.message);
    }
  }

  // Memory fallback
  for (const id of ids) {
    if (memoryStats.has(id)) {
      map[id] = { ...memoryStats.get(id)! };
    }
  }

  return map;
}

export async function incrementStat(groupId: string, action: 'upvote' | 'share' | 'join' | 'click') {
  const col = action === 'upvote' ? 'upvotes' : action === 'share' ? 'shares' : 'clicks';

  // Update in-memory fallback
  const current = memoryStats.get(groupId) || { upvotes: 0, shares: 0, clicks: 0 };
  if (action === 'upvote') current.upvotes += 1;
  else if (action === 'share') current.shares += 1;
  else current.clicks += 1;
  memoryStats.set(groupId, current);

  const pool = getPool();
  if (pool) {
    try {
      await pool.query(
        `UPDATE groups_dir SET ${col} = ${col} + 1 WHERE id = ? OR slug = ?`,
        [groupId, groupId]
      );
      const [rows]: any = await pool.query(
        `SELECT id, upvotes, shares, clicks FROM groups_dir WHERE id = ? OR slug = ? LIMIT 1`,
        [groupId, groupId]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          group_id: groupId,
          upvotes: Number(rows[0].upvotes) || current.upvotes,
          shares: Number(rows[0].shares) || current.shares,
          clicks: Number(rows[0].clicks) || current.clicks,
        };
      }
    } catch (err: any) {
      console.warn('[stats-db] incrementStat MySQL notice:', err?.message);
    }
  }

  return { group_id: groupId, ...current };
}

