import { Pool } from 'pg';

let pool: Pool | null = null;

function getSslConfig() {
  if (process.env.PG_DISABLE_SSL === 'true') {
    return undefined;
  }

  if (process.env.PG_CA_CERT) {
    return {
      rejectUnauthorized: true,
      ca: process.env.PG_CA_CERT,
    };
  }

  return { rejectUnauthorized: false };
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT || '6432'),
      database: process.env.PG_DATABASE || 'potok',
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      ssl: getSslConfig(),
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[db] unexpected pool error:', err.message);
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rows;
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params?: any[]): Promise<number> {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rowCount ?? 0;
}

export async function queryAsUser<T = any>(
  userId: string,
  sql: string,
  params?: any[],
): Promise<T[]> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("SET LOCAL app.current_user_id = $1", [userId]);
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
