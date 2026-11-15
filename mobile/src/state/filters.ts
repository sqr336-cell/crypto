import { create } from 'zustand';
import { EMPTY_FILTERS, type DiscoverFilters } from '../domain/types';

export const useFilters = create<{ filters: DiscoverFilters; set: (f: DiscoverFilters) => void; clear: () => void }>((set) => ({
  filters: EMPTY_FILTERS,
  set: (filters) => set({ filters }),
  clear: () => set({ filters: EMPTY_FILTERS }),
}));

export function activeFilterCount(f: DiscoverFilters): number {
  return f.roles.length + f.genres.length + f.availability.length + (f.remoteOnly ? 1 : 0);
}
