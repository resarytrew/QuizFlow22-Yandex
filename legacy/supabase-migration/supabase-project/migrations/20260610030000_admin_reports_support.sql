-- =============================================================================
-- Поток - reports and support queues for the admin panel
-- =============================================================================

create table if not exists public.quiz_reports (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (
    reason in (
      'extremism', 'terrorism', 'violence', 'pornography',
      'sexual_content', 'harassment', 'hate', 'spam',
      'fraud', 'copyright', 'misinformation', 'other'
    )
  ),
  comment text,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'approved', 'rejected', 'closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quiz_reports_status_created
  on public.quiz_reports(status, created_at desc);
create index if not exists idx_quiz_reports_quiz
  on public.quiz_reports(quiz_id, created_at desc);
create index if not exists idx_quiz_reports_reporter
  on public.quiz_reports(reporter_user_id, created_at desc)
  where reporter_user_id is not null;

drop trigger if exists tg_quiz_reports_updated_at on public.quiz_reports;
create trigger tg_quiz_reports_updated_at
  before update on public.quiz_reports
  for each row execute function public.tg_touch_updated_at();

alter table public.quiz_reports enable row level security;

drop policy if exists quiz_reports_insert_authenticated on public.quiz_reports;
create policy quiz_reports_insert_authenticated
  on public.quiz_reports for insert to authenticated
  with check (
    reporter_user_id = auth.uid()
    and exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and q.visibility in ('public', 'unlisted')
    )
  );

drop policy if exists quiz_reports_read_own on public.quiz_reports;
create policy quiz_reports_read_own
  on public.quiz_reports for select to authenticated
  using (reporter_user_id = auth.uid());

revoke update, delete on public.quiz_reports from anon, authenticated;
grant select, insert on public.quiz_reports to authenticated;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  subject text not null,
  category text not null default 'general'
    check (category in ('general', 'account', 'billing', 'quiz', 'technical', 'other')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'waiting_user', 'closed')),
  message text not null,
  assigned_to uuid references auth.users(id) on delete set null,
  internal_note text,
  resolution text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or email is not null)
);

create index if not exists idx_support_tickets_status_created
  on public.support_tickets(status, created_at desc);
create index if not exists idx_support_tickets_user
  on public.support_tickets(user_id, created_at desc)
  where user_id is not null;
create index if not exists idx_support_tickets_assigned
  on public.support_tickets(assigned_to, status)
  where assigned_to is not null;

drop trigger if exists tg_support_tickets_updated_at on public.support_tickets;
create trigger tg_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.tg_touch_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own
  on public.support_tickets for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists support_tickets_read_own on public.support_tickets;
create policy support_tickets_read_own
  on public.support_tickets for select to authenticated
  using (user_id = auth.uid());

revoke update, delete on public.support_tickets from anon, authenticated;
grant select, insert on public.support_tickets to authenticated;
