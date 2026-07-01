create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store a shared secret in Vault so the cron job can authenticate to the
-- edge function without hardcoding a plaintext value in the job definition.
-- NOTE: after this migration, set the SAME value as the CRON_SECRET env var
-- on the nightly-journal-scan edge function (Dashboard > Edge Functions >
-- Secrets, or `supabase secrets set CRON_SECRET=...`).
select vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'cron_secret', 'Shared secret for nightly-journal-scan cron auth');

select cron.schedule(
  'nightly-journal-scan',
  '0 3 * * *', -- 03:00 UTC daily
  $$
  select net.http_post(
    url := 'https://bzczbsrtbnqiydscvnak.supabase.co/functions/v1/nightly-journal-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
