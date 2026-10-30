-- Additive upgrade. Existing one-time guide orders remain valid, but are no longer sold.
create table public.plan_orders (
 id uuid primary key default gen_random_uuid(),
 order_code bigint generated always as identity (start with 1000000) unique not null,
 user_id uuid references auth.users(id) on delete set null,
 plan_id text not null check(plan_id in ('premium','family')),
 amount integer not null,
 currency text not null default 'VND' check(currency='VND'),
 provider text not null check(provider in ('payos','sepay')),
 method text not null check(method in ('bank','card')),
 status text not null default 'pending' check(status in ('pending','paid','refunded','cancelled')),
 payment_link_id text unique,checkout_url text,payment_reference text unique,refund_reference text unique,
 processing_fee integer check(processing_fee>=0),
 created_at timestamptz not null default now(),paid_at timestamptz,refunded_at timestamptz,
 terms_version text not null default '2026-10-28-membership-v1',consented_at timestamptz not null default now(),
 check((plan_id='premium' and amount=39000) or (plan_id='family' and amount=89000)),
 check((provider='payos' and method='bank') or provider='sepay')
);
alter table public.plan_orders enable row level security;
revoke all on public.plan_orders from anon,authenticated;
grant select on public.plan_orders to authenticated;
grant all on public.plan_orders to service_role;
grant usage,select on sequence public.plan_orders_order_code_seq to service_role;
create policy my_plan_orders on public.plan_orders for select to authenticated using(user_id=auth.uid());
create index plan_orders_user on public.plan_orders(user_id,created_at desc);

create table public.memberships (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 order_id uuid unique references public.plan_orders(id) on delete restrict,
 plan_id text not null check(plan_id in ('premium','family')),
 starts_at timestamptz not null,ends_at timestamptz not null,
 revoked_at timestamptz,check(ends_at>starts_at)
);
alter table public.memberships enable row level security;
revoke all on public.memberships from anon,authenticated;
grant select on public.memberships to authenticated;grant all on public.memberships to service_role;
create policy own_memberships on public.memberships for select to authenticated using(user_id=auth.uid());
create index memberships_active on public.memberships(user_id,ends_at);

create table public.family_members (
 member_id uuid primary key references auth.users(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),check(member_id<>owner_id)
);
alter table public.family_members enable row level security;
revoke all on public.family_members from anon,authenticated;
grant select on public.family_members to authenticated;grant all on public.family_members to service_role;
create policy family_visible on public.family_members for select to authenticated using(member_id=auth.uid() or owner_id=auth.uid());
create index family_members_owner on public.family_members(owner_id);
create table public.family_invites (
 token uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '7 days',used_by uuid references auth.users(id) on delete set null,used_at timestamptz,revoked_at timestamptz
);
alter table public.family_invites enable row level security;
revoke all on public.family_invites from anon,authenticated;grant all on public.family_invites to service_role;

-- Include contiguous prepaid renewals in the displayed expiry, without bridging a revoked gap.
create function private.membership_coverage_end(p_user uuid,p_plan text) returns timestamptz language sql stable security definer set search_path='' as $$
 with recursive coverage(ends_at) as (
  select ends_at from public.memberships where user_id=p_user and plan_id=p_plan and revoked_at is null and starts_at<=now() and ends_at>now()
  union
  select m.ends_at from public.memberships m join coverage c on m.starts_at<=c.ends_at and m.ends_at>c.ends_at where m.user_id=p_user and m.plan_id=p_plan and m.revoked_at is null
 ) select max(ends_at) from coverage
