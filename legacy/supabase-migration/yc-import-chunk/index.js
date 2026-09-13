const { Client } = require('pg');

const CONFIGS = {
  users: {
    table: 'users',
    columns: ['id', 'email', 'created_at', 'updated_at'],
    conflict: ['id'],
    update: ['email', 'updated_at'],
  },
  profiles: {
    table: 'profiles',
    columns: ['user_id', 'account_code', 'username', 'display_name', 'status', 'blocked_until', 'block_reason', 'last_active_at', 'created_at', 'updated_at'],
    conflict: ['user_id'],
    update: ['account_code', 'username', 'display_name', 'status', 'blocked_until', 'block_reason', 'last_active_at', 'updated_at'],
  },
  quizzes: {
    table: 'quizzes',
    columns: ['id', 'user_id', 'name', 'description', 'quiz_data', 'visibility', 'cover_image_url', 'is_favorite', 'published_at', 'moderation_status', 'moderation_reason', 'moderated_by', 'moderated_at', 'deleted_at', 'created_at', 'updated_at'],
    jsonColumns: ['quiz_data'],
    conflict: ['id'],
    update: ['name', 'description', 'quiz_data', 'visibility', 'cover_image_url', 'is_favorite', 'published_at', 'moderation_status', 'moderation_reason', 'moderated_by', 'moderated_at', 'deleted_at', 'updated_at'],
  },
  quiz_sessions: {
    table: 'quiz_sessions',
    columns: ['id', 'quiz_id', 'user_id', 'session_token', 'status', 'path_data', 'started_at', 'completed_at', 'created_at'],
    jsonColumns: ['path_data'],
    conflict: ['id'],
    update: ['status', 'path_data', 'completed_at'],
  },
  quiz_results: {
    table: 'quiz_results',
    columns: ['id', 'quiz_id', 'session_id', 'user_id', 'score', 'final_node_title', 'participant_name', 'participant_email', 'results_data', 'path_data', 'time_spent_seconds', 'created_at'],
    jsonColumns: ['results_data', 'path_data'],
    conflict: ['id'],
    update: ['score', 'final_node_title', 'participant_name', 'participant_email', 'results_data', 'path_data', 'time_spent_seconds'],
  },
  entitlements: {
    table: 'entitlements',
    columns: ['user_id', 'plan', 'features', 'source', 'valid_until', 'updated_at'],
    jsonColumns: ['features'],
    conflict: ['user_id'],
    update: ['plan', 'features', 'source', 'valid_until', 'updated_at'],
  },
  payments: {
    table: 'payments',
    columns: ['id', 'user_id', 'plan_id', 'amount_kopecks', 'currency', 'status', 'provider', 'external_id', 'description', 'created_at', 'receipt_url', 'is_recurring', 'save_payment_method', 'payment_method_id', 'raw_payload', 'idempotence_key'],
    jsonColumns: ['raw_payload'],
    conflict: ['id'],
    update: [],
  },
  subscriptions: {
    table: 'subscriptions',
    columns: ['id', 'user_id', 'plan_id', 'status', 'current_period_start', 'current_period_end', 'cancel_at_period_end', 'canceled_at', 'provider', 'provider_subscription_id', 'payment_method_id', 'last_payment_id', 'created_at', 'updated_at'],
    conflict: ['id'],
    update: [],
  },
  support_tickets: {
    table: 'support_tickets',
    columns: ['id', 'user_id', 'email', 'subject', 'category', 'priority', 'status', 'message', 'assigned_to', 'internal_note', 'resolution', 'closed_at', 'created_at', 'updated_at'],
    conflict: ['id'],
    update: ['status', 'assigned_to', 'internal_note', 'resolution', 'closed_at', 'updated_at'],
  },
  support_ticket_messages: {
    table: 'support_ticket_messages',
    columns: ['id', 'ticket_id', 'sender_id', 'sender_user_id', 'sender_kind', 'body', 'message', 'attachment_name', 'attachment_url', 'created_at'],
    conflict: ['id'],
    update: [],
  },
  webhook_events: {
    table: 'webhook_events',
    columns: ['id', 'provider', 'event_type', 'external_id', 'payload', 'processed_at', 'error', 'created_at'],
    jsonColumns: ['payload'],
    conflict: ['id'],
    update: [],
  },
};

function quoteIdent(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

function parseEvent(event) {
  if (!event) return {};
  if (typeof event === 'string') return JSON.parse(event);
  if (typeof event.body === 'string') return JSON.parse(event.body);
  return event;
}

function buildUpsert(config, rowCount) {
  const columns = config.columns.map(quoteIdent).join(', ');
  const values = [];
  let param = 1;
  for (let row = 0; row < rowCount; row += 1) {
    const params = config.columns.map(() => `$${param++}`).join(', ');
    values.push(`(${params})`);
  }

  const conflict = config.conflict.map(quoteIdent).join(', ');
  const updates = config.update.length
    ? `do update set ${config.update.map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`).join(', ')}`
    : 'do nothing';

  return `insert into public.${quoteIdent(config.table)} (${columns}) values ${values.join(', ')} on conflict (${conflict}) ${updates}`;
}

module.exports.handler = async (event) => {
  const payload = parseEvent(event);
  const config = CONFIGS[payload.table];
  if (!config) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Unsupported table' }) };
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (rows.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, table: payload.table, rows: 0 }) };
  }

  const params = [];
  const jsonColumns = new Set(config.jsonColumns || []);
  for (const row of rows) {
    for (const column of config.columns) {
      const value = row[column] ?? null;
      params.push(value !== null && jsonColumns.has(column) ? JSON.stringify(value) : value);
    }
  }

  const client = new Client({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 6432),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: process.env.PG_CA_CERT
      ? { rejectUnauthorized: true, ca: process.env.PG_CA_CERT }
      : { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  await client.connect();
  try {
    await client.query(buildUpsert(config, rows.length), params);
    return { statusCode: 200, body: JSON.stringify({ ok: true, table: payload.table, rows: rows.length }) };
  } finally {
    await client.end();
  }
};
