import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import nextEnv from '@next/env';
vi.mock('server-only', () => ({}));
nextEnv.loadEnvConfig(process.cwd());

import { getHcmPlaces, type HcmPlace } from '@/data/hcm-places';
import { normalizeRecognitionImage } from '@/lib/image';
import { analyzeRecognition } from '@/lib/recognition-pipeline';
import { recognitionInstructions } from '@/lib/vision-provider';
import { placeContext } from '@/lib/place-context';
import { ApiError } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/types';
import type { DeviceLocation, RecognitionResult } from '@/lib/recognition';

/**
 * Live accuracy eval of the camera recognition prompt (prompts/recognition.md) on DeepSeek via TheHive.
 * Positives: real catalog photos, with and without device GPS. Negatives: photos from other
 * provinces while the device claims to stand at a Saigon catalog place (must not be "matched").
 * See evals/README.md for the options.
 */
const SIZE = Number(process.env.EVAL_SIZE || 12);
const SEED = process.env.EVAL_SEED || '1';
const LOCALE: Locale = isLocale(process.env.EVAL_LOCALE || '')
  ? (process.env.EVAL_LOCALE as Locale)
  : 'vi';
const WITH_CONTEXT = process.env.EVAL_CONTEXT === '1';
const CONCURRENCY = Math.max(1, Number(process.env.EVAL_CONCURRENCY || 3));
const NEGATIVES = ['ha-long.jpg', 'hoi-an.jpg', 'hue.jpg', 'my-son.jpg', 'thang-long.jpg', 'trang-an.jpg'];

type Case = {
  kind: 'located' | 'visual' | 'negative';
  file: string;
  expected: HcmPlace | null;
  standingAt: HcmPlace | null;
};
type Outcome = Case & { ms: number; error: string | null; result: RecognitionResult | null };

const imagePath = (src: string) => path.join(process.cwd(), 'public', decodeURI(src));
const rank = (id: string) => createHash('sha256').update(`${SEED}:${id}`).digest('hex');

/** Deterministic sample spread across category groups, so one kind of place cannot dominate. */
function sample(places: HcmPlace[]) {
  const usable = places
    // Only verified coordinates: the pipeline deliberately ignores distance when hasGps is false.
    .filter((p) => p.status === 'published' && p.hasImage && p.image && p.latitude !== null && p.hasGps)
    .filter((p) => existsSync(imagePath(p.image!)))
    .sort((a, b) => rank(a.id).localeCompare(rank(b.id)));
  const groups = new Map<string, HcmPlace[]>();
  for (const p of usable) groups.set(p.categoryGroup, [...(groups.get(p.categoryGroup) || []), p]);
  const picked: HcmPlace[] = [];
  while (picked.length < SIZE && [...groups.values()].some((g) => g.length)) {
    for (const group of [...groups.keys()].sort()) {
      const next = groups.get(group)!.shift();
      if (next && picked.length < SIZE) picked.push(next);
    }
  }
  return picked;
}

const at = (place: HcmPlace): DeviceLocation => ({
  source: 'device',
  latitude: place.latitude!,
  longitude: place.longitude!,
  accuracy: 25,
  timestamp: Date.now(),
});

async function run(item: Case, instructions: string, catalog: HcmPlace[]): Promise<Outcome> {
  const started = Date.now();
  try {
    const image = await normalizeRecognitionImage(readFileSync(item.file));
    const location = item.standingAt ? at(item.standingAt) : null;
    const result = await analyzeRecognition({
      image,
      locale: LOCALE,
      location,
      origin: 'camera',
      catalog,
      instructions,
      signal: AbortSignal.timeout(54_000),
      context:
        location && WITH_CONTEXT
          ? placeContext(location, AbortSignal.timeout(6000)).catch(() => null)
          : Promise.resolve(null),
    });
    return { ...item, ms: Date.now() - started, error: null, result };
  } catch (error) {
    const code =
      error instanceof ApiError ? error.code : error instanceof Error ? error.message : 'unknown';
    return { ...item, ms: Date.now() - started, error: code, result: null };
  }
}

