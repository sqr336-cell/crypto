import { backend } from '../../data';
import type { MediaSource, Message, Track } from '../../domain/types';
import type { PlayerItem } from '../../state/player';

export function trackItem(
  track: Pick<Track, 'id' | 'title' | 'durationMs' | 'waveform' | 'storagePath'>,
  owner: { id?: string; displayName: string; artwork: MediaSource | null },
  context: PlayerItem['context'],
): PlayerItem {
  return {
    key: `track:${track.id}`,
    title: track.title,
    subtitle: owner.displayName,
    artwork: owner.artwork,
    durationMs: track.durationMs,
    waveform: track.waveform,
    context,
    profileId: owner.id,
    resolve: () => backend.trackSource(track),
  };
}

export function messageAudioItem(message: Message, senderName: string, artwork: MediaSource | null): PlayerItem {
  return {
    key: `message:${message.id}`,
    title: message.audio?.filename?.replace(/\.[a-z0-9]+$/i, '') ?? senderName,
    subtitle: senderName,
    artwork,
    durationMs: message.audio?.durationMs ?? null,
    waveform: message.audio?.waveform ?? null,
    context: 'message',
    profileId: message.senderId ?? undefined,
    resolve: () => backend.messageAudioSource(message),
  };
}
