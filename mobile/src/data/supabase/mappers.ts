/** Database rows (snake_case JSON) → domain objects. */
import type {
  CollabRequest,
  Collaboration,
  Connection,
  ConversationSummary,
  DiscoverCandidate,
  Fit,
  Favorite,
  MediaSource,
  Message,
  Profile,
  ProfileLink,
  ProfileMini,
  Track,
  Usage,
} from '../../domain/types';
import { detectPlatform } from '../../domain/links';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
export type ImageUrl = (path: string | null | undefined) => MediaSource | null;

export function toProfile(r: Row, img: ImageUrl): Profile {
  return {
    id: r.id,
    handle: r.handle ?? null,
    displayName: r.display_name,
    avatar: img(r.avatar_path),
    banner: img(r.banner_path),
    avatarPath: r.avatar_path ?? null,
    bannerPath: r.banner_path ?? null,
    bio: r.bio ?? null,
    lookingFor: r.looking_for ?? null,
    city: r.city ?? null,
    countryCode: r.country_code ?? null,
    languages: r.languages ?? [],
    roles: r.roles ?? [],
    genres: r.genres ?? [],
    influences: r.influences ?? [],
    skills: r.skills ?? [],
    goals: r.goals ?? [],
    availability: r.availability ?? 'open',
    collabMode: r.collab_mode ?? 'both',
    isDiscoverable: r.is_discoverable ?? true,
    onboardedAt: r.onboarded_at ?? null,
    lastActiveAt: r.last_active_at ?? r.created_at,
    createdAt: r.created_at,
  };
}

export function toMini(r: Row | null, img: ImageUrl): ProfileMini | null {
  if (!r) return null;
  return {
    id: r.id,
    displayName: r.display_name,
    handle: r.handle ?? null,
    avatar: img(r.avatar_path),
    roles: r.roles ?? [],
    availability: r.availability ?? 'open',
  };
}

export function toTrack(r: Row): Track {
  return {
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    storagePath: r.storage_path,
    durationMs: r.duration_ms ?? null,
    waveform: r.waveform ?? null,
    bpm: r.bpm ?? null,
    musicalKey: r.musical_key ?? null,
    genre: r.genre ?? null,
    position: r.position ?? 0,
    createdAt: r.created_at,
  };
}

export function toLink(r: Row): ProfileLink {
  return { id: r.id, platform: r.platform, url: r.url, position: r.position ?? 0 };
}

export function toFit(r: Row): Fit {
  return {
    score: r.score,
    tier: r.tier,
    genres: { points: r.genres.points, shared: r.genres.shared ?? [] },
    roles: { points: r.roles.points, theyFitYou: !!r.roles.they_fit_you, youFitThem: !!r.roles.you_fit_them },
    influences: { points: r.influences.points, shared: r.influences.shared ?? [] },
    skills: { points: r.skills.points, complementary: r.skills.complementary ?? [] },
    availability: { points: r.availability.points, value: r.availability.value },
    goals: { points: r.goals.points, shared: r.goals.shared ?? [], reciprocal: !!r.goals.reciprocal },
    logistics: {
      points: r.logistics.points,
      sharedLanguages: r.logistics.shared_languages ?? [],
      remoteOk: !!r.logistics.remote_ok,
      sameCity: !!r.logistics.same_city,
    },
  };
}

export function toCandidate(r: Row, img: ImageUrl): DiscoverCandidate {
  return {
    profile: toProfile(r.profile, img),
    fit: toFit(r.fit),
    tracks: (r.tracks ?? []).map(toTrack),
    links: (r.links ?? []).map(toLink),
    isSaved: !!r.is_saved,
  };
}

export function toMessage(r: Row): Message {
  const meta = (r.meta ?? {}) as Row;
  const m: Message = {
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id ?? null,
    kind: r.kind,
    body: r.body ?? null,
    attachmentPath: r.attachment_path ?? null,
    createdAt: r.created_at,
  };
  if (r.kind === 'audio') {
    m.audio = {
      durationMs: meta.duration_ms ?? null,
      waveform: meta.waveform ?? null,
      filename: meta.filename ?? null,
      sizeBytes: meta.size_bytes ?? null,
      mime: meta.mime ?? null,
    };
  } else if (r.kind === 'track') {
    m.track = {
      trackId: meta.track_id,
      title: meta.title,
      durationMs: meta.duration_ms ?? null,
      waveform: meta.waveform ?? null,
      storagePath: meta.storage_path,
    };
  } else if (r.kind === 'system') {
    m.system = meta as Message['system'];
  } else if (r.kind === 'link') {
    m.linkPlatform = meta.platform ?? (r.body ? detectPlatform(r.body) : null);
  }
  return m;
}

export function toConversation(r: Row, img: ImageUrl): ConversationSummary {
  return {
    id: r.id,
    other: toMini(r.other, img),
    lastMessage: r.last_message ? toMessage(r.last_message) : null,
    lastMessageAt: r.last_message_at ?? null,
    createdAt: r.created_at,
    unreadCount: Number(r.unread_count ?? 0),
    canPost: !!r.can_post,
    muted: !!r.muted,
  };
}

export function toConnection(r: Row, img: ImageUrl): Connection {
  return {
    id: r.id,
    origin: r.origin,
    createdAt: r.created_at,
    conversationId: r.conversation_id ?? null,
    other: toMini(r.other, img)!,
  };
}

export function toRequest(r: Row, img: ImageUrl): CollabRequest {
  return {
    id: r.id,
    direction: r.direction,
    status: r.status,
    message: r.message,
    projectTitle: r.project_title ?? null,
    createdAt: r.created_at,
    respondedAt: r.responded_at ?? null,
    other: toMini(r.other, img)!,
    track: r.track
      ? {
          id: r.track.id,
          title: r.track.title,
          durationMs: r.track.duration_ms ?? null,
          waveform: r.track.waveform ?? null,
          storagePath: r.track.storage_path,
        }
      : null,
  };
}

export function toCollaboration(r: Row, img: ImageUrl): Collaboration {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    conversationId: r.conversation_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    members: (r.members ?? []).map((m: Row) => toMini(m, img)!).filter(Boolean),
  };
}

export function toFavorite(r: Row, img: ImageUrl): Favorite {
  return { createdAt: r.created_at, profile: toMini(r.profile, img)!, fit: r.fit ? toFit(r.fit) : null };
}

export function toUsage(r: Row): Usage {
  return {
    plan: r.plan ?? 'free',
    interestsUsed: r.interests_used ?? 0,
    interestsLimit: r.interests_limit ?? null,
    requestsUsed: r.requests_used ?? 0,
    requestsLimit: r.requests_limit ?? 0,
    favoritesCount: Number(r.favorites_count ?? 0),
    favoritesLimit: r.favorites_limit ?? null,
    tracksCount: Number(r.tracks_count ?? 0),
    tracksLimit: r.tracks_limit ?? 0,
  };
}
