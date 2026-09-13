import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function handler() {
  const sql = fs.readFileSync(path.join(__dirname, '003_quizflow_auth.sql'), 'utf8');
  const client = new Client({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 6432),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: process.env.PG_CA_CERT ? { rejectUnauthorized: true, ca: process.env.PG_CA_CERT } : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();
  try {
    await client.query(sql);
    const columns = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type IN ('text', 'character varying', 'json', 'jsonb')
      ORDER BY table_name, ordinal_position`);
    const remainingStorageReferences: Array<{ table: string; column: string; count: number }> = [];
    for (const column of columns.rows) {
      const result = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM public.${quoteIdentifier(column.table_name)}
         WHERE ${quoteIdentifier(column.column_name)}::text ILIKE '%supabase.co/storage/v1/%'`,
      );
      const count = Number(result.rows[0]?.count || 0);
      if (count) remainingStorageReferences.push({ table: column.table_name, column: column.column_name, count });
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, migration: '003_quizflow_auth', remainingStorageReferences }),
    };
  } finally {
    await client.end();
  }
}
