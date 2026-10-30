create table public.discovery_visits (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 client_key uuid not null,entry_slug text not null,place_name text not null,
 latitude double precision,longitude double precision,
 method text not null default 'manual' check(method in ('manual','gps')),
 visited_at timestamptz not null default now(),unique(user_id,client_key)
);
alter table public.discovery_visits enable row level security;
revoke all on public.discovery_visits from anon,authenticated;
grant select,delete on public.discovery_visits to authenticated;grant all on public.discovery_visits to service_role;
create policy visits_private on public.discovery_visits to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create index visits_timeline on public.discovery_visits(user_id,visited_at desc);

create table public.travel_sessions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 100),started_at timestamptz not null default now(),ended_at timestamptz,
 consented_at timestamptz not null default now()
);
create unique index one_active_trip on public.travel_sessions(user_id) where ended_at is null;
alter table public.travel_sessions enable row level security;
revoke all on public.travel_sessions from anon,authenticated;
grant select,delete on public.travel_sessions to authenticated;grant all on public.travel_sessions to service_role;
create policy trip_private on public.travel_sessions to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create table public.travel_points (
 session_id uuid not null references public.travel_sessions(id) on delete cascade,sequence integer not null check(sequence>=0),
 latitude double precision not null check(latitude between -90 and 90),longitude double precision not null check(longitude between -180 and 180),
 accuracy double precision not null check(accuracy between 0 and 150),recorded_at timestamptz not null,
 primary key(session_id,sequence)
);
alter table public.travel_points enable row level security;
revoke all on public.travel_points from anon,authenticated;grant select on public.travel_points to authenticated;grant all on public.travel_points to service_role;
create policy points_private on public.travel_points for select to authenticated using(exists(select 1 from public.travel_sessions s where s.id=session_id and s.user_id=auth.uid()));
create function public.trip_action(p_action text,p_name text default '',p_session uuid default null,p_sequence integer default null,p_lat double precision default null,p_lng double precision default null,p_accuracy double precision default null,p_time timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();trip uuid;last_point public.travel_points;km double precision;seconds double precision;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED';end if;
 if p_action='start' then
  if not private.consume_quota('trip-start:'||uid::text,12,3600) then raise exception 'RATE_LIMIT';end if;
  perform pg_advisory_xact_lock(hashtextextended('trip:'||uid::text,0));
  select id into trip from public.travel_sessions where user_id=uid and ended_at is null;
  if trip is null then insert into public.travel_sessions(user_id,name) values(uid,p_name) returning id into trip;end if;
  return jsonb_build_object('id',trip);
 end if;
 perform 1 from public.travel_sessions where id=p_session and user_id=uid for update;
 if not found then raise exception 'TRIP_UNAVAILABLE';end if;
 if p_action='stop' then update public.travel_sessions set ended_at=coalesce(ended_at,now()) where id=p_session;return jsonb_build_object('success',true);end if;
 if p_action='point' then
  if exists(select 1 from public.travel_sessions where id=p_session and ended_at is not null) then raise exception 'TRIP_FINISHED';end if;
  if p_time is null or p_time<now()-interval '10 minutes' or p_time>now()+interval '30 seconds' or p_sequence is null or p_sequence<0 or p_lat is null or p_lng is null or p_accuracy is null or p_accuracy>150 or p_accuracy<0 then raise exception 'INVALID_POINT';end if;
  if exists(select 1 from public.travel_points where session_id=p_session and sequence=p_sequence) then return jsonb_build_object('success',true);end if;
  if not private.consume_quota('trip-point:'||uid::text,30,60) then raise exception 'RATE_LIMIT';end if;
  select * into last_point from public.travel_points where session_id=p_session order by sequence desc limit 1;
  if found then
   seconds:=extract(epoch from p_time-last_point.recorded_at);
   if p_sequence<=last_point.sequence or seconds<5 then raise exception 'INVALID_POINT';end if;
   km:=6371*2*asin(sqrt(least(1,power(sin(radians(p_lat-last_point.latitude)/2),2)+cos(radians(p_lat))*cos(radians(last_point.latitude))*power(sin(radians(p_lng-last_point.longitude)/2),2))));
   if km/(seconds/3600)>200 then raise exception 'GPS_JUMP';end if;
  end if;
  insert into public.travel_points(session_id,sequence,latitude,longitude,accuracy,recorded_at) values(p_session,p_sequence,p_lat,p_lng,p_accuracy,p_time);
  return jsonb_build_object('success',true);
 end if;
 raise exception 'INVALID_ACTION';
end $$;
revoke all on function public.trip_action(text,text,uuid,integer,double precision,double precision,double precision,timestamptz) from public,anon;
grant execute on function public.trip_action(text,text,uuid,integer,double precision,double precision,double precision,timestamptz) to authenticated;

create table public.place_submissions (
 id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete set null,
 name text not null check(char_length(name) between 3 and 160),address text not null check(char_length(address) between 5 and 250),
 region text not null check(char_length(region) between 2 and 80),summary text not null check(char_length(summary) between 30 and 2000),
 latitude double precision not null check(latitude between 8 and 12),longitude double precision not null check(longitude between 105 and 108),
 source_url text not null check(source_url like 'https://%'),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),review_note text not null default '',
 created_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by uuid references auth.users(id) on delete set null,
 published_entry uuid references public.heritage_entries(id) on delete set null
);
alter table public.place_submissions enable row level security;
revoke all on public.place_submissions from anon,authenticated;
grant select on public.place_submissions to authenticated;grant all on public.place_submissions to service_role;
create policy submissions_private on public.place_submissions for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin'));
create table public.user_notifications (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null,title text not null,body text not null,url text not null,
 created_at timestamptz not null default now(),read_at timestamptz
);
alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from anon,authenticated;
grant select on public.user_notifications to authenticated;grant all on public.user_notifications to service_role;
create policy notifications_private on public.user_notifications for select to authenticated using(user_id=auth.uid());

