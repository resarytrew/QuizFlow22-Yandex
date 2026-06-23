const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { Client } = require('../yc-functions/node_modules/pg');

const YC = process.env.YC_BIN || 'C:\\Users\\enekr\\yandex-cloud\\bin\\yc.exe';
const CHUNK_SIZE = Number(process.env.MIGRATION_CHUNK_SIZE || 100);
const MAX_PAYLOAD_BYTES = Number(process.env.MIGRATION_MAX_PAYLOAD_BYTES || 2800000);
const START_TABLE = process.env.START_TABLE || '';

const source = new Client({
  host: process.env.SUPABASE_DB_HOST || 'aws-1-eu-central-1.pooler.supabase.com',
  port: Number(process.env.SUPABASE_DB_PORT || 6543),
  database: process.env.SUPABASE_DB_DATABASE || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres.lntsyybfbunajmzbahrq',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

function normalizeSessionStatus(value) {
  if (value === 'completed') return 'completed';
  if (value === 'abandoned') return 'abandoned';
  return 'active';
}

const jobs = [
  {
    table: 'users',
    sql: `select id, email, coalesce(created_at, now()) as created_at, coalesce(updated_at, created_at, now()) as updated_at
          from auth.users where email is not null order by created_at`,
    map: (r) => r,
  },
  {
    table: 'profiles',
    sql: `select id, account_code, username, display_name, status, blocked_until, block_reason,
                 last_active_at, coalesce(created_at, now()) as created_at, coalesce(updated_at, now()) as updated_at
          from public.profiles order by created_at`,
    map: (r) => ({
      user_id: r.id,
      account_code: String(r.account_code),
      username: r.username,
      display_name: r.display_name,
      status: r.status || 'active',
      blocked_until: r.blocked_until,
      block_reason: r.block_reason,
      last_active_at: r.last_active_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }),
  },
  {
    table: 'quizzes',
    sql: `select id, user_id, name, description, quiz_data, visibility, cover_image_url, is_favorite,
                 published_at, moderation_status, moderation_reason, moderated_by, moderated_at, deleted_at,
                 coalesce(created_at, now()) as created_at, coalesce(updated_at, now()) as updated_at
          from public.quizzes order by created_at`,
    map: (r) => ({
      ...r,
      quiz_data: r.quiz_data || {},
      visibility: r.visibility || 'private',
      is_favorite: Boolean(r.is_favorite),
      moderation_status: r.moderation_status || 'unreviewed',
    }),
  },
  {
    table: 'quiz_sessions',
    sql: `select id, quiz_id, user_id, session_token, status, path_data, started_at, completed_at, coalesce(created_at, now()) as created_at
          from public.quiz_sessions s
          where exists (select 1 from public.quizzes q where q.id = s.quiz_id)
          order by created_at`,
    map: (r) => ({
      id: r.id,
      quiz_id: r.quiz_id,
      user_id: r.user_id,
      session_token: r.session_token || r.id,
      status: normalizeSessionStatus(r.status),
      path_data: r.path_data,
      started_at: r.started_at || r.created_at,
      completed_at: r.completed_at,
      created_at: r.created_at,
    }),
  },
  {
    table: 'quiz_results',
    sql: `select id, quiz_id,
                 case when row_number() over (partition by session_id order by created_at, id) = 1
                      then session_id
                      else session_id || '_' || id::text
                 end as session_id,
                 user_id, score, final_node_title, participant_name, participant_email,
                 results_data, path_data, time_spent_seconds, coalesce(created_at, now()) as created_at
          from public.quiz_results r
          where exists (select 1 from public.quizzes q where q.id = r.quiz_id)
          order by created_at`,
    map: (r) => ({
      ...r,
      score: Math.min(Math.max(Number(r.score || 0), 0), 10000000),
      time_spent_seconds: r.time_spent_seconds == null
        ? null
        : Math.min(Math.max(Number(r.time_spent_seconds || 0), 0), 604800),
    }),
  },
  {
    table: 'entitlements',
    sql: `select user_id, plan, features, source, valid_until, updated_at from public.entitlements`,
    map: (r) => ({
      ...r,
      plan: r.plan || 'free',
      features: r.features || {},
      source: r.source || 'migration',
      updated_at: r.updated_at || new Date().toISOString(),
    }),
  },
  {
    table: 'payments',
    sql: `select id, user_id, plan_id, amount_kopecks, currency, status, provider, external_id, description, created_at,
                 receipt_url, is_recurring, save_payment_method, payment_method_id, raw_payload, idempotence_key
          from public.payments`,
    map: (r) => r,
  },
  {
    table: 'subscriptions',
    sql: `select id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end,
                 canceled_at, provider, provider_payment_id as provider_subscription_id, payment_method_id,
                 last_payment_id, created_at, updated_at
          from public.subscriptions`,
    map: (r) => r,
  },
  {
    table: 'support_tickets',
    sql: `select id, user_id, email, subject, category, priority, status, message, assigned_to,
                 internal_note, resolution, closed_at, created_at, updated_at
          from public.support_tickets`,
    map: (r) => ({
      ...r,
      status: r.status === 'new' ? 'open' : r.status,
    }),
  },
  {
    table: 'support_ticket_messages',
    sql: `select id, ticket_id, sender_user_id as sender_id, sender_user_id, sender_kind, body, body as message,
                 attachment_name, attachment_url, created_at
          from public.support_ticket_messages`,
    map: (r) => r,
  },
  {
    table: 'webhook_events',
    sql: `select id, provider, event_type, external_id, payload, processed_at, error, received_at as created_at
          from public.webhook_events`,
    map: (r) => r,
  },
];

function invokeChunk(table, rows) {
  const payloadFile = path.join(os.tmpdir(), `quizflow-import-${table}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  fs.writeFileSync(payloadFile, JSON.stringify({ table, rows }));
  try {
    let lastError;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        const output = execFileSync(YC, ['serverless', 'function', 'invoke', 'potok-import-chunk', '--data-file', payloadFile, '--format', 'json'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 180000,
        });
        const parsed = JSON.parse(output);
        if (parsed.statusCode && parsed.statusCode >= 400) {
          throw new Error(parsed.body || output);
        }
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 5) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 1500);
        }
      }
    }
    throw lastError;
  } finally {
    fs.rmSync(payloadFile, { force: true });
  }
}

function makeChunks(table, rows) {
  const chunks = [];
  let current = [];

  for (const row of rows) {
    const candidate = [...current, row];
    const candidateBytes = Buffer.byteLength(JSON.stringify({ table, rows: candidate }));
    if (current.length > 0 && (candidate.length > CHUNK_SIZE || candidateBytes > MAX_PAYLOAD_BYTES)) {
      chunks.push(current);
      current = [row];
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

(async () => {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    throw new Error('SUPABASE_DB_PASSWORD is required');
  }

  await source.connect();
  const summary = [];
  try {
    for (const job of jobs) {
      if (START_TABLE) {
        const startIndex = jobs.findIndex((candidate) => candidate.table === START_TABLE);
        const currentIndex = jobs.findIndex((candidate) => candidate.table === job.table);
        if (startIndex !== -1 && currentIndex < startIndex) {
          continue;
        }
      }
      const { rows } = await source.query(job.sql);
      const mapped = rows.map(job.map);
      for (const chunk of makeChunks(job.table, mapped)) {
        invokeChunk(job.table, chunk);
      }
      summary.push({ table: job.table, rows: mapped.length });
      console.log(`${job.table}: ${mapped.length}`);
    }
  } finally {
    await source.end();
  }

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
