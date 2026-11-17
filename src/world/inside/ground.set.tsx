/**
 * Ground-floor rooms of Alrashed school owned by set-ground: clinic, canteen, prayer room,
 * sports hall and the principal's office. Each room is authored in local coordinates (floor y = 0,
 * interior centred) and rendered inside <group position={origin}> by the host.
 * Landmarks: src/world/inside/ground/landmarks.ts and docs/sets/ground.md.
 */
import type { ComponentType } from 'react';
import type { InsideLocationId } from '../../core/types';
import { Clinic } from './ground/clinic';
import { Canteen } from './ground/canteen';
import { PrayerRoom } from './ground/prayer';
import { SportsHall } from './ground/sports';
import { Principal } from './ground/principal';

export const rooms: Partial<Record<InsideLocationId, ComponentType>> = {
  clinic: Clinic,
  canteen: Canteen,
  prayer_room: PrayerRoom,
  sports_hall: SportsHall,
  principal: Principal,
};
