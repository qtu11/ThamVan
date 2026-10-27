import { writeFile } from 'node:fs/promises';
import { catalog, starterChallenges } from '../src/data/catalog.ts';
const quote = (v) =>
  v === null
    ? 'null'
    : typeof v === 'number'
      ? String(v)
      : `'${(typeof v === 'object' ? JSON.stringify(v) : v).replaceAll("'", "''")}'`;
const entryColumns = [
  'id',
  'slug',
  'name',
  'kind',
  'region',
  'translations',
  'latitude',
  'longitude',
  'image',
  'image_author',
  'image_license',
  'image_source',
  'sources',
  'status',
  'verification',
  'updated_at',
];
const challengeColumns = [
  'id',
  'entry_id',
  'translations',
  'points',
  'badge',
  'status',
  'expires_at',
];
let sql =
  '-- Starter reference collection. Sources and image credits retained; not expert-reviewed.\nbegin;\n';
for (const e of catalog)
  sql += `insert into public.heritage_entries (${entryColumns.join(',')}) values (${entryColumns.map((k) => quote(e[k])).join(',')}) on conflict (id) do nothing;\n`;
for (const c of starterChallenges) {
  sql += `insert into public.challenges (${challengeColumns.join(',')}) values (${challengeColumns.map((k) => quote(c[k])).join(',')}) on conflict (id) do nothing;\n`;
  sql += `insert into private.challenge_answers (challenge_id,correct_option) values (${quote(c.id)},0) on conflict do nothing;\n`;
}
sql += 'commit;\n';
await writeFile('supabase/seed.sql', sql);
console.log(`Generated ${catalog.length} entries, ${starterChallenges.length} challenges.`);
