create function public.complete_payos_payment(p_code bigint,p_amount integer,p_link text,p_reference text,p_currency text) returns boolean language plpgsql security definer set search_path='' as $$
declare target public.plan_orders;
begin
 select * into target from public.plan_orders where order_code=p_code and provider='payos' for update;
 if found then
  if target.payment_link_id is distinct from p_link then raise exception 'PAYMENT_MISMATCH';end if;
  return public.activate_plan_order(target.id,p_amount,p_currency,'payos','payos:'||p_reference);
 end if;
 return public.complete_commerce_payment(p_code,p_amount,p_link,p_reference,p_currency);
end $$;
revoke all on function public.complete_payos_payment(bigint,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.complete_payos_payment(bigint,integer,text,text,text) to service_role;

create function public.admin_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare since_date timestamptz:=date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';revenue bigint;refunds bigint;fees bigint;expenses bigint;unknown_fees bigint;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN';end if;
 select coalesce(sum(amount),0),coalesce(sum(processing_fee),0),count(*) filter(where processing_fee is null) into revenue,fees,unknown_fees from public.plan_orders where paid_at>=since_date and status in ('paid','refunded');
 select coalesce(sum(amount),0) into refunds from public.plan_orders where refunded_at>=since_date and status='refunded';
 select coalesce(sum(amount),0) into expenses from public.operating_expenses where spent_on>=(since_date at time zone 'Asia/Ho_Chi_Minh')::date;
 return jsonb_build_object(
 'since',since_date,'revenue',revenue,'refunds',refunds,'fees',fees,'expenses',expenses,'unrecorded_fees',unknown_fees,'profit',case when unknown_fees>0 then null else revenue-refunds-fees-expenses end,
 'customers',(select count(*) from public.profiles),'active_memberships',(select count(distinct user_id) from public.memberships where revoked_at is null and starts_at<=now() and ends_at>now()),
 'pending_submissions',(select count(*) from public.place_submissions where status='pending'),
 'orders',coalesce((select jsonb_agg(row_to_json(o)) from (select id,order_code,plan_id,amount,status,provider,method,paid_at,created_at,processing_fee from public.plan_orders order by created_at desc limit 100)o),'[]'::jsonb),
 'submissions',coalesce((select jsonb_agg(row_to_json(s)) from (select * from public.place_submissions order by (status='pending') desc,created_at desc limit 100)s),'[]'::jsonb),
 'expenses_list',coalesce((select jsonb_agg(row_to_json(e)) from (select id,amount,category,description,spent_on from public.operating_expenses order by spent_on desc limit 100)e),'[]'::jsonb),
 'customers_list',coalesce((select jsonb_agg(row_to_json(c)) from (select p.id,p.display_name,u.email,private.effective_membership(p.id) membership from public.profiles p join auth.users u on u.id=p.id order by p.id limit 100)c),'[]'::jsonb),
 'notifications',coalesce((select jsonb_agg(row_to_json(n)) from (select id,title,body,url,created_at,read_at from public.user_notifications where user_id=auth.uid() order by created_at desc limit 30)n),'[]'::jsonb),
 'audit',coalesce((select jsonb_agg(row_to_json(a)) from (select * from public.audit_events order by created_at desc limit 50)a),'[]'::jsonb)
 );
end $$;
revoke all on function public.admin_workspace() from public,anon;grant execute on function public.admin_workspace() to authenticated;

create function public.admin_expense(p_amount integer,p_category text,p_description text,p_date date) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN';end if;
 if p_date>(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'FUTURE_EXPENSE';end if;
 insert into public.operating_expenses(amount,category,description,spent_on,created_by) values(p_amount,p_category,p_description,p_date,auth.uid()) returning id into result;
 insert into public.audit_events(actor_id,entity_id,action) values(auth.uid(),result,'expense.created');return result;
end $$;
revoke all on function public.admin_expense(integer,text,text,date) from public,anon;grant execute on function public.admin_expense(integer,text,text,date) to authenticated;
create function public.admin_record_fee(p_order uuid,p_fee integer) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'FORBIDDEN';end if;
 if p_fee<0 then raise exception 'INVALID_FEE';end if;
 update public.plan_orders set processing_fee=p_fee where id=p_order and status in ('paid','refunded') and p_fee<=amount;
 if not found then raise exception 'ORDER_UNAVAILABLE';end if;
 insert into public.audit_events(actor_id,entity_id,action) values(auth.uid(),p_order,'order.fee_recorded');return true;
end $$;
revoke all on function public.admin_record_fee(uuid,integer) from public,anon;grant execute on function public.admin_record_fee(uuid,integer) to authenticated;

-- Complete also enforces the calendar-day Free cap, including challenges joined earlier.
create or replace function public.complete_challenge(p_challenge_id uuid,p_answer integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare challenge public.challenges;progress public.challenge_progress;answer integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if not public.has_accepted_terms() then raise exception 'TERMS_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('challenge:'||auth.uid()::text,0));
 select * into progress from public.challenge_progress where user_id=auth.uid() and challenge_id=p_challenge_id for update;
 if not found then raise exception 'JOIN_REQUIRED';end if;
 if progress.completed_at is not null then return jsonb_build_object('correct',true,'points',progress.awarded_points,'already_completed',true);end if;
 if private.effective_membership(auth.uid())->>'plan'='free' and (select count(*) from public.challenge_progress where user_id=auth.uid() and (completed_at at time zone 'Asia/Ho_Chi_Minh')::date=(now() at time zone 'Asia/Ho_Chi_Minh')::date)>=5 then raise exception 'DAILY_CHALLENGE_LIMIT';end if;
 select c.* into challenge from public.challenges c join public.heritage_entries e on e.id=c.entry_id where c.id=p_challenge_id and c.status='published' and e.status='published' and(c.expires_at is null or c.expires_at>now());
 if not found then raise exception 'CHALLENGE_UNAVAILABLE';end if;
 if not private.consume_quota('quiz:'||auth.uid()::text,30,60) then return jsonb_build_object('correct',false,'limited',true);end if;
 select correct_option into answer from private.challenge_answers where challenge_id=p_challenge_id;
 if answer is null or p_answer is distinct from answer then return jsonb_build_object('correct',false);end if;
 update public.challenge_progress set completed_at=now(),awarded_points=challenge.points where user_id=auth.uid() and challenge_id=p_challenge_id;
 return jsonb_build_object('correct',true,'points',challenge.points,'already_completed',false);
end $$;

create function public.consume_workspace_quota(p_user uuid,p_bucket text,p_limit integer,p_seconds integer) returns boolean language sql security definer set search_path='' as $$select private.consume_quota(p_bucket||':'||p_user::text,p_limit,p_seconds)$$;
revoke all on function public.consume_workspace_quota(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_workspace_quota(uuid,text,integer,integer) to service_role;
