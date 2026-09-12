const { Client } = require('pg');

const SOURCE_CONFIG = {
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT || 6543),
  database: process.env.SUPABASE_DB_DATABASE || 'postgres',
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
};

const TARGET_CONFIG = {
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT || 6432),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: process.env.PG_CA_CERT
    ? { rejectUnauthorized: true, ca: process.env.PG_CA_CERT }
    : { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
};

async function copyRows(source, target, name, selectSql, insertSql, mapper = (row) => row) {
  const { rows } = await source.query(selectSql);
  let inserted = 0;
  for (const raw of rows) {
    const values = mapper(raw);
    await target.query(insertSql, values);
    inserted += 1;
  }
  return { table: name, rows: rows.length, upserted: inserted };
}

module.exports.handler = async () => {
  const source = new Client(SOURCE_CONFIG);
  const target = new Client(TARGET_CONFIG);
  await source.connect();
  await target.connect();

  const summary = [];
  try {
    await target.query('begin');

    summary.push(await copyRows(
      source,
      target,
      'users',
      `select id, email, coalesce(created_at, now()) as created_at, coalesce(updated_at, created_at, now()) as updated_at
       from auth.users
       where email is not null
       order by created_at`,
      `insert into public.users (id, email, created_at, updated_at)
       values ($1, $2, $3, $4)
       on conflict (id) do update set email = excluded.email, updated_at = excluded.updated_at`,
      (r) => [r.id, r.email, r.created_at, r.updated_at],
    ));

    summary.push(await copyRows(
      source,
      target,
      'profiles',
      `select id, account_code, username, display_name, status, blocked_until, block_reason,
              last_active_at, coalesce(created_at, now()) as created_at, coalesce(updated_at, now()) as updated_at
       from public.profiles
       order by created_at`,
      `insert into public.profiles
         (user_id, account_code, username, display_name, status, blocked_until, block_reason, last_active_at, created_at, updated_at)
       values ($1, $2, $3, $4, coalesce($5, 'active'), $6, $7, $8, $9, $10)
       on conflict (user_id) do update set
         account_code = excluded.account_code,
         username = excluded.username,
         display_name = excluded.display_name,
         status = excluded.status,
         blocked_until = excluded.blocked_until,
         block_reason = excluded.block_reason,
         last_active_at = excluded.last_active_at,
         updated_at = excluded.updated_at`,
      (r) => [r.id, String(r.account_code), r.username, r.display_name, r.status, r.blocked_until, r.block_reason, r.last_active_at, r.created_at, r.updated_at],
    ));

    summary.push(await copyRows(
      source,
      target,
      'quizzes',
      `select id, user_id, name, description, quiz_data, visibility, cover_image_url, is_favorite,
              published_at, moderation_status, moderation_reason, moderated_by, moderated_at, deleted_at,
              coalesce(created_at, now()) as created_at, coalesce(updated_at, now()) as updated_at
       from public.quizzes
       order by created_at`,
      `insert into public.quizzes
         (id, user_id, name, description, quiz_data, visibility, cover_image_url, is_favorite,
          published_at, moderation_status, moderation_reason, moderated_by, moderated_at, deleted_at, created_at, updated_at)
       values ($1, $2, $3, $4, coalesce($5, '{}'::jsonb), coalesce($6, 'private'), $7, coalesce($8, false),
               $9, coalesce($10, 'unreviewed'), $11, $12, $13, $14, $15, $16)
       on conflict (id) do update set
         name = excluded.name,
         description = excluded.description,
         quiz_data = excluded.quiz_data,
         visibility = excluded.visibility,
         cover_image_url = excluded.cover_image_url,
         is_favorite = excluded.is_favorite,
         published_at = excluded.published_at,
         moderation_status = excluded.moderation_status,
         moderation_reason = excluded.moderation_reason,
         moderated_by = excluded.moderated_by,
         moderated_at = excluded.moderated_at,
         deleted_at = excluded.deleted_at,
         updated_at = excluded.updated_at`,
      (r) => [r.id, r.user_id, r.name, r.description, r.quiz_data, r.visibility, r.cover_image_url, r.is_favorite, r.published_at, r.moderation_status, r.moderation_reason, r.moderated_by, r.moderated_at, r.deleted_at, r.created_at, r.updated_at],
    ));

    summary.push(await copyRows(
      source,
      target,
      'quiz_sessions',
      `select id, quiz_id, user_id, participant_name, participant_email, status, score,
              variables, achievements, path_data, started_at, completed_at, time_spent_seconds, session_token,
              coalesce(created_at, now()) as created_at, coalesce(updated_at, now()) as updated_at
       from public.quiz_sessions
       order by created_at`,
      `insert into public.quiz_sessions
         (id, quiz_id, user_id, participant_name, participant_email, status, score, variables, achievements,
          path_data, started_at, completed_at, time_spent_seconds, session_token, created_at, updated_at)
       values ($1, $2, $3, $4, $5, coalesce($6, 'started'), $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       on conflict (id) do update set
         status = excluded.status,
         score = excluded.score,
         variables = excluded.variables,
         achievements = excluded.achievements,
         path_data = excluded.path_data,
         completed_at = excluded.completed_at,
         time_spent_seconds = excluded.time_spent_seconds,
         updated_at = excluded.updated_at`,
      (r) => [r.id, r.quiz_id, r.user_id, r.participant_name, r.participant_email, r.status, r.score, r.variables, r.achievements, r.path_data, r.started_at, r.completed_at, r.time_spent_seconds, r.session_token, r.created_at, r.updated_at],
    ));

    summary.push(await copyRows(
      source,
      target,
      'quiz_results',
      `select id, quiz_id, session_id, user_id, score, final_node_title, participant_name, participant_email,
              results_data, path_data, time_spent_seconds, coalesce(created_at, now()) as created_at
       from public.quiz_results
       order by created_at`,
      `insert into public.quiz_results
         (id, quiz_id, session_id, user_id, score, final_node_title, participant_name, participant_email,
          results_data, path_data, time_spent_seconds, created_at)
       values ($1, $2, coalesce($3, 'migrated_' || $1::text), $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (id) do update set
         score = excluded.score,
         final_node_title = excluded.final_node_title,
         participant_name = excluded.participant_name,
         participant_email = excluded.participant_email,
         results_data = excluded.results_data,
         path_data = excluded.path_data,
         time_spent_seconds = excluded.time_spent_seconds`,
      (r) => [r.id, r.quiz_id, r.session_id, r.user_id, r.score, r.final_node_title, r.participant_name, r.participant_email, r.results_data, r.path_data, r.time_spent_seconds, r.created_at],
    ));

    const optionalCopies = [
      {
        name: 'entitlements',
        select: `select user_id, plan, features, source, valid_until, updated_at from public.entitlements`,
        insert: `insert into public.entitlements (user_id, plan, features, source, valid_until, updated_at)
                 values ($1, coalesce($2, 'free'), coalesce($3, '{}'::jsonb), coalesce($4, 'migration'), $5, coalesce($6, now()))
                 on conflict (user_id) do update set plan=excluded.plan, features=excluded.features, source=excluded.source, valid_until=excluded.valid_until, updated_at=excluded.updated_at`,
        map: (r) => [r.user_id, r.plan, r.features, r.source, r.valid_until, r.updated_at],
      },
      {
        name: 'payments',
        select: `select id, user_id, plan_id, amount_kopecks, currency, status, provider, external_id, description, created_at,
                        receipt_url, is_recurring, save_payment_method, payment_method_id, raw_payload, idempotence_key
                 from public.payments`,
        insert: `insert into public.payments
                   (id, user_id, plan_id, amount_kopecks, currency, status, provider, external_id, description, created_at,
                    receipt_url, is_recurring, save_payment_method, payment_method_id, raw_payload, idempotence_key)
                 values ($1,$2,$3,$4,coalesce($5,'RUB'),$6,coalesce($7,'yookassa'),$8,$9,coalesce($10,now()),$11,coalesce($12,false),coalesce($13,false),$14,$15,$16)
                 on conflict (id) do nothing`,
        map: (r) => [r.id, r.user_id, r.plan_id, r.amount_kopecks, r.currency, r.status, r.provider, r.external_id, r.description, r.created_at, r.receipt_url, r.is_recurring, r.save_payment_method, r.payment_method_id, r.raw_payload, r.idempotence_key],
      },
      {
        name: 'subscriptions',
        select: `select id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end,
                        canceled_at, provider, provider_payment_id, payment_method_id, last_payment_id, created_at, updated_at
                 from public.subscriptions`,
        insert: `insert into public.subscriptions
                   (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end,
                    canceled_at, provider, provider_subscription_id, payment_method_id, last_payment_id, created_at, updated_at)
                 values ($1,$2,$3,$4,$5,$6,coalesce($7,false),$8,coalesce($9,'yookassa'),$10,$11,$12,coalesce($13,now()),coalesce($14,now()))
                 on conflict (id) do nothing`,
        map: (r) => [r.id, r.user_id, r.plan_id, r.status, r.current_period_start, r.current_period_end, r.cancel_at_period_end, r.canceled_at, r.provider, r.provider_payment_id, r.payment_method_id, r.last_payment_id, r.created_at, r.updated_at],
      },
      {
        name: 'support_tickets',
        select: `select id, user_id, email, subject, category, priority, status, message, assigned_to, internal_note, resolution, closed_at, created_at, updated_at from public.support_tickets`,
        insert: `insert into public.support_tickets
                   (id, user_id, email, subject, category, priority, status, message, assigned_to, internal_note, resolution, closed_at, created_at, updated_at)
                 values ($1,$2,$3,$4,coalesce($5,'general'),coalesce($6,'normal'),coalesce($7,'open'),$8,$9,$10,$11,$12,coalesce($13,now()),coalesce($14,now()))
                 on conflict (id) do update set status=excluded.status, assigned_to=excluded.assigned_to, internal_note=excluded.internal_note, resolution=excluded.resolution, closed_at=excluded.closed_at, updated_at=excluded.updated_at`,
        map: (r) => [r.id, r.user_id, r.email, r.subject, r.category, r.priority, r.status, r.message, r.assigned_to, r.internal_note, r.resolution, r.closed_at, r.created_at, r.updated_at],
      },
      {
        name: 'support_ticket_messages',
        select: `select id, ticket_id, sender_user_id, sender_kind, body, attachment_name, attachment_url, created_at from public.support_ticket_messages`,
        insert: `insert into public.support_ticket_messages
                   (id, ticket_id, sender_user_id, sender_kind, body, attachment_name, attachment_url, created_at)
                 values ($1,$2,$3,coalesce($4,'user'),$5,$6,$7,coalesce($8,now()))
                 on conflict (id) do nothing`,
        map: (r) => [r.id, r.ticket_id, r.sender_user_id, r.sender_kind, r.body, r.attachment_name, r.attachment_url, r.created_at],
      },
      {
        name: 'webhook_events',
        select: `select id, provider, event_type, external_id, payload, processed_at, error, received_at from public.webhook_events`,
        insert: `insert into public.webhook_events (id, provider, event_type, external_id, payload, processed_at, error, received_at)
                 values ($1,$2,$3,$4,$5,$6,$7,coalesce($8,now())) on conflict (id) do nothing`,
        map: (r) => [r.id, r.provider, r.event_type, r.external_id, r.payload, r.processed_at, r.error, r.received_at],
      },
      {
        name: 'csp_reports',
        select: `select id, report, user_agent, created_at from public.csp_reports`,
        insert: `insert into public.csp_reports (id, report, user_agent, created_at)
                 values ($1,$2,$3,coalesce($4,now())) on conflict (id) do nothing`,
        map: (r) => [r.id, r.report, r.user_agent, r.created_at],
      },
    ];

    for (const copy of optionalCopies) {
      summary.push(await copyRows(source, target, copy.name, copy.select, copy.insert, copy.map));
    }

    await target.query('commit');

    const counts = await target.query(`
      select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int as rows
      from information_schema.tables
      where table_schema = 'public' and table_name = any($1)
      order by table_name
    `, [['users', 'profiles', 'quizzes', 'quiz_sessions', 'quiz_results', 'entitlements', 'payments', 'subscriptions', 'support_tickets', 'support_ticket_messages']]);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, summary, counts: counts.rows }),
    };
  } catch (error) {
    await target.query('rollback');
    throw error;
  } finally {
    await source.end();
    await target.end();
  }
};
