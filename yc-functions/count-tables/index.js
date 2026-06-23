const { Client } = require('pg');

const TABLES = [
  'users',
  'profiles',
  'quizzes',
  'quiz_sessions',
  'quiz_results',
  'entitlements',
  'payments',
  'subscriptions',
  'support_tickets',
  'support_ticket_messages',
  'webhook_events',
];

module.exports.handler = async () => {
  const client = new Client({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 6432),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: process.env.PG_CA_CERT
      ? { rejectUnauthorized: true, ca: process.env.PG_CA_CERT }
      : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const counts = [];
    for (const table of TABLES) {
      const { rows } = await client.query(`select count(*)::int as count from public."${table}"`);
      counts.push({ table, count: rows[0].count });
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, counts }) };
  } finally {
    await client.end();
  }
};
