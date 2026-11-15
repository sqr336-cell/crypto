/**
 * One app-wide audio player. Every play button, waveform and the mini-player
 * read from this store, so only one sound plays at a time and playback
 * survives navigation.
 */
import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { create } from 'zustand';
import type { MediaSource } from '../domain/types';

export interface PlayerItem {
  /** Unique key, e.g. `track:<id>` or `message:<id>`. */
  key: string;
  title: string;
  subtitle: string | null;
  artwork: MediaSource | null;
  durationMs: number | null;
  waveform: number[] | null;
  /** Where the item came from, to decide follow-up behaviour (e.g. continuous Discover listening). */
  context: 'discover' | 'profile' | 'message' | 'request';
  profileId?: string;
  resolve: () => Promise<MediaSource>;
}

interface PlayerState {
  current: PlayerItem | null;
  playing: boolean;
  loading: boolean;
  positionMs: number;
  durationMs: number;
  error: string | null;
  play: (item: PlayerItem) => Promise<void>;
  toggle: (item?: PlayerItem) => Promise<void>;
  pause: () => void;
  seekTo: (fraction: number) => void;
  stop: () => void;
}

let player: AudioPlayer | null = null;
let modeSet = false;
let loadToken = 0;

function ensurePlayer(onStatus: (s: AudioStatus) => void): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 200 });
    player.addListener('playbackStatusUpdate', onStatus);
  }
  return player;
}

/** Bundled audio (demo sounds) must be resolved to a URI on every platform, including the web. */
async function bundledAssetUri(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  if (!asset.localUri) await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}

export const usePlayer = create<PlayerState>((set, get) => {
  const onStatus = (s: AudioStatus) => {
    const { current } = get();
    if (!current) return;
    if (s.didJustFinish) {
      set({ playing: false, positionMs: 0 });
      void player?.seekTo(0);
      return;
    }
    set({
      playing: s.playing,
      loading: !s.isLoaded || (s.isBuffering && !s.playing && get().loading),
      positionMs: Math.max(0, s.currentTime * 1000),
      durationMs: s.duration > 0 ? s.duration * 1000 : current.durationMs ?? 0,
    });
  };

  return {
    current: null,
    playing: false,
    loading: false,
    positionMs: 0,
    durationMs: 0,
    error: null,

    play: async (item) => {
      const token = ++loadToken;
      if (!modeSet) {
        modeSet = true;
        void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' }).catch(() => undefined);
      }
      const p = ensurePlayer(onStatus);
      set({ current: item, loading: true, playing: false, positionMs: 0, durationMs: item.durationMs ?? 0, error: null });
      try {
        const source = await item.resolve();
        // Bundled assets are numbers on native and URL strings on the web.
        const raw = source as MediaSource | string;
        const uri = typeof raw === 'number' ? await bundledAssetUri(raw) : typeof raw === 'string' ? raw : raw.uri;
        if (token !== loadToken) return; // A newer play() won.
        p.replace({ uri });
        p.play();
        set({ playing: true });
      } catch (e) {
        if (token !== loadToken) return;
        set({ loading: false, playing: false, error: e instanceof Error ? e.message : 'playback_failed' });
      }
    },

    toggle: async (item) => {
      const { current, playing } = get();
      if (item && current?.key !== item.key) return get().play(item);
      if (!current || !player) return;
      if (playing) {
        player.pause();
        set({ playing: false });
      } else {
        player.play();
        set({ playing: true });
      }
    },

    pause: () => {
      player?.pause();
      set({ playing: false });
    },

    seekTo: (fraction) => {
      const { durationMs } = get();
      if (!player || !durationMs) return;
      const ms = Math.max(0, Math.min(1, fraction)) * durationMs;
      set({ positionMs: ms });
      void player.seekTo(ms / 1000);
    },

    stop: () => {
      loadToken++;
      player?.pause();
      set({ current: null, playing: false, loading: false, positionMs: 0, durationMs: 0, error: null });
    },
  };
});

/** Playback state for one item; cheap to call from many rows. */
export function useItemPlayback(key: string) {
  const isCurrent = usePlayer((s) => s.current?.key === key);
  const playing = usePlayer((s) => s.current?.key === key && s.playing);
  const loading = usePlayer((s) => s.current?.key === key && s.loading);
  const progress = usePlayer((s) => (s.current?.key === key && s.durationMs > 0 ? s.positionMs / s.durationMs : 0));
  return { isCurrent, playing, loading, progress };
}
