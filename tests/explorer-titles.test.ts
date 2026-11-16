import { describe, expect, it } from 'vitest';
import { EXPLORER_TITLE_SEEDS } from '@/data/explorer-titles';
import { hcmPlaces } from '@/data/hcm-places';
import {
  evaluateAllExplorerTitles,
  evaluateTitleRule,
  resolveActiveExplorerTitle,
  totalExplorerTitlesCount,
  type ExplorerTitleMetrics,
} from '@/lib/explorer-titles';
import { locales } from '@/lib/types';

describe('explorer titles catalog (300+ multi-language progression)', () => {
  it('provides at least 300 unique, trilingual titles ordered from easy (1) to legendary (6)', () => {
    expect(totalExplorerTitlesCount()).toBeGreaterThanOrEqual(300);
    expect(EXPLORER_TITLE_SEEDS.length).toBe(336);

    const ids = new Set<string>();
    const viNames = new Set<string>();
    const enNames = new Set<string>();
    const zhNames = new Set<string>();

    let previousTier = 1;
    for (const seed of EXPLORER_TITLE_SEEDS) {
      expect(ids.has(seed.id), `duplicate id ${seed.id}`).toBe(false);
      ids.add(seed.id);

      expect(seed.tier).toBeGreaterThanOrEqual(previousTier);
      previousTier = seed.tier;

      expect(seed.name[0].trim()).not.toBe('');
      expect(seed.name[1].trim()).not.toBe('');
      expect(seed.name[2].trim()).not.toBe('');
      expect(seed.motto[0].trim()).not.toBe('');
      expect(seed.motto[1].trim()).not.toBe('');
      expect(seed.motto[2].trim()).not.toBe('');

      expect(viNames.has(seed.name[0]), `duplicate vi name: ${seed.name[0]}`).toBe(false);
      expect(enNames.has(seed.name[1]), `duplicate en name: ${seed.name[1]}`).toBe(false);
      expect(zhNames.has(seed.name[2]), `duplicate zh name: ${seed.name[2]}`).toBe(false);
      viNames.add(seed.name[0]);
      enNames.add(seed.name[1]);
      zhNames.add(seed.name[2]);
    }

    for (const requested of [
      'Khoai Lang Thang',
      'Nhà Du Mục',
      'Khách Lãng Du',
      'Kẻ Phiêu Diêu',
      'Nhà Thám Hiểm',
    ]) {
      expect(viNames.has(requested), `missing requested title: ${requested}`).toBe(true);
    }
  });

  it('keeps topic-specific thresholds attainable within the actual HCM place dataset', () => {
    const counts: Record<string, number> = {};
    for (const place of hcmPlaces) {
      counts[place.kind] = (counts[place.kind] ?? 0) + 1;
    }

    for (const seed of EXPLORER_TITLE_SEEDS) {
      if (seed.rule.metric === 'topic' && seed.rule.topic) {
        expect(seed.rule.threshold).toBeLessThanOrEqual(counts[seed.rule.topic] ?? 0);
      }
      if (seed.rule.metric === 'topics_covered') {
        expect(seed.rule.threshold).toBeLessThanOrEqual(Object.keys(counts).length);
      }
    }
  });

  it('evaluates unlocks, progress percentages, active title resolution and all 3 locales', () => {
    const freshUser: ExplorerTitleMetrics = {
      xp: 0,
      level: 1,
      completedCount: 0,
      savedCount: 0,
      visitedCount: 0,
      topicCounts: {},
      uniqueTopics: 0,
    };
    const veteranUser: ExplorerTitleMetrics = {
      xp: 6500,
      level: 9,
      completedCount: 35,
      savedCount: 120,
      visitedCount: 70,
      topicCounts: {
        monument: 28,
        architecture: 65,
        nature: 28,
        craft: 50,
        symbol: 130,
      },
      uniqueTopics: 5,
    };

    for (const locale of locales) {
      const freshEval = evaluateAllExplorerTitles(freshUser, locale);
      expect(freshEval.length).toBe(336);
      expect(freshEval.filter((t) => t.unlocked).length).toBe(2);
      expect(freshEval.every((t) => t.howToEarn.trim().length > 0)).toBe(true);
      expect(freshEval.every((t) => t.difficultyLabel.trim().length > 0)).toBe(true);

      const veteranEval = evaluateAllExplorerTitles(veteranUser, locale);
      const veteranUnlocked = veteranEval.filter((t) => t.unlocked);
      expect(veteranUnlocked.length).toBeGreaterThan(200);
      expect(veteranEval.at(-1)?.unlocked).toBe(false);

      const highest = resolveActiveExplorerTitle(veteranEval, null);
      expect(highest.unlocked).toBe(true);
      expect(highest.order).toBeGreaterThan(200);

      // Equipping an unlocked lower-tier title succeeds; locked preferred ID falls back to highest unlocked
      const firstId = veteranEval[0].id;
      expect(resolveActiveExplorerTitle(veteranEval, firstId).id).toBe(firstId);
      const lockedId = veteranEval.at(-1)!.id;
      expect(resolveActiveExplorerTitle(veteranEval, lockedId).id).toBe(highest.id);
    }

    expect(
      evaluateTitleRule(
        { metric: 'combo_visit_challenge', threshold: 10, secondaryThreshold: 5 },
        { ...freshUser, visitedCount: 10, completedCount: 4 },
      ).unlocked,
    ).toBe(false);
    expect(
      evaluateTitleRule(
        { metric: 'combo_visit_challenge', threshold: 10, secondaryThreshold: 5 },
        { ...freshUser, visitedCount: 10, completedCount: 5 },
      ).unlocked,
    ).toBe(true);
  });
});