$$;
revoke all on function private.membership_coverage_end(uuid,text) from public,anon,authenticated;
create function private.effective_membership(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with candidates as (
 select m.plan_id,m.user_id owner_id,private.membership_coverage_end(m.user_id,m.plan_id) ends_at, true is_owner from public.memberships m where m.user_id=p_user and m.starts_at<=now() and m.ends_at>now() and m.revoked_at is null
 union all
 select m.plan_id,m.user_id,private.membership_coverage_end(m.user_id,m.plan_id),false from public.family_members f join public.memberships m on m.user_id=f.owner_id and m.plan_id='family' where f.member_id=p_user and m.starts_at<=now() and m.ends_at>now() and m.revoked_at is null
 ), chosen as (select * from candidates order by (plan_id='family') desc,is_owner desc,ends_at desc limit 1)
 select coalesce((select jsonb_build_object('plan',plan_id,'owner_id',owner_id,'expires_at',ends_at,'is_owner',is_owner) from chosen),jsonb_build_object('plan','free','owner_id',null,'expires_at',null,'is_owner',true))
$$;
revoke all on function private.effective_membership(uuid) from public,anon,authenticated;
create function public.my_membership() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; used integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED';end if;
 result:=private.effective_membership(auth.uid());
 select count(*) into used from public.challenge_progress where user_id=auth.uid() and (joined_at at time zone 'Asia/Ho_Chi_Minh')::date=(now() at time zone 'Asia/Ho_Chi_Minh')::date;
 return result||jsonb_build_object('challenge_used',used,'challenge_limit',case when result->>'plan'='free' then 5 else null end);
end $$;
revoke all on function public.my_membership() from public,anon;grant execute on function public.my_membership() to authenticated;

create function public.reserve_plan_order(p_user uuid,p_plan text,p_provider text,p_method text) returns public.plan_orders language plpgsql security definer set search_path='' as $$
declare result public.plan_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended('order:'||p_user::text,0));
 if p_user is null then raise exception 'AUTH_REQUIRED';end if;
 if p_plan='premium' and private.effective_membership(p_user)->>'plan'='family' then raise exception 'FAMILY_ACTIVE';end if;
 select * into result from public.plan_orders where user_id=p_user and plan_id=p_plan and provider=p_provider and method=p_method and status='pending' and created_at>now()-interval '14 minutes' order by created_at desc limit 1;
 if found then return result;end if;
 if(select count(*) from public.plan_orders where user_id=p_user and created_at>now()-interval '1 hour')>=6 then raise exception 'RATE_LIMIT';end if;
 insert into public.plan_orders(user_id,plan_id,amount,provider,method) values(p_user,p_plan,case p_plan when 'premium' then 39000 when 'family' then 89000 else 0 end,p_provider,p_method) returning * into result;
 return result;
end $$;
revoke all on function public.reserve_plan_order(uuid,text,text,text) from public,anon,authenticated;grant execute on function public.reserve_plan_order(uuid,text,text,text) to service_role;

create function public.activate_plan_order(p_order uuid,p_amount integer,p_currency text,p_provider text,p_reference text) returns boolean language plpgsql security definer set search_path='' as $$
declare target public.plan_orders; beginning timestamptz;
begin
 select * into target from public.plan_orders where id=p_order for update;
 if not found then return false;end if;
 if target.amount<>p_amount or p_currency<>'VND' or target.provider<>p_provider or coalesce(p_reference,'')='' then raise exception 'PAYMENT_MISMATCH';end if;
 if target.status in ('paid','refunded') then
  if target.payment_reference is distinct from p_reference then raise exception 'PAYMENT_MISMATCH';end if;return true;
 end if;
 if target.user_id is null then raise exception 'ACCOUNT_DELETED';end if;
 perform pg_advisory_xact_lock(hashtextextended('membership:'||target.user_id::text,0));
 select greatest(now(),coalesce(max(ends_at),now())) into beginning from public.memberships where user_id=target.user_id and plan_id=target.plan_id and revoked_at is null and ends_at>now();
 insert into public.memberships(user_id,order_id,plan_id,starts_at,ends_at) values(target.user_id,target.id,target.plan_id,beginning,beginning+interval '1 month');
 update public.plan_orders set status='paid',paid_at=now(),payment_reference=p_reference where id=target.id;
 return true;
end $$;
revoke all on function public.activate_plan_order(uuid,integer,text,text,text) from public,anon,authenticated;grant execute on function public.activate_plan_order(uuid,integer,text,text,text) to service_role;

