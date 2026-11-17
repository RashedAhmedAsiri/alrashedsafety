/**
 * Walkable ground height of the OUTDOOR world (metres), used by locAt() for outdoor locations so
 * that every outdoor point a cutscene names lands on the surface (sidewalks are raised).
 * Set builders must model their surfaces to match these heights exactly.
 *
 *   road surfaces (main street, signal road, side road, lay-by lane, parking) ... 0
 *   sidewalks (north z -7.5..-3.5, south z 3.5..7.5; behind the lay-by z -10.5..-7.5) ... 0.15
 *   raised zebra crossing at the gate: flat top x -2.5..2.5 at 0.15, ramps to 0 by |x| = 3.5
 *   flood dip on the side road (x -17.5..-10.5): smooth dip to -0.35 at z = 20 (z 15..25)
 *   school compound inside the fence, houses' plots, park, open land ... 0
 * Sidewalks are interrupted (road level) where a road crosses them: the signal road
 * (x -75.5..-68.5), the side road on the south side (x -17.5..-10.5), the parking driveway on the
 * north side (x 60..66) and the lay-by (x -50..-16, north sidewalk becomes the lay-by lane).
 */
export const SIDEWALK_H = 0.15;
export const STREET_HALF = 3.5;
export const SIDEWALK_OUTER = 7.5;
export const SIGNAL_ROAD_X = -72;
export const SIDE_ROAD_X = -14;
export const ROAD_HALF_W = 3.5;
export const LAYBY: { x0: number; x1: number } = { x0: -50, x1: -16 };
export const DRIVEWAY: { x0: number; x1: number } = { x0: 60, x1: 66 };
export const FLOOD_DIP = { z: 20, half: 5, depth: 0.35 };

const within = (v: number, a: number, b: number) => v >= a && v <= b;

export function groundHeight(x: number, z: number): number {
  const onSignalRoad = Math.abs(x - SIGNAL_ROAD_X) <= ROAD_HALF_W;
  const onSideRoad = Math.abs(x - SIDE_ROAD_X) <= ROAD_HALF_W && z >= STREET_HALF && z <= 44;
  // Main street and its crossing hump.
  if (Math.abs(z) < STREET_HALF && within(x, -130, 130)) {
    const ax = Math.abs(x);
    if (ax <= 2.5) return SIDEWALK_H;
    if (ax < 3.5) return SIDEWALK_H * (1 - (ax - 2.5));
    return 0;
  }
  if (onSignalRoad) return 0;
  if (onSideRoad) {
    const d = Math.abs(z - FLOOD_DIP.z);
    return d < FLOOD_DIP.half ? -FLOOD_DIP.depth * 0.5 * (1 + Math.cos((Math.PI * d) / FLOOD_DIP.half)) : 0;
  }
  // North side.
  if (z <= -STREET_HALF && z >= -SIDEWALK_OUTER) {
    if (within(x, LAYBY.x0, LAYBY.x1)) return 0; // lay-by lane
    if (within(x, DRIVEWAY.x0, DRIVEWAY.x1)) return 0;
    return within(x, -130, 130) ? SIDEWALK_H : 0;
  }
  if (z < -SIDEWALK_OUTER && z >= -10.5 && within(x, LAYBY.x0, LAYBY.x1)) return SIDEWALK_H; // sidewalk behind the lay-by
  // South side.
  if (z >= STREET_HALF && z <= SIDEWALK_OUTER) return within(x, -130, 130) ? SIDEWALK_H : 0;
  return 0;
}
