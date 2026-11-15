/**
 * The single contract between the UI and data. Two implementations:
 *  - SupabaseBackend: production (Postgres + RLS + RPC, Storage, Realtime).
 *  - DemoBackend: runs entirely on the device with clearly labelled demo data,
 *    used when no Supabase project is configured.
 * Screens never import either implementation directly.
 */
import type {
  BlockedUser,
  Collaboration,
  CollaborationStatus,
  CollabRequest,
  Connection,
  ConversationSummary,
  DiscoverCandidate,
  DiscoverFilters,
  Favorite,
  LocalFile,
  MediaSource,
  Message,
  NewTrackInput,
  Profile,
  ProfileBundle,
  ProfileDraft,
  ProfileLink,
  ReportInput,
  Session,
  SwipeDecision,
  SwipeResult,
  Track,
  Usage,
} from '../domain/types';
import type { LinkPlatform } from '../domain/taxonomy';

export type BackendMode = 'demo' | 'supabase';
export type OAuthProvider = 'google' | 'apple';

export interface SaveProfileInput extends Partial<ProfileDraft> {
  confirmAge?: boolean;
  completeOnboarding?: boolean;
}

export interface SendRequestInput {
  targetId: string;
  message: string;
  projectTitle: string | null;
  trackId: string | null;
}

export interface Backend {
  readonly mode: BackendMode;

  // Auth ---------------------------------------------------------------------
  getSession(): Promise<Session | null>;
  onSessionChange(listener: (session: Session | null) => void): () => void;
  signUpWithEmail(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signInWithProvider(provider: OAuthProvider): Promise<void>;
  /** OAuth providers enabled on the server (empty in demo mode). */
  availableProviders(): Promise<OAuthProvider[]>;
  /** Demo mode only: creates a local account on this device. */
  startDemo?(): Promise<void>;
  /** Demo mode only: wipes local demo data. */
  resetDemo?(): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;

  // My profile ---------------------------------------------------------------
  getMyProfile(): Promise<Profile | null>;
  saveMyProfile(input: SaveProfileInput): Promise<Profile>;
  uploadProfileImage(kind: 'avatar' | 'banner', file: LocalFile): Promise<Profile>;
  isHandleAvailable(handle: string): Promise<boolean>;
  listMyLinks(): Promise<ProfileLink[]>;
  setMyLinks(links: { platform: LinkPlatform; url: string }[]): Promise<ProfileLink[]>;
  listMyTracks(): Promise<Track[]>;
  addTrack(input: NewTrackInput): Promise<Track>;
  deleteTrack(trackId: string): Promise<void>;
  touchActivity(): Promise<void>;

  // Media --------------------------------------------------------------------
  trackSource(track: Pick<Track, 'storagePath'>): Promise<MediaSource>;
  messageAudioSource(message: Pick<Message, 'attachmentPath'>): Promise<MediaSource>;

  // Discovery ----------------------------------------------------------------
  discoverFeed(filters: DiscoverFilters, limit: number): Promise<DiscoverCandidate[]>;
  swipe(targetId: string, decision: SwipeDecision): Promise<SwipeResult>;
  setSaved(targetId: string, saved: boolean): Promise<void>;
  getProfileBundle(profileId: string): Promise<ProfileBundle>;

  // Network ------------------------------------------------------------------
  sendRequest(input: SendRequestInput): Promise<{ connected: boolean; conversationId: string | null }>;
  listRequests(box: 'received' | 'sent'): Promise<CollabRequest[]>;
  respondRequest(requestId: string, accept: boolean): Promise<{ conversationId: string | null }>;
  withdrawRequest(requestId: string): Promise<void>;
  listConnections(): Promise<Connection[]>;
  removeConnection(connectionId: string): Promise<void>;
  listCollaborations(): Promise<Collaboration[]>;
  startCollaboration(conversationId: string, title: string): Promise<string>;
  setCollaborationStatus(collaborationId: string, status: CollaborationStatus): Promise<void>;
  listFavorites(): Promise<Favorite[]>;

  // Messaging ----------------------------------------------------------------
  listConversations(): Promise<ConversationSummary[]>;
  listMessages(conversationId: string, before?: string): Promise<Message[]>;
  sendText(conversationId: string, body: string): Promise<Message>;
  sendAudio(conversationId: string, file: LocalFile, meta: { durationMs: number | null; waveform: number[] | null }): Promise<Message>;
  markRead(conversationId: string): Promise<void>;
  /** Live inserts in conversations the user belongs to. Returns an unsubscribe function. */
  subscribeToMessages(listener: (message: Message) => void): () => void;
  /** Live changes to requests and links (for badges). */
  subscribeToNetwork(listener: () => void): () => void;

  // Safety & account ---------------------------------------------------------
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
  listBlocked(): Promise<BlockedUser[]>;
  report(input: ReportInput): Promise<void>;
  getUsage(): Promise<Usage>;
  exportMyData(): Promise<string>;
  registerPushToken(token: string, platform: 'ios' | 'android' | 'web', locale: 'en' | 'fr'): Promise<void>;
}
