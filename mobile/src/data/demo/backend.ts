/**
 * Demo backend: the full product running on the device, with clearly labelled
 * fictional profiles. It applies the same rules as the server (limits, blocks,
 * consent before messaging) so the demo behaves like production.
 * Nothing leaves the device; state persists in AsyncStorage.
 */
import * as Crypto from 'expo-crypto';
import type { Backend, OAuthProvider, SaveProfileInput, SendRequestInput } from '../backend';
import { computeFit } from '../../domain/matching';
import { PLAN_LIMITS } from '../../domain/plans';
import { detectPlatform, isLinkOnly, normalizeUrl } from '../../domain/links';
import {
  AppError,
  type BlockedUser,
  type Collaboration,
  type CollaborationStatus,
  type CollabRequest,
  type Connection,
  type ConversationSummary,
  type DiscoverCandidate,
  type DiscoverFilters,
  type LocalFile,
  type MediaSource,
  type Message,
  type NewTrackInput,
  type Profile,
  type ProfileBundle,
  type ProfileLink,
  type ProfileMini,
  type ReportInput,
  type Session,
  type SwipeDecision,
  type Track,
  type Usage,
} from '../../domain/types';
import type { LinkPlatform } from '../../domain/taxonomy';
import { storage } from '../../lib/storage';
import { t, useLocale } from '../../i18n';
import {
  buildDemoProfiles,
  DEMO_INTERESTED_IN_YOU,
  DEMO_REQUEST_FROM,
  DEMO_REQUEST_PROJECT,
  DEMO_REQUEST_TEXT,
  demoAudioSource,
  type DemoProfileRecord,
} from './seed';

const STORAGE_KEY = 'beatlink.demo.v1';
const ME = 'demo-you';

interface RequestRow {
  id: string;
  senderId: string;
  recipientId: string;
  message: string;
  projectTitle: string | null;
  trackId: string | null;
  status: CollabRequest['status'];
  createdAt: string;
  respondedAt: string | null;
}

interface ConnectionRow {
  id: string;
  otherId: string;
  origin: Connection['origin'];
  createdAt: string;
  conversationId: string;
}

interface ConversationRow {
  id: string;
  memberIds: string[];
  createdAt: string;
  lastMessageAt: string | null;
  lastReadAt: string | null;
}

