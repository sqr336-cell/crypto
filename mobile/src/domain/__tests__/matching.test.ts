import { describe, expect, it } from 'vitest';
import { computeFit, fitReasons, tierFor, wantedRoles, type MatchInput } from '../matching';

const base: MatchInput = {
  roles: [],
  genres: [],
  influences: [],
  skills: [],
  goals: [],
  languages: ['fr'],
  availability: 'open',
  collabMode: 'both',
  city: null,
  countryCode: null,
};

const producer: MatchInput = {
  ...base,
  roles: ['producer', 'beatmaker'],
  genres: ['alt_rnb', 'rnb', 'soul'],
  influences: ['Frank Ocean', 'SZA'],
  skills: ['production', 'mixing'],
  goals: ['find_singers', 'collaborate'],
  availability: 'looking',
  city: 'Paris',
  countryCode: 'FR',
};

const singer: MatchInput = {
  ...base,
  roles: ['singer', 'songwriter'],
  genres: ['rnb', 'alt_rnb', 'pop'],
  influences: ['frank ocean', 'Brent Faiyaz'],
  skills: ['topline', 'writing'],
  goals: ['find_beatmakers', 'collaborate'],
  availability: 'available',
  city: 'paris',
  countryCode: 'FR',
};

describe('wantedRoles', () => {
  it('derives wanted roles from goals first', () => {
    expect(wantedRoles(producer)).toEqual(['singer']);
  });
  it('falls back to the complement of own roles', () => {
    expect(wantedRoles({ roles: ['rapper'], goals: ['grow_network'] }).sort()).toEqual(['beatmaker', 'engineer', 'producer']);
  });
});

describe('computeFit', () => {
  it('rewards complementarity between a producer and a singer', () => {
    const fit = computeFit(producer, singer);
    expect(fit.roles).toEqual({ points: 20, theyFitYou: true, youFitThem: true });
    expect(fit.genres).toEqual({ points: 20, shared: ['rnb', 'alt_rnb'] });
    expect(fit.influences).toEqual({ points: 8, shared: ['frank ocean'] });
    expect(fit.skills.complementary).toEqual(['topline', 'writing']);
    expect(fit.goals).toEqual({ points: 10, shared: ['collaborate'], reciprocal: true });
    expect(fit.logistics).toEqual({ points: 5, sharedLanguages: ['fr'], remoteOk: true, sameCity: true });
    expect(fit.score).toBe(20 + 20 + 8 + 10 + 8 + 10 + 5);
    expect(fit.tier).toBe('strong');
  });

  it('never exceeds 100 and each criterion respects its weight', () => {
    const fit = computeFit(producer, { ...singer, genres: producer.genres, influences: ['Frank Ocean', 'SZA', 'x', 'y'], availability: 'looking' });
    expect(fit.score).toBeLessThanOrEqual(100);
    expect(fit.genres.points).toBeLessThanOrEqual(30);
    expect(fit.influences.points).toBeLessThanOrEqual(15);
  });

  it('gives nothing for genres when a profile has none', () => {
    expect(computeFit(producer, { ...singer, genres: [] }).genres.points).toBe(0);
  });

  it('penalises in-person-only collaborators in different cities', () => {
    const fit = computeFit(producer, { ...singer, collabMode: 'in_person', city: 'Lyon' });
    expect(fit.logistics).toMatchObject({ points: 3, remoteOk: false, sameCity: false });
  });

  it('scores an unavailable profile 0 on availability', () => {
    expect(computeFit(producer, { ...singer, availability: 'unavailable' }).availability.points).toBe(0);
  });
});

describe('tiers and reasons', () => {
  it('maps scores to tiers', () => {
    expect([tierFor(80), tierFor(70), tierFor(69), tierFor(45), tierFor(44)]).toEqual(['strong', 'strong', 'good', 'good', 'explore']);
  });
  it('explains the strongest reasons first', () => {
    const reasons = fitReasons(computeFit(producer, singer), 3);
    expect(reasons[0]).toEqual({ kind: 'roles_mutual' });
    expect(reasons[1]).toEqual({ kind: 'genres', items: ['rnb', 'alt_rnb'] });
    expect(reasons).toHaveLength(3);
  });
});
