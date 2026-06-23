const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

module.exports.handler = async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'yc_migration.sql'), 'utf8');
  const client = new Client({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 6432),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: process.env.PG_CA_CERT
      ? { rejectUnauthorized: true, ca: process.env.PG_CA_CERT }
      : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        tableCount: rows.length,
        tables: rows.map((row) => row.table_name),
      }),
    };
  } finally {
    await client.end();
  }
};
