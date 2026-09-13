import { query, execute } from '../_shared/db';

export async function handler() {
  console.log('[cron] starting cleanup...');

  const results: string[] = [];

  // 1. Clean expired rate limits
  const deletedRateLimits = await execute(
    `DELETE FROM public.ai_rate_limits WHERE window_start < now() - interval '2 hours'`
  );
  results.push(`rate_limits: ${deletedRateLimits} deleted`);

  // 2. Cancel expired subscriptions (past due: period ended > 24h ago)
  const expiredSubs = await execute(
    `UPDATE public.subscriptions
     SET status = 'canceled', canceled_at = now(), updated_at = now()
     WHERE status = 'active'
       AND current_period_end < now() - interval '24 hours'
       AND cancel_at_period_end = true`
  );
  results.push(`expired_subs_canceled: ${expiredSubs}`);

  // 3. Downgrade entitlements for canceled/expired subscriptions
  const downgraded = await execute(
    `UPDATE public.entitlements
     SET plan = 'free', features = '{"max_quizzes":3,"ai_tier":"basic","hide_branding":false,"premium_templates":false,"unlimited_logic":false}'::jsonb,
         valid_until = NULL, source = 'system'
     WHERE user_id IN (
       SELECT user_id FROM public.subscriptions
       WHERE status IN ('canceled', 'expired')
         AND current_period_end < now()
     )
     AND plan != 'free'`
  );
  results.push(`entitlements_downgraded: ${downgraded}`);

  // 4. Mark past_due subscriptions (period ended but not yet canceled)
  const markedPastDue = await execute(
    `UPDATE public.subscriptions
     SET status = 'past_due', updated_at = now()
     WHERE status = 'active'
       AND current_period_end < now()
       AND cancel_at_period_end = false`
  );
  results.push(`marked_past_due: ${markedPastDue}`);

  // 5. Clean old quiz results (> 90 days, keep summary)
  const oldResults = await execute(
    `DELETE FROM public.quiz_results
     WHERE created_at < now() - interval '90 days'
       AND path_data IS NOT NULL`
  );
  results.push(`old_results_cleaned: ${oldResults}`);

  // 6. Clean old webhook events (> 30 days)
  const oldWebhooks = await execute(
    `DELETE FROM public.webhook_events
     WHERE created_at < now() - interval '30 days'`
  );
  results.push(`old_webhooks_cleaned: ${oldWebhooks}`);

  // 7. Clean abandoned quiz sessions (> 7 days)
  const abandonedSessions = await execute(
    `UPDATE public.quiz_sessions
     SET status = 'abandoned', abandoned_at = now()
     WHERE status = 'active'
       AND started_at < now() - interval '7 days'`
  );
  results.push(`abandoned_sessions: ${abandonedSessions}`);

  // 8. Clean old CSP reports (> 30 days)
  const oldCsp = await execute(
    `DELETE FROM public.csp_reports WHERE created_at < now() - interval '30 days'`
  );
  results.push(`old_csp_reports: ${oldCsp}`);

  const expiredAuthSessions = await execute(
    `DELETE FROM public.auth_sessions
     WHERE expires_at < now() - interval '30 days'
        OR revoked_at < now() - interval '30 days'`
  );
  results.push(`auth_sessions_cleaned: ${expiredAuthSessions}`);

  const expiredAuthArtifacts = await execute(
    `WITH deleted_codes AS (
       DELETE FROM public.auth_codes WHERE expires_at < now() - interval '1 day' RETURNING 1
     ), deleted_resets AS (
       DELETE FROM public.auth_reset_tokens WHERE expires_at < now() - interval '1 day' RETURNING 1
     ), deleted_states AS (
       DELETE FROM public.auth_oauth_states WHERE expires_at < now() - interval '1 day' RETURNING 1
     ) SELECT count(*) FROM deleted_codes, deleted_resets, deleted_states`
  ).catch(() => 0);
  results.push(`auth_artifacts_cleaned: ${expiredAuthArtifacts}`);

  const oldAuthLimits = await execute(
    `DELETE FROM public.auth_rate_limits WHERE updated_at < now() - interval '1 day'`
  ).catch(() => 0);
  results.push(`auth_rate_limits_cleaned: ${oldAuthLimits}`);

  console.log('[cron] cleanup results:', results.join(', '));

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, results }),
  };
}
