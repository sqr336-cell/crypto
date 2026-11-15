/**
 * Explainable compatibility between two creators.
 *
 * This is the TypeScript mirror of `public.compatibility()` in
 * supabase/migrations/20261115000200_functions.sql. The SQL version is the
 * source of truth in production; this one powers demo mode and unit tests.
 * supabase/tests/api.test.ts checks both produce identical results.
 *
 * The score is not a measure of "how good" someone is. It is the sum of
 * visible, weighted criteria, always shown with its breakdown.
 */
import { COMPLEMENT_RULES } from './taxonomy';
import type { Availability, CollabMode } from './taxonomy';
import type { Fit, FitTier } from './types';

export interface MatchInput {
  roles: readonly string[];
  genres: readonly string[];
  influences: readonly string[];
  skills: readonly string[];
  goals: readonly string[];
  languages: readonly string[];
  availability: Availability;
  collabMode: CollabMode;
  city: string | null;
  countryCode: string | null;
}

export const FIT_WEIGHTS = {
  genres: 30,
  roles: 20,
  influences: 15,
  skills: 10,
  availability: 10,
  goals: 10,
  logistics: 5,
} as const;

export const FIT_CRITERIA = Object.keys(FIT_WEIGHTS) as (keyof typeof FIT_WEIGHTS)[];

const AVAILABILITY_POINTS: Record<Availability, number> = {
  looking: 10,
  available: 8,
  open: 5,
  unavailable: 0,
};

const SHARED_GOALS = new Set(['collaborate', 'grow_network', 'start_collective']);
const WANTS_ARTISTS = ['find_artists', 'find_singers'];

export function tierFor(score: number): FitTier {
  if (score >= 70) return 'strong';
  if (score >= 45) return 'good';
  return 'explore';
}

export function wantedRoles(p: Pick<MatchInput, 'goals' | 'roles'>): string[] {
  const fromGoals = uniq(
    COMPLEMENT_RULES.filter((r) => r.kind === 'goal' && p.goals.includes(r.slug)).map((r) => r.wantedRole),
  );
  if (fromGoals.length > 0) return fromGoals;
  return uniq(COMPLEMENT_RULES.filter((r) => r.kind === 'role' && p.roles.includes(r.slug)).map((r) => r.wantedRole));
}

/** Score of candidate `b` from viewer `a`'s point of view. */
export function computeFit(a: MatchInput, b: MatchInput): Fit {
  const aWants = wantedRoles(a);
  const bWants = wantedRoles(b);

  // Genres (30)
  const sharedGenres = b.genres.filter((g) => a.genres.includes(g));
  const genreDenom = Math.min(3, a.genres.length, b.genres.length);
  const genrePts = genreDenom > 0 ? Math.round(30 * Math.min(1, sharedGenres.length / genreDenom)) : 0;

  // Complementary roles (20)
  const theyFitYou = overlaps(b.roles, aWants);
  const youFitThem = overlaps(a.roles, bWants);
  const rolePts = (theyFitYou ? 12 : 0) + (youFitThem ? 8 : 0);

  // Influences (15)
  const aInfl = new Set(a.influences.map((i) => i.toLowerCase()));
  const sharedInfl = b.influences.filter((i) => aInfl.has(i.toLowerCase()));
  const inflPts = [0, 8, 12, 15][Math.min(sharedInfl.length, 3)];

  // Complementary skills (10)
  const compSkills = b.skills.filter((s) => !a.skills.includes(s));
  const skillPts = 5 * Math.min(2, compSkills.length);

  // Availability (10)
  const availPts = AVAILABILITY_POINTS[b.availability];

  // Goals (10)
  const sharedGoals = b.goals.filter((g) => a.goals.includes(g) && SHARED_GOALS.has(g));
  const reciprocal =
    (overlaps(a.goals, WANTS_ARTISTS) && b.goals.includes('find_beatmakers')) ||
    (overlaps(b.goals, WANTS_ARTISTS) && a.goals.includes('find_beatmakers'));
  const goalPts = 5 * Math.min(2, sharedGoals.length + (reciprocal ? 1 : 0));

  // Logistics (5)
  const sharedLanguages = b.languages.filter((l) => a.languages.includes(l));
  const remoteOk = a.collabMode !== 'in_person' && b.collabMode !== 'in_person';
  const sameCity =
    !!a.city && !!b.city && a.city.toLowerCase() === b.city.toLowerCase() && (a.countryCode ?? '') === (b.countryCode ?? '');
  const logiPts = (sharedLanguages.length > 0 ? 3 : 0) + (remoteOk || sameCity ? 2 : 0);

  const score = genrePts + rolePts + inflPts + skillPts + availPts + goalPts + logiPts;

  return {
    score,
    tier: tierFor(score),
    genres: { points: genrePts, shared: sharedGenres },
    roles: { points: rolePts, theyFitYou, youFitThem },
    influences: { points: inflPts, shared: sharedInfl },
    skills: { points: skillPts, complementary: compSkills },
    availability: { points: availPts, value: b.availability },
    goals: { points: goalPts, shared: sharedGoals, reciprocal },
    logistics: { points: logiPts, sharedLanguages, remoteOk, sameCity },
  };
}

