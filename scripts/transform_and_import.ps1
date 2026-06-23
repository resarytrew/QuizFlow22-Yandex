#Requires -Version 5.1
<#
.SYNOPSIS
    Трансформация и импорт данных из Supabase в Yandex Cloud PostgreSQL.

.DESCRIPTION
    Восстанавливает дамп Supabase во временную БД, трансформирует данные
    под схему yc_migration.sql и импортирует в целевую БД.

.PARAMETER SupabaseDump
    Путь к файлу дампа Supabase (*.pgdump).

.PARAMETER PG_DSN
    Строка подключения к целевой PostgreSQL.
    Формат: "host=<ХОСТ> port=6432 dbname=quizflow user=quizflow_app sslmode=verify-full"

.EXAMPLE
    .\transform_and_import.ps1 -SupabaseDump supabase_data.pgdump -PG_DSN "host=rc1a-xxx.mdb.yandexcloud.net port=6432 dbname=quizflow user=quizflow_app sslmode=verify-full"
#>
param(
  [Parameter(Mandatory=$true)]
  [string]$SupabaseDump,

  [Parameter(Mandatory=$true)]
  [string]$PG_DSN
)

$ErrorActionPreference = "Stop"

Write-Host "=== QuizFlow22 Data Migration ===" -ForegroundColor Cyan
Write-Host "Source: $SupabaseDump" -ForegroundColor Gray
Write-Host "Target: $PG_DSN" -ForegroundColor Gray

# --- Validate input ---
if (-not (Test-Path $SupabaseDump)) {
  throw "Dump file not found: $SupabaseDump"
}

# --- Step 1: Create temporary database ---
Write-Host "`n[1/8] Creating temporary database..." -ForegroundColor Yellow
$tempDb = "temp_restore_$(Get-Date -Format 'yyyyMMddHHmmss')"
$tempDSN = $PG_DSN -replace 'dbname=\w+', "dbname=$tempDb"

try {
  # Extract connection params for psql
  $hostMatch = [regex]::Match($PG_DSN, 'host=(\S+)')
  $portMatch = [regex]::Match($PG_DSN, 'port=(\d+)')
  $userMatch = [regex]::Match($PG_DSN, 'user=(\S+)')
  $targetDb = ([regex]::Match($PG_DSN, 'dbname=(\S+)')).Groups[1].Value

  $pgHost = $hostMatch.Groups[1].Value
  $pgPort = $portMatch.Groups[1].Value
  $pgUser = $userMatch.Groups[1].Value

  $baseDSN = "host=$pgHost port=$pgPort user=$pgUser dbname=postgres sslmode=verify-full"

  psql $baseDSN -c "CREATE DATABASE $tempDb;"
  Write-Host "  Created $tempDb" -ForegroundColor Green

  # --- Step 2: Restore dump into temp database ---
  Write-Host "`n[2/8] Restoring dump into temporary database..." -ForegroundColor Yellow
  pg_restore --no-owner --no-acl --dbname="$tempDSN" "$SupabaseDump" 2>&1 | ForEach-Object {
    if ($_ -match 'ERROR') { Write-Host "  $_" -ForegroundColor Red }
  }
  Write-Host "  Restore complete" -ForegroundColor Green

  # --- Step 3: Migrate users from auth.users ---
  Write-Host "`n[3/8] Migrating users from auth.users..." -ForegroundColor Yellow
  psql $PG_DSN -c @"
INSERT INTO public.users (id, email, role, created_at)
SELECT
  id,
  email,
  CASE
    WHEN raw_user_meta_data->>'role' = 'admin' THEN 'admin'
    ELSE 'user'
  END,
  COALESCE(created_at, now())
FROM ${tempDb}.auth.users
ON CONFLICT (id) DO NOTHING;
"@
  $userCount = (psql $PG_DSN -t -A -c "SELECT COUNT(*) FROM public.users" 2>$null).Trim()
  Write-Host "  Users: $userCount" -ForegroundColor Green

  # --- Step 4: Migrate quizzes ---
  Write-Host "`n[4/8] Migrating quizzes..." -ForegroundColor Yellow
  psql $PG_DSN -c @"
INSERT INTO public.quizzes (id, user_id, name, description, quiz_data, visibility, is_favorite, published_at, created_at, updated_at)
SELECT
  q.id,
  q.user_id,
  q.name,
  q.description,
  q.quiz_data,
  COALESCE(
    q.visibility,
    CASE WHEN q.is_published THEN 'public' ELSE 'private' END,
    'private'
  ),
  COALESCE(q.is_favorite, false),
  q.published_at,
  COALESCE(q.created_at, now()),
  COALESCE(q.updated_at, now())
FROM ${tempDb}.public.quizzes q
WHERE q.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;
"@
  $quizCount = (psql $PG_DSN -t -A -c "SELECT COUNT(*) FROM public.quizzes" 2>$null).Trim()
  Write-Host "  Quizzes: $quizCount" -ForegroundColor Green

  # --- Step 5: Migrate subscriptions ---
  Write-Host "`n[5/8] Migrating subscriptions..." -ForegroundColor Yellow
  psql $PG_DSN -c @"
INSERT INTO public.subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at, provider, created_at, updated_at)
SELECT
  s.id,
  s.user_id,
  s.plan_id,
  s.status,
  s.current_period_start,
  s.current_period_end,
  COALESCE(s.cancel_at_period_end, false),
  s.canceled_at,
  COALESCE(s.provider, 'yookassa'),
  COALESCE(s.created_at, now()),
  COALESCE(s.updated_at, now())
