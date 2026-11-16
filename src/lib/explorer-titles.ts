import type { Kind, Locale } from './types';
import { copy } from './locale-copy';
import { EXPLORER_TITLE_SEEDS } from '@/data/explorer-titles';

export type TitleTier = 1 | 2 | 3 | 4 | 5 | 6;

export type TitleRuleMetric =
  | 'starter'
  | 'xp'
  | 'level'
  | 'saved'
  | 'visited'
  | 'challenges'
  | 'topics_covered'
  | 'topic'
  | 'combo_visit_challenge';

export type TitleRule = {
  metric: TitleRuleMetric;
  threshold: number;
  secondaryThreshold?: number;
  topic?: Kind;
};

export type ExplorerTitleSeed = {
  id: string;
  order: number;
  tier: TitleTier;
  rule: TitleRule;
  /** [vi, en, zh] */
  name: readonly [string, string, string];
  /** [vi, en, zh] */
  motto: readonly [string, string, string];
};

export type ExplorerTitleMetrics = {
  xp: number;
  level: number;
  completedCount: number;
  savedCount: number;
  visitedCount: number;
  topicCounts: Partial<Record<Kind, number>>;
  uniqueTopics: number;
};

export type EvaluatedExplorerTitle = {
  id: string;
  order: number;
  tier: TitleTier;
  tierLabel: string;
  difficultyLabel: string;
  title: string;
  motto: string;
  howToEarn: string;
  unlocked: boolean;
  current: number;
  target: number;
  progressPct: number;
  rule: TitleRule;
};

export const EQUIPPED_TITLE_STORAGE_KEY = 'tv-equipped-title';
export const EQUIPPED_TITLE_EVENT = 'tv-equipped-title';

export const TIER_ORDER: readonly TitleTier[] = [1, 2, 3, 4, 5, 6];

export function tierMeta(tier: TitleTier, locale: Locale) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  switch (tier) {
    case 1:
      return {
        tier,
        shortLabel: c('Bậc I', 'Tier I', '一阶'),
        difficulty: c('Dễ', 'Easy', '简单'),
        name: c('Bậc I · Khởi hành (Dễ)', 'Tier I · Starting Out (Easy)', '一阶 · 初行入门（简单）'),
        summary: c(
          'Những bước chân đầu tiên chạm ngõ phố thị và mở sổ tay thực địa.',
          'First steps into historic quarters and opening your field notebook.',
          '初入街巷、开启实地手札的最初足迹。',
        ),
      };
    case 2:
      return {
        tier,
        shortLabel: c('Bậc II', 'Tier II', '二阶'),
        difficulty: c('Phổ thông', 'Familiar', '普通'),
        name: c('Bậc II · Dạo bước Du Mục', 'Tier II · Urban Nomad', '二阶 · 城市游牧（普通）'),
        summary: c(
          'Tạo thói quen rong ruổi, lưu điểm đến và ghé thăm các góc phố quen.',
          'Building a habit of wandering, saving spots and visiting local corners.',
          '养成漫游习惯，收藏路线并实地探访街角风光。',
        ),
      };
    case 3:
      return {
        tier,
        shortLabel: c('Bậc III', 'Tier III', '三阶'),
        difficulty: c('Trung bình', 'Medium', '中等'),
        name: c('Bậc III · Lãng Du & Phiêu Diêu', 'Tier III · Free Wanderer', '三阶 · 浪游逍遥（中等）'),
        summary: c(
          'Mở rộng hành trình qua nhiều chủ đề kiến trúc, bến sông và nghề thủ công.',
          'Expanding walks across architecture, river wharves and traditional crafts.',
          '横跨建筑、江岸码头与传统手艺的进阶漫游。',
        ),
      };
    case 4:
      return {
        tier,
        shortLabel: c('Bậc IV', 'Tier IV', '四阶'),
        difficulty: c('Khó', 'Hard', '困难'),
        name: c('Bậc IV · Thám Hiểm & Biên Khảo', 'Tier IV · Field Explorer', '四阶 · 探险考据（困难）'),
        summary: c(
          'Dấn thân sâu vào tư liệu đối chiếu, thử thách thực địa và lộ trình dài.',
          'Deep commitment to heritage archives, field challenges and long walks.',
          '深入文献比对、实地挑战与长线探索的行家历程。',
        ),
      };
    case 5:
      return {
        tier,
        shortLabel: c('Bậc V', 'Tier V', '五阶'),
        difficulty: c('Rất khó', 'Very Hard', '极难'),
        name: c('Bậc V · Học Giả & Tinh Hoa', 'Tier V · Master Archivist', '五阶 · 博雅精研（极难）'),
        summary: c(
          'Am tường sâu sắc hàng trăm công trình, di tích và lớp ký ức đô thị.',
          'Mastery across hundreds of architectural landmarks and cultural records.',
          '通晓数百处建筑风貌、古迹档案与城市年轮的学者风范。',
        ),
      };
    case 6:
      return {
        tier,
        shortLabel: c('Bậc VI', 'Tier VI', '六阶'),
        difficulty: c('Cực khó', 'Legendary', '传奇'),
        name: c('Bậc VI · Huyền Thoại Đô Thị', 'Tier VI · Urban Legend', '六阶 · 城市传奇（巅峰）'),
        summary: c(
          'Đỉnh cao hiếm có dành cho người lưu giữ linh hồn di sản toàn thành phố.',
          'Rare pinnacle reserved for guardians of the entire city heritage.',
          '献给守护整座城市文化遗产灵魂的巅峰传奇探索者。',
        ),
      };
  }
}

