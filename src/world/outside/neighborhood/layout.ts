/**
 * Neighborhood layout: every coordinate the geometry is built from, exported so cutscene writers
 * and docs/sets/neighborhood.md name the same places. WORLD coordinates, metres.
 * Surfaces follow src/core/ground.ts (side road and flood dip heights, everything else 0).
 */
import type { Vec3 } from '../../../core/types';

/** Side road: x -17.5..-10.5, from the main street (z 3.5) south to z 44. Heights from groundHeight. */
export const SIDE_ROAD = { x0: -17.5, x1: -10.5, z0: 3.5, z1: 44 };
export const DIP = { z: 20, half: 5, depth: 0.35, zWater0: 16.4, zWater1: 23.6 };

/** Row of six villas south of the street. plot i spans xs[i]..xs[i+1]; front wall z = WALL_Z, back wall z = PLOT_Z1. */
export const PLOT_XS = [-9.5, 2, 14, 26, 38, 48, 56.5];
export const WALL_Z = 10;
export const PLOT_Z1 = 30;
export const VILLA_Z0 = 15.2;
/** Alrashed's house: plot 3 (index 2), teal gate at x = 20. */
export const HOME = { plot: 3, gate: [20, 0, WALL_Z] as Vec3, door: [20, 0, VILLA_Z0] as Vec3, gateW: 3.2, stand: [20, 0, 8.9] as Vec3 };

/** Gate centres (x) of the six plots and the gate width. */
export const GATES = [-3.2, 8, 20, 32, 43, 54.6];
export const GATE_W = [3, 3.2, 3.2, 3.4, 3, 2.6];

/** Utility poles along the front of the houses (z) with birds sitting on the wires. */
export const POLES = { z: 8.9, xs: [3, 29, 51], top: 7.2 };

/** Cars parked in front yards (CarModel, facing +X, origin at ground). */
export const YARD_CARS: { pos: Vec3; rotY: number; color: string; seed: number }[] = [
  { pos: [-5.6, 0.01, 12.7], rotY: 0, color: '#F4F4F0', seed: 21 },
  { pos: [34.6, 0.01, 12.9], rotY: Math.PI, color: '#2F5E8E', seed: 22 },
  { pos: [50.4, 0.01, 12.7], rotY: 0, color: '#8E2E2E', seed: 23 },
  { pos: [5.0, 0.01, 12.8], rotY: Math.PI, color: '#B8C1CC', seed: 24 },
];

export const CAT = { pos: [11.4, 0.01, 8.55] as Vec3, rotY: 1.1 };

/**
 * Park (x -63..-21.5, z 8..40). Fence line x = PARK.x1, walking-track ring, and inside the ring a
 * low-fenced playground (soft teal rubber) with a swing set, a slide tower, a seesaw, a climbing
 * dome, two spring riders and a shaded row of benches along its south fence; a fountain east of it.
 */
