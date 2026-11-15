import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { AppError, type LocalFile } from '../domain/types';
import { LIMITS } from '../domain/taxonomy';

const AUDIO_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  webm: 'audio/webm',
};

const IMAGE_EXT: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export function extensionOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

/** Normalises the many audio MIME spellings platforms report. */
export function audioMime(name: string, reported?: string | null): string | null {
  const ext = extensionOf(name);
  if (AUDIO_EXT[ext]) return AUDIO_EXT[ext];
  if (reported && reported.startsWith('audio/')) {
    if (reported === 'audio/x-m4a' || reported === 'audio/m4a') return 'audio/mp4';
    if (reported === 'audio/x-wav' || reported === 'audio/wave') return 'audio/wav';
    if (reported === 'audio/mp3') return 'audio/mpeg';
    return reported;
  }
  return null;
}

export function audioExtension(mime: string): string {
  return { 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/webm': 'webm' }[mime] ?? 'm4a';
}

export async function pickAudioFile(maxBytes: number = LIMITS.trackMaxBytes): Promise<LocalFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const mime = audioMime(a.name, a.mimeType);
  if (!mime) throw new AppError('unsupported_file');
  const size = a.size ?? a.file?.size ?? null;
  if (size != null && size > maxBytes) throw new AppError('file_too_large', undefined, String(Math.round(maxBytes / 1024 / 1024)));
  return { uri: a.uri, name: a.name, mimeType: mime, sizeBytes: size, blob: a.file ?? undefined };
}

export async function pickImage(aspect: [number, number]): Promise<LocalFile | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const name = a.fileName ?? `image.${a.mimeType === 'image/png' ? 'png' : 'jpg'}`;
  const mime = a.mimeType ?? IMAGE_EXT[extensionOf(name)] ?? 'image/jpeg';
  const size = a.fileSize ?? a.file?.size ?? null;
  if (size != null && size > LIMITS.imageMaxBytes) {
    throw new AppError('file_too_large', undefined, String(Math.round(LIMITS.imageMaxBytes / 1024 / 1024)));
  }
  return { uri: a.uri, name, mimeType: mime, sizeBytes: size, blob: a.file ?? undefined };
}

/** Bytes of a picked file, for uploads. */
export async function readFileBytes(file: LocalFile): Promise<ArrayBuffer> {
  if (file.blob) return file.blob.arrayBuffer();
  if (Platform.OS === 'web' || /^(blob:|data:|https?:)/.test(file.uri)) {
    const res = await fetch(file.uri);
    return res.arrayBuffer();
  }
  const { File } = await import('expo-file-system');
  return new File(file.uri).arrayBuffer();
}

export interface AudioAnalysis {
  durationMs: number | null;
  /** 64 peaks (0–100), or null when the platform cannot decode audio in JS. */
  waveform: number[] | null;
}

/**
 * Duration and waveform of a picked audio file.
 * Web decodes with the Web Audio API. Native apps get the duration from the
 * player; the waveform stays null until server-side analysis exists
 * (documented in docs/04-setup.md) — the UI then shows a plain progress line.
 */
export async function analyseAudio(file: LocalFile, bars = 64): Promise<AudioAnalysis> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      try {
        const buffer = await ctx.decodeAudioData(await readFileBytes(file));
        return { durationMs: Math.round(buffer.duration * 1000), waveform: computePeaks(buffer.getChannelData(0), bars) };
      } catch {
        return { durationMs: null, waveform: null };
      } finally {
        void ctx.close();
      }
    }
    return { durationMs: null, waveform: null };
  }
  return { durationMs: await nativeDuration(file.uri), waveform: null };
}

async function nativeDuration(uri: string): Promise<number | null> {
  const { createAudioPlayer } = await import('expo-audio');
  const player = createAudioPlayer({ uri });
  try {
    for (let i = 0; i < 40; i++) {
      if (player.isLoaded && player.duration > 0) return Math.round(player.duration * 1000);
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  } finally {
    player.remove();
  }
}

export function computePeaks(samples: Float32Array | number[], bars: number): number[] {
  const n = samples.length;
  const size = Math.max(1, Math.floor(n / bars));
  const rms: number[] = [];
  for (let b = 0; b < bars; b++) {
    let sum = 0;
    const start = b * size;
    const end = Math.min(n, start + size);
    for (let i = start; i < end; i += 4) sum += samples[i] * samples[i];
    rms.push(Math.sqrt(sum / Math.max(1, (end - start) / 4)));
  }
  const max = Math.max(...rms, 1e-9);
  return rms.map((v) => Math.max(6, Math.round((v / max) * 100)));
}
