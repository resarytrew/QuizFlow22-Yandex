-- ============================================================================
-- Поток — Three-level quiz visibility (private / unlisted / public)
-- Migration: 20260609000000_quiz_visibility.sql
--
-- Adds a single `visibility` text column on public.quizzes, backfills it
-- from the existing is_published boolean, and installs:
--   * sync_is_published()           — keeps is_published/published_at in sync
--                                      with visibility (back-compat for
--                                      edge functions and gallery).
--   * validate_quiz_visibility()    — server-side gate: free users cannot
--                                      create or transition INTO private or
--                                      unlisted. Updates that keep the same
--                                      visibility (content edits) are
--                                      grandfathered in, so a user who
--                                      downgrades from PRO to free can still
--                                      finish editing their existing private
--                                      or unlisted quizzes.
--   * quizzes_read_public_or_unlisted — replaces the old
--                                      quizzes_read_published policy and
--                                      matches the new model: anyone can
--                                      SELECT a public or unlisted row, but
--                                      not private. Owners always reach
--                                      their own rows through quizzes_rw_own.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Column + check constraint + indexes
-- ----------------------------------------------------------------------------
alter table public.quizzes
  add column if not exists visibility text not null default 'public'
    check (visibility in ('private','unlisted','public'));

create index if not exists idx_quizzes_visibility
  on public.quizzes (visibility);
create index if not exists idx_quizzes_public_published
  on public.quizzes (published_at desc)
  where visibility = 'public';

-- ----------------------------------------------------------------------------
-- 2. Backfill. We only overwrite the default ('public') rows, so a row
--    that already has a non-default value (in theory; in practice all
--    existing rows are 'public' because we just added the column) is
--    preserved. Black-and-white translation of the old is_published flag:
--      true  → public
--      false → private
--    Free users with existing 'private' (formerly draft) quizzes keep
--    them; the visibility trigger below forbids creating NEW private
--    quizzes for free users and forbids transitioning a quiz INTO
--    private/unlisted, but allows continuing to edit existing ones.
-- ----------------------------------------------------------------------------
update public.quizzes
   set visibility = case when is_published = true then 'public' else 'private' end
 where visibility = 'public';

-- ----------------------------------------------------------------------------
-- 3. sync_is_published() — make is_published / published_at a derived view
--    of visibility, so the rest of the codebase (PublicQuizzesPage,
--    save-quiz-session, save-quiz-result, contest registry) can keep
--    reading is_published unchanged.
-- ----------------------------------------------------------------------------
create or replace function public.sync_is_published()
returns trigger
language plpgsql
as $$
begin
  if NEW.visibility = 'public' then
    NEW.is_published := true;
    if NEW.published_at is null then
      NEW.published_at := now();
    end if;
  else
    NEW.is_published := false;
    NEW.published_at := null;
  end if;
  return NEW;
end; $$;

drop trigger if exists tg_quizzes_sync_published on public.quizzes;
create trigger tg_quizzes_sync_published
  before insert or update of visibility on public.quizzes
  for each row execute function public.sync_is_published();

-- ----------------------------------------------------------------------------
-- 4. validate_quiz_visibility() — gate private/unlisted behind PRO.
--    Rules:
--      * INSERT with visibility in (private,unlisted) requires PRO.
--      * UPDATE that CHANGES visibility INTO (private,unlisted) requires PRO.
--      * UPDATE that keeps the same visibility is grandfathered: a free
--        user can still edit the content of a quiz they already had as
--        private/unlisted (e.g. after their PRO expired).
--      * Any transition OUT of private/unlisted (e.g. unlisted → public)
--        is always allowed.
-- ----------------------------------------------------------------------------
create or replace function public.validate_quiz_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_changing boolean;
begin
  v_changing := (TG_OP = 'INSERT')
                or (TG_OP = 'UPDATE' and (OLD.visibility is distinct from NEW.visibility));

  if not v_changing then
    return NEW;
  end if;

  if NEW.visibility = 'public' then
    return NEW;
  end if;

  -- NEW.visibility is 'private' or 'unlisted'. Require PRO.
  select plan into v_plan
    from public.entitlements
   where user_id = NEW.user_id;

  if v_plan is null or v_plan <> 'pro' then
    raise exception 'visibility_requires_pro'
      using errcode = '42501',
            hint = 'Private and unlisted quizzes require an active PRO subscription.';
  end if;

  return NEW;
end; $$;

drop trigger if exists tg_validate_quiz_visibility on public.quizzes;
create trigger tg_validate_quiz_visibility
  before insert or update of visibility on public.quizzes
  for each row execute function public.validate_quiz_visibility();

-- ----------------------------------------------------------------------------
-- 5. RLS — replace the old "anyone can read if is_published" policy with
--    "anyone can read if visibility is public or unlisted". Private rows
--    are visible only to the owner (via quizzes_rw_own).
-- ----------------------------------------------------------------------------
drop policy if exists quizzes_read_published on public.quizzes;
create policy quizzes_read_public_or_unlisted
  on public.quizzes for select
  using (visibility in ('public','unlisted'));

-- quizzes_rw_own from 20260605000000_core.sql remains unchanged:
--   the owner has full read/write/delete on their own rows regardless
--   of visibility.
