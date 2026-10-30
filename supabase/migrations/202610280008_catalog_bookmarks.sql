-- Local catalog identifiers are not PostgreSQL heritage UUIDs. Keep their bookmarks separate.
create table public.catalog_bookmarks (
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id text not null check(entry_id ~ '^HCM-[A-Z0-9-]{1,80}$'),
 collection text not null default '' check(char_length(collection)<=80),
 saved_at timestamptz not null default now(),visited_at timestamptz,
 primary key(user_id,entry_id)
);
alter table public.catalog_bookmarks enable row level security;
revoke all on public.catalog_bookmarks from anon,authenticated;
grant select,delete on public.catalog_bookmarks to authenticated;
grant update(collection,visited_at) on public.catalog_bookmarks to authenticated;
grant all on public.catalog_bookmarks to service_role;
create policy bookmarks_private on public.catalog_bookmarks to authenticated using(user_id=auth.uid() and public.has_accepted_terms()) with check(user_id=auth.uid() and public.has_accepted_terms());
-- New account-scoped counters must be erased with the account too.
create or replace function private.cleanup_user_quota() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from private.rate_limits where key in('vision:'||old.id::text,'vision-technical:'||old.id::text,'quiz:'||old.id::text,'report:'||old.id::text,'invite:'||old.id::text,'trip-start:'||old.id::text,'trip-point:'||old.id::text,'place-submit:'||old.id::text,'planner:'||old.id::text,'push-test:'||old.id::text,'visit:'||old.id::text,'bookmark:'||old.id::text);
 return old;
end $$;

