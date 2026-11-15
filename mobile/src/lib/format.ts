import { translate, type Locale } from '../i18n';

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–:––';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Compact relative time for lists: "now", "5 min", "3 h", "2 d", then a date. */
export function formatRelative(iso: string, locale: Locale, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return translate(locale, 'time.now');
  if (min < 60) return translate(locale, 'time.minutes', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return translate(locale, 'time.hours', { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return translate(locale, 'time.days', { n: d });
  return formatDate(iso, locale);
}

export function formatDate(iso: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatTime(iso: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

/** "Today", "Yesterday" or a date, used to separate days in a conversation. */
export function formatDayLabel(iso: string, locale: Locale, now = new Date()): string {
  const d = new Date(iso);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return translate(locale, 'messages.today');
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return translate(locale, 'messages.yesterday');
  return formatDate(iso, locale);
}

export function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(0);
}
