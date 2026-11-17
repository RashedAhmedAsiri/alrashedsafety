// Helpers shared by the cut-street scenarios (open_sewer, heavy_rain, flood_safety, parked_cars).
import type { CutsceneCtx } from '../api';
import type { Vec3 } from '../../core/types';

/** World point (x, z) on the surface of the current outdoor location, `dy` above the ground. */
export const wp = (c: CutsceneCtx, x: number, z: number, dy = 0): Vec3 => c.at(x - c.loc.origin[0], z - c.loc.origin[2], dy);

/** Facing angle (rotY, 0 = +Z) from (x0, z0) toward (x1, z1). */
export const yaw = (x0: number, z0: number, x1: number, z1: number) => Math.atan2(x1 - x0, z1 - z0);

/** Fire and forget: the ctx marks its promises handled, so a dropped promise never reports. */
export const go = (p: Promise<unknown>) => {
  void p;
};
