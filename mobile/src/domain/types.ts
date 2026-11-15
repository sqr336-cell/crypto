import type {
  Availability,
  CollabMode,
  GenreSlug,
  GoalSlug,
  LinkPlatform,
  ReportReason,
  RoleSlug,
  SkillSlug,
} from './taxonomy';

/** An image or audio source the UI can render: a bundled asset (an id on native, a URL string on the web) or a URI. */
export type MediaSource = number | { uri: string };

export type PlanTier = 'free' | 'plus' | 'pro';

export interface Profile {
  id: string;
  handle: string | null;
  displayName: string;
  avatar: MediaSource | null;
  banner: MediaSource | null;
  avatarPath: string | null;
  bannerPath: string | null;
  bio: string | null;
  lookingFor: string | null;
  city: string | null;
  countryCode: string | null;
  languages: string[];
  roles: RoleSlug[];
  genres: GenreSlug[];
  influences: string[];
  skills: SkillSlug[];
  goals: GoalSlug[];
  availability: Availability;
  collabMode: CollabMode;
  isDiscoverable: boolean;
  onboardedAt: string | null;
  lastActiveAt: string;
  createdAt: string;
  /** True for clearly labelled demonstration profiles (demo mode only). */
  isDemo?: boolean;
}

/** Compact profile used in lists (links, requests, conversations). */
export interface ProfileMini {
  id: string;
  displayName: string;
  handle: string | null;
  avatar: MediaSource | null;
  roles: RoleSlug[];
  availability: Availability;
  isDemo?: boolean;
}

export interface ProfileDraft {
  handle: string;
  displayName: string;
  bio: string;
  lookingFor: string;
  city: string;
  countryCode: string;
  languages: string[];
  roles: RoleSlug[];
  genres: GenreSlug[];
  influences: string[];
  skills: SkillSlug[];
  goals: GoalSlug[];
  availability: Availability;
  collabMode: CollabMode;
  isDiscoverable: boolean;
}

export interface Track {
  id: string;
  ownerId: string;
  title: string;
  storagePath: string;
  durationMs: number | null;
  /** Peaks 0–100. Null when the file has not been analysed yet. */
  waveform: number[] | null;
  bpm: number | null;
  musicalKey: string | null;
  genre: GenreSlug | null;
  position: number;
  createdAt: string;
}

export interface ProfileLink {
  id: string;
  platform: LinkPlatform;
  url: string;
  position: number;
}

export type FitTier = 'strong' | 'good' | 'explore';

/** Explainable compatibility, computed by the same formula in SQL and TS. */
export interface Fit {
  score: number;
  tier: FitTier;
  genres: { points: number; shared: string[] };
  roles: { points: number; theyFitYou: boolean; youFitThem: boolean };
  influences: { points: number; shared: string[] };
  skills: { points: number; complementary: string[] };
  availability: { points: number; value: Availability };
  goals: { points: number; shared: string[]; reciprocal: boolean };
  logistics: { points: number; sharedLanguages: string[]; remoteOk: boolean; sameCity: boolean };
}

export interface DiscoverCandidate {
  profile: Profile;
  fit: Fit;
  tracks: Track[];
  links: ProfileLink[];
  isSaved: boolean;
}

export interface DiscoverFilters {
  roles: RoleSlug[];
  genres: GenreSlug[];
  availability: Availability[];
  remoteOnly: boolean;
}

export const EMPTY_FILTERS: DiscoverFilters = { roles: [], genres: [], availability: [], remoteOnly: false };

export type SwipeDecision = 'pass' | 'interest';

export interface Usage {
  plan: PlanTier;
  interestsUsed: number;
  interestsLimit: number | null;
  requestsUsed: number;
  requestsLimit: number;
  favoritesCount: number;
  favoritesLimit: number | null;
  tracksCount: number;
  tracksLimit: number;
}

export interface SwipeResult {
  connected: boolean;
  connectionId: string | null;
  conversationId: string | null;
  usage: Usage;
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface CollabRequest {
  id: string;
  direction: 'received' | 'sent';
  status: RequestStatus;
  message: string;
  projectTitle: string | null;
  createdAt: string;
  respondedAt: string | null;
  other: ProfileMini;
  track: Pick<Track, 'id' | 'title' | 'durationMs' | 'waveform' | 'storagePath'> | null;
}

export interface Connection {
  id: string;
  origin: 'mutual_interest' | 'collab_request';
  createdAt: string;
  conversationId: string | null;
  other: ProfileMini;
}

export type CollaborationStatus = 'active' | 'completed' | 'archived';

export interface Collaboration {
  id: string;
  title: string;
  status: CollaborationStatus;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
  members: ProfileMini[];
}

export interface Favorite {
  createdAt: string;
  profile: ProfileMini;
  fit: Fit | null;
}

export type MessageKind = 'text' | 'link' | 'audio' | 'track' | 'system';

export interface AudioMeta {
  durationMs: number | null;
  waveform: number[] | null;
  filename: string | null;
  sizeBytes: number | null;
  mime: string | null;
}

export interface TrackMeta {
  trackId: string;
  title: string;
  durationMs: number | null;
  waveform: number[] | null;
  storagePath: string;
}

export type SystemEvent =
  | { event: 'linked'; origin?: string }
  | { event: 'project_started'; title: string }
  | { event: 'project_completed'; title: string };

export interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  kind: MessageKind;
  body: string | null;
  attachmentPath: string | null;
  audio?: AudioMeta;
  track?: TrackMeta;
  system?: SystemEvent;
  linkPlatform?: LinkPlatform | null;
  createdAt: string;
  /** Client-side only: optimistic message not yet confirmed by the server. */
  pending?: boolean;
}

export interface ConversationSummary {
  id: string;
  other: ProfileMini | null;
  lastMessage: Message | null;
  lastMessageAt: string | null;
  createdAt: string;
  unreadCount: number;
  canPost: boolean;
  muted: boolean;
}

export interface ProfileBundle {
  profile: Profile;
  fit: Fit | null;
  tracks: Track[];
  links: ProfileLink[];
  isSaved: boolean;
  myDecision: SwipeDecision | null;
  connection: { id: string; conversationId: string | null } | null;
  pendingSent: { id: string } | null;
  pendingReceived: { id: string } | null;
}

export interface BlockedUser {
  blockedAt: string;
  profile: ProfileMini;
}

export interface ReportInput {
  reason: ReportReason;
  targetProfileId?: string;
  messageId?: string;
  trackId?: string;
  details?: string;
}

/** A local file picked by the user, ready to upload. */
export interface LocalFile {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  /** Web only: the underlying File/Blob when available. */
  blob?: Blob;
}

export interface NewTrackInput {
  file: LocalFile;
  title: string;
  bpm: number | null;
  musicalKey: string | null;
  genre: GenreSlug | null;
  durationMs: number | null;
  waveform: number[] | null;
}

export interface Session {
  userId: string;
  email: string | null;
  provider: 'email' | 'google' | 'apple' | 'demo';
}

/** Error carrying a stable machine code that the UI translates. */
export class AppError extends Error {
  constructor(
    public code: string,
    message?: string,
    public hint?: string,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}