interface CollaborationRow {
  id: string;
  title: string;
  status: CollaborationStatus;
  conversationId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface DemoState {
  version: 1;
  session: Session | null;
  me: Profile | null;
  myLinks: ProfileLink[];
  myTracks: Track[];
  swipes: Record<string, { decision: SwipeDecision; at: string }>;
  favorites: { targetId: string; createdAt: string }[];
  connections: ConnectionRow[];
  requests: RequestRow[];
  collaborations: CollaborationRow[];
  conversations: ConversationRow[];
  messages: Message[];
  blocks: { userId: string; createdAt: string }[];
  reports: (ReportInput & { id: string; createdAt: string })[];
  usage: { day: string; interests: number; requests: number };
  seededRequest: boolean;
}

const emptyState = (): DemoState => ({
  version: 1,
  session: null,
  me: null,
  myLinks: [],
  myTracks: [],
  swipes: {},
  favorites: [],
  connections: [],
  requests: [],
  collaborations: [],
  conversations: [],
  messages: [],
  blocks: [],
  reports: [],
  usage: { day: today(), interests: 0, requests: 0 },
  seededRequest: false,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}
function now() {
  return new Date().toISOString();
}
function id() {
  return Crypto.randomUUID();
}
/** Blob URLs (web uploads) die on reload; keep only what can be restored. */
function persistable(uri: string | null | undefined) {
  return !!uri && !uri.startsWith('blob:');
}

export class DemoBackend implements Backend {
  readonly mode = 'demo' as const;
  private state: DemoState = emptyState();
  private ready: Promise<void>;
  private directory: Map<string, DemoProfileRecord>;
  private sessionListeners = new Set<(s: Session | null) => void>();
  private messageListeners = new Set<(m: Message) => void>();
  private networkListeners = new Set<() => void>();

  constructor() {
    this.directory = new Map(buildDemoProfiles().map((r) => [r.profile.id, r]));
    this.ready = this.load();
  }

  private async load() {
    const saved = await storage.getJSON<DemoState>(STORAGE_KEY);
    if (saved?.version === 1) {
      this.state = { ...emptyState(), ...saved };
      // Drop files that did not survive a page reload (web blob: URLs).
      this.state.myTracks = this.state.myTracks.filter((tr) => persistable(tr.storagePath.replace(/^local:/, '')));
      this.state.messages = this.state.messages.filter((m) => !m.attachmentPath || persistable(m.attachmentPath.replace(/^local:/, '')));
      if (this.state.me) {
        const me = this.state.me;
        if (me.avatar && typeof me.avatar === 'object' && !persistable(me.avatar.uri)) me.avatar = null;
        if (me.banner && typeof me.banner === 'object' && !persistable(me.banner.uri)) me.banner = null;
      }
    }
  }

  private async save() {
    await storage.setJSON(STORAGE_KEY, this.state);
  }

  private async tx<T>(fn: () => T | Promise<T>, persist = true): Promise<T> {
    await this.ready;
    const out = await fn();
    if (persist) await this.save();
    return out;
  }

  private emitNetwork() {
    this.networkListeners.forEach((l) => l());
  }

  // Auth -----------------------------------------------------------------------
  async getSession() {
    await this.ready;
    return this.state.session;
  }

  onSessionChange(listener: (s: Session | null) => void) {
    this.sessionListeners.add(listener);
    return () => void this.sessionListeners.delete(listener);
  }

  private setSession(s: Session | null) {
    this.state.session = s;
    this.sessionListeners.forEach((l) => l(s));
  }

  async startDemo() {
    await this.tx(() => this.setSession({ userId: ME, email: null, provider: 'demo' }));
  }

  async resetDemo() {
    await this.tx(() => {
      this.state = emptyState();
      this.setSession(null);
    });
  }

  async signUpWithEmail(): Promise<{ needsConfirmation: boolean }> {
    throw new AppError('not_available_demo');
  }
  async signInWithEmail(): Promise<void> {
    throw new AppError('not_available_demo');
  }
  async availableProviders(): Promise<OAuthProvider[]> {
    return [];
  }
  async signInWithProvider(_provider: OAuthProvider): Promise<void> {
    throw new AppError('not_available_demo');
  }

  async signOut() {
    await this.tx(() => this.setSession(null));
  }

  async deleteAccount() {
    await this.resetDemo();
  }

  // Profile --------------------------------------------------------------------
  private requireMe(): Profile {
    if (!this.state.session) throw new AppError('not_authenticated');
    if (!this.state.me) throw new AppError('profile_incomplete');
    return this.state.me;
  }

  private requireReady(): Profile {
    const me = this.requireMe();
    if (!me.onboardedAt) throw new AppError('profile_incomplete');
    return me;
  }

  async getMyProfile() {
    await this.ready;
    return this.state.session ? this.state.me : null;
  }

  async saveMyProfile(input: SaveProfileInput) {
    return this.tx(() => {
      if (!this.state.session) throw new AppError('not_authenticated');
      const base: Profile = this.state.me ?? {
        id: ME,
        handle: null,
        displayName: '',
        avatar: null,
        banner: null,
        avatarPath: null,
        bannerPath: null,
        bio: null,
        lookingFor: null,
        city: null,
        countryCode: null,
        languages: [],
        roles: [],
        genres: [],
        influences: [],
        skills: [],
        goals: [],
        availability: 'open',
        collabMode: 'both',
        isDiscoverable: true,
        onboardedAt: null,
        lastActiveAt: now(),
        createdAt: now(),
      };
      const { confirmAge: _age, completeOnboarding, ...fields } = input;
      const next: Profile = {
        ...base,
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
      };
      next.displayName = next.displayName.trim();
      next.bio = next.bio?.trim() || null;
      next.lookingFor = next.lookingFor?.trim() || null;
      next.city = next.city?.trim() || null;
      next.countryCode = next.countryCode?.trim().toUpperCase() || null;
      next.influences = dedupeCaseInsensitive(next.influences);
      if (completeOnboarding && !next.onboardedAt) next.onboardedAt = now();
      this.state.me = next;
      if (next.onboardedAt && !this.state.seededRequest) this.seedIncomingRequest();
      return next;
    });
  }

  /** One demo creator proposes a project after onboarding, so the Requests flow can be tried. */
  private seedIncomingRequest() {
    this.state.seededRequest = true;
    const from = this.directory.get(DEMO_REQUEST_FROM);
    if (!from) return;
    this.state.requests.push({
      id: id(),
      senderId: from.profile.id,
      recipientId: ME,
      message: DEMO_REQUEST_TEXT[useLocale.getState().locale],
      projectTitle: DEMO_REQUEST_PROJECT,
      trackId: from.tracks[0]?.id ?? null,
      status: 'pending',
      createdAt: now(),
      respondedAt: null,
    });
  }

  async uploadProfileImage(kind: 'avatar' | 'banner', file: LocalFile) {
    return this.tx(() => {
      const me = this.requireMe();
      const next = { ...me, [kind]: { uri: file.uri } };
      this.state.me = next;
      return next;
    });
  }

  async isHandleAvailable(handle: string) {
    const taken = [...this.directory.values()].some((r) => r.profile.handle === handle.toLowerCase());
    return !taken;
  }

  async listMyLinks() {
    await this.ready;
    return this.state.myLinks;
  }

  async setMyLinks(links: { platform: LinkPlatform; url: string }[]) {
    return this.tx(() => {
      this.state.myLinks = links
        .map((l, i) => ({ id: id(), platform: l.platform, url: normalizeUrl(l.url) ?? '', position: i }))
        .filter((l) => l.url);
      return this.state.myLinks;
    });
  }

  async listMyTracks() {
    await this.ready;
    return this.state.myTracks;
  }

  async addTrack(input: NewTrackInput) {
    return this.tx(() => {
      this.requireMe();
      const limit = PLAN_LIMITS.free.maxTracks;
      if (this.state.myTracks.length >= limit) throw new AppError('track_limit', undefined, String(limit));
      const track: Track = {
        id: id(),
        ownerId: ME,
        title: input.title.trim(),
        storagePath: `local:${input.file.uri}`,
        durationMs: input.durationMs,
        waveform: input.waveform,
        bpm: input.bpm,
        musicalKey: input.musicalKey,
        genre: input.genre,
        position: this.state.myTracks.length,
        createdAt: now(),
      };
      this.state.myTracks.push(track);
      return track;
    });
  }

  async deleteTrack(trackId: string) {
    await this.tx(() => {
      this.state.myTracks = this.state.myTracks.filter((tr) => tr.id !== trackId);
    });
  }

  async touchActivity() {}

  // Media ----------------------------------------------------------------------
  async trackSource(track: { storagePath: string }): Promise<MediaSource> {
    if (track.storagePath.startsWith('demo:')) {
      const src = demoAudioSource(track.storagePath);
      if (src != null) return src;
    }
    if (track.storagePath.startsWith('local:')) return { uri: track.storagePath.slice(6) };
    throw new AppError('generic', 'Unknown demo track');
  }

  async messageAudioSource(message: { attachmentPath: string | null }): Promise<MediaSource> {
    if (!message.attachmentPath) throw new AppError('generic');
    return { uri: message.attachmentPath.replace(/^local:/, '') };
  }

  // Discovery ------------------------------------------------------------------
  private isBlocked(otherId: string) {
    return this.state.blocks.some((b) => b.userId === otherId);
  }

  private connectionWith(otherId: string) {
    return this.state.connections.find((c) => c.otherId === otherId) ?? null;
  }

  private mini(pid: string): ProfileMini {
    const p = pid === ME ? this.state.me : this.directory.get(pid)?.profile;
    if (!p) return { id: pid, displayName: '?', handle: null, avatar: null, roles: [], availability: 'open' };
    return { id: p.id, displayName: p.displayName, handle: p.handle, avatar: p.avatar, roles: p.roles, availability: p.availability, isDemo: p.isDemo };
  }

  async discoverFeed(filters: DiscoverFilters, limit: number): Promise<DiscoverCandidate[]> {
    await this.ready;
    const me = this.requireReady();
    const monthAgo = Date.now() - 30 * 86400_000;
    const out: DiscoverCandidate[] = [];
    for (const rec of this.directory.values()) {
      const p = rec.profile;
      const sw = this.state.swipes[p.id];
      if (this.isBlocked(p.id)) continue;
      if (sw && (sw.decision === 'interest' || Date.parse(sw.at) > monthAgo)) continue;
      if (this.connectionWith(p.id)) continue;
      if (this.state.requests.some((r) => r.senderId === ME && r.recipientId === p.id && r.status === 'pending')) continue;
      if (filters.roles.length && !p.roles.some((r) => filters.roles.includes(r))) continue;
      if (filters.genres.length && !p.genres.some((g) => filters.genres.includes(g))) continue;
      if (filters.availability.length && !filters.availability.includes(p.availability)) continue;
      if (filters.remoteOnly && p.collabMode === 'in_person') continue;
      out.push({
        profile: p,
        fit: computeFit(me, p),
        tracks: rec.tracks,
        links: rec.links,
        isSaved: this.state.favorites.some((f) => f.targetId === p.id),
      });
    }
    const jitter = (s: string) => [...(s + today())].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 7;
    return out
      .sort((a, b) => b.fit.score + jitter(b.profile.id) - (a.fit.score + jitter(a.profile.id)))
      .slice(0, limit);
  }

  private rollUsageDay() {
    if (this.state.usage.day !== today()) this.state.usage = { day: today(), interests: 0, requests: 0 };
  }

  async swipe(targetId: string, decision: SwipeDecision) {
    return this.tx(() => {
      this.requireReady();
      if (!this.directory.has(targetId) || this.isBlocked(targetId)) throw new AppError('target_unavailable');
      this.rollUsageDay();
      const prev = this.state.swipes[targetId]?.decision;
      if (decision === 'interest' && prev !== 'interest') {
        const cap = PLAN_LIMITS.free.dailyInterests;
        if (cap != null && this.state.usage.interests >= cap) throw new AppError('daily_interest_limit', undefined, String(cap));
        this.state.usage.interests += 1;
      }
      this.state.swipes[targetId] = { decision, at: now() };
      let conversationId: string | null = null;
      let connectionId: string | null = null;
      if (decision === 'interest' && DEMO_INTERESTED_IN_YOU.has(targetId)) {
        const c = this.ensureConnection(targetId, 'mutual_interest');
        conversationId = c.conversationId;
        connectionId = c.id;
      }
      return { connected: !!conversationId, connectionId, conversationId, usage: this.usage() };
    });
  }

  private ensureConnection(otherId: string, origin: Connection['origin']): ConnectionRow {
    const existing = this.connectionWith(otherId);
    if (existing) return existing;
    let conv = this.state.conversations.find((c) => c.memberIds.includes(otherId));
    if (!conv) {
      conv = { id: id(), memberIds: [ME, otherId], createdAt: now(), lastMessageAt: null, lastReadAt: null };
      this.state.conversations.push(conv);
    }
    const row: ConnectionRow = { id: id(), otherId, origin, createdAt: now(), conversationId: conv.id };
    this.state.connections.push(row);
    this.pushMessage({ conversationId: conv.id, senderId: null, kind: 'system', body: null, attachmentPath: null, system: { event: 'linked', origin } });
    this.emitNetwork();
    return row;
  }

  private pushMessage(m: Omit<Message, 'id' | 'createdAt'>): Message {
    const msg: Message = { ...m, id: id(), createdAt: now() };
    this.state.messages.push(msg);
    const conv = this.state.conversations.find((c) => c.id === m.conversationId);
    if (conv) {
      conv.lastMessageAt = msg.createdAt;
      if (m.senderId === ME) conv.lastReadAt = msg.createdAt;
    }
    this.messageListeners.forEach((l) => l(msg));
    return msg;
  }

  async setSaved(targetId: string, saved: boolean) {
    await this.tx(() => {
      this.state.favorites = this.state.favorites.filter((f) => f.targetId !== targetId);
      if (saved) {
        const cap = PLAN_LIMITS.free.maxFavorites;
        if (cap != null && this.state.favorites.length >= cap) throw new AppError('favorite_limit', undefined, String(cap));
        this.state.favorites.unshift({ targetId, createdAt: now() });
      }
    });
  }

  async getProfileBundle(profileId: string): Promise<ProfileBundle> {
    await this.ready;
    if (profileId === ME) {
      const me = this.requireMe();
      return { profile: me, fit: null, tracks: this.state.myTracks, links: this.state.myLinks, isSaved: false, myDecision: null, connection: null, pendingSent: null, pendingReceived: null };
    }
    const rec = this.directory.get(profileId);
    if (!rec || this.isBlocked(profileId)) throw new AppError('profile_not_found');
    const me = this.state.me;
    const conn = this.connectionWith(profileId);
    const sent = this.state.requests.find((r) => r.senderId === ME && r.recipientId === profileId && r.status === 'pending');
    const received = this.state.requests.find((r) => r.senderId === profileId && r.recipientId === ME && r.status === 'pending');
    return {
      profile: rec.profile,
      fit: me?.onboardedAt ? computeFit(me, rec.profile) : null,
      tracks: rec.tracks,
      links: rec.links,
      isSaved: this.state.favorites.some((f) => f.targetId === profileId),
      myDecision: this.state.swipes[profileId]?.decision ?? null,
      connection: conn ? { id: conn.id, conversationId: conn.conversationId } : null,
      pendingSent: sent ? { id: sent.id } : null,
      pendingReceived: received ? { id: received.id } : null,
    };
  }

  // Network --------------------------------------------------------------------
  async sendRequest(input: SendRequestInput) {
    return this.tx(() => {
      this.requireReady();
      if (!this.directory.has(input.targetId) || this.isBlocked(input.targetId)) throw new AppError('target_unavailable');
      if (this.state.requests.some((r) => r.senderId === ME && r.recipientId === input.targetId && r.status === 'pending')) {
        throw new AppError('request_already_pending');
      }
      if (this.state.requests.some((r) => r.senderId === input.targetId && r.recipientId === ME && r.status === 'pending')) {
        throw new AppError('request_pending_from_them');
      }
      if (input.trackId && !this.state.myTracks.some((tr) => tr.id === input.trackId)) throw new AppError('invalid_track');
      this.rollUsageDay();
      const cap = PLAN_LIMITS.free.dailyRequests;
      if (this.state.usage.requests >= cap) throw new AppError('daily_request_limit', undefined, String(cap));
      this.state.usage.requests += 1;
      this.state.requests.push({
        id: id(),
        senderId: ME,
        recipientId: input.targetId,
        message: input.message.trim(),
        projectTitle: input.projectTitle?.trim() || null,
        trackId: input.trackId,
        status: 'pending',
        createdAt: now(),
        respondedAt: null,
      });
      this.state.swipes[input.targetId] = { decision: 'interest', at: now() };
      let conversationId: string | null = null;
      if (DEMO_INTERESTED_IN_YOU.has(input.targetId)) conversationId = this.ensureConnection(input.targetId, 'mutual_interest').conversationId;
      this.emitNetwork();
      return { connected: !!conversationId, conversationId };
    });
  }

  private findTrack(trackId: string | null) {
    if (!trackId) return null;
    const mine = this.state.myTracks.find((tr) => tr.id === trackId);
    if (mine) return mine;
    for (const rec of this.directory.values()) {
      const found = rec.tracks.find((tr) => tr.id === trackId);
      if (found) return found;
    }
    return null;
  }

  async listRequests(box: 'received' | 'sent'): Promise<CollabRequest[]> {
    await this.ready;
    return this.state.requests
      .filter((r) =>
        box === 'received'
          ? r.recipientId === ME && r.status === 'pending'
          : r.senderId === ME && (r.status === 'pending' || r.status === 'declined'),
      )
      .filter((r) => !this.isBlocked(box === 'received' ? r.senderId : r.recipientId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => {
        const track = this.findTrack(r.trackId);
        return {
          id: r.id,
          direction: box,
          status: r.status,
          message: r.message,
          projectTitle: r.projectTitle,
          createdAt: r.createdAt,
          respondedAt: r.respondedAt,
          other: this.mini(box === 'received' ? r.senderId : r.recipientId),
          track: track ? { id: track.id, title: track.title, durationMs: track.durationMs, waveform: track.waveform, storagePath: track.storagePath } : null,
        };
      });
  }

  async respondRequest(requestId: string, accept: boolean) {
    return this.tx(() => {
      const r = this.state.requests.find((x) => x.id === requestId && x.recipientId === ME);
      if (!r) throw new AppError('request_not_found');
      if (r.status !== 'pending') throw new AppError('request_not_pending');
      r.status = accept ? 'accepted' : 'declined';
      r.respondedAt = now();
      if (!accept) {
        this.emitNetwork();
        return { conversationId: null };
      }
      const conn = this.ensureConnection(r.senderId, 'collab_request');
      this.pushMessage({ conversationId: conn.conversationId, senderId: r.senderId, kind: 'text', body: r.message, attachmentPath: null });
      const track = this.findTrack(r.trackId);
      if (track) {
        this.pushMessage({
          conversationId: conn.conversationId,
          senderId: r.senderId,
          kind: 'track',
          body: null,
          attachmentPath: null,
          track: { trackId: track.id, title: track.title, durationMs: track.durationMs, waveform: track.waveform, storagePath: track.storagePath },
        });
      }
      const title = (r.projectTitle ?? `${this.mini(r.senderId).displayName} × ${this.state.me?.displayName ?? ''}`).slice(0, 80);
      this.state.collaborations.push({
        id: id(),
        title,
        status: 'active',
        conversationId: conn.conversationId,
        memberIds: [ME, r.senderId],
        createdAt: now(),
        updatedAt: now(),
      });
      this.pushMessage({ conversationId: conn.conversationId, senderId: null, kind: 'system', body: null, attachmentPath: null, system: { event: 'project_started', title } });
      this.emitNetwork();
      return { conversationId: conn.conversationId };
    });
  }

  async withdrawRequest(requestId: string) {
    await this.tx(() => {
      const r = this.state.requests.find((x) => x.id === requestId && x.senderId === ME && x.status === 'pending');
      if (!r) throw new AppError('request_not_found');
      r.status = 'withdrawn';
      r.respondedAt = now();
      this.emitNetwork();
    });
  }

  async listConnections(): Promise<Connection[]> {
    await this.ready;
    return this.state.connections
      .filter((c) => !this.isBlocked(c.otherId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((c) => ({ id: c.id, origin: c.origin, createdAt: c.createdAt, conversationId: c.conversationId, other: this.mini(c.otherId) }));
  }

  async removeConnection(connectionId: string) {
    await this.tx(() => {
      this.state.connections = this.state.connections.filter((c) => c.id !== connectionId);
      this.emitNetwork();
    });
  }

  async listCollaborations(): Promise<Collaboration[]> {
    await this.ready;
    return this.state.collaborations
      .filter((c) => c.status !== 'archived')
      .sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || b.updatedAt.localeCompare(a.updatedAt))
      .map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        conversationId: c.conversationId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        members: c.memberIds.filter((m) => m !== ME).map((m) => this.mini(m)),
      }));
  }

  async startCollaboration(conversationId: string, title: string) {
    return this.tx(() => {
      const conv = this.state.conversations.find((c) => c.id === conversationId);
      if (!conv || !this.canPost(conv)) throw new AppError('conversation_closed');
      const clean = title.trim().slice(0, 80);
      if (!clean) throw new AppError('title_required');
      const cid = id();
      this.state.collaborations.push({ id: cid, title: clean, status: 'active', conversationId, memberIds: conv.memberIds, createdAt: now(), updatedAt: now() });
      this.pushMessage({ conversationId, senderId: null, kind: 'system', body: null, attachmentPath: null, system: { event: 'project_started', title: clean } });
      return cid;
    });
  }

  async setCollaborationStatus(collaborationId: string, status: CollaborationStatus) {
    await this.tx(() => {
      const c = this.state.collaborations.find((x) => x.id === collaborationId);
      if (!c) throw new AppError('collaboration_not_found');
      c.status = status;
      c.updatedAt = now();
      if (status === 'completed') {
        this.pushMessage({ conversationId: c.conversationId, senderId: null, kind: 'system', body: null, attachmentPath: null, system: { event: 'project_completed', title: c.title } });
      }
    });
  }

  async listFavorites() {
    await this.ready;
    const me = this.state.me;
    return this.state.favorites
      .filter((f) => !this.isBlocked(f.targetId) && this.directory.has(f.targetId))
      .map((f) => ({
        createdAt: f.createdAt,
        profile: this.mini(f.targetId),
        fit: me?.onboardedAt ? computeFit(me, this.directory.get(f.targetId)!.profile) : null,
      }));
  }

  // Messaging ------------------------------------------------------------------
  private canPost(conv: ConversationRow) {
    const other = conv.memberIds.find((m) => m !== ME);
    return !!other && !this.isBlocked(other) && !!this.connectionWith(other);
  }

  async listConversations(): Promise<ConversationSummary[]> {
    await this.ready;
    return this.state.conversations
      .filter((c) => !c.memberIds.some((m) => m !== ME && this.isBlocked(m)))
      .map((c) => {
        const msgs = this.state.messages.filter((m) => m.conversationId === c.id);
        const last = msgs[msgs.length - 1] ?? null;
        const unread = msgs.filter((m) => m.senderId !== ME && (!c.lastReadAt || m.createdAt > c.lastReadAt)).length;
        return {
          id: c.id,
          other: this.mini(c.memberIds.find((m) => m !== ME)!),
          lastMessage: last,
          lastMessageAt: c.lastMessageAt,
          createdAt: c.createdAt,
          unreadCount: unread,
          canPost: this.canPost(c),
          muted: false,
        };
      })
      .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));
  }

  async listMessages(conversationId: string, before?: string) {
    await this.ready;
    const all = this.state.messages.filter((m) => m.conversationId === conversationId && (!before || m.createdAt < before));
    return all.slice(-50);
  }

  async sendText(conversationId: string, body: string) {
    return this.tx(() => {
      const conv = this.state.conversations.find((c) => c.id === conversationId);
      if (!conv || !this.canPost(conv)) throw new AppError('conversation_closed');
      const text = body.trim();
      const link = isLinkOnly(text) ? normalizeUrl(text) : null;
      return this.pushMessage(
        link
          ? { conversationId, senderId: ME, kind: 'link', body: link, attachmentPath: null, linkPlatform: detectPlatform(link) }
          : { conversationId, senderId: ME, kind: 'text', body: text, attachmentPath: null },
      );
    });
  }

  async sendAudio(conversationId: string, file: LocalFile, meta: { durationMs: number | null; waveform: number[] | null }) {
    return this.tx(() => {
      const conv = this.state.conversations.find((c) => c.id === conversationId);
      if (!conv || !this.canPost(conv)) throw new AppError('conversation_closed');
      return this.pushMessage({
        conversationId,
        senderId: ME,
        kind: 'audio',
        body: null,
        attachmentPath: `local:${file.uri}`,
        audio: { durationMs: meta.durationMs, waveform: meta.waveform, filename: file.name, sizeBytes: file.sizeBytes, mime: file.mimeType },
      });
    });
  }

  async markRead(conversationId: string) {
    await this.tx(() => {
      const conv = this.state.conversations.find((c) => c.id === conversationId);
      if (conv) conv.lastReadAt = now();
    });
  }

  subscribeToMessages(listener: (m: Message) => void) {
    this.messageListeners.add(listener);
    return () => void this.messageListeners.delete(listener);
  }

  subscribeToNetwork(listener: () => void) {
    this.networkListeners.add(listener);
    return () => void this.networkListeners.delete(listener);
  }

  // Safety & account -----------------------------------------------------------
  async block(userId: string) {
    await this.tx(() => {
      if (!this.state.blocks.some((b) => b.userId === userId)) this.state.blocks.unshift({ userId, createdAt: now() });
      this.state.connections = this.state.connections.filter((c) => c.otherId !== userId);
      this.state.requests.forEach((r) => {
        if (r.status === 'pending' && (r.senderId === userId || r.recipientId === userId)) {
          r.status = 'withdrawn';
          r.respondedAt = now();
        }
      });
      this.state.favorites = this.state.favorites.filter((f) => f.targetId !== userId);
      this.emitNetwork();
    });
  }

  async unblock(userId: string) {
    await this.tx(() => {
      this.state.blocks = this.state.blocks.filter((b) => b.userId !== userId);
    });
  }

  async listBlocked(): Promise<BlockedUser[]> {
    await this.ready;
    return this.state.blocks.map((b) => ({ blockedAt: b.createdAt, profile: this.mini(b.userId) }));
  }

  async report(input: ReportInput) {
    await this.tx(() => {
      this.state.reports.push({ ...input, id: id(), createdAt: now() });
    });
  }

  private usage(): Usage {
    this.rollUsageDay();
    const l = PLAN_LIMITS.free;
    return {
      plan: 'free',
      interestsUsed: this.state.usage.interests,
      interestsLimit: l.dailyInterests,
      requestsUsed: this.state.usage.requests,
      requestsLimit: l.dailyRequests,
      favoritesCount: this.state.favorites.length,
      favoritesLimit: l.maxFavorites,
      tracksCount: this.state.myTracks.length,
      tracksLimit: l.maxTracks,
    };
  }

  async getUsage() {
    await this.ready;
    return this.usage();
  }

  async exportMyData() {
    await this.ready;
    const { session: _s, ...data } = this.state;
    return JSON.stringify({ exported_at: now(), demo: true, note: t('settings.demoBody'), ...data }, null, 2);
  }

  async registerPushToken() {
    throw new AppError('not_available_demo');
  }
}

function dedupeCaseInsensitive(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of xs) {
    const x = raw.trim();
    if (!x || seen.has(x.toLowerCase())) continue;
    seen.add(x.toLowerCase());
    out.push(x);
  }
  return out;
}
