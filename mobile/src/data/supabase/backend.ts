import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type AuthError, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Platform } from 'react-native';
import type { Backend, OAuthProvider, SaveProfileInput, SendRequestInput } from '../backend';
import { config } from '../config';
import {
  toCandidate,
  toCollaboration,
  toConnection,
  toConversation,
  toFavorite,
  toFit,
  toLink,
  toMessage,
  toMini,
  toProfile,
  toRequest,
  toTrack,
  toUsage,
  type ImageUrl,
} from './mappers';
import { detectPlatform, isLinkOnly, normalizeUrl } from '../../domain/links';
import { AppError, type DiscoverFilters, type LocalFile, type MediaSource, type Session } from '../../domain/types';
import type { LinkPlatform } from '../../domain/taxonomy';
import { audioExtension, extensionOf, readFileBytes } from '../../lib/files';

WebBrowser.maybeCompleteAuthSession();

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Converts Supabase errors into stable codes the UI can translate. */
export function toAppError(error: PostgrestError | AuthError | Error | { message?: string; hint?: string; code?: string } | null): AppError {
  if (!error) return new AppError('generic');
  const message = String(error.message ?? '');
  const hint = 'hint' in error && error.hint ? String(error.hint) : undefined;
  const known = /^([a-z_]+)$/.exec(message.trim());
  if (known) return new AppError(known[1], message, hint);
  if (/Invalid login credentials/i.test(message)) return new AppError('invalid_credentials', message);
  if (/already registered|already been registered/i.test(message)) return new AppError('email_taken', message);
  if (/Password should be|weak password/i.test(message)) return new AppError('weak_password', message);
  if (/invalid format|validate email|Unable to validate email/i.test(message)) return new AppError('invalid_email', message);
  if (/profiles_handle_key|duplicate key.*handle/i.test(message)) return new AppError('handle_taken', message);
  if (/provider is not enabled|Unsupported provider/i.test(message)) return new AppError('provider_not_configured', message);
  if (/Failed to fetch|Network request failed|NetworkError|fetch failed/i.test(message)) return new AppError('network', message);
  return new AppError('generic', message);
}

function unwrap<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw toAppError(res.error);
  return res.data;
}

export class SupabaseBackend implements Backend {
  readonly mode = 'supabase' as const;
  readonly client: SupabaseClient;
  private signedUrls = new Map<string, { url: string; expiresAt: number }>();
  private providers: Promise<Record<string, boolean>> | null = null;