create function public.refund_plan_order(p_order uuid,p_reference text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if length(trim(coalesce(p_reference,'')))<3 then raise exception 'REFERENCE_REQUIRED';end if;
 update public.plan_orders set status='refunded',refunded_at=now(),refund_reference=p_reference where id=p_order and status='paid';
 if not found then return false;end if;
 update public.memberships set revoked_at=now() where order_id=p_order;
 return true;
end $$;
revoke all on function public.refund_plan_order(uuid,text) from public,anon,authenticated;grant execute on function public.refund_plan_order(uuid,text) to service_role;

create or replace function public.join_challenge(p_challenge_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('challenge:'||auth.uid()::text,0));
 if exists(select 1 from public.challenge_progress where user_id=auth.uid() and challenge_id=p_challenge_id) then return;end if;
 if not exists(select 1 from public.challenges c join public.heritage_entries e on e.id=c.entry_id where c.id=p_challenge_id and c.status='published' and e.status='published' and (c.expires_at is null or c.expires_at>now())) then raise exception 'CHALLENGE_UNAVAILABLE';end if;
 if private.effective_membership(auth.uid())->>'plan'='free' and (select count(*) from public.challenge_progress where user_id=auth.uid() and (joined_at at time zone 'Asia/Ho_Chi_Minh')::date=(now() at time zone 'Asia/Ho_Chi_Minh')::date)>=5 then raise exception 'DAILY_CHALLENGE_LIMIT';end if;
 insert into public.challenge_progress(user_id,challenge_id) values(auth.uid(),p_challenge_id) on conflict do nothing;
end $$;
create or replace function public.consume_recognition_quota() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED';end if;
 return private.consume_quota('vision-technical:'||auth.uid()::text,30,60);
end $$;

create function public.family_action(p_action text,p_token uuid default null,p_member uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); access jsonb; invitation public.family_invites; code uuid;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED';end if;
 access:=private.effective_membership(uid);
 if p_action='leave' then delete from public.family_members where member_id=uid;return jsonb_build_object('success',true);end if;
 if p_action='accept' then
  select * into invitation from public.family_invites where token=p_token for update;
  if not found or invitation.used_at is not null or invitation.revoked_at is not null or invitation.expires_at<now() or invitation.owner_id=uid then raise exception 'INVITE_INVALID';end if;
  perform pg_advisory_xact_lock(hashtextextended('family:'||invitation.owner_id::text,0));
  if not exists(select 1 from public.memberships where user_id=invitation.owner_id and plan_id='family' and starts_at<=now() and ends_at>now() and revoked_at is null) then raise exception 'FAMILY_EXPIRED';end if;
  if exists(select 1 from public.family_members where member_id=uid) or exists(select 1 from public.memberships where user_id=uid and plan_id='family' and revoked_at is null and ends_at>now()) then raise exception 'FAMILY_ALREADY_JOINED';end if;
  if(select count(*) from public.family_members where owner_id=invitation.owner_id)>=3 then raise exception 'FAMILY_FULL';end if;
  insert into public.family_members(member_id,owner_id) values(uid,invitation.owner_id);
  update public.family_invites set used_by=uid,used_at=now() where token=p_token;
  return jsonb_build_object('success',true);
 end if;
 if access->>'plan'<>'family' or not (access->>'is_owner')::boolean then raise exception 'FAMILY_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('family:'||uid::text,0));
 if p_action='invite' then
  if(select count(*) from public.family_members where owner_id=uid)>=3 then raise exception 'FAMILY_FULL';end if;
  if not private.consume_quota('invite:'||uid::text,10,3600) then raise exception 'RATE_LIMIT';end if;
  insert into public.family_invites(owner_id) values(uid) returning token into code;return jsonb_build_object('token',code);
 elsif p_action='remove' then delete from public.family_members where owner_id=uid and member_id=p_member;return jsonb_build_object('success',true);
 elsif p_action='revoke' then update public.family_invites set revoked_at=now() where owner_id=uid and token=p_token;return jsonb_build_object('success',true);
 end if;
 raise exception 'INVALID_ACTION';
end $$;
revoke all on function public.family_action(text,uuid,uuid) from public,anon;grant execute on function public.family_action(text,uuid,uuid) to authenticated;