export function topicDisplayName(topic: Kind, locale: Locale): string {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  switch (topic) {
    case 'monument':
      return c('Di tích & lịch sử', 'Monuments & History', '古迹与历史');
    case 'architecture':
      return c('Kiến trúc', 'Architecture', '建筑风貌');
    case 'nature':
      return c('Di sản thiên nhiên', 'Natural Heritage', '自然遗产');
    case 'craft':
      return c('Nghề thủ công', 'Traditional Crafts', '传统手工艺');
    case 'symbol':
      return c('Biểu tượng & hoa văn', 'Symbols & Motifs', '文化符号与纹样');
    case 'festival':
      return c('Lễ hội & cộng đồng', 'Festivals & Community', '节庆与社区');
  }
}

function localizedTuple(tuple: readonly [string, string, string], locale: Locale): string {
  return locale === 'en' ? tuple[1] : locale === 'zh' ? tuple[2] : tuple[0];
}

export function formatTitleRequirement(rule: TitleRule, locale: Locale): string {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const n = rule.threshold.toLocaleString(locale === 'vi' ? 'vi-VN' : locale === 'zh' ? 'zh-CN' : 'en-US');

  switch (rule.metric) {
    case 'starter':
      return c(
        'Mở khóa tự động khi bắt đầu hành trình trên THÁM VĂN.',
        'Unlocked automatically when you begin on THÁM VĂN.',
        '加入 THÁM VĂN 开启旅程即可自动解锁。',
      );
    case 'xp':
      return c(
        `Tích lũy đủ ${n} XP từ các thử thách thực địa.`,
        `Accumulate ${n} XP from heritage field challenges.`,
        `通过实地挑战累计获得 ${n} XP。`,
      );
    case 'level':
      return c(
        `Nâng cấp hồ sơ lên Cấp ${n}.`,
        `Reach Explorer Level ${n}.`,
        `将个人探索等级提升至第 ${n} 级。`,
      );
    case 'saved':
      return c(
        `Lưu ít nhất ${n} địa điểm vào hành trình cá nhân.`,
        `Save at least ${n} places to your personal journey.`,
        `在个人旅程中收藏至少 ${n} 个地点。`,
      );
    case 'visited':
      return c(
        `Ghé thực tế (hoặc Check-in GPS) tại ${n} địa điểm.`,
        `Visit (or GPS Check-in at) ${n} heritage places in person.`,
        `实地到访（或 GPS 打卡）至少 ${n} 个遗产地点。`,
      );
    case 'challenges':
      return c(
        `Hoàn thành ${n} thử thách tìm hiểu di sản.`,
        `Complete ${n} heritage discovery challenges.`,
        `完成 ${n} 项遗产探索挑战。`,
      );
    case 'topics_covered':
      return c(
        `Khám phá ít nhất ${n} chủ đề văn hóa khác nhau.`,
        `Explore at least ${n} distinct cultural themes.`,
        `探索至少 ${n} 个不同的文化主题分类。`,
      );
    case 'topic': {
      const topicName = rule.topic ? topicDisplayName(rule.topic, locale) : '';
      return c(
        `Lưu hoặc ghé ${n} địa điểm thuộc chủ đề “${topicName}”.`,
        `Save or visit ${n} places in “${topicName}”.`,
        `在“${topicName}”主题中收藏或到访 ${n} 个地点。`,
      );
    }
    case 'combo_visit_challenge': {
      const c2 = rule.secondaryThreshold ?? 1;
      return c(
        `Ghé thực tế ${n} địa điểm và hoàn thành ${c2} thử thách.`,
        `Visit ${n} places in person and complete ${c2} challenges.`,
        `实地打卡 ${n} 个地点并完成 ${c2} 项挑战。`,
      );
    }
  }
}

