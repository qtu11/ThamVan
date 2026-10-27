-- THÁM VĂN: apply once to a fresh Supabase project. All application tables use RLS.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  locale text not null default 'vi' check (locale in ('vi','en','zh')),
  radius_km integer not null default 5 check (radius_km between 3 and 10),
  notifications boolean not null default false,
  terms_version text not null default '2026-10-26',
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'admin')
);
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin') $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.heritage_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  name text not null check (char_length(name) between 1 and 160),
  kind text not null check (kind in ('monument','architecture','nature','craft','symbol','festival')),
  region text not null check (char_length(region) <= 100),
  translations jsonb not null default '{}' check (jsonb_typeof(translations) = 'object'),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  image text,
  image_author text not null default '',
  image_license text not null default '',
  image_source text,
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  verification text not null default 'reference' check (verification in ('reference','reviewed')),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);
create index heritage_published on public.heritage_entries(status, kind);

create table public.saved_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.heritage_entries(id) on delete cascade,
  collection text not null default '' check (char_length(collection) <= 80),
  visited_at timestamptz,
  saved_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);
create index saved_entries_entry on public.saved_entries(entry_id);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.heritage_entries(id) on delete cascade,
  translations jsonb not null check (jsonb_typeof(translations) = 'object'),
  points integer not null default 20 check (points between 1 and 100),
  badge text not null check (char_length(badge) between 1 and 80),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table private.challenge_answers (
  challenge_id uuid primary key references public.challenges(id) on delete cascade,
  correct_option integer not null check (correct_option between 0 and 3)
);
create table public.challenge_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  awarded_points integer not null default 0 check (awarded_points >= 0),
  primary key (user_id, challenge_id)
);
create index challenge_entry on public.challenges(entry_id);
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  entry_id uuid references public.heritage_entries(id) on delete set null,
  reason text not null check (char_length(reason) between 10 and 2000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);
create index reports_user on public.content_reports(user_id);
create index reports_entry on public.content_reports(entry_id);
create table private.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null default 1
);
create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  entity_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);

create function private.consume_quota(p_key text, p_limit integer, p_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_hits integer;
begin
  insert into private.rate_limits(key,window_start,hits) values(p_key,now(),1)
  on conflict(key) do update set
    window_start = case when private.rate_limits.window_start < now() - make_interval(secs => p_seconds) then now() else private.rate_limits.window_start end,
    hits = case when private.rate_limits.window_start < now() - make_interval(secs => p_seconds) then 1 else private.rate_limits.hits + 1 end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

create function public.consume_recognition_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  return private.consume_quota('vision:' || auth.uid()::text, 10, 86400);
end $$;

create function public.join_challenge(p_challenge_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.challenges c join public.heritage_entries e on e.id=c.entry_id where c.id=p_challenge_id and c.status='published' and e.status='published' and (c.expires_at is null or c.expires_at > now())) then raise exception 'CHALLENGE_UNAVAILABLE'; end if;
  insert into public.challenge_progress(user_id,challenge_id) values(auth.uid(),p_challenge_id) on conflict do nothing;
end $$;

create function public.complete_challenge(p_challenge_id uuid, p_answer integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_challenge public.challenges; v_progress public.challenge_progress; v_correct integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_progress from public.challenge_progress where user_id=auth.uid() and challenge_id=p_challenge_id for update;
  if not found then raise exception 'JOIN_REQUIRED'; end if;
  if v_progress.completed_at is not null then return jsonb_build_object('correct',true,'points',v_progress.awarded_points,'already_completed',true); end if;
  select c.* into v_challenge from public.challenges c join public.heritage_entries e on e.id=c.entry_id where c.id=p_challenge_id and c.status='published' and e.status='published' and (c.expires_at is null or c.expires_at>now());
  if not found then raise exception 'CHALLENGE_UNAVAILABLE'; end if;
  if not private.consume_quota('quiz:' || auth.uid()::text, 30, 3600) then return jsonb_build_object('correct',false,'limited',true); end if;
  select correct_option into v_correct from private.challenge_answers where challenge_id=p_challenge_id;
  if v_correct is null or p_answer is distinct from v_correct then return jsonb_build_object('correct',false); end if;
  update public.challenge_progress set completed_at=now(),awarded_points=v_challenge.points where user_id=auth.uid() and challenge_id=p_challenge_id;
  return jsonb_build_object('correct',true,'points',v_challenge.points,'already_completed',false);
end $$;

create function public.submit_report(p_entry_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(trim(p_reason)) not between 10 and 2000 then raise exception 'INVALID_REASON'; end if;
  if not exists(select 1 from public.heritage_entries where id=p_entry_id and status='published') then raise exception 'NOT_FOUND'; end if;
  if not private.consume_quota('report:' || auth.uid()::text, 5, 3600) then raise exception 'RATE_LIMIT'; end if;
  insert into public.content_reports(user_id,entry_id,reason) values(auth.uid(),p_entry_id,trim(p_reason));
end $$;

create function public.on_auth_user_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data->>'terms_version' is distinct from '2026-10-26' then raise exception 'TERMS_REQUIRED'; end if;
  insert into public.profiles(id,display_name,terms_version) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),80), '2026-10-26');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.on_auth_user_created();

