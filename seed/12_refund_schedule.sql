-- Supabase SQL Editor, run as postgres. Runs while browsers are closed.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('shopease-wallet-refunds', '* * * * *', 'SELECT public.shop_settle_refunds();');
SELECT jobname,schedule,active FROM cron.job WHERE jobname='shopease-wallet-refunds';
