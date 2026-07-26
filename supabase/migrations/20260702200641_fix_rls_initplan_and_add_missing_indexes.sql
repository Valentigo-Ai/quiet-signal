-- Add covering indexes for unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON public.recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_messages_checkin_id ON public.shared_messages(checkin_id);
CREATE INDEX IF NOT EXISTS idx_shared_messages_recipient_id ON public.shared_messages(recipient_id);

-- Fix RLS policies re-evaluating auth.uid() per row: wrap in (select ...)

-- checkins
ALTER POLICY checkins_select_own ON public.checkins USING ((select auth.uid()) = user_id);
ALTER POLICY checkins_insert_own ON public.checkins WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY checkins_update_own ON public.checkins USING ((select auth.uid()) = user_id);
ALTER POLICY checkins_delete_own ON public.checkins USING ((select auth.uid()) = user_id);

-- journal_entries
ALTER POLICY journal_entries_select_own ON public.journal_entries USING ((select auth.uid()) = user_id);
ALTER POLICY journal_entries_insert_own ON public.journal_entries WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY journal_entries_update_own ON public.journal_entries USING ((select auth.uid()) = user_id);
ALTER POLICY journal_entries_delete_own ON public.journal_entries USING ((select auth.uid()) = user_id);

-- journal_insights
ALTER POLICY journal_insights_select_own ON public.journal_insights USING ((select auth.uid()) = user_id);
ALTER POLICY journal_insights_insert_own ON public.journal_insights WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY journal_insights_delete_own ON public.journal_insights USING ((select auth.uid()) = user_id);

-- profiles
ALTER POLICY profiles_select_own ON public.profiles USING ((select auth.uid()) = user_id);
ALTER POLICY profiles_insert_own ON public.profiles WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY profiles_update_own ON public.profiles USING ((select auth.uid()) = user_id);
ALTER POLICY profiles_delete_own ON public.profiles USING ((select auth.uid()) = user_id);

-- recipients
ALTER POLICY recipients_select_own ON public.recipients USING ((select auth.uid()) = user_id);
ALTER POLICY recipients_insert_own ON public.recipients WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY recipients_update_own ON public.recipients USING ((select auth.uid()) = user_id);
ALTER POLICY recipients_delete_own ON public.recipients USING ((select auth.uid()) = user_id);

-- shared_messages (EXISTS subquery against checkins)
ALTER POLICY shared_messages_select_owner ON public.shared_messages
  USING (EXISTS (SELECT 1 FROM public.checkins c WHERE c.id = shared_messages.checkin_id AND c.user_id = (select auth.uid())));
ALTER POLICY shared_messages_insert_owner ON public.shared_messages
  WITH CHECK (EXISTS (SELECT 1 FROM public.checkins c WHERE c.id = shared_messages.checkin_id AND c.user_id = (select auth.uid())));
ALTER POLICY shared_messages_delete_owner ON public.shared_messages
  USING (EXISTS (SELECT 1 FROM public.checkins c WHERE c.id = shared_messages.checkin_id AND c.user_id = (select auth.uid())));
