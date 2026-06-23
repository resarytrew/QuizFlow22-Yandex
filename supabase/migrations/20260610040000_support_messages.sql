-- =============================================================================
-- Поток - support ticket conversation messages
-- =============================================================================

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_kind text not null check (sender_kind in ('user', 'staff', 'system')),
  body text not null check (char_length(body) between 1 and 4000),
  attachment_name text,
  attachment_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_ticket_created
  on public.support_ticket_messages(ticket_id, created_at);

alter table public.support_ticket_messages enable row level security;

drop policy if exists support_messages_read_own_ticket on public.support_ticket_messages;
create policy support_messages_read_own_ticket
  on public.support_ticket_messages for select to authenticated
  using (
    exists (
      select 1
      from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

drop policy if exists support_messages_insert_own_ticket on public.support_ticket_messages;
create policy support_messages_insert_own_ticket
  on public.support_ticket_messages for insert to authenticated
  with check (
    sender_kind = 'user'
    and sender_user_id = auth.uid()
    and exists (
      select 1
      from public.support_tickets t
      where t.id = ticket_id
        and t.user_id = auth.uid()
        and t.status <> 'closed'
    )
  );

grant select, insert on public.support_ticket_messages to authenticated;
revoke update, delete on public.support_ticket_messages from anon, authenticated;

insert into public.support_ticket_messages (
  ticket_id,
  sender_user_id,
  sender_kind,
  body,
  created_at
)
select
  t.id,
  t.user_id,
  'user',
  t.message,
  t.created_at
from public.support_tickets t
where not exists (
  select 1 from public.support_ticket_messages m where m.ticket_id = t.id
);