FROM ${tempDb}.public.subscriptions s
ON CONFLICT (id) DO NOTHING;
"@
  $subCount = (psql $PG_DSN -t -A -c "SELECT COUNT(*) FROM public.subscriptions" 2>$null).Trim()
  Write-Host "  Subscriptions: $subCount" -ForegroundColor Green

  # --- Step 6: Migrate payments ---
  Write-Host "`n[6/8] Migrating payments..." -ForegroundColor Yellow
  psql $PG_DSN -c @"
INSERT INTO public.payments (id, user_id, plan_id, amount_kopecks, currency, status, provider, provider_payment_id, description, created_at)
SELECT
  p.id,
  p.user_id,
  p.plan_id,
  p.amount_kopecks,
  COALESCE(p.currency, 'RUB'),
  p.status,
  COALESCE(p.provider, 'yookassa'),
  COALESCE(p.external_id, p.provider_payment_id),
  p.description,
  COALESCE(p.created_at, now())
FROM ${tempDb}.public.payments p
ON CONFLICT (id) DO NOTHING;
"@
  $payCount = (psql $PG_DSN -t -A -c "SELECT COUNT(*) FROM public.payments" 2>$null).Trim()
  Write-Host "  Payments: $payCount" -ForegroundColor Green

  # --- Step 7: Migrate quiz_results ---
  Write-Host "`n[7/8] Migrating quiz_results..." -ForegroundColor Yellow
  psql $PG_DSN -c @"
INSERT INTO public.quiz_results (id, quiz_id, session_id, user_id, score, final_node_title, participant_name, participant_email, results_data, path_data, time_spent_seconds, created_at)
SELECT
  r.id,
  r.quiz_id,
  COALESCE(r.session_id::text, 'migrated_' || r.id),
  r.user_id,
  r.score,
  r.final_node_title,
  r.participant_name,
  r.participant_email,
  r.results_data,
  r.path_data,
  r.time_spent_seconds,
  COALESCE(r.created_at, now())
FROM ${tempDb}.public.quiz_results r
ON CONFLICT (id) DO NOTHING;
"@
  $resCount = (psql $PG_DSN -t -A -c "SELECT COUNT(*) FROM public.quiz_results" 2>$null).Trim()
  Write-Host "  Quiz results: $resCount" -ForegroundColor Green

  # --- Step 8: Migrate support tickets ---
  Write-Host "`n[8/8] Migrating support tickets..." -ForegroundColor Yellow
  psql $PG_DSN -c @"
INSERT INTO public.support_tickets (id, user_id, subject, category, priority, status, created_at, updated_at)
SELECT
  st.id,
  st.user_id,
  st.subject,
  COALESCE(st.category, 'general'),
  COALESCE(st.priority, 'normal'),
  st.status,
  COALESCE(st.created_at, now()),
  COALESCE(st.updated_at, now())
FROM ${tempDb}.public.support_tickets st
ON CONFLICT (id) DO NOTHING;
"@ 2>$null
  Write-Host "  Support tickets migrated" -ForegroundColor Green

  # --- Cleanup ---
  Write-Host "`nCleaning up temporary database..." -ForegroundColor Yellow
  psql $baseDSN -c "DROP DATABASE IF EXISTS $tempDb;"
  Write-Host "  Done" -ForegroundColor Green

  # --- Summary ---
  Write-Host "`n=== Migration Complete ===" -ForegroundColor Cyan
  Write-Host "  Users:          $userCount" -ForegroundColor White
  Write-Host "  Quizzes:        $quizCount" -ForegroundColor White
  Write-Host "  Subscriptions:  $subCount" -ForegroundColor White
  Write-Host "  Payments:       $payCount" -ForegroundColor White
  Write-Host "  Quiz results:   $resCount" -ForegroundColor White
  Write-Host "`nVerify with:" -ForegroundColor Gray
  Write-Host "  psql `"$PG_DSN`" -c `"SELECT 'users' as tbl, COUNT(*) FROM public.users UNION ALL SELECT 'quizzes', COUNT(*) FROM public.quizzes UNION ALL SELECT 'subscriptions', COUNT(*) FROM public.subscriptions UNION ALL SELECT 'payments', COUNT(*) FROM public.payments UNION ALL SELECT 'quiz_results', COUNT(*) FROM public.quiz_results;`"" -ForegroundColor DarkGray

} catch {
  Write-Host "`nERROR: $_" -ForegroundColor Red
  Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed

  # Cleanup on error
  if ($tempDb) {
    Write-Host "`nCleaning up after error..." -ForegroundColor Yellow
    try { psql $baseDSN -c "DROP DATABASE IF EXISTS $tempDb;" 2>$null } catch {}
  }
  exit 1
}
