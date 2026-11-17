import type { CutsceneCtx } from '../api';
import type { Vec3 } from '../../core/types';

/**
 * Shared helpers of the four street-crossing scenarios (cut-crossing).
 * All coordinates passed to `at` are WORLD metres (x east, z south); the helper converts to
 * ctx.at() offsets so the points land on the surface (sidewalk 0.15, crossing table 0.15, road 0).
 * Street layout: main street centre z = 0; westbound lane (cars come from the EAST, +X) z -1.75;
 * eastbound lane z +1.75; school (north) sidewalk z -7.5..-3.5; far (south) sidewalk z 3.5..7.5.
 */
export const at = (c: CutsceneCtx) => (x: number, z: number, dy = 0): Vec3 => c.at(x - c.loc.origin[0], z - c.loc.origin[2], dy);

export const FACE_SOUTH = 0;
export const FACE_NORTH = Math.PI;
export const FACE_EAST = Math.PI / 2;
export const FACE_WEST = -Math.PI / 2;

/** Run several async steps together (all must finish). */
export const together = (...ps: Promise<unknown>[]) => Promise.all(ps).then(() => undefined);

export const WHITE_CAR = '#F4F4F0';
