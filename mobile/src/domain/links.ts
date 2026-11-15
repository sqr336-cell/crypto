import type { LinkPlatform } from './taxonomy';

const PLATFORM_HOSTS: [LinkPlatform, RegExp][] = [
  ['soundcloud', /(^|\.)soundcloud\.com$|(^|\.)on\.soundcloud\.com$/],
  ['spotify', /(^|\.)spotify\.com$|(^|\.)spotify\.link$/],
  ['youtube', /(^|\.)youtube\.com$|(^|\.)youtu\.be$/],
  ['instagram', /(^|\.)instagram\.com$/],
  ['beatstars', /(^|\.)beatstars\.com$/],
  ['tiktok', /(^|\.)tiktok\.com$/],
  ['apple_music', /(^|\.)music\.apple\.com$/],
  ['bandcamp', /(^|\.)bandcamp\.com$/],
];

/** Normalises user input into an https URL, or null when it is not a URL. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes('.')) return null;
    url.protocol = 'https:';
    const out = url.toString();
    return out.length <= 308 ? out : null;
  } catch {
    return null;
  }
}

export function detectPlatform(url: string): LinkPlatform | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (const [platform, re] of PLATFORM_HOSTS) if (re.test(host)) return platform;
    return 'website';
  } catch {
    return null;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const URL_ONLY = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i;

/** A chat message made only of a URL is sent as a "link" message. */
export function isLinkOnly(text: string): boolean {
  return URL_ONLY.test(text.trim());
}

/** Splits text into plain and URL segments for rendering tappable links. */
export function splitLinks(text: string): { text: string; url?: string }[] {
  const re = /\bhttps?:\/\/[^\s<>"']+/gi;
  const out: { text: string; url?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i) });
    out.push({ text: m[0], url: m[0] });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