export const PARK = {
  x0: -63,
  x1: -21.5,
  z0: 8,
  z1: 40,
  gateNorth: { x: -28.5, z: 8, w: 4 },
  gateEast: { x: -21.5, z: 12, w: 2.4 },
  /** Walking track: rounded rectangle ring (outer x -58..-23, z 14..36; inner edge x -56.2..-24.8, z 15.8..34.2). */
  track: { cx: -40.5, cz: 25, w: 35, d: 22, r: 5, width: 1.8 },
  /** Fenced playground (fence 0.9 m high on its edges). Openings: north fence x gateN, east fence z gateE. */
  playground: { x0: -55, x1: -33, z0: 18.5, z1: 34, gateN: [-36.7, -34.5] as [number, number], gateE: [24.1, 25.9] as [number, number] },
  /** Swing set: beam along x at z, A-frames at beamX0 / beamX1 (legs spread +-legZ in z), two swings at xs
   *  swinging along Z, rubber seat 0.65 above the floor. The painted keep-out zone is `zone`. */
  swings: { z: 22.6, xs: [-47.3, -45.3], beamY: 2.4, beamX0: -48.9, beamX1: -43.7, legZ: 1.15, seatY: 0.65, zone: { x0: -49.5, x1: -43.1, z0: 20.4, z1: 24.8 } },
  /** Slide tower: deck centre (x, z) 1.4 m square at topY; ladder on the west side (foot at ladderX),
   *  chute runs +X from the deck edge (x + 0.7) down to (chuteX1, 0.42) then a flat run-out to runX. */
  slide: { x: -39.6, z: 27.2, topY: 1.7, ladderX: -40.85, chuteX1: -36.1, runX: -35.3 },
  seesaw: { x: -42.5, z: 29.3 },
  dome: { x: -52.3, z: 31.0, r: 1.3 },
  riders: [
    { x: -37.3, z: 21.2, color: '#5DBB63', rotY: 0.4 },
    { x: -35.3, z: 22.5, color: '#F2B632', rotY: -0.3 },
  ],
  /** Cantilever shade over the bench row inside the south fence: posts at zBack, front edge at zFront. */
  shade: { x0: -50.8, x1: -35.2, zBack: 33.75, zFront: 31.95, yBack: 2.95, yFront: 2.62, posts: [-50.6, -45.75, -40.25, -35.4] },
  fountain: { x: -30, z: 25, r: 1.9 },
  /** Benches (centre, facing; shade = own pergola). The first three sit under the playground shade. */
  benches: [
    { x: -48.5, z: 33.2, face: 'n', shade: false },
    { x: -43, z: 33.2, face: 'n', shade: false },
    { x: -37.5, z: 33.2, face: 'n', shade: false },
    { x: -54.3, z: 26.6, face: 'e', shade: false },
    { x: -30, z: 31.5, face: 'n', shade: true },
    { x: -29.5, z: 18.0, face: 's', shade: true },
  ] as { x: number; z: number; face: 'n' | 's' | 'e' | 'w'; shade: boolean }[],
  booth: { x: -24.6, z: 10.1 },
  /** Palms, trees and lamps all stand off the track ring. */
  palms: [
    [-60, 11], [-55, 9.5], [-49, 10.5], [-43, 9.6], [-36, 10.5], [-61, 22], [-61.5, 31], [-60, 38],
    [-52, 38.2], [-44, 38.6], [-35, 38.4], [-27, 38], [-22.4, 33], [-22.4, 19.5], [-59.8, 15.0], [-23.0, 16.2],
  ] as [number, number][],
  trees: [[-53.4, 20.4], [-26.0, 31.6], [-47, 17.0], [-60.3, 26.5]] as [number, number][],
  lamps: [[-52, 13.2], [-46, 36.8], [-34, 36.8], [-27.5, 22], [-25.0, 14.0], [-59.2, 30], [-59.2, 20], [-39, 13.2]] as [number, number][],
};

/**
 * Roadworks on the south sidewalk (surface y 0.15; sidewalk z 3.75..7.42, park wall behind it).
 * An open sewer trench dug into the paving (the sidewalk tiles and the terrain are cut out around
 * `pit`, see street/static.ts), a fenced works zone around it and a marked pedestrian path behind.
 *   z 3.75 curb | 4.05 cones + tape posts | 4.4..5.4 trench | 5.85 barricade line (feet 5.6..6.1)
 *   z 6.3..7.4 safe pedestrian path (green mat) | 7.42 edge stone, park wall.
 */
export const WORKS = {
  y: 0.15,
  /** Trench cut through tiles and terrain (x0..x1, z0..z1) and its depth below the paving. */
  pit: { x0: -29.6, x1: -26.0, z0: 4.4, z1: 5.4, depth: 1.1 },
  /** Centre of the trench (kept for the cutscene look-at targets). */
  manhole: [-27.8, 0.15, 4.9] as Vec3,
  /** Fenced zone: barricade centre line on the walkway side, cone/tape line on the street side. */
  zone: { x0: -34.0, x1: -23.5, zBarricade: 5.85, zCones: 4.05, barricadeLen: 1.5 },
  /** Manhole cover lying flat west of the trench, spoil heap beyond it. */
  cover: [-30.45, 0.15, 4.9] as Vec3,
  sand: [-32.6, 0.15, 4.85] as Vec3,
  /** Stacked pipes, tools and bucket east of the trench (inside the zone). */
  pipes: [-24.8, 0.15, 4.55] as Vec3,
  /** Portable warning sign on a tripod stand at the west end of the zone (faces west and the road). */
  sign: [-35.4, 0.15, 4.5] as Vec3,
  /** Safe walking path on the sidewalk, behind the barricade line: x -36..-17.8, z 6.3..7.4 (centre 6.85). */
  safe: { x0: -36, x1: -17.8, z0: 6.3, z1: 7.4 },
  safeZ: [6.3, 7.4],
};

/** Flowing water in the dip (flag floodWater true/false forces it; otherwise follows wet/rain weather). */
export const WATER = { x0: -17.6, x1: -10.4, z0: DIP.zWater0, z1: DIP.zWater1, y: -0.14 };
