import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
let db: PGlite;
const users = Array.from(
  { length: 6 },
  (_, i) => `60000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
);
const [owner, member, third, fourth, fifth, admin] = users;
const challenge = '10000000-0000-4000-8000-000000000001';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to anon,authenticated;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
  );
  for (const file of (await readdir('supabase/migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  for (const id of users)
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
      id,
      `${id.slice(-1)}@example.test`,
      { display_name: 'Explorer', terms_version: '2026-10-26' },
    ]);
  await db.query("insert into public.user_roles values($1,'admin')", [admin]);
}, 30000);
beforeEach(async () => {
  await db.exec(
    'truncate public.catalog_bookmarks,public.plan_orders,public.memberships,public.family_members,public.family_invites,public.challenge_progress,public.travel_sessions,public.discovery_visits,public.place_submissions,public.user_notifications,public.itinerary_requests,public.operating_expenses,public.audit_events,private.rate_limits restart identity cascade',
  );
});
afterAll(async () => {
  await db?.close();
});
async function as<T>(user: string | null, task: () => Promise<T>) {
  await db.exec(`begin;set local role ${user ? 'authenticated' : 'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [user || '']);
  try {
    const result = await task();
    await db.exec('commit');
    return result;
  } catch (error) {
    await db.exec('rollback');
    throw error;
  }
}
async function reserve(plan = 'premium', user = owner) {
  return (
    await db.query<{ id: string; amount: number; order_code: number }>(
      'select * from public.reserve_plan_order($1,$2,$3,$4)',
      [user, plan, 'sepay', 'card'],
    )
  ).rows[0];
}
async function activate(id: string, amount = 39000, ref = `sepay:${id}`) {
  return db.query("select public.activate_plan_order($1,$2,'VND','sepay',$3)", [id, amount, ref]);
}
async function family() {
  const order = await reserve('family');
  await activate(order.id, 89000);
  return order;
}
async function invite() {
  return as(
    owner,
    async () =>
      (
        await db.query<{ invite: { token: string } }>(
          "select public.family_action('invite') invite",
        )
      ).rows[0].invite.token,
  );
}
async function membership(user = owner) {
  return as(
    user,
    async () =>
      (
        await db.query<{
          access: { plan: string; is_owner: boolean; challenge_used: number; expires_at: string };
        }>('select public.my_membership() access')
      ).rows[0].access,
  );
}
describe('membership PostgreSQL production boundaries', () => {
  it('keeps local catalog bookmarks private, preserves timestamp on repeated save, and erases newer quota buckets', async () => {
    await db.query(
      "insert into public.catalog_bookmarks(user_id,entry_id) values($1,'HCM-0001') on conflict do nothing",
      [owner],
    );
    expect(
      (await as(member, () => db.query('select * from public.catalog_bookmarks'))).rows,
    ).toHaveLength(0);
    await as(owner, () =>
      db.exec("update public.catalog_bookmarks set collection='Weekend' where entry_id='HCM-0001'"),
    );
    await expect(
      as(owner, () =>
        db.exec(
          "update public.catalog_bookmarks set user_id='60000000-0000-4000-8000-000000000002'",
        ),
      ),
    ).rejects.toThrow();
    await expect(
      as(owner, () =>
        db.query("insert into public.catalog_bookmarks(user_id,entry_id) values($1,'HCM-0002')", [
          owner,
        ]),
      ),
    ).rejects.toThrow();
    await db.query("select public.consume_workspace_quota($1,'planner',3,60)", [fifth]);
    await db.query('delete from auth.users where id=$1', [fifth]);
    expect(
      (await db.query('select * from private.rate_limits where key=$1', [`planner:${fifth}`])).rows,
    ).toHaveLength(0);
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
      fifth,
      { display_name: 'Explorer', terms_version: '2026-10-26' },
    ]);
  });
  it('reserves only server prices and grants exactly one calendar month after verified payment, idempotently', async () => {
    const order = await reserve();
    expect(order.amount).toBe(39000);
    expect((await reserve()).id).toBe(order.id);
    await expect(activate(order.id, 1)).rejects.toThrow('PAYMENT_MISMATCH');
    expect((await membership()).plan).toBe('free');
    await activate(order.id);
    await activate(order.id);
    expect((await membership()).plan).toBe('premium');
    expect((await db.query('select * from public.memberships')).rows).toHaveLength(1);
    const duration = await db.query<{ ok: boolean }>(
      "select ends_at=starts_at+interval '1 month' ok from public.memberships",
    );
    expect(duration.rows[0].ok).toBe(true);
    await expect(activate(order.id, 39000, 'different')).rejects.toThrow('PAYMENT_MISMATCH');
  });
  it('extends renewal after the current period and revokes refunded access without reopening on callback replay', async () => {
    const first = await reserve();
    await activate(first.id);
    const second = await reserve();
    await activate(second.id);
    const prepaid = (
      await db.query<{ ends_at: Date }>(
        'select ends_at from public.memberships where order_id=$1',
        [second.id],
      )
    ).rows[0].ends_at;
    expect(Date.parse((await membership()).expires_at)).toBe(prepaid.getTime());
    expect(
      (
        await db.query<{ ok: boolean }>(
          `select b.starts_at=a.ends_at ok from public.memberships a join public.memberships b on a.order_id=$1 and b.order_id=$2`,
          [first.id, second.id],
        )
      ).rows[0].ok,
    ).toBe(true);
    await db.query("select public.refund_plan_order($1,'actual-refund-001')", [first.id]);
    await activate(first.id);
    expect((await membership()).plan).toBe('free');
    expect(
      (await db.query('select refund_reference from public.plan_orders where id=$1', [first.id]))
        .rows[0],
    ).toEqual({ refund_reference: 'actual-refund-001' });
  });
  it('expires entitlements and prevents browser mutations or service-RPC access', async () => {
    const order = await reserve();
    await activate(order.id);
    await db.exec(
      "update public.memberships set starts_at=now()-interval '2 months',ends_at=now()-interval '1 month'",
    );
    expect((await membership()).plan).toBe('free');
    for (const sql of [
      "update public.plan_orders set status='paid'",
      "insert into public.memberships(user_id,plan_id,starts_at,ends_at) values('" +
        owner +
        "','family',now(),now()+interval '1 year')",
      `select public.reserve_plan_order('${owner}','family','sepay','card')`,
      `select public.activate_plan_order('${order.id}',39000,'VND','sepay','fake')`,
      `select public.admin_workspace()`,
    ])
      await expect(as(member, () => db.exec(sql))).rejects.toThrow();
    expect(await as(member, () => db.query('select * from public.plan_orders'))).toMatchObject({
      rows: [],
    });
  });
  it('allows four family members total, consumes invites once, and revokes inherited entitlement on leave or owner expiry', async () => {
    await family();
    const tokens: string[] = [];
    for (let i = 0; i < 4; i++) tokens.push(await invite()); // sequential DB engine, separate committed requests
    for (const [index, user] of [member, third, fourth].entries())
      await as(user, () => db.query("select public.family_action('accept',$1)", [tokens[index]]));
    expect((await membership(member)).plan).toBe('family');
    expect((await membership(member)).is_owner).toBe(false);
    await expect(
      as(fifth, () => db.query("select public.family_action('accept',$1)", [tokens[3]])),
    ).rejects.toThrow('FAMILY_FULL');
    await expect(
      as(fifth, () => db.query("select public.family_action('accept',$1)", [tokens[0]])),
    ).rejects.toThrow('INVITE_INVALID');
    await as(member, () => db.exec("select public.family_action('leave')"));
    expect((await membership(member)).plan).toBe('free');
    await db.exec(
      "update public.memberships set starts_at=now()-interval '2 months',ends_at=now()-interval '1 month'",
    );
    expect((await membership(third)).plan).toBe('free');
  });
  it('caps Free new challenges at five per Vietnam day, allows idempotent retries and removes the business cap for Premium', async () => {
    const challenges = (await db.query<{ id: string }>('select id from public.challenges limit 1'))
      .rows;
    expect(challenges).toHaveLength(1);
    for (let i = 1; i <= 6; i++)
      await db.query(
        "insert into public.challenges(id,entry_id,translations,points,badge,status) select $1,entry_id,translations,points,badge,'published' from public.challenges where id=$2",
        [`71000000-0000-4000-8000-${String(i).padStart(12, '0')}`, challenge],
      );
    const all = (
      await db.query<{ id: string }>('select id from public.challenges order by id limit 6')
    ).rows;
    for (const item of all.slice(0, 5))
      await as(owner, () => db.query('select public.join_challenge($1)', [item.id]));
    await as(owner, () => db.query('select public.join_challenge($1)', [all[0].id]));
    await expect(
      as(owner, () => db.query('select public.join_challenge($1)', [all[5].id])),
    ).rejects.toThrow('DAILY_CHALLENGE_LIMIT');
    expect((await membership()).challenge_used).toBe(5);
    const order = await reserve();
    await activate(order.id);
    await as(owner, () => db.query('select public.join_challenge($1)', [all[5].id]));
  });
  it('keeps pending submissions private, notifies admin, and publishes exactly once after an admin review', async () => {
    const id = await as(
      member,
      async () =>
        (
          await db.query<{ id: string }>(
            "select public.submit_place('Test place','Test address','Quận 1','A test place with a sufficiently descriptive sourced summary.',10.77,106.7,'https://example.test/source') id",
          )
        ).rows[0].id,
    );
    expect(
      (await as(owner, () => db.query('select * from public.place_submissions'))).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('select * from public.user_notifications where user_id=$1', [admin])).rows,
    ).toHaveLength(1);
    await expect(
      as(member, () => db.query("select public.review_place($1,true,'Verified source')", [id])),
    ).rejects.toThrow('FORBIDDEN');
    await as(admin, () =>
      db.query("select public.review_place($1,true,'Verified source and address')", [id]),
    );
    expect(
      (
        await as(null, () =>
          db.query('select * from public.heritage_entries where slug=$1', [`community-${id}`]),
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      as(admin, () => db.query("select public.review_place($1,true,'Repeat review')", [id])),
    ).rejects.toThrow('SUBMISSION_UNAVAILABLE');
  });
  it('records only owned GPS sessions, rejects jumps/old timestamps, and keeps points private', async () => {
    const id = await as(
      owner,
      async () =>
        (
          await db.query<{ trip: { id: string } }>(
            "select public.trip_action('start','Actual trip') trip",
          )
        ).rows[0].trip.id,
    );
    const now = Date.now();
    const point = (seq: number, lat: number, time: number) =>
      db.query("select public.trip_action('point','',$1,$2,$3,106.7,10,$4)", [
        id,
        seq,
        lat,
        new Date(time).toISOString(),
      ]);
    await as(owner, () => point(0, 10.77, now - 20000));
    await as(owner, () => point(1, 10.7701, now - 10000));
    await expect(as(owner, () => point(2, 60, now))).rejects.toThrow('GPS_JUMP');
    await expect(as(member, () => point(2, 10.7702, now))).rejects.toThrow('TRIP_UNAVAILABLE');
    expect(
      (await as(member, () => db.query('select * from public.travel_points'))).rows,
    ).toHaveLength(0);
    await as(owner, () => db.query("select public.trip_action('stop','',$1)", [id]));
    await expect(as(owner, () => point(2, 10.7702, now))).rejects.toThrow('TRIP_FINISHED');
  });
  it('gates AI to Family, computes recorded profit only after fee reconciliation, and requires consent at SQL entrypoints', async () => {
    await expect(as(owner, () => db.exec("select public.reserve_itinerary('{}')"))).rejects.toThrow(
      'FAMILY_REQUIRED',
    );
    const order = await family();
    await as(owner, () => db.exec("select public.reserve_itinerary('{}')"));
    const before = await as(
      admin,
      async () =>
        (
          await db.query<{ data: { profit: number | null } }>(
            'select public.admin_workspace() data',
          )
        ).rows[0].data,
    );
    expect(before.profit).toBeNull();
    await as(admin, () => db.query('select public.admin_record_fee($1,1000)', [order.id]));
    await as(admin, () =>
      db.exec("select public.admin_expense(5000,'hosting','Actual hosting cost',current_date)"),
    );
    expect(
      (
        await as(
          admin,
          async () =>
            (await db.query<{ data: { profit: number } }>('select public.admin_workspace() data'))
              .rows[0].data,
        )
      ).profit,
    ).toBe(83000);
    await db.query('update public.profiles set consented_at=null where id=$1', [owner]);
    try {
      await expect(
        as(owner, () => db.query('select public.join_challenge($1)', [challenge])),
      ).rejects.toThrow('TERMS_REQUIRED');
      await expect(
        as(owner, () => db.exec("select public.trip_action('start','No consent')")),
      ).rejects.toThrow('TERMS_REQUIRED');
    } finally {
      await db.query('update public.profiles set consented_at=now() where id=$1', [owner]);
    }
  });
});
