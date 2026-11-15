import { LIMITS } from './taxonomy';
import type { ProfileDraft } from './types';

export function slugifyHandle(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, '')
    .slice(0, LIMITS.handle.max);
}

export function isValidHandle(handle: string): boolean {
  return /^[a-z0-9_.]{3,24}$/.test(handle);
}

export type DraftIssue =
  | 'display_name_required'
  | 'handle_invalid'
  | 'roles_required'
  | 'genres_required'
  | 'too_long';

/** Field checks per onboarding step; the database re-validates everything. */
export function validateDraft(draft: Partial<ProfileDraft>, step: 'identity' | 'craft' | 'sound' | 'intent'): DraftIssue | null {
  switch (step) {
    case 'identity':
      if (!draft.displayName?.trim()) return 'display_name_required';
      if ((draft.displayName?.length ?? 0) > LIMITS.displayName) return 'too_long';
      if (!draft.handle || !isValidHandle(draft.handle)) return 'handle_invalid';
      if ((draft.bio?.length ?? 0) > LIMITS.bio) return 'too_long';
      return null;
    case 'craft':
      return draft.roles && draft.roles.length > 0 ? null : 'roles_required';
    case 'sound':
      return draft.genres && draft.genres.length > 0 ? null : 'genres_required';
    case 'intent':
      return (draft.lookingFor?.length ?? 0) > LIMITS.lookingFor ? 'too_long' : null;
  }
}

export function parseBpm(input: string): number | null {
  const n = Number.parseInt(input.trim(), 10);
  return Number.isFinite(n) && n >= 40 && n <= 250 ? n : null;
}