create function public.submit_place(p_name text,p_address text,p_region text,p_summary text,p_lat double precision,p_lng double precision,p_source text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();result uuid;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED';end if;
 if not private.consume_quota('place-submit:'||uid::text,10,3600) then raise exception 'RATE_LIMIT';end if;
 insert into public.place_submissions(user_id,name,address,region,summary,latitude,longitude,source_url) values(uid,p_name,p_address,p_region,p_summary,p_lat,p_lng,p_source) returning id into result;
 insert into public.user_notifications(user_id,kind,title,body,url) select user_id,'review','Địa điểm mới chờ duyệt',p_name,'/vi/admin/dashboard?tab=moderation' from public.user_roles where role='admin';
 return result;
end $$;
revoke all on function public.submit_place(text,text,text,text,double precision,double precision,text) from public,anon;grant execute on function public.submit_place(text,text,text,text,double precision,double precision,text) to authenticated;

create function public.review_place(p_id uuid,p_approve boolean,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.place_submissions;entry uuid;translation jsonb;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN';end if;
 if char_length(trim(p_note))<5 or char_length(p_note)>1000 then raise exception 'REVIEW_NOTE_REQUIRED';end if;
 select * into item from public.place_submissions where id=p_id for update;
 if not found or item.status<>'pending' then raise exception 'SUBMISSION_UNAVAILABLE';end if;
 if p_approve then
  translation:=jsonb_build_object('summary',item.summary,'story',item.summary,'detail',item.address);
  insert into public.heritage_entries(slug,name,kind,region,translations,latitude,longitude,image_author,image_license,sources,status,verification)
  values('community-'||item.id::text,item.name,'monument',item.region,jsonb_build_object('vi',translation,'en',translation,'zh',translation),item.latitude,item.longitude,'','No image supplied',jsonb_build_array(jsonb_build_object('title',item.name,'publisher','Nguồn do cộng đồng đề xuất','url',item.source_url,'accessed',now()::date::text)),'published','reference') returning id into entry;
 end if;
 update public.place_submissions set status=case when p_approve then 'approved' else 'rejected' end,review_note=p_note,reviewed_at=now(),reviewed_by=auth.uid(),published_entry=entry where id=p_id;
 if item.user_id is not null then insert into public.user_notifications(user_id,kind,title,body,url) values(item.user_id,'submission',case when p_approve then 'Địa điểm đã được duyệt' else 'Đề xuất cần điều chỉnh' end,p_note,'/vi/dashboard?tab=contributions');end if;
 insert into public.audit_events(actor_id,entity_id,action) values(auth.uid(),p_id,case when p_approve then 'place.approved' else 'place.rejected' end);
 return entry;
end $$;
revoke all on function public.review_place(uuid,boolean,text) from public,anon;grant execute on function public.review_place(uuid,boolean,text) to authenticated;

create table public.itinerary_requests (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 input jsonb not null,status text not null default 'generating' check(status in ('generating','ready','failed')),created_at timestamptz not null default now()
);
create table public.itineraries (
 id uuid primary key default gen_random_uuid(),request_id uuid unique not null references public.itinerary_requests(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,title text not null,days jsonb not null,
 provider_model text not null,created_at timestamptz not null default now()
);
alter table public.itinerary_requests enable row level security;alter table public.itineraries enable row level security;
revoke all on public.itinerary_requests,public.itineraries from anon,authenticated;grant select on public.itinerary_requests,public.itineraries to authenticated;grant all on public.itinerary_requests,public.itineraries to service_role;
create policy own_itinerary_requests on public.itinerary_requests for select to authenticated using(user_id=auth.uid());
create policy own_itineraries on public.itineraries for select to authenticated using(user_id=auth.uid());
create function public.reserve_itinerary(p_input jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED';end if;
 if private.effective_membership(auth.uid())->>'plan'<>'family' then raise exception 'FAMILY_REQUIRED';end if;
 if not private.consume_quota('planner:'||auth.uid()::text,3,60) then raise exception 'RATE_LIMIT';end if;
 insert into public.itinerary_requests(user_id,input) values(auth.uid(),p_input) returning id into result;return result;
end $$;
revoke all on function public.reserve_itinerary(jsonb) from public,anon;grant execute on function public.reserve_itinerary(jsonb) to authenticated;

create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text unique not null,keys jsonb not null,created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon,authenticated;grant all on public.push_subscriptions to service_role;
create table public.operating_expenses (
 id uuid primary key default gen_random_uuid(),amount integer not null check(amount>0),category text not null check(category in ('hosting','content','marketing','tax','other')),
 description text not null check(char_length(description) between 3 and 500),spent_on date not null,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
alter table public.operating_expenses enable row level security;revoke all on public.operating_expenses from anon,authenticated;grant all on public.operating_expenses to service_role;

