-- Apply after 001/002/003. Prices are VND. Only server-held service_role can mutate commerce.
create table public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  order_code bigint generated always as identity (start with 100000) unique not null,
  user_id uuid references auth.users(id) on delete set null,
  product_id text not null check (product_id in ('walk','collection')),
  experience_slug text,
  amount integer not null,
  currency text not null default 'VND' check (currency = 'VND'),
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  payment_link_id text unique,
  checkout_url text,
  payment_reference text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  refund_reference text,
  purchase_terms_version text not null default '2026-10-27-commerce-v1',
  purchase_consented_at timestamptz not null default now(),
  check ((product_id='walk' and amount=69000 and experience_slug in ('sai-gon-ben-song','nhung-lop-ky-uc','mot-ngay-cho-lon')) or (product_id='collection' and amount=149000 and experience_slug is null))
);
create index commerce_orders_owner on public.commerce_orders(user_id,status);
alter table public.commerce_orders enable row level security;
revoke all on public.commerce_orders from anon,authenticated;
grant select on public.commerce_orders to authenticated;
grant all on public.commerce_orders to service_role;
grant usage,select on sequence public.commerce_orders_order_code_seq to service_role;
create policy own_orders on public.commerce_orders for select to authenticated using (user_id=auth.uid());

create table public.business_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) <= 254),
  organization text not null check (char_length(organization) between 2 and 160),
  segment text not null check (segment in ('school','hotel','team')),
  message text not null check (char_length(message) between 15 and 2000),
  locale text not null check (locale in ('vi','en','zh')),
  consented_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);
alter table public.business_leads enable row level security;
revoke all on public.business_leads from anon,authenticated;
grant all on public.business_leads to service_role;

create function public.reserve_commerce_order(p_user uuid,p_product text,p_experience text) returns public.commerce_orders
language plpgsql security definer set search_path='' as $$
declare result public.commerce_orders;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  if exists(select 1 from public.commerce_orders where user_id=p_user and status='paid' and (product_id='collection' or (p_product='walk' and experience_slug=p_experience))) then raise exception 'ALREADY_OWNED'; end if;
  select * into result from public.commerce_orders where user_id=p_user and product_id=p_product and experience_slug is not distinct from p_experience and status='pending' and created_at>now()-interval '14 minutes' order by created_at desc limit 1;
  if found then return result; end if;
  if (select count(*) from public.commerce_orders where user_id=p_user and created_at>now()-interval '1 hour') >= 6 then raise exception 'RATE_LIMIT'; end if;
  insert into public.commerce_orders(user_id,product_id,experience_slug,amount) values(p_user,p_product,p_experience,case p_product when 'walk' then 69000 when 'collection' then 149000 else 0 end) returning * into result;
  return result;
end $$;
revoke all on function public.reserve_commerce_order(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_commerce_order(uuid,text,text) to service_role;

create function public.complete_commerce_payment(p_code bigint,p_amount integer,p_link text,p_reference text,p_currency text) returns boolean
language plpgsql security definer set search_path='' as $$
declare target public.commerce_orders;
begin
  select * into target from public.commerce_orders where order_code=p_code for update;
  if not found then return false; end if;
  if target.amount<>p_amount or p_currency<>'VND' or target.payment_link_id is distinct from p_link or coalesce(p_reference,'')='' then raise exception 'PAYMENT_MISMATCH'; end if;
  if target.status in ('paid','refunded') then
    if target.payment_reference is distinct from p_reference then raise exception 'PAYMENT_MISMATCH'; end if;
    return true;
  end if;
  update public.commerce_orders set status='paid',paid_at=now(),payment_reference=p_reference where id=target.id;
  return true;
end $$;
revoke all on function public.complete_commerce_payment(bigint,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.complete_commerce_payment(bigint,integer,text,text,text) to service_role;

-- Run ONLY after a full refund is confirmed in the provider/bank, never from a browser request.
create function public.record_commerce_refund(p_order uuid,p_reference text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if char_length(trim(coalesce(p_reference,'')))<3 then raise exception 'REFUND_REFERENCE_REQUIRED'; end if;
  update public.commerce_orders set status='refunded',refunded_at=now(),refund_reference=p_reference where id=p_order and status='paid';
  return found;
end $$;
revoke all on function public.record_commerce_refund(uuid,text) from public,anon,authenticated;
grant execute on function public.record_commerce_refund(uuid,text) to service_role;

create function public.submit_business_lead(p_name text,p_email text,p_organization text,p_segment text,p_message text,p_locale text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if not private.consume_quota('lead:'||lower(p_email),3,3600) then raise exception 'RATE_LIMIT'; end if;
  insert into public.business_leads(name,email,organization,segment,message,locale) values(p_name,lower(p_email),p_organization,p_segment,p_message,p_locale) returning id into result;
  return result;
end $$;
revoke all on function public.submit_business_lead(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_business_lead(text,text,text,text,text,text) to service_role;
