/**
 * DEMO DATA — fictional creators used only in demo mode (no backend
 * connected). Every profile is flagged `isDemo` and labelled in the UI.
 * Covers are abstract generated art; sounds are procedurally synthesised
 * (scripts/generate_demo_assets.py), with no samples and no vocals.
 */
import type { Profile, ProfileLink, Track } from '../../domain/types';
import type { GenreSlug } from '../../domain/taxonomy';
import { DEMO_AUDIO, DEMO_IMAGES } from './assets.generated';

type DemoKey = keyof typeof DEMO_IMAGES;
type AudioKey = keyof typeof DEMO_AUDIO;

interface DemoSeed {
  key: DemoKey;
  profile: Omit<Profile, 'id' | 'avatar' | 'banner' | 'avatarPath' | 'bannerPath' | 'isDemo' | 'createdAt' | 'lastActiveAt' | 'onboardedAt' | 'isDiscoverable'>;
  tracks: AudioKey[];
  links: Omit<ProfileLink, 'id' | 'position'>[];
  activeHoursAgo: number;
}

const SEEDS: DemoSeed[] = [
  {
    key: 'nayla',
    tracks: ['nayla-velours', 'nayla-minuit'],
    activeHoursAgo: 1,
    links: [{ platform: 'soundcloud', url: 'https://soundcloud.com' }, { platform: 'instagram', url: 'https://instagram.com' }],
    profile: {
      handle: 'nayla.velour',
      displayName: 'Nayla Vélour',
      bio: 'Productrice R&B alternatif. Synthés chauds, 808 douces, beaucoup de reverb. Deux EP en indé, des placements en cours.',
      lookingFor: 'Une voix soul pour un EP R&B alternatif de 5 titres',
      city: 'Paris',
      countryCode: 'FR',
      languages: ['fr', 'en'],
      roles: ['producer', 'beatmaker'],
      genres: ['alt_rnb', 'rnb', 'soul'],
      influences: ['Frank Ocean', 'Kaytranada', 'SZA', 'Sango'],
      skills: ['production', 'mixing', 'sound_design'],
      goals: ['find_singers', 'collaborate'],
      availability: 'looking',
      collabMode: 'both',
    },
  },
  {
    key: 'koz',
    tracks: ['koz-lune'],
    activeHoursAgo: 3,
    links: [{ platform: 'spotify', url: 'https://open.spotify.com' }],
    profile: {
      handle: 'k.oz',
      displayName: 'K.Oz',
      bio: 'Chanteur et toplineur. J’écris vite, en français et en anglais. Je cherche des prods lentes avec de l’espace pour la voix.',
      lookingFor: 'Des prods lentes, guitares et 808 douces',
      city: 'Lyon',
      countryCode: 'FR',
      languages: ['fr', 'en'],
      roles: ['singer', 'songwriter'],
      genres: ['rnb', 'alt_rnb', 'pop'],
      influences: ['Brent Faiyaz', 'Daniel Caesar', 'Frank Ocean'],
      skills: ['topline', 'writing', 'recording'],
      goals: ['find_beatmakers', 'collaborate'],
      availability: 'available',
      collabMode: 'remote',
    },
  },
  {
    key: 'mira',
    tracks: ['mira-pressure'],
    activeHoursAgo: 6,
    links: [{ platform: 'youtube', url: 'https://youtube.com' }, { platform: 'instagram', url: 'https://instagram.com' }],
    profile: {
      handle: 'mirablaze',
      displayName: 'Mira Blaze',
      bio: 'UK drill rapper from South London. Dark keys, sliding 808s, honest bars. Two mixtapes out, working on the third.',
      lookingFor: 'Producers with dark, cinematic drill beats',
      city: 'London',
      countryCode: 'GB',
      languages: ['en'],
      roles: ['rapper', 'songwriter'],
      genres: ['drill', 'trap', 'hiphop'],
      influences: ['Central Cee', 'Headie One', 'Little Simz'],
      skills: ['writing', 'recording'],
      goals: ['find_beatmakers', 'grow_network'],
      availability: 'open',
      collabMode: 'remote',
    },
  },
  {
    key: 'sahel',
    tracks: ['sahel-lagune'],
    activeHoursAgo: 2,
    links: [{ platform: 'beatstars', url: 'https://beatstars.com' }],
    profile: {
      handle: 'sahel808',
      displayName: 'Sahel 808',
      bio: 'Beatmaker afro et amapiano. Log drums, percus live, accords jazz. Je bosse vite et j’aime les sessions à distance.',
      lookingFor: 'Une chanteuse ou un rappeur pour un single afro-amapiano',
      city: 'Abidjan',
      countryCode: 'CI',
      languages: ['fr', 'en'],
      roles: ['beatmaker', 'producer'],
      genres: ['afro', 'amapiano', 'dancehall'],
      influences: ['Burna Boy', 'Kabza De Small', 'Tems'],
      skills: ['production', 'arrangement', 'instrumentation'],
      goals: ['find_artists', 'collaborate'],
      availability: 'looking',
      collabMode: 'remote',
    },
  },
  {
    key: 'theo',
    tracks: ['theo-rhodes'],
    activeHoursAgo: 20,
    links: [{ platform: 'bandcamp', url: 'https://bandcamp.com' }],
    profile: {
      handle: 'theo.arpege',
      displayName: 'Théo Arpège',
      bio: 'Pianiste et compositeur. Rhodes, accords jazz, arrangements de cordes. J’enregistre des parties live pour vos prods.',
      lookingFor: 'Des producteurs qui veulent des vraies parties de clavier',
      city: 'Bruxelles',
      countryCode: 'BE',
      languages: ['fr', 'nl', 'en'],
      roles: ['pianist', 'composer'],
      genres: ['soul', 'jazz', 'ambient', 'alt_rnb'],
      influences: ['Robert Glasper', 'Nujabes', 'Kaytranada'],
      skills: ['composition', 'instrumentation', 'arrangement'],
      goals: ['collaborate', 'offer_services'],
      availability: 'available',
      collabMode: 'both',
    },
  },
  {
    key: 'lina',
    tracks: ['lina-neon'],
    activeHoursAgo: 4,
    links: [{ platform: 'tiktok', url: 'https://tiktok.com' }, { platform: 'spotify', url: 'https://open.spotify.com' }],
    profile: {
      handle: 'linavox',
      displayName: 'Lina Vox',
      bio: 'Singer-songwriter between pop and electronic R&B. Bilingual toplines, stacked harmonies. Based in Montréal.',
      lookingFor: 'A producer for a dark-pop EP',
      city: 'Montréal',
      countryCode: 'CA',
      languages: ['fr', 'en', 'es'],
      roles: ['singer', 'songwriter'],
      genres: ['pop', 'rnb', 'electronic'],
      influences: ['Rosalía', 'Kelela', 'SZA'],
      skills: ['topline', 'writing'],
      goals: ['find_beatmakers', 'collaborate'],
      availability: 'looking',
      collabMode: 'remote',
    },
  },
  {
    key: 'dex',
    tracks: ['dex-fog'],
    activeHoursAgo: 30,
    links: [{ platform: 'soundcloud', url: 'https://soundcloud.com' }],
    profile: {
      handle: 'dexforma',
      displayName: 'Dex Forma',
      bio: 'Producer. UK garage, broken house, foggy textures. Releases on small Berlin labels. Always up for vocal collabs.',
      lookingFor: 'Vocalists for garage and house edits',
      city: 'Berlin',
      countryCode: 'DE',
      languages: ['en', 'de'],
      roles: ['producer'],
      genres: ['uk_garage', 'house', 'electronic'],
      influences: ['Burial', 'Fred again..', 'Kaytranada'],
      skills: ['production', 'sound_design', 'mixing'],
      goals: ['find_singers', 'collaborate'],
      availability: 'available',
      collabMode: 'remote',
    },
  },
  {
    key: 'ayo',
    tracks: ['ayo-mix'],
    activeHoursAgo: 8,
    links: [{ platform: 'website', url: 'https://example.com' }],
    profile: {
      handle: 'ayo.tempo',
      displayName: 'Ayo Tempo',
      bio: 'Ingé son mix et mastering. Rap, R&B, trap. Studio à Marseille, je travaille aussi à distance. Écoute le avant/après.',
      lookingFor: 'Des artistes qui veulent un mix propre et punchy',
      city: 'Marseille',
      countryCode: 'FR',
      languages: ['fr'],
      roles: ['engineer'],
      genres: ['hiphop', 'rnb', 'trap'],
      influences: ['Metro Boomin', 'Jul', 'SCH'],
      skills: ['mixing', 'mastering', 'recording'],
      goals: ['offer_services', 'grow_network'],
      availability: 'available',
      collabMode: 'both',
    },
  },
  {
    key: 'kenji',
    tracks: ['kenji-rain'],
    activeHoursAgo: 48,
    links: [{ platform: 'youtube', url: 'https://youtube.com' }],
    profile: {
      handle: 'kenjirain',
      displayName: 'Kenji Rain',
      bio: 'Lo-fi and boom bap beatmaker. SP-404 crackle, jazz chops, rainy-day loops. Looking for rappers with storytelling.',
      lookingFor: 'Rappers who tell stories',
      city: 'Tokyo',
      countryCode: 'JP',
      languages: ['ja', 'en'],
      roles: ['beatmaker'],
      genres: ['lofi', 'boom_bap', 'hiphop'],
      influences: ['J Dilla', 'Nujabes', 'MF DOOM'],
      skills: ['production', 'sound_design'],
      goals: ['find_artists', 'collaborate'],
      availability: 'open',
      collabMode: 'remote',
    },
  },
  {
    key: 'saya',
    tracks: ['saya-choir'],
    activeHoursAgo: 5,
    links: [{ platform: 'instagram', url: 'https://instagram.com' }],
    profile: {
      handle: 'saya.chante',
      displayName: 'Saya',
      bio: 'Chanteuse soul et gospel, songwriter. Harmonies, chœurs, voix lead. Je cherche un producteur pour un premier EP.',
      lookingFor: 'Un producteur soul ou R&B alternatif pour mon premier EP',
      city: 'Paris',
      countryCode: 'FR',
      languages: ['fr', 'en'],
      roles: ['singer', 'songwriter'],
      genres: ['soul', 'gospel', 'rnb'],
      influences: ['Jazmine Sullivan', 'Lauryn Hill', 'SZA'],
      skills: ['topline', 'writing', 'arrangement'],
      goals: ['find_beatmakers', 'collaborate'],
      availability: 'looking',
      collabMode: 'both',
    },
  },
  {
    key: 'vex',
    tracks: ['vex-glass'],
    activeHoursAgo: 12,
    links: [{ platform: 'soundcloud', url: 'https://soundcloud.com' }],
    profile: {
      handle: 'vex',
      displayName: 'Vex',
      bio: 'Experimental producer. Hyperpop, glitch, metallic textures. I like weird voices and fast tempos.',
      lookingFor: 'Singers who are not afraid of strange sounds',
      city: 'Lisbon',
      countryCode: 'PT',
      languages: ['pt', 'en'],
      roles: ['producer', 'beatmaker'],
      genres: ['hyperpop', 'experimental', 'electronic'],
      influences: ['SOPHIE', 'Arca', 'A. G. Cook'],
      skills: ['production', 'sound_design'],
      goals: ['find_singers', 'start_collective'],
      availability: 'available',
      collabMode: 'remote',
    },
  },
  {
    key: 'rico',
    tracks: ['rico-nylon'],
    activeHoursAgo: 72,
    links: [{ platform: 'youtube', url: 'https://youtube.com' }],
    profile: {
      handle: 'ricolume',
      displayName: 'Rico Lume',
      bio: 'Guitarrista. Nylon and electric, R&B and latin grooves. I record clean guitar parts for producers, fast turnaround.',
      lookingFor: 'Producers who need live guitar',
      city: 'Madrid',
      countryCode: 'ES',
      languages: ['es', 'en'],
      roles: ['guitarist', 'composer'],
      genres: ['indie', 'rnb', 'latin'],
      influences: ['Steve Lacy', 'Rosalía', 'Daniel Caesar'],
      skills: ['instrumentation', 'composition', 'recording'],
      goals: ['collaborate', 'offer_services'],
      availability: 'unavailable',
      collabMode: 'both',
    },
  },
];

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
