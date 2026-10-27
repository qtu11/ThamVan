-- Run AFTER 001 and 002, including on an existing project. Preserve existing user data.
begin;
alter table public.profiles alter column terms_version drop not null;
alter table public.profiles alter column terms_version drop default;
alter table public.profiles alter column consented_at drop not null;
alter table public.profiles alter column consented_at drop default;

create or replace function public.on_auth_user_created() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_google boolean; v_name text;
begin
  -- raw_app_meta_data is server-owned. Never infer the provider from user-editable metadata.
  v_google := coalesce(new.raw_app_meta_data->>'provider','email') = 'google';
  if not v_google and new.raw_user_meta_data->>'terms_version' is distinct from '2026-10-26' then
    raise exception 'TERMS_REQUIRED';
  end if;
  v_name := left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),nullif(trim(new.raw_user_meta_data->>'full_name'),''),nullif(trim(new.raw_user_meta_data->>'name'),''),''),80);
  insert into public.profiles(id,display_name,terms_version,consented_at)
  values(new.id,v_name,case when v_google then null else '2026-10-26' end,case when v_google then null else now() end);
  return new;
end $$;

-- Repair pre-existing Auth accounts without profiles. Do not invent prior consent.
insert into public.profiles(id,display_name,terms_version,consented_at)
select u.id,left(coalesce(u.raw_user_meta_data->>'display_name',u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''),80),null,null
from auth.users u where not exists(select 1 from public.profiles p where p.id=u.id)
on conflict(id) do nothing;

create or replace function public.has_accepted_terms() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and terms_version='2026-10-26' and consented_at is not null)
$$;
revoke all on function public.has_accepted_terms() from public;
grant execute on function public.has_accepted_terms() to anon,authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_accepted_terms() and exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin')
$$;

create or replace function public.accept_current_terms(p_version text,p_display_name text,p_locale text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_version is distinct from '2026-10-26' then raise exception 'INVALID_TERMS_VERSION'; end if;
  if char_length(trim(coalesce(p_display_name,''))) not between 2 and 80 or p_locale is null or p_locale not in ('vi','en','zh') then raise exception 'INVALID_PROFILE'; end if;
  update public.profiles set
    consented_at=case when terms_version=p_version and consented_at is not null then consented_at else now() end,
    terms_version=p_version,display_name=trim(p_display_name),locale=p_locale
  where id=auth.uid();
  if not found then raise exception 'PROFILE_MISSING'; end if;
end $$;
revoke all on function public.accept_current_terms(text,text,text) from public,anon;
grant execute on function public.accept_current_terms(text,text,text) to authenticated;

-- Preserve tested business logic privately, adding a consent gate at each RPC entry point.
-- Conditional moves also make this patch safe to re-run in the SQL Editor.
do $$ begin
  if to_regprocedure('private.join_challenge(uuid)') is null then alter function public.join_challenge(uuid) set schema private; end if;
  if to_regprocedure('private.complete_challenge(uuid,integer)') is null then alter function public.complete_challenge(uuid,integer) set schema private; end if;
  if to_regprocedure('private.submit_report(uuid,text)') is null then alter function public.submit_report(uuid,text) set schema private; end if;
  if to_regprocedure('private.consume_recognition_quota()') is null then alter function public.consume_recognition_quota() set schema private; end if;
end $$;
revoke all on function private.join_challenge(uuid),private.complete_challenge(uuid,integer),private.submit_report(uuid,text),private.consume_recognition_quota() from public,anon,authenticated;

create or replace function public.join_challenge(p_challenge_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED'; end if;
  perform private.join_challenge(p_challenge_id);
end $$;
create or replace function public.complete_challenge(p_challenge_id uuid,p_answer integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED'; end if;
  return private.complete_challenge(p_challenge_id,p_answer);
end $$;
create or replace function public.submit_report(p_entry_id uuid,p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED'; end if;
  perform private.submit_report(p_entry_id,p_reason);
end $$;
create or replace function public.consume_recognition_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED'; end if;
  return private.consume_recognition_quota();
end $$;
revoke all on function public.join_challenge(uuid),public.complete_challenge(uuid,integer),public.submit_report(uuid,text),public.consume_recognition_quota() from public,anon;
grant execute on function public.join_challenge(uuid),public.complete_challenge(uuid,integer),public.submit_report(uuid,text),public.consume_recognition_quota() to authenticated;

drop policy if exists saved_insert on public.saved_entries;
create policy saved_insert on public.saved_entries for insert to authenticated with check
  (user_id=(select auth.uid()) and (select public.has_accepted_terms()) and exists(select 1 from public.heritage_entries e where e.id=entry_id and e.status='published'));
drop policy if exists saved_update on public.saved_entries;
create policy saved_update on public.saved_entries for update to authenticated using
  (user_id=(select auth.uid()) and (select public.has_accepted_terms())) with check
  (user_id=(select auth.uid()) and (select public.has_accepted_terms()));
commit;
