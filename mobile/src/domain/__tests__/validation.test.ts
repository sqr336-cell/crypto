import { describe, expect, it } from 'vitest';
import { isValidHandle, parseBpm, slugifyHandle, validateDraft } from '../validation';
import { PLAN_LIMITS, can } from '../plans';

describe('validation', () => {
  it('builds handles from artist names', () => {
    expect(slugifyHandle('Nayla Vélour')).toBe('naylavelour');
    expect(slugifyHandle('K.Oz')).toBe('k.oz');
    expect(isValidHandle('ab')).toBe(false);
    expect(isValidHandle('k.oz')).toBe(true);
  });
  it('checks each onboarding step', () => {
    expect(validateDraft({ displayName: '', handle: 'abc' }, 'identity')).toBe('display_name_required');
    expect(validateDraft({ displayName: 'A', handle: 'A B' }, 'identity')).toBe('handle_invalid');
    expect(validateDraft({ roles: [] }, 'craft')).toBe('roles_required');
    expect(validateDraft({ genres: ['rnb'] }, 'sound')).toBeNull();
  });
  it('parses BPM within the allowed range', () => {
    expect(parseBpm('92')).toBe(92);
    expect(parseBpm('12')).toBeNull();
    expect(parseBpm('')).toBeNull();
  });
});

describe('plans', () => {
  it('keeps connecting free and caps spam', () => {
    expect(PLAN_LIMITS.free.dailyInterests).toBeGreaterThanOrEqual(30);
    expect(PLAN_LIMITS.free.dailyRequests).toBeGreaterThan(0);
    expect(can('free', 'advanced_filters')).toBe(false);
    expect(can('plus', 'advanced_filters')).toBe(true);
  });
});
