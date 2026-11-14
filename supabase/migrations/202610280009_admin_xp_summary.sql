-- Aggregated explorer XP metrics for the admin dashboard.
create or replace function public.admin_xp_summary() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare total_xp bigint;completed_count bigint;explorers bigint;top_level bigint;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN';end if;
 select coalesce(sum(p.awarded_points),0),count(*) filter(where p.completed_at is not null),count(distinct p.user_id) into total_xp,completed_count,explorers from public.challenge_progress p;
 select coalesce(max(floor(sqrt(coalesce(u.xp,0)/100.0))+1),0) into top_level from (select p2.user_id,sum(p2.awarded_points) xp from public.challenge_progress p2 group by p2.user_id)u;
 return jsonb_build_object(
  'total_xp',total_xp,
  'completed_challenges',completed_count,
  'explorers',explorers,
  'top_level',top_level
 );
end $$;
revoke all on function public.admin_xp_summary() from public,anon;
grant execute on function public.admin_xp_summary() to authenticated;
