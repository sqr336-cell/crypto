import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { en, type Dictionary } from './en';
import { fr } from './fr';
import { storage } from '../lib/storage';

export type Locale = 'en' | 'fr';
export const LOCALES: Locale[] = ['fr', 'en'];
export const LOCALE_NAMES: Record<Locale, string> = { fr: 'Français', en: 'English' };

const dictionaries: Record<Locale, Dictionary> = { en, fr };

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Leaves<Dictionary>;
export type TVars = Record<string, string | number>;

function deviceLocale(): Locale {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

const STORAGE_KEY = 'beatlink.locale';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  hydrate: () => Promise<void>;
}

export const useLocale = create<LocaleState>((set) => ({
  locale: deviceLocale(),
  setLocale: (locale) => {
    set({ locale });
    void storage.set(STORAGE_KEY, locale);
  },
  hydrate: async () => {
    const saved = await storage.get(STORAGE_KEY);
    if (saved === 'en' || saved === 'fr') set({ locale: saved });
  },
}));

function lookup(dict: Dictionary, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in cur) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function translate(locale: Locale, key: TKey | string, vars?: TVars): string {
  const raw = lookup(dictionaries[locale], key) ?? lookup(en, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/** Translate outside React (toasts from async code). */
export function t(key: TKey | string, vars?: TVars): string {
  return translate(useLocale.getState().locale, key, vars);
}

export function useT() {
  const locale = useLocale((s) => s.locale);
  const tt = (key: TKey | string, vars?: TVars) => translate(locale, key, vars);
  return Object.assign(tt, { locale });
}

/** Joins labels the natural way: "A, B and C" / "A, B et C". */
export function joinList(items: string[], locale: Locale): string {
  if (items.length <= 1) return items.join('');
  const and = locale === 'fr' ? ' et ' : ' and ';
  return `${items.slice(0, -1).join(', ')}${and}${items[items.length - 1]}`;
}