function passed(o: Outcome) {
  if (!o.result) return false;
  const ids = o.result.candidates.map((c) => c.entry.id);
  if (o.kind === 'negative') return ids.length === 0;
  if (o.kind === 'located') return ids[0] === o.expected!.id;
  return ids.includes(o.expected!.id);
}

it('measures recognition accuracy of the current prompt', async () => {
  if (!process.env.THEHIVE_API_KEY) {
    console.warn('THEHIVE_API_KEY missing: vision eval skipped');
    return;
  }
  const catalog = getHcmPlaces();
  const instructions = await recognitionInstructions();
  const places = sample(catalog);
  const cases: Case[] = [
    ...places.map((p) => ({ kind: 'located' as const, file: imagePath(p.image!), expected: p, standingAt: p })),
    ...places.map((p) => ({ kind: 'visual' as const, file: imagePath(p.image!), expected: p, standingAt: null })),
    ...NEGATIVES.map((name, i) => ({
      kind: 'negative' as const,
      file: path.join(process.cwd(), 'public/images', name),
      expected: null,
      standingAt: places[i % places.length],
    })),
  ];
  const outcomes: Outcome[] = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < cases.length) {
        const outcome = await run(cases[cursor++], instructions, catalog);
        outcomes.push(outcome);
        console.log(
          `${passed(outcome) ? 'PASS' : 'FAIL'} ${outcome.kind.padEnd(8)} ${outcome.ms}ms ${outcome.expected?.name ?? path.basename(outcome.file)}`,
        );
      }
    }),
  );

  const of = (kind: Case['kind']) => outcomes.filter((o) => o.kind === kind);
  const rate = (list: Outcome[], test = passed) =>
    list.length ? Math.round((list.filter(test).length / list.length) * 100) / 100 : 0;
  const summary = {
    model: process.env.VISION_MODEL || 'default',
    prompt: process.env.VISION_PROMPT_FILE || 'prompts/recognition.md',
    locale: LOCALE,
    seed: SEED,
    placeContext: WITH_CONTEXT,
    cases: outcomes.length,
    validJson: rate(outcomes, (o) => !!o.result),
    locatedTop1: rate(of('located')),
    locatedTop3: rate(of('located'), (o) =>
      Boolean(o.result?.candidates.some((c) => c.entry.id === o.expected!.id)),
    ),
    visualTop3: rate(of('visual')),
    negativeRejected: rate(of('negative')),
    subjectFilled: rate(outcomes, (o) => Boolean(o.result?.subject)),
    avgMs: Math.round(outcomes.reduce((sum, o) => sum + o.ms, 0) / Math.max(1, outcomes.length)),
  };
  const failures = outcomes
    .filter((o) => !passed(o))
    .map((o) => ({
      kind: o.kind,
      expected: o.expected ? `${o.expected.id} ${o.expected.name}` : null,
      image: path.basename(o.file),
      error: o.error,
      got: o.result?.candidates.map((c) => `${c.entry.id} ${c.entry.name}`) ?? null,
      subject: o.result?.subject?.name ?? null,
      visibleText: o.result?.visibleText ?? null,
      assessment: o.result?.assessment ?? null,
    }));
  console.table(summary);
  console.log(JSON.stringify(failures, null, 2));
  mkdirSync('evals/results', { recursive: true });
  const file = `evals/results/vision-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(
    file,
    JSON.stringify(
      {
        summary,
        failures,
        outcomes: outcomes.map((o) => ({
          ...o,
          expected: o.expected?.id ?? null,
          standingAt: o.standingAt?.id ?? null,
        })),
      },
      null,
      2,
    ),
  );
  console.log('report:', file);
  // A broken prompt usually shows up as unparseable output first.
  expect(summary.validJson).toBeGreaterThanOrEqual(0.9);
});