  constructor() {
    this.client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    });
    if (Platform.OS !== 'web') {
      // Refresh tokens only while the app is in the foreground (Supabase guidance for React Native).
      AppState.addEventListener('change', (state) => {
        if (state === 'active') void this.client.auth.startAutoRefresh();
        else void this.client.auth.stopAutoRefresh();
      });
    }
  }

  private img: ImageUrl = (path) => (path ? { uri: this.client.storage.from('images').getPublicUrl(path).data.publicUrl } : null);

  private async uid(): Promise<string> {
    const { data } = await this.client.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new AppError('not_authenticated');
    return id;
  }

  // Auth -----------------------------------------------------------------------
  async getSession(): Promise<Session | null> {
    const { data } = await this.client.auth.getSession();
    return toSession(data.session);
  }

  onSessionChange(listener: (session: Session | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => listener(toSession(session)));
    return () => data.subscription.unsubscribe();
  }

  async signUpWithEmail(email: string, password: string) {
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectUrl() },
    });
    if (error) throw toAppError(error);
    return { needsConfirmation: !data.session };
  }

  async signInWithEmail(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw toAppError(error);
  }

  /** Which OAuth providers are enabled on the Supabase project. */
  enabledProviders(): Promise<Record<string, boolean>> {
    this.providers ??= fetch(`${config.supabaseUrl}/auth/v1/settings`, { headers: { apikey: config.supabaseAnonKey } })
      .then((r) => r.json())
      .then((s) => (s?.external ?? {}) as Record<string, boolean>)
      .catch(() => ({}));
    return this.providers;
  }

  async availableProviders(): Promise<OAuthProvider[]> {
    const enabled = await this.enabledProviders();
    return (['apple', 'google'] as const).filter((p) => enabled[p]);
  }

  async signInWithProvider(provider: OAuthProvider) {
    const enabled = await this.enabledProviders();
    if (!enabled[provider]) throw new AppError('provider_not_configured', undefined, provider === 'apple' ? 'Apple' : 'Google');

    if (provider === 'apple' && Platform.OS === 'ios') {
      const Apple = await import('expo-apple-authentication');
      if (await Apple.isAvailableAsync()) {
        const rawNonce = Crypto.randomUUID();
        const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
        const cred = await Apple.signInAsync({
          requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
          nonce: hashed,
        });
        if (!cred.identityToken) throw new AppError('generic', 'No identity token from Apple');
        const { error } = await this.client.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: rawNonce });
        if (error) throw toAppError(error);
        return;
      }
    }

    if (Platform.OS === 'web') {
      const { error } = await this.client.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl() } });
      if (error) throw toAppError(error);
      return; // The browser navigates away; detectSessionInUrl finishes the flow on return.
    }

    const redirectTo = redirectUrl();
    const { data, error } = await this.client.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !data.url) throw toAppError(error);
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return;
    const code = new URL(result.url).searchParams.get('code');
    if (!code) throw new AppError('generic', 'OAuth returned no code');
    const exchange = await this.client.auth.exchangeCodeForSession(code);
    if (exchange.error) throw toAppError(exchange.error);
  }

  async signOut() {
    await this.client.auth.signOut();
    this.signedUrls.clear();
  }

  async deleteAccount() {
    const { error } = await this.client.functions.invoke('delete-account', { method: 'POST' });
    if (error) throw toAppError(error);
    await this.client.auth.signOut({ scope: 'local' });
  }

  // Profile --------------------------------------------------------------------
  async getMyProfile() {
    const id = await this.uid();
    const res = await this.client.from('profiles').select('*').eq('id', id).maybeSingle();
    const row = unwrap(res);
    return row ? toProfile(row, this.img) : null;
  }

  async saveMyProfile(input: SaveProfileInput) {
    const id = await this.uid();
    const row: Record<string, unknown> = { id };
    const map: [keyof SaveProfileInput, string][] = [
      ['handle', 'handle'],
      ['displayName', 'display_name'],
      ['bio', 'bio'],
      ['lookingFor', 'looking_for'],
      ['city', 'city'],
      ['countryCode', 'country_code'],
      ['languages', 'languages'],
      ['roles', 'roles'],
      ['genres', 'genres'],
      ['influences', 'influences'],
      ['skills', 'skills'],
      ['goals', 'goals'],
      ['availability', 'availability'],
      ['collabMode', 'collab_mode'],
      ['isDiscoverable', 'is_discoverable'],
    ];
    for (const [key, column] of map) if (input[key] !== undefined) row[column] = input[key];
    if (input.confirmAge) row.age_confirmed_at = new Date().toISOString();
    if (input.completeOnboarding) row.onboarded_at = new Date().toISOString();

    const existing = await this.client.from('profiles').select('id').eq('id', id).maybeSingle();
    const res = existing.data
      ? await this.client.from('profiles').update(row).eq('id', id).select().single()
      : await this.client.from('profiles').insert({ display_name: input.displayName ?? '', ...row }).select().single();
    return toProfile(unwrap(res), this.img);
  }

  async uploadProfileImage(kind: 'avatar' | 'banner', file: LocalFile) {
    const id = await this.uid();
    const ext = extensionOf(file.name) || (file.mimeType === 'image/png' ? 'png' : 'jpg');
    const path = `${id}/${kind}-${Date.now()}.${ext}`;
    const up = await this.client.storage.from('images').upload(path, await readFileBytes(file), { contentType: file.mimeType, upsert: false });
    if (up.error) throw toAppError(up.error);
    const before = await this.getMyProfile();
    const column = kind === 'avatar' ? 'avatar_path' : 'banner_path';
    const res = await this.client.from('profiles').update({ [column]: path }).eq('id', id).select().single();
    const old = kind === 'avatar' ? before?.avatarPath : before?.bannerPath;
    if (old) void this.client.storage.from('images').remove([old]);
    return toProfile(unwrap(res), this.img);
  }

  async isHandleAvailable(handle: string) {
    const id = await this.uid();
    const res = await this.client.from('profiles').select('id').eq('handle', handle.toLowerCase()).neq('id', id).limit(1);
    return (res.data ?? []).length === 0;
  }

  async listMyLinks() {
    const id = await this.uid();
    return (unwrap(await this.client.from('profile_links').select('*').eq('profile_id', id).order('position')) ?? []).map(toLink);
  }

  async setMyLinks(links: { platform: LinkPlatform; url: string }[]) {
    const id = await this.uid();
    const clean = links
      .map((l, i) => ({ profile_id: id, platform: l.platform, url: normalizeUrl(l.url), position: i }))
      .filter((l): l is { profile_id: string; platform: LinkPlatform; url: string; position: number } => !!l.url);
    unwrap(await this.client.from('profile_links').delete().eq('profile_id', id));
    if (clean.length) unwrap(await this.client.from('profile_links').insert(clean));
    return this.listMyLinks();
  }

  async listMyTracks() {
    const id = await this.uid();
    return (unwrap(await this.client.from('tracks').select('*').eq('owner_id', id).order('position').order('created_at')) ?? []).map(toTrack);
  }

  async addTrack(input: Parameters<Backend['addTrack']>[0]) {
    const id = await this.uid();
    const path = `${id}/${Crypto.randomUUID()}.${audioExtension(input.file.mimeType)}`;
    const up = await this.client.storage.from('tracks').upload(path, await readFileBytes(input.file), { contentType: input.file.mimeType });
    if (up.error) throw toAppError(up.error);
    const existing = await this.listMyTracks();
    const res = await this.client
      .from('tracks')
      .insert({
        owner_id: id,
        title: input.title.trim(),
        storage_path: path,
        duration_ms: input.durationMs,
        waveform: input.waveform,
        bpm: input.bpm,
        musical_key: input.musicalKey,
        genre: input.genre,
        position: existing.length,
      })
      .select()
      .single();
    if (res.error) {
      void this.client.storage.from('tracks').remove([path]);
      throw toAppError(res.error);
    }
    return toTrack(res.data);
  }

  async deleteTrack(trackId: string) {
    const row = unwrap(await this.client.from('tracks').delete().eq('id', trackId).select().single());
    void this.client.storage.from('tracks').remove([row.storage_path]);
  }

  async touchActivity() {
    await this.client.rpc('touch_activity');
  }

  // Media ----------------------------------------------------------------------
  private async signed(bucket: string, path: string): Promise<MediaSource> {
    const key = `${bucket}/${path}`;
    const cached = this.signedUrls.get(key);
    if (cached && cached.expiresAt > Date.now() + 60_000) return { uri: cached.url };
    const { data, error } = await this.client.storage.from(bucket).createSignedUrl(path, 3600);
    if (error || !data) throw toAppError(error);
    this.signedUrls.set(key, { url: data.signedUrl, expiresAt: Date.now() + 3600_000 });
    return { uri: data.signedUrl };
  }

  /** Single place that resolves track URLs, so audio can move to another store (e.g. Cloudflare R2) later. */
  trackSource(track: { storagePath: string }) {
    return this.signed('tracks', track.storagePath);
  }

  messageAudioSource(message: { attachmentPath: string | null }) {
    if (!message.attachmentPath) throw new AppError('generic', 'Message has no audio');
    return this.signed('message-audio', message.attachmentPath);
  }

  // Discovery ------------------------------------------------------------------
  async discoverFeed(filters: DiscoverFilters, limit: number) {
    const rows = unwrap(
      await this.client.rpc('discover_feed', {
        p_limit: limit,
        p_roles: filters.roles.length ? filters.roles : null,
        p_genres: filters.genres.length ? filters.genres : null,
        p_availability: filters.availability.length ? filters.availability : null,
        p_remote_only: filters.remoteOnly,
      }),
    ) as any[];
    return rows.map((r) => toCandidate(r, this.img));
  }

  async swipe(targetId: string, decision: 'pass' | 'interest') {
    const r = unwrap(await this.client.rpc('record_swipe', { p_target: targetId, p_decision: decision })) as any;
    return { connected: !!r.connected, connectionId: r.connection_id ?? null, conversationId: r.conversation_id ?? null, usage: toUsage(r.usage) };
  }

  async setSaved(targetId: string, saved: boolean) {
    const id = await this.uid();
    if (saved) {
      const res = await this.client.from('favorites').upsert({ owner_id: id, target_id: targetId }, { onConflict: 'owner_id,target_id', ignoreDuplicates: true });
      if (res.error) throw toAppError(res.error);
    } else {
      unwrap(await this.client.from('favorites').delete().eq('owner_id', id).eq('target_id', targetId));
    }
  }

  async getProfileBundle(profileId: string) {
    const r = unwrap(await this.client.rpc('get_profile_bundle', { p_id: profileId })) as any;
    return {
      profile: toProfile(r.profile, this.img),
      fit: r.fit ? toFit(r.fit) : null,
      tracks: (r.tracks ?? []).map(toTrack),
      links: (r.links ?? []).map(toLink),
      isSaved: !!r.is_saved,
      myDecision: r.my_decision ?? null,
      connection: r.connection ? { id: r.connection.id, conversationId: r.connection.conversation_id ?? null } : null,
      pendingSent: r.pending_sent ? { id: r.pending_sent.id } : null,
      pendingReceived: r.pending_received ? { id: r.pending_received.id } : null,
    };
  }

  // Network --------------------------------------------------------------------
  async sendRequest(input: SendRequestInput) {
    const r = unwrap(
      await this.client.rpc('send_collab_request', {
        p_target: input.targetId,
        p_message: input.message,
        p_project_title: input.projectTitle,
        p_track_id: input.trackId,
      }),
    ) as any;
    return { connected: !!r.connected, conversationId: r.conversation_id ?? null };
  }

  async listRequests(box: 'received' | 'sent') {
    return (unwrap(await this.client.rpc('list_requests', { p_box: box })) as any[]).map((r) => toRequest(r, this.img));
  }

  async respondRequest(requestId: string, accept: boolean) {
    const r = unwrap(await this.client.rpc('respond_collab_request', { p_request: requestId, p_accept: accept })) as any;
    return { conversationId: r.conversation_id ?? null };
  }

  async withdrawRequest(requestId: string) {
    unwrap(await this.client.rpc('withdraw_collab_request', { p_request: requestId }));
  }

  async listConnections() {
    return (unwrap(await this.client.rpc('list_connections')) as any[]).map((r) => toConnection(r, this.img));
  }

  async removeConnection(connectionId: string) {
    unwrap(await this.client.rpc('remove_connection', { p_connection: connectionId }));
  }

  async listCollaborations() {
    return (unwrap(await this.client.rpc('list_collaborations')) as any[]).map((r) => toCollaboration(r, this.img));
  }

  async startCollaboration(conversationId: string, title: string) {
    return unwrap(await this.client.rpc('start_collaboration', { p_conversation: conversationId, p_title: title })) as string;
  }

  async setCollaborationStatus(collaborationId: string, status: 'active' | 'completed' | 'archived') {
    unwrap(await this.client.rpc('set_collaboration_status', { p_collaboration: collaborationId, p_status: status }));
  }

  async listFavorites() {
    return (unwrap(await this.client.rpc('list_favorites')) as any[]).map((r) => toFavorite(r, this.img));
  }

  // Messaging ------------------------------------------------------------------
  async listConversations() {
    return (unwrap(await this.client.rpc('list_conversations')) as any[]).map((r) => toConversation(r, this.img));
  }

  async listMessages(conversationId: string, before?: string) {
    let q = this.client.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(50);
    if (before) q = q.lt('created_at', before);
    return (unwrap(await q) ?? []).map(toMessage).reverse();
  }

  async sendText(conversationId: string, body: string) {
    const id = await this.uid();
    const text = body.trim();
    const link = isLinkOnly(text) ? normalizeUrl(text) : null;
    const row: Record<string, unknown> = link
      ? { conversation_id: conversationId, sender_id: id, kind: 'link', body: link, meta: { platform: detectPlatform(link) } }
      : { conversation_id: conversationId, sender_id: id, kind: 'text', body: text };
    return toMessage(unwrap(await this.client.from('messages').insert(row).select().single())!);
  }

  async sendAudio(conversationId: string, file: LocalFile, meta: { durationMs: number | null; waveform: number[] | null }) {
    const id = await this.uid();
    const path = `${conversationId}/${Crypto.randomUUID()}.${audioExtension(file.mimeType)}`;
    const up = await this.client.storage.from('message-audio').upload(path, await readFileBytes(file), { contentType: file.mimeType });
    if (up.error) throw toAppError(up.error);
    const res = await this.client
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: id,
        kind: 'audio',
        attachment_path: path,
        meta: { duration_ms: meta.durationMs, waveform: meta.waveform, filename: file.name, size_bytes: file.sizeBytes, mime: file.mimeType },
      })
      .select()
      .single();
    if (res.error) throw toAppError(res.error);
    return toMessage(res.data);
  }

  async markRead(conversationId: string) {
    await this.client.rpc('mark_conversation_read', { p_conversation: conversationId });
  }

  subscribeToMessages(listener: (m: ReturnType<typeof toMessage>) => void) {
    const channel = this.client
      .channel(`messages:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => listener(toMessage(payload.new)))
      .subscribe();
    return () => {
      void this.client.removeChannel(channel);
    };
  }

  subscribeToNetwork(listener: () => void) {
    const channel = this.client
      .channel(`network:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collab_requests' }, () => listener())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => listener())
      .subscribe();
    return () => {
      void this.client.removeChannel(channel);
    };
  }

  // Safety & account -----------------------------------------------------------
  async block(userId: string) {
    unwrap(await this.client.rpc('block_user', { p_target: userId }));
  }

  async unblock(userId: string) {
    unwrap(await this.client.rpc('unblock_user', { p_target: userId }));
  }

  async listBlocked() {
    return (unwrap(await this.client.rpc('list_blocked')) as any[]).map((r) => ({ blockedAt: r.blocked_at, profile: toMini(r.profile, this.img)! }));
  }

  async report(input: Parameters<Backend['report']>[0]) {
    unwrap(
      await this.client.rpc('report_content', {
        p_reason: input.reason,
        p_target_profile: input.targetProfileId ?? null,
        p_message: input.messageId ?? null,
        p_track: input.trackId ?? null,
        p_details: input.details ?? null,
      }),
    );
  }

  async getUsage() {
    return toUsage(unwrap(await this.client.rpc('my_usage')));
  }

  async exportMyData() {
    return JSON.stringify(unwrap(await this.client.rpc('export_my_data')), null, 2);
  }

  async registerPushToken(token: string, platform: 'ios' | 'android' | 'web', locale: 'en' | 'fr') {
    const id = await this.uid();
    const res = await this.client
      .from('push_tokens')
      .upsert({ token, profile_id: id, platform, locale, updated_at: new Date().toISOString() }, { onConflict: 'token' });
    if (res.error) throw toAppError(res.error);
  }
}

function toSession(s: { user: { id: string; email?: string | null; app_metadata?: { provider?: string } } } | null): Session | null {
  if (!s) return null;
  const p = s.user.app_metadata?.provider;
  return { userId: s.user.id, email: s.user.email ?? null, provider: p === 'google' || p === 'apple' ? p : 'email' };
}

function redirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/auth-callback`;
  return Linking.createURL('auth-callback');
}
