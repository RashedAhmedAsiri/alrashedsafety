/**
 * set-first: the four first-floor rooms (computer lab, biology lab, art room, library).
 * Authored in local coordinates (src/world/inside/first/*) and documented in docs/sets/first.md.
 */
import type { ComponentType } from 'react';
import type { InsideLocationId } from '../../core/types';
import { ArtRoom } from './first/ArtRoom';
import { BiologyLab } from './first/BiologyLab';
import { Library } from './first/Library';
import { ComputerLab } from './first/ComputerLab';

export const rooms: Partial<Record<InsideLocationId, ComponentType>> = {
  computer_lab: ComputerLab,
  biology_lab: BiologyLab,
  art_room: ArtRoom,
  library: Library,
};
