import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

/**
 * Checks if MySQL database environment variables are configured.
 */
export function isMySQLConfigured(): boolean {
  console.log('[DB] DISABLE_MYSQL:', process.env.DISABLE_MYSQL);
  if (process.env.DISABLE_MYSQL === 'true') return false;
  return Boolean(
    process.env.DB_HOST &&
    process.env.DB_NAME &&
    (process.env.DB_USER || process.env.MYSQL_USER)
  );
}

// MySQL Pool setup
let pool: mysql.Pool | null = null;

/**
 * Returns the MySQL connection pool (or null if not configured).
 */
export function getPool(): mysql.Pool | null {
  if (process.env.DISABLE_MYSQL === 'true') return null;
  if (pool) return pool;
  
  if (isMySQLConfigured()) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT || process.env.MYSQL_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        connectTimeout: 5000,
      });
    } catch (err) {
      console.error('[DB] Failed to create MySQL pool:', err);
      pool = null;
    }
  }
  return pool;
}

/**
 * Pings the MySQL database to test connectivity.
 */
export async function pingDatabase(): Promise<boolean> {
  const currentPool = getPool();
  if (!currentPool) return false;
  try {
    const connection = await currentPool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (err) {
    console.error('[DB] Database ping failed:', err);
    return false;
  }
}

function ensureJsonDir() {
  if (typeof window !== 'undefined') return;
  const fs = require('fs');
  const path = require('path');
  const JSON_DIR = path.join(process.cwd(), '.data');
  try {
    if (!fs.existsSync(JSON_DIR)) {
      fs.mkdirSync(JSON_DIR, { recursive: true });
    }
  } catch {}
}

ensureJsonDir();

/**
 * Execute a read query returning an array of rows.
 * Fallback to empty array if DB is not configured or query fails.
 */
export async function queryRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const currentPool = getPool();
  if (currentPool) {
    try {
      const [results] = await currentPool.execute(sql, params);
      return (results as T[]) || [];
    } catch (err) {
      console.error('[DB] queryRows error:', err);
      return [];
    }
  }
  return [];
}

/**
 * Execute DML (INSERT, UPDATE, DELETE) query.
 * Fallback to null if DB is not configured or query fails.
 */
export async function executeDml(sql: string, params: any[] = []): Promise<any> {
  const currentPool = getPool();
  if (currentPool) {
    try {
      const [result] = await currentPool.execute(sql, params);
      return result;
    } catch (err) {
      console.error('[DB] executeDml error:', err);
      return null;
    }
  }
  return null;
}

const db = {
  isMySQLConfigured,
  pool,
  getPool,
  pingDatabase,
  queryRows,
  executeDml,
};

export default db;

