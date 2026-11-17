/**
 * set-core: the classroom (Alrashed's home), the entrance lobby, the two corridors and the main stairs.
 * Rooms are authored in local coordinates (see src/world/inside/core/*) and documented in docs/sets/core.md.
 */
import type { ComponentType } from 'react';
import type { InsideLocationId } from '../../core/types';
import { Classroom } from './core/Classroom';
import { Lobby } from './core/Lobby';
import { Stairs } from './core/Stairs';
import { CorridorFirst, CorridorGround } from './core/Corridor';

export const rooms: Partial<Record<InsideLocationId, ComponentType>> = {
  classroom: Classroom,
  stairs: Stairs,
  lobby: Lobby,
  corridor_ground: CorridorGround,
  corridor_first: CorridorFirst,
};
