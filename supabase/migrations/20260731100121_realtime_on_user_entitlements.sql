-- Lets the client subscribe to postgres_changes on its own user_entitlements
-- row (see ProContext.tsx's subscribeToEntitlementChanges), so a webhook-
-- driven is_pro flip (a refund, an expiration) reaches the app almost
-- immediately instead of waiting for the next foreground check or restart.
-- Realtime enforces the table's existing RLS for postgres_changes, so this
-- doesn't widen access - the "own entitlement is readable by owner" policy
-- from the initial user_entitlements migration is what actually scopes each
-- subscriber to their own row.
alter publication supabase_realtime add table public.user_entitlements;
