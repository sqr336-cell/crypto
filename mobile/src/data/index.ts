import type { Backend } from './backend';
import { isSupabaseConfigured } from './config';
import { DemoBackend } from './demo/backend';

let instance: Backend | null = null;

/** The app's backend: Supabase when configured, otherwise the on-device demo. */
export function getBackend(): Backend {
  if (!instance) {
    if (isSupabaseConfigured) {
      // Loaded lazily so the demo build never initialises a Supabase client.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SupabaseBackend } = require('./supabase/backend') as typeof import('./supabase/backend');
      instance = new SupabaseBackend();
    } else {
      instance = new DemoBackend();
    }
  }
  return instance;
}

export const backend = new Proxy({} as Backend, {
  get(_target, prop) {
    const b = getBackend() as unknown as Record<string | symbol, unknown>;
    const value = b[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(b) : value;
  },
});
