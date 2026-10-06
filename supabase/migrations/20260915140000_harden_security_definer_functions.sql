-- Harden legacy SECURITY DEFINER functions against object-shadowing and
-- remove PostgreSQL's default PUBLIC execute privilege where direct calls are
-- unnecessary. Trigger functions remain callable by their triggers.

alter function public.handle_new_user() set search_path = '';
alter function public.trg_audit_trade_changes() set search_path = '';
alter function public.invoke_news_cron_refresh() set search_path = '';
alter function public.invoke_trade_reminder_cron() set search_path = '';
alter function public.invoke_scanner_cron() set search_path = '';

revoke all on function public.handle_new_user() from public;
revoke all on function public.trg_audit_trade_changes() from public;
revoke all on function public.invoke_news_cron_refresh() from public;
revoke all on function public.invoke_trade_reminder_cron() from public;
revoke all on function public.invoke_scanner_cron() from public;

grant execute on function public.invoke_news_cron_refresh() to postgres;
grant execute on function public.invoke_trade_reminder_cron() to postgres;
grant execute on function public.invoke_scanner_cron() to postgres;
