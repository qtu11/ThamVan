-- Operator switches changed from the admin dashboard. payments_live=false (default) keeps checkout
-- in preview: a decorative, unscannable QR is shown and no provider session is ever created.
begin;
create table if not exists public.app_settings (
  key text primary key check (key in ('payments_live')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select, insert, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
drop policy if exists app_settings_admin_read on public.app_settings;
create policy app_settings_admin_read on public.app_settings for select to authenticated
  using ((select public.is_admin()));
drop policy if exists app_settings_admin_insert on public.app_settings;
create policy app_settings_admin_insert on public.app_settings for insert to authenticated
  with check ((select public.is_admin()) and updated_by = (select auth.uid()));
drop policy if exists app_settings_admin_update on public.app_settings;
create policy app_settings_admin_update on public.app_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()) and updated_by = (select auth.uid()));
insert into public.app_settings(key, value) values ('payments_live', 'false'::jsonb)
  on conflict (key) do nothing;
commit;
