import type { Locale } from './types';
export const plans = {
  free: { name: 'Free', amount: 0, challengeLimit: 5, seats: 1, planner: false },
  premium: { name: 'Premium', amount: 39000, challengeLimit: null, seats: 1, planner: false },
  family: { name: 'Premium Family', amount: 89000, challengeLimit: null, seats: 4, planner: true },
} as const;
export type PlanId = keyof typeof plans;
export type PaidPlanId = Exclude<PlanId, 'free'>;
export type MembershipAccess = {
  plan: PlanId;
  owner_id: string | null;
  expires_at: string | null;
  challenge_used: number;
  challenge_limit: number | null;
  is_owner: boolean;
};
export const isPaidPlan = (value: unknown): value is PaidPlanId =>
  value === 'premium' || value === 'family';
export const planLabel = (id: PlanId) => plans[id].name;
export const periodLabel = (locale: Locale) =>
  locale === 'en' ? 'per month' : locale === 'zh' ? '每月' : 'mỗi tháng';
