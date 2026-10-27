import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
let db: PGlite;
const alice = '40000000-0000-4000-8000-000000000001',
  bob = '40000000-0000-4000-8000-000000000002';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to anon,authenticated;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
  );
  await db.exec(await readFile('supabase/migrations/202610260001_initial.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/202610270004_commerce.sql', 'utf8'));
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$3),($2,$3)', [alice, bob, {display_name:'Test',terms_version:'2026-10-26'}]);
}, 30000);
beforeEach(async () => {
  await db.exec(
    'truncate public.commerce_orders,public.business_leads,private.rate_limits restart identity',
  );
});
afterAll(async () => {
  await db?.close();
});
async function reserve(user = alice, product = 'walk', slug: string | null = 'sai-gon-ben-song') {
  return (
    await db.query<{ id: string; order_code: number; amount: number }>(
      `select * from public.reserve_commerce_order($1,$2,$3)`,
      [user, product, slug],
    )
  ).rows[0];
}
async function pay(
  code: number,
  amount = 39000,
  link = 'link',
  reference = 'bank-reference',
  currency = 'VND',
) {
  return db.query('select public.complete_commerce_payment($1,$2,$3,$4,$5) as completed', [
    code,
    amount,
    link,
    reference,
    currency,
  ]);
}
describe('commerce PostgreSQL trust boundaries', () => {
  it('reserves at server prices, reuses pending orders, and rejects invalid products', async () => {
    const order = await reserve();
    expect(order.amount).toBe(39000);
    expect((await reserve()).id).toBe(order.id);
    expect((await reserve(alice, 'collection', null)).amount).toBe(89000);
    await expect(reserve(alice, 'walk', 'unknown-route')).rejects.toThrow();
    await expect(reserve(alice, 'forged', null)).rejects.toThrow();
  });
  it('never grants payment for the wrong amount, currency or provider link; replays are idempotent', async () => {
    const order = await reserve();
    await db.query('update public.commerce_orders set payment_link_id=$1 where id=$2', [
      'link',
      order.id,
    ]);
    for (const [amount,link,reference,currency] of [
      [1, 'link', 'reference', 'VND'],
      [39000, 'forged', 'reference', 'VND'],
      [39000, 'link', 'reference', 'USD'],
    ] as const)
      await expect(pay(order.order_code, amount,link,reference,currency)).rejects.toThrow('PAYMENT_MISMATCH');
    expect(
      (await db.query('select status from public.commerce_orders where id=$1', [order.id])).rows[0],
    ).toEqual({ status: 'pending' });
    await pay(order.order_code);
    await pay(order.order_code);
    expect(
      (await db.query('select status from public.commerce_orders where id=$1', [order.id])).rows[0],
    ).toEqual({ status: 'paid' });
    await expect(reserve()).rejects.toThrow('ALREADY_OWNED');
    await expect(pay(order.order_code, 39000, 'link', 'different-reference')).rejects.toThrow(
      'PAYMENT_MISMATCH',
    );
  });
  it('a verified full refund revokes access and a replayed paid webhook cannot reopen it', async () => {
    const order = await reserve();
    await db.query('update public.commerce_orders set payment_link_id=$1 where id=$2', [
      'link',
      order.id,
    ]);
    await pay(order.order_code);
    await db.query('select public.record_commerce_refund($1,$2)', [
      order.id,
      'confirmed-refund-001',
    ]);
    await pay(order.order_code);
    expect(
      (await db.query('select status from public.commerce_orders where id=$1', [order.id])).rows[0],
    ).toEqual({ status: 'refunded' });
  });
  it('one account cannot view another account orders, mutate its own status, read leads or invoke service functions', async () => {
    const order = await reserve();
    await reserve(bob, 'collection', null);
    await db.exec('begin;set local role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [bob]);
    expect((await db.query('select id from public.commerce_orders')).rows).toHaveLength(1);
    expect(
      (await db.query('select id from public.commerce_orders where id=$1', [order.id])).rows,
    ).toHaveLength(0);
    await db.exec('rollback');
    for (const statement of [
      "update public.commerce_orders set status='paid'",
      'select * from public.business_leads',
      `select public.reserve_commerce_order('${bob}','collection',null)`,
      `select public.complete_commerce_payment(100000,39000,'link','ref','VND')`,
    ]) {
      await db.exec('begin;set local role authenticated');
      try {
        await expect(db.exec(statement)).rejects.toThrow();
      } finally {
        await db.exec('rollback');
      }
    }
  });
  it('rate-limits business inquiries and keeps them out of anonymous access', async () => {
    for (let i = 0; i < 3; i++)
      await db.query('select public.submit_business_lead($1,$2,$3,$4,$5,$6)', [
        'Test Person',
        'inquiry@example.test',
        'Test School',
        'school',
        'A complete test inquiry for a school visit.',
        'vi',
      ]);
    await expect(
      db.query('select public.submit_business_lead($1,$2,$3,$4,$5,$6)', [
        'Test Person',
        'INQUIRY@example.test',
        'Test School',
        'school',
        'Another complete test inquiry.',
        'vi',
      ]),
    ).rejects.toThrow('RATE_LIMIT');
    await db.exec('begin;set local role anon');
    try {
      await expect(db.exec('select * from public.business_leads')).rejects.toThrow();
    } finally {
      await db.exec('rollback');
    }
  });
  it('account deletion detaches financial records without retaining the deleted account link', async () => {
    const order = await reserve();
    await db.exec('begin');
    try {
      await db.query('delete from auth.users where id=$1', [alice]);
      expect(
        (await db.query('select user_id from public.commerce_orders where id=$1', [order.id]))
          .rows[0],
      ).toEqual({ user_id: null });
    } finally {
      await db.exec('rollback');
    }
  });
});