export type FitReason =
  | { kind: 'roles_mutual' }
  | { kind: 'roles_they_fit' }
  | { kind: 'roles_you_fit' }
  | { kind: 'genres'; items: string[] }
  | { kind: 'influences'; items: string[] }
  | { kind: 'skills'; items: string[] }
  | { kind: 'looking' }
  | { kind: 'goals_reciprocal' }
  | { kind: 'goals_shared'; items: string[] }
  | { kind: 'same_city' };

/**
 * The few strongest, most specific reasons behind a fit, strongest first.
 * The UI turns them into sentences ("2 genres in common: R&B, Soul").
 */
export function fitReasons(fit: Fit, max = 3): FitReason[] {
  const ranked: { weight: number; reason: FitReason }[] = [];
  const r = fit.roles;
  if (r.theyFitYou && r.youFitThem) ranked.push({ weight: r.points, reason: { kind: 'roles_mutual' } });
  else if (r.theyFitYou) ranked.push({ weight: r.points, reason: { kind: 'roles_they_fit' } });
  else if (r.youFitThem) ranked.push({ weight: r.points, reason: { kind: 'roles_you_fit' } });
  if (fit.genres.shared.length) ranked.push({ weight: fit.genres.points, reason: { kind: 'genres', items: fit.genres.shared } });
  if (fit.influences.shared.length)
    ranked.push({ weight: fit.influences.points + 1, reason: { kind: 'influences', items: fit.influences.shared } });
  if (fit.availability.value === 'looking') ranked.push({ weight: fit.availability.points, reason: { kind: 'looking' } });
  if (fit.goals.reciprocal) ranked.push({ weight: fit.goals.points, reason: { kind: 'goals_reciprocal' } });
  else if (fit.goals.shared.length) ranked.push({ weight: fit.goals.points, reason: { kind: 'goals_shared', items: fit.goals.shared } });
  if (fit.skills.complementary.length)
    ranked.push({ weight: fit.skills.points - 1, reason: { kind: 'skills', items: fit.skills.complementary.slice(0, 2) } });
  if (fit.logistics.sameCity) ranked.push({ weight: 4, reason: { kind: 'same_city' } });
  // Stable sort: equal weights keep the insertion order above.
  return ranked
    .map((x, i) => ({ ...x, i }))
    .sort((x, y) => y.weight - x.weight || x.i - y.i)
    .slice(0, max)
    .map((x) => x.reason);
}

function overlaps(a: readonly string[], b: readonly string[]): boolean {
  return a.some((x) => b.includes(x));
}

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}
