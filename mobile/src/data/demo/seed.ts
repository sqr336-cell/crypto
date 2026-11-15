/**
 * DEMO DATA — fictional creators used only in demo mode (no backend
 * connected). Every profile is flagged `isDemo` and labelled in the UI.
 * Covers are abstract generated art; sounds are procedurally synthesised
 * (scripts/generate_demo_assets.py), with no samples and no vocals.
 */
import type { Profile, ProfileLink, Track } from '../../domain/types';
import type { GenreSlug } from '../../domain/taxonomy';
import { DEMO_AUDIO, DEMO_IMAGES } from './assets.generated';
import profilesJson from './profiles.json';

type DemoKey = keyof typeof DEMO_IMAGES;
type AudioKey = keyof typeof DEMO_AUDIO;

interface DemoSeed {
  key: DemoKey;
  profile: Omit<Profile, 'id' | 'avatar' | 'banner' | 'avatarPath' | 'bannerPath' | 'isDemo' | 'createdAt' | 'lastActiveAt' | 'onboardedAt' | 'isDiscoverable'>;
  tracks: AudioKey[];
  links: Omit<ProfileLink, 'id' | 'position'>[];
  activeHoursAgo: number;
}

/** Shared with scripts/seed-local.mjs so local Supabase data matches the demo. */
const SEEDS = profilesJson as DemoSeed[];

/** Demo profiles that have already shown interest in the visitor, so a Link creates a mutual link. */
export const DEMO_INTERESTED_IN_YOU = new Set(['demo-koz', 'demo-lina', 'demo-sahel', 'demo-saya']);

/** Demo profile that sends the visitor a project proposal right after onboarding. */
export const DEMO_REQUEST_FROM = 'demo-theo';
export const DEMO_REQUEST_TEXT = {
  fr: 'Salut ! J’ai vu ton profil, j’aime ton univers. Je peux poser des Rhodes et des accords jazz sur une de tes idées. Tu serais partant·e pour essayer ?',
  en: 'Hey! I came across your profile and love your universe. I can add Rhodes and jazz chords to one of your ideas. Want to try?',
};
export const DEMO_REQUEST_PROJECT = 'Rhodes session';

const SEED_EPOCH = Date.parse('2026-10-01T10:00:00Z');

export interface DemoProfileRecord {
  profile: Profile;
  tracks: Track[];
  links: ProfileLink[];
}

export function buildDemoProfiles(now = Date.now()): DemoProfileRecord[] {
  return SEEDS.map((s) => {
    const id = `demo-${s.key}`;
    const img = DEMO_IMAGES[s.key];
    const profile: Profile = {
      ...s.profile,
      id,
      avatar: img.avatar,
      banner: img.cover,
      avatarPath: null,
      bannerPath: null,
      isDiscoverable: true,
      onboardedAt: new Date(SEED_EPOCH).toISOString(),
      createdAt: new Date(SEED_EPOCH).toISOString(),
      lastActiveAt: new Date(now - s.activeHoursAgo * 3600_000).toISOString(),
      isDemo: true,
    };
    const tracks: Track[] = s.tracks.map((key, i) => {
      const a = DEMO_AUDIO[key];
      return {
        id: `track-${key}`,
        ownerId: id,
        title: a.title,
        storagePath: `demo:${key}`,
        durationMs: a.durationMs,
        waveform: [...a.waveform],
        bpm: a.bpm,
        musicalKey: a.musicalKey,
        genre: a.genre as GenreSlug,
        position: i,
        createdAt: new Date(SEED_EPOCH).toISOString(),
      };
    });
    const links: ProfileLink[] = s.links.map((l, i) => ({ ...l, id: `${id}-link-${i}`, position: i }));
    return { profile, tracks, links };
  });
}

export function demoAudioSource(storagePath: string): number | null {
  const key = storagePath.replace(/^demo:/, '') as AudioKey;
  return DEMO_AUDIO[key]?.source ?? null;
}
