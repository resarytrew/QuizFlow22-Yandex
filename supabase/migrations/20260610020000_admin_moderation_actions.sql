-- =============================================================================
-- Поток - Admin moderation actions
-- Migration: 20260610020000_admin_moderation_actions.sql
--
-- Adds server-owned moderation metadata for quizzes. Physical deletes remain
-- out of the admin UI; destructive moderation uses a soft `deleted` status.
-- =============================================================================

alter table public.quizzes
  add column if not exists moderation_status text not null default 'unreviewed'
    check (
      moderation_status in (
        'unreviewed',
        'reviewing',
        'approved',
        'rejected',
        'blocked',
        'hidden',
        'deleted'
      )
    ),
  add column if not exists moderation_reason text,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists moderated_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_quizzes_moderation_status
  on public.quizzes(moderation_status, updated_at desc);

create index if not exists idx_quizzes_deleted_at
  on public.quizzes(deleted_at)
  where deleted_at is not null;
