-- The advisor flagged public.under_free_recipient_limit(uuid) as a
-- SECURITY DEFINER function directly callable via PostgREST RPC by any
-- signed-in (and anon) caller, who could pass an arbitrary user_id and
-- learn whether THAT user is under the free recipient limit - a minor
-- cross-user info leak. Fix: drop the uid parameter entirely so the
-- function only ever evaluates the caller's own auth.uid(), removing the
-- ability to probe other users. It can still be called directly via RPC,
-- but doing so only ever reveals a caller's own status, which the app
-- already knows.

drop policy if exists "recipients_insert_own" on public.recipients;
drop function if exists public.under_free_recipient_limit(uuid);

create or replace function public.under_free_recipient_limit()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*) < 1
  from public.recipients r
  where r.user_id = auth.uid();
$$;

revoke all on function public.under_free_recipient_limit() from public;
revoke all on function public.under_free_recipient_limit() from anon;
grant execute on function public.under_free_recipient_limit() to authenticated;

create policy "recipients_insert_own" on public.recipients
  for insert
  with check (
    (select auth.uid()) = user_id
    and (
      public.is_pro((select auth.uid()))
      or public.under_free_recipient_limit()
    )
  );
