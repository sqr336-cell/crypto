/**
 * Freemium model. Limits are enforced server-side (plan_limits table +
 * SECURITY DEFINER functions); this mirror drives demo mode and copy.
 *
 * Rule: connecting with people is never behind a paywall. Free limits exist
 * to prevent spam, not to sell upgrades.
 */
import type { PlanTier } from './types';

export interface PlanLimits {
  dailyInterests: number | null;
  dailyRequests: number;
  maxFavorites: number | null;
  maxTracks: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { dailyInterests: 50, dailyRequests: 10, maxFavorites: 100, maxTracks: 3 },
  plus: { dailyInterests: 200, dailyRequests: 30, maxFavorites: null, maxTracks: 10 },
  pro: { dailyInterests: null, dailyRequests: 50, maxFavorites: null, maxTracks: 25 },
};

/** Features reserved for paid plans once they launch (none are purchasable yet). */
export type Feature = 'advanced_filters' | 'profile_stats' | 'boost' | 'project_spaces';

export const FEATURES_BY_PLAN: Record<PlanTier, Feature[]> = {
  free: [],
  plus: ['advanced_filters', 'profile_stats', 'boost'],
  pro: ['advanced_filters', 'profile_stats', 'boost', 'project_spaces'],
};

export function can(plan: PlanTier, feature: Feature): boolean {
  return FEATURES_BY_PLAN[plan].includes(feature);
}
