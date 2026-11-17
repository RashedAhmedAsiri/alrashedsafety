// OWNER: ui worker. UI-only state that no other module needs (the shared panel flags live in useApp.ui).
import { create } from 'zustand';

export type MapSheet = 'outside' | 'ground' | 'first';

interface UiLocal {
  mapOpen: boolean;
  /** null = follow the current location's floor when the map opens. */
  mapSheet: MapSheet | null;
  /** Time (performance.now) of the last call start, for the ring animation. */
  ringAt: number;
  set: (p: Partial<Omit<UiLocal, 'set'>>) => void;
}

export const useUiLocal = create<UiLocal>((set) => ({
  mapOpen: false,
  mapSheet: null,
  ringAt: 0,
  set: (p) => set(p),
}));
