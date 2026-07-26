-- The previous migration's recipients_insert_own policy subqueried
-- public.recipients directly inside its own WITH CHECK, which Postgres
-- rejects as infinite recursion (a policy can't directly re-query the table
-- it protects). Standard fix: move the count check into a SECURITY DEFINER
-- function, which evaluates outside the calling policy's RLS context.

create or replace function public.under_free_recipient_limit(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*) < 1
  from public.recipients r
  where r.user_id = check_user_id;
$$;

-- Lock down: only used from within RLS policies via the authenticated role.
revoke all on function public.under_free_recipient_limit(uuid) from public;
grant execute on function public.under_free_recipient_limit(uuid) to authenticated;

drop policy if exists "recipients_insert_own" on public.recipients;
create policy "recipients_insert_own" on public.recipients
  for insert
  with check (
    (select auth.uid()) = user_id
    and (
      public.is_pro((select auth.uid()))
      or public.under_free_recipient_limit((select auth.uid()))
    )
  );
