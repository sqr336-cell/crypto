import { create } from 'zustand';
import type { Session } from '../domain/types';
import { backend } from '../data';
import { queryClient } from '../data/queries';
import { usePlayer } from './player';

interface SessionState {
  status: 'loading' | 'ready';
  session: Session | null;
  init: () => Promise<() => void>;
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  session: null,
  init: async () => {
    const off = backend.onSessionChange((session) => {
      const prev = get().session;
      if (prev?.userId !== session?.userId) {
        // Never show one account's cached data to another.
        queryClient.clear();
        usePlayer.getState().stop();
      }
      set({ session, status: 'ready' });
    });
    const session = await backend.getSession();
    set({ session, status: 'ready' });
    return off;
  },
}));
