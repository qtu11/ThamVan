import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
let db: PGlite;
const alice = '20000000-0000-4000-8000-000000000001',
  bob = '20000000-0000-4000-8000-000000000002',
  admin = '20000000-0000-4000-8000-000000000003';
const entry = '00000000-0000-4000-8000-000000000001',
  challenge = '10000000-0000-4000-8000-000000000001';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; grant usage on schema auth to anon,authenticated; create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`,
  );
  await db.exec(await readFile('supabase/migrations/202610260001_initial.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/202610260002_retention.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/202610270003_google_auth_consent.sql', 'utf8'));
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  await db.exec(
    `insert into auth.users(id,raw_user_meta_data) values ('${alice}','{"display_name":"Alice","terms_version":"2026-10-26"}'),('${bob}','{"display_name":"Bob","terms_version":"2026-10-26"}'),('${admin}','{"display_name":"Admin","terms_version":"2026-10-26"}');insert into public.user_roles values('${admin}','admin');`,
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function asUser<T>(user: string | null, operation: () => Promise<T>) {
  await db.exec(`begin;set local role ${user ? 'authenticated' : 'anon'};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [user || '']);
  try {
    return await operation();
  } finally {
    await db.exec('rollback');
  }
}
describe('actual PostgreSQL grants, RLS and award transactions', () => {
  it('re-running the Google upgrade preserves existing consent and backfills missing profiles without consent', async () => {
    const missing = '30000000-0000-4000-8000-000000000099';
    const before = (
      await db.query('select terms_version,consented_at from public.profiles where id=$1', [alice])
    ).rows[0];
    await db.exec('alter table auth.users disable trigger on_auth_user_created');
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
      missing,
      { full_name: 'Existing user' },
    ]);
    await db.exec('alter table auth.users enable trigger on_auth_user_created');
    await db.exec(
      await readFile('supabase/migrations/202610270003_google_auth_consent.sql', 'utf8'),
    );
    expect(
      (
        await db.query('select terms_version,consented_at from public.profiles where id=$1', [
          alice,
        ])
      ).rows[0],
    ).toEqual(before);
    expect(
      (
        await db.query('select terms_version,consented_at from public.profiles where id=$1', [
          missing,
        ])
      ).rows[0],
    ).toEqual({ terms_version: null, consented_at: null });
    await db.query('delete from auth.users where id=$1', [missing]);
  });
  it('creates a Google profile without inventing terms acceptance or admin privileges', async () => {
    await db.exec('begin');
    try {
      const id = '30000000-0000-4000-8000-000000000001';
      await db.query(
        'insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) values($1,$2,$3)',
        [
          id,
          { provider: 'google' },
          { full_name: 'Google Explorer', terms_version: '2026-10-26', role: 'admin' },
        ],
      );
      const p = await db.query<{
        display_name: string;
        terms_version: string | null;
        consented_at: string | null;
      }>('select display_name,terms_version,consented_at from public.profiles where id=$1', [id]);
      expect(p.rows[0]).toEqual({
        display_name: 'Google Explorer',
        terms_version: null,
        consented_at: null,
      });
      expect(
        (await db.query('select * from public.user_roles where user_id=$1', [id])).rows,
      ).toHaveLength(0);
    } finally {
      await db.exec('rollback');
    }
  });
  it('does not trust a user-editable fake Google provider', async () => {
    await expect(
      db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
        '30000000-0000-4000-8000-000000000002',
        { provider: 'google', full_name: 'Fake provider' },
      ]),
    ).rejects.toThrow(/TERMS_REQUIRED/);
  });
  it('blocks pending Google users at SQL RPC and RLS, then permits explicit consent', async () => {
    const id = '30000000-0000-4000-8000-000000000003';
    await db.query('insert into auth.users(id,raw_app_meta_data) values($1,$2)', [
      id,
      { provider: 'google' },
    ]);
    for (const sql of [
      `select public.join_challenge('${challenge}')`,
      `select public.complete_challenge('${challenge}',0)`,
      `select public.consume_recognition_quota()`,
      `select public.submit_report('${entry}','Please check this source')`,
    ])
      await expect(asUser(id, () => db.exec(sql))).rejects.toThrow(/TERMS_REQUIRED/);
    await expect(
      asUser(id, () =>
        db.query('insert into public.saved_entries(user_id,entry_id) values($1,$2)', [id, entry]),
      ),
    ).rejects.toThrow(/row.level security/i);
    await expect(
      asUser(id, () => db.exec("select public.accept_current_terms('old','Explorer','vi')")),
    ).rejects.toThrow(/INVALID_TERMS_VERSION/);
    await expect(
      asUser(id, () =>
        db.exec("update public.profiles set terms_version='2026-10-26',consented_at=now()"),
      ),
    ).rejects.toThrow(/permission denied/i);
    await asUser(id, async () => {
      await db.exec("select public.accept_current_terms('2026-10-26','Google Explorer','en')");
      expect(
        (await db.query<{ ok: boolean }>('select public.has_accepted_terms() as ok')).rows[0].ok,
      ).toBe(true);
      const before = (
        await db.query<{ consented_at: Date }>('select consented_at from public.profiles')
      ).rows[0].consented_at;
      await db.exec("select public.accept_current_terms('2026-10-26','Google Explorer','en')");
      expect(
        (await db.query<{ consented_at: Date }>('select consented_at from public.profiles')).rows[0]
          .consented_at,
      ).toEqual(before);
      await db.query('insert into public.saved_entries(user_id,entry_id) values($1,$2)', [
        id,
        entry,
      ]);
      await db.query('select public.join_challenge($1)', [challenge]);
    });
    await db.query('delete from auth.users where id=$1', [id]);
  });
  it('prevents pending users from invoking the relocated private implementations', async () => {
    await expect(
      asUser(alice, () => db.query('select private.join_challenge($1)', [challenge])),
    ).rejects.toThrow(/permission denied/i);
  });
  it('requires consent metadata when creating an account profile', async () => {
    await expect(
      db.exec("insert into auth.users(id) values('20000000-0000-4000-8000-000000000099')"),
    ).rejects.toThrow(/TERMS_REQUIRED/);
  });
  it('allows guests to read published content but hides drafts', async () => {
    await db.exec(
      `insert into public.heritage_entries(id,slug,name,kind,region,translations) values('00000000-0000-4000-8000-000000000099','secret-draft','Private','monument','Huế','{}')`,
    );
    await asUser(null, async () => {
      const result = await db.query<{ count: number }>(
        'select count(*)::int as count from public.heritage_entries',
      );
      expect(result.rows[0].count).toBe(6);
    });
    await asUser(admin, async () => {
      const result = await db.query<{ count: number }>(
        'select count(*)::int as count from public.heritage_entries',
      );
      expect(result.rows[0].count).toBe(7);
    });
  });
  it('only returns the current user profile', async () => {
    await asUser(alice, async () => {
      const result = await db.query<{ id: string }>('select id from public.profiles');
      expect(result.rows.map((r) => r.id)).toEqual([alice]);
    });
  });
  it('rejects forged ownership when inserting a saved place', async () => {
    await expect(
      asUser(alice, () =>
        db.query('insert into public.saved_entries(user_id,entry_id) values($1,$2)', [bob, entry]),
      ),
    ).rejects.toThrow(/row.level security/i);
  });
  it('does not let a user change another user’s saved record', async () => {
    await db.query('insert into public.saved_entries(user_id,entry_id) values($1,$2)', [
      bob,
      entry,
    ]);
    await asUser(alice, async () => {
      const result = await db.query(
        'update public.saved_entries set collection=$1 where user_id=$2 returning *',
        ['Stolen', bob],
      );
      expect(result.rows).toHaveLength(0);
    });
  });
  it('forbids assigning an admin role or changing consent metadata', async () => {
    await expect(
      asUser(alice, () =>
        db.query('insert into public.user_roles values($1,$2)', [alice, 'admin']),
      ),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asUser(alice, () => db.query("update public.profiles set terms_version='forged'")),
    ).rejects.toThrow(/permission denied/i);
  });
  it('rejects direct score writes and keeps answer keys private', async () => {
    await expect(
      asUser(alice, () =>
        db.exec(
          `insert into public.challenge_progress(user_id,challenge_id,awarded_points) values('${alice}','${challenge}',1000)`,
        ),
      ),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asUser(alice, () => db.exec('select * from private.challenge_answers')),
    ).rejects.toThrow(/permission denied/i);
  });
  it('requires joining, verifies the answer, and awards points only once', async () => {
    await expect(
      asUser(alice, () => db.query('select public.complete_challenge($1,0)', [challenge])),
    ).rejects.toThrow(/JOIN_REQUIRED/);
    await asUser(alice, async () => {
      await db.query('select public.join_challenge($1)', [challenge]);
      const wrong = await db.query<{ result: { correct: boolean } }>(
        'select public.complete_challenge($1,2) as result',
        [challenge],
      );
      expect(wrong.rows[0].result.correct).toBe(false);
      const first = await db.query<{ result: { correct: boolean; already_completed: boolean } }>(
        'select public.complete_challenge($1,0) as result',
        [challenge],
      );
      expect(first.rows[0].result).toMatchObject({ correct: true, already_completed: false });
      const again = await db.query<{ result: { already_completed: boolean } }>(
        'select public.complete_challenge($1,0) as result',
        [challenge],
      );
      expect(again.rows[0].result.already_completed).toBe(true);
      const points = await db.query<{ points: number }>(
        'select sum(awarded_points)::int as points from public.challenge_progress',
      );
      expect(points.rows[0].points).toBe(20);
    });
  });
  it('limits recognition requests across sessions in the database', async () => {
    await asUser(alice, async () => {
      for (let i = 0; i < 10; i++) {
        const r = await db.query<{ allowed: boolean }>(
          'select public.consume_recognition_quota() as allowed',
        );
        expect(r.rows[0].allowed).toBe(true);
      }
      const limit = await db.query<{ allowed: boolean }>(
        'select public.consume_recognition_quota() as allowed',
      );
      expect(limit.rows[0].allowed).toBe(false);
    });
  });
  it('forbids ordinary users from publishing content or moderating reports', async () => {
    await expect(
      asUser(alice, () =>
        db.exec(
          "insert into public.heritage_entries(slug,name,kind,region) values('forged','Forged','monument','X')",
        ),
      ),
    ).rejects.toThrow(/row.level security/i);
    await expect(
      asUser(alice, () => db.query('select public.set_challenge_answer($1,1)', [challenge])),
    ).rejects.toThrow(/FORBIDDEN/);
  });
  it('hides reports belonging to someone else', async () => {
    await asUser(alice, async () => {
      await db.query('select public.submit_report($1,$2)', [entry, 'Please review this source']);
      const r = await db.query('select reason from public.content_reports');
      expect(r.rows).toHaveLength(1);
    });
    await asUser(bob, async () => {
      const r = await db.query('select * from public.content_reports');
      expect(r.rows).toHaveLength(0);
    });
  });
  it('deletes account-owned records and quota counters on account deletion', async () => {
    await db.exec('begin');
    try {
      await db.query('insert into private.rate_limits(key,window_start) values($1,now())', [
        `vision:${bob}`,
      ]);
      await db.query('delete from auth.users where id=$1', [bob]);
      expect(
        (await db.query('select * from public.profiles where id=$1', [bob])).rows,
      ).toHaveLength(0);
      expect(
        (await db.query('select * from public.saved_entries where user_id=$1', [bob])).rows,
      ).toHaveLength(0);
      expect(
        (await db.query('select * from private.rate_limits where key=$1', [`vision:${bob}`])).rows,
      ).toHaveLength(0);
    } finally {
      await db.exec('rollback');
    }
  });
});
