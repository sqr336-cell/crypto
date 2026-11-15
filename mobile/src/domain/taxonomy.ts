/**
 * Closed lists used across the product. Slugs are stored in the database;
 * labels live in src/i18n. Keep in sync with
 * supabase/migrations/20261115000150_reference_data.sql (a test enforces it).
 */

export const ROLES = [
  'beatmaker',
  'producer',
  'rapper',
  'singer',
  'songwriter',
  'guitarist',
  'pianist',
  'bassist',
  'drummer',
  'engineer',
  'composer',
  'dj',
  'other',
] as const;
export type RoleSlug = (typeof ROLES)[number];

export const GENRES = [
  'trap',
  'rnb',
  'alt_rnb',
  'hiphop',
  'drill',
  'pop',
  'afro',
  'electronic',
  'experimental',
  'ambient',
  'soul',
  'boom_bap',
  'lofi',
  'cloud',
  'amapiano',
  'dancehall',
  'reggaeton',
  'house',
  'techno',
  'uk_garage',
  'jersey_club',
  'hyperpop',
  'indie',
  'rock',
  'jazz',
  'funk',
  'gospel',
  'latin',
] as const;
export type GenreSlug = (typeof GENRES)[number];

/** Genres shown first in pickers; the rest sit behind "More genres". */
export const FEATURED_GENRES: GenreSlug[] = [
  'trap',
  'rnb',
  'alt_rnb',
  'hiphop',
  'drill',
  'pop',
  'afro',
  'electronic',
  'experimental',
  'ambient',
  'soul',
];

export const SKILLS = [
  'composition',
  'production',
  'sound_design',
  'mixing',
  'mastering',
  'writing',
  'topline',
  'recording',
  'instrumentation',
  'arrangement',
] as const;
export type SkillSlug = (typeof SKILLS)[number];

export const GOALS = [
  'find_artists',
  'find_beatmakers',
  'find_singers',
  'collaborate',
  'grow_network',
  'offer_services',
  'start_collective',
] as const;
export type GoalSlug = (typeof GOALS)[number];

export const AVAILABILITIES = ['looking', 'available', 'open', 'unavailable'] as const;
export type Availability = (typeof AVAILABILITIES)[number];

/** Bars lit on the availability meter (signature UI element). */
export const AVAILABILITY_LEVEL: Record<Availability, 0 | 1 | 2 | 3> = {
  looking: 3,
  available: 2,
  open: 1,
  unavailable: 0,
};

export const COLLAB_MODES = ['remote', 'in_person', 'both'] as const;
export type CollabMode = (typeof COLLAB_MODES)[number];

export const LINK_PLATFORMS = [
  'soundcloud',
  'spotify',
  'youtube',
  'instagram',
  'beatstars',
  'tiktok',
  'apple_music',
  'bandcamp',
  'website',
] as const;
export type LinkPlatform = (typeof LINK_PLATFORMS)[number];

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'inappropriate',
  'impersonation',
  'copyright',
  'underage',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Spoken languages offered in onboarding (ISO 639-1). */
export const LANGUAGES = ['fr', 'en', 'es', 'pt', 'de', 'it', 'ar', 'nl', 'ja', 'ko'] as const;

export const MUSICAL_KEYS = [
  'C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'Eb', 'Ebm', 'E', 'Em', 'F', 'Fm',
  'F#', 'F#m', 'G', 'Gm', 'Ab', 'Abm', 'A', 'Am', 'Bb', 'Bbm', 'B', 'Bm',
] as const;

export type ComplementRule = { kind: 'goal' | 'role'; slug: string; wantedRole: RoleSlug };

/** What a person is looking for. Goals win; own roles are the fallback. */
export const COMPLEMENT_RULES: ComplementRule[] = [
  ...goal('find_artists', ['rapper', 'singer', 'songwriter']),
  ...goal('find_beatmakers', ['beatmaker', 'producer']),
  ...goal('find_singers', ['singer']),
  ...role('beatmaker', ['rapper', 'singer', 'songwriter']),
  ...role('producer', ['rapper', 'singer', 'songwriter']),
  ...role('composer', ['singer', 'songwriter', 'producer']),
  ...role('rapper', ['beatmaker', 'producer', 'engineer']),
  ...role('singer', ['beatmaker', 'producer', 'composer']),
  ...role('songwriter', ['beatmaker', 'producer', 'singer']),
  ...role('engineer', ['rapper', 'singer', 'producer']),
  ...role('guitarist', ['producer', 'singer', 'songwriter']),
  ...role('pianist', ['producer', 'singer', 'songwriter']),
  ...role('bassist', ['producer', 'guitarist', 'drummer']),
  ...role('drummer', ['producer', 'guitarist', 'bassist']),
  ...role('dj', ['producer', 'beatmaker']),
];

function goal(slug: GoalSlug, wanted: RoleSlug[]): ComplementRule[] {
  return wanted.map((wantedRole) => ({ kind: 'goal', slug, wantedRole }));
}
function role(slug: RoleSlug, wanted: RoleSlug[]): ComplementRule[] {
  return wanted.map((wantedRole) => ({ kind: 'role', slug, wantedRole }));
}

/** Input limits, mirrored by database CHECK constraints. */
export const LIMITS = {
  displayName: 40,
  handle: { min: 3, max: 24 },
  bio: 300,
  lookingFor: 140,
  city: 60,
  roles: 4,
  genres: 5,
  influences: 10,
  influenceLength: 40,
  skills: 10,
  languages: 6,
  trackTitle: 80,
  requestMessage: 1000,
  projectTitle: 80,
  messageBody: 4000,
  reportDetails: 1000,
  trackMaxBytes: 15 * 1024 * 1024,
  trackMaxSeconds: 90,
  messageAudioMaxBytes: 25 * 1024 * 1024,
  imageMaxBytes: 5 * 1024 * 1024,
} as const;