export function evaluateTitleRule(
  rule: TitleRule,
  metrics: ExplorerTitleMetrics,
): { unlocked: boolean; current: number; target: number; progressPct: number } {
  const safeXp = Math.max(0, metrics.xp);
  const safeLevel = Math.max(1, metrics.level);
  const safeSaved = Math.max(0, metrics.savedCount);
  const safeVisited = Math.max(0, metrics.visitedCount);
  const safeChallenges = Math.max(0, metrics.completedCount);
  const safeTopics = Math.max(0, metrics.uniqueTopics);

  switch (rule.metric) {
    case 'starter':
      return { unlocked: true, current: 1, target: 1, progressPct: 100 };
    case 'xp': {
      const target = Math.max(1, rule.threshold);
      const current = Math.min(safeXp, target);
      return {
        unlocked: safeXp >= rule.threshold,
        current,
        target,
        progressPct: Math.min(100, Math.round((safeXp / target) * 100)),
      };
    }
    case 'level': {
      const target = Math.max(1, rule.threshold);
      const current = Math.min(safeLevel, target);
      return {
        unlocked: safeLevel >= rule.threshold,
        current,
        target,
        progressPct: Math.min(100, Math.round((safeLevel / target) * 100)),
      };
    }
    case 'saved': {
      const target = Math.max(1, rule.threshold);
      const current = Math.min(safeSaved, target);
      return {
        unlocked: safeSaved >= rule.threshold,
        current,
        target,
        progressPct: Math.min(100, Math.round((safeSaved / target) * 100)),
      };
    }
    case 'visited': {
      const target = Math.max(1, rule.threshold);
      const current = Math.min(safeVisited, target);
      return {
        unlocked: safeVisited >= rule.threshold,
        current,
        target,
        progressPct: Math.min(100, Math.round((safeVisited / target) * 100)),
      };
    }
    case 'challenges': {
      const target = Math.max(1, rule.threshold);
      const current = Math.min(safeChallenges, target);
      return {
        unlocked: safeChallenges >= rule.threshold,
        current,
        target,
        progressPct: Math.min(100, Math.round((safeChallenges / target) * 100)),
      };
    }
    case 'topics_covered': {
      const target = Math.max(1, rule.threshold);
      const current = Math.min(safeTopics, target);
      return {
        unlocked: safeTopics >= rule.threshold,
        current,
        target,
        progressPct: Math.min(100, Math.round((safeTopics / target) * 100)),
      };
    }
    case 'topic': {
      const count = rule.topic ? Math.max(0, metrics.topicCounts[rule.topic] ?? 0) : 0;
      const target = Math.max(1, rule.threshold);
      const current = Math.min(count, target);
      return {
        unlocked: count >= rule.threshold,
        current,
        target,
        progressPct: Math.min(100, Math.round((count / target) * 100)),
      };
    }
    case 'combo_visit_challenge': {
      const vTarget = Math.max(1, rule.threshold);
      const cTarget = Math.max(1, rule.secondaryThreshold ?? 1);
      const p1 = Math.min(1, safeVisited / vTarget);
      const p2 = Math.min(1, safeChallenges / cTarget);
      const unlocked = safeVisited >= vTarget && safeChallenges >= cTarget;
      const doneSteps = (safeVisited >= vTarget ? 1 : 0) + (safeChallenges >= cTarget ? 1 : 0);
      return {
        unlocked,
        current: doneSteps,
        target: 2,
        progressPct: unlocked ? 100 : Math.min(99, Math.round(((p1 + p2) / 2) * 100)),
      };
    }
  }
}

export function evaluateAllExplorerTitles(
  metrics: ExplorerTitleMetrics,
  locale: Locale,
): EvaluatedExplorerTitle[] {
  return EXPLORER_TITLE_SEEDS.map((seed) => {
    const meta = tierMeta(seed.tier, locale);
    const evalState = evaluateTitleRule(seed.rule, metrics);
    return {
      id: seed.id,
      order: seed.order,
      tier: seed.tier,
      tierLabel: meta.shortLabel,
      difficultyLabel: meta.difficulty,
      title: localizedTuple(seed.name, locale),
      motto: localizedTuple(seed.motto, locale),
      howToEarn: formatTitleRequirement(seed.rule, locale),
      unlocked: evalState.unlocked,
      current: evalState.current,
      target: evalState.target,
      progressPct: evalState.progressPct,
      rule: seed.rule,
    };
  });
}

export function resolveActiveExplorerTitle(
  evaluated: EvaluatedExplorerTitle[],
  preferredId: string | null | undefined,
): EvaluatedExplorerTitle {
  const unlocked = evaluated.filter((item) => item.unlocked);
  if (preferredId) {
    const matched = unlocked.find((item) => item.id === preferredId);
    if (matched) return matched;
  }
  return unlocked.at(-1) ?? evaluated[0];
}

export function totalExplorerTitlesCount(): number {
  return EXPLORER_TITLE_SEEDS.length;
}
