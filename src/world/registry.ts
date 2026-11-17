import type { ComponentType } from 'react';
import type { InsideLocationId } from '../core/types';

/**
 * Location sets are discovered by file name so that workers never edit a shared registry:
 *   src/world/inside/*.set.tsx   export const rooms: Partial<Record<InsideLocationId, ComponentType>>
 *   src/world/grounds/*.set.tsx  export const outdoorParts: ComponentType[]
 *   src/world/outside/*.set.tsx  export const outdoorParts: ComponentType[]
 * Inside rooms render only while active. All outdoor parts render together whenever the
 * current location is outdoor (grounds or outside).
 */
type RoomModule = { rooms?: Partial<Record<InsideLocationId, ComponentType>> };
type OutdoorModule = { outdoorParts?: ComponentType[] };

const roomMods = import.meta.glob<RoomModule>('./inside/*.set.tsx', { eager: true });
const outdoorMods = import.meta.glob<OutdoorModule>(['./grounds/*.set.tsx', './outside/*.set.tsx'], { eager: true });

export const ROOM_SETS: Partial<Record<InsideLocationId, ComponentType>> = Object.assign(
  {},
  ...Object.values(roomMods).map((m) => m.rooms ?? {}),
);

export const OUTDOOR_PARTS: ComponentType[] = Object.values(outdoorMods).flatMap((m) => m.outdoorParts ?? []);