create function public.audit_content_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_TABLE_NAME = 'heritage_entries' then new.updated_at=now(); end if;
  insert into public.audit_events(actor_id,entity_id,action) values(auth.uid(),new.id,TG_TABLE_NAME || ':' || lower(TG_OP));
  return new;
end $$;
create trigger audit_heritage before insert or update on public.heritage_entries for each row execute function public.audit_content_change();
create trigger audit_challenge before insert or update on public.challenges for each row execute function public.audit_content_change();
create trigger audit_report before update on public.content_reports for each row execute function public.audit_content_change();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.heritage_entries enable row level security;
alter table public.saved_entries enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.content_reports enable row level security;
alter table public.audit_events enable row level security;

create policy profile_read on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy role_read on public.user_roles for select to authenticated using (user_id=(select auth.uid()));
create policy heritage_read on public.heritage_entries for select using (status='published' or (select public.is_admin()));
create policy heritage_admin on public.heritage_entries for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy saved_read on public.saved_entries for select to authenticated using (user_id=(select auth.uid()));
create policy saved_insert on public.saved_entries for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.heritage_entries e where e.id=entry_id and e.status='published'));
create policy saved_update on public.saved_entries for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy saved_delete on public.saved_entries for delete to authenticated using (user_id=(select auth.uid()));
create policy challenges_read on public.challenges for select using ((status='published' and exists(select 1 from public.heritage_entries e where e.id=entry_id and e.status='published')) or (select public.is_admin()));
create policy challenges_admin on public.challenges for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy progress_read on public.challenge_progress for select to authenticated using (user_id=(select auth.uid()));
create policy report_read on public.content_reports for select to authenticated using (user_id=(select auth.uid()) or (select public.is_admin()));
create policy report_admin on public.content_reports for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy audit_read on public.audit_events for select to authenticated using ((select public.is_admin()));

-- Explicit grants also prevent a client from self-awarding points or assigning admin roles.
revoke all on public.profiles,public.user_roles,public.heritage_entries,public.saved_entries,public.challenges,public.challenge_progress,public.content_reports,public.audit_events from anon,authenticated;
grant select on public.heritage_entries,public.challenges to anon,authenticated;
grant select on public.profiles,public.user_roles,public.saved_entries,public.challenge_progress,public.content_reports,public.audit_events to authenticated;
grant update(display_name,locale,radius_km,notifications) on public.profiles to authenticated;
grant insert,update,delete on public.saved_entries to authenticated;
grant insert,update,delete on public.heritage_entries,public.challenges to authenticated;
grant update(status) on public.content_reports to authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.consume_recognition_quota(),public.join_challenge(uuid),public.complete_challenge(uuid,integer),public.submit_report(uuid,text),public.on_auth_user_created(),public.audit_content_change() from public,anon;
grant execute on function public.consume_recognition_quota(),public.join_challenge(uuid),public.complete_challenge(uuid,integer),public.submit_report(uuid,text) to authenticated;

-- Admin-only RPC keeps answer keys outside the exposed API schema.
create function public.set_challenge_answer(p_challenge_id uuid,p_correct_option integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  insert into private.challenge_answers values(p_challenge_id,p_correct_option) on conflict(challenge_id) do update set correct_option=excluded.correct_option;
end $$;
revoke all on function public.set_challenge_answer(uuid,integer) from public,anon;
grant execute on function public.set_challenge_answer(uuid,integer) to authenticated;
commit;
