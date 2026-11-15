import { create } from 'zustand';
import { AppError } from '../domain/types';
import { t } from '../i18n';
import { formatMegabytes } from '../lib/format';

export interface Toast {
  id: number;
  message: string;
  tone: 'neutral' | 'error';
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, tone = 'neutral') => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone }] });
    setTimeout(() => get().dismiss(id), tone === 'error' ? 4200 : 2600);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

export const toast = (message: string) => useToast.getState().show(message);

/** Turns any thrown value into translated, actionable copy. */
export function errorMessage(e: unknown): string {
  if (e instanceof AppError) {
    const vars: Record<string, string> = { hint: e.hint ?? '', provider: e.hint ?? '', max: e.hint ?? formatMegabytes(15 * 1024 * 1024) };
    const translated = t(`errors.${e.code}`, vars);
    return translated === `errors.${e.code}` ? t('errors.generic') : translated;
  }
  if (e instanceof Error && /network|fetch/i.test(e.message)) return t('errors.network');
  return t('errors.generic');
}

export const toastError = (e: unknown) => useToast.getState().show(errorMessage(e), 'error');
