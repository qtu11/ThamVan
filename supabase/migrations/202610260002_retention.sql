begin;
-- Remove per-account quota rows as part of account erasure.
create function private.cleanup_user_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.rate_limits where key in ('vision:'||old.id::text,'quiz:'||old.id::text,'report:'||old.id::text);
  return old;
end $$;
create trigger cleanup_user_quota before delete on auth.users for each row execute function private.cleanup_user_quota();
revoke all on function private.cleanup_user_quota() from public,anon,authenticated;
-- Schedule with pg_cron if available; expired counters are also reset atomically on use.
create function public.prune_operational_data() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.rate_limits where window_start < now()-interval '30 days';
  delete from public.content_reports where status <> 'open' and created_at < now()-interval '180 days';
  delete from public.audit_events where created_at < now()-interval '365 days';
end $$;
revoke all on function public.prune_operational_data() from public,anon,authenticated;
grant execute on function public.prune_operational_data() to service_role;
commit;
