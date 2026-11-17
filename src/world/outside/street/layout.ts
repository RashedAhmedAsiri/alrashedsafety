/**
 * Street set layout: every coordinate the street geometry is built from, exported so cutscene
 * writers (and docs/sets/street.md) can name the same places. WORLD coordinates, metres.
 * Surfaces follow src/core/ground.ts exactly (roads 0, sidewalks 0.15, gate crossing hump).
 */
import type { Vec3 } from '../../../core/types';

export const X_MIN = -130;
export const X_MAX = 130;
export const HALF = 3.5; // street half width (curb faces at z = ±3.5)
export const SW_OUT = 7.5; // sidewalk outer edge
export const SW_H = 0.15; // sidewalk height
export const CURB_W = 0.25; // curb stones are inside the sidewalk footprint
export const EDGE_W = 0.08; // outer edge stones of sidewalks

/** Main gate crossing (raised zebra table): flat top x -2.5..2.5 at 0.15, ramps to |x| = 3.5. */
export const ZEBRA = { x0: -2.5, x1: 2.5, rampTo: 3.5, stripes: [-3, -2, -1, 0, 1, 2, 3], stripeW: 0.5, stripeLen: 4.4 };

/** Signal intersection. */
export const SIGNAL = {
  x: -72,
  road: { x0: -75.5, x1: -68.5 },
  /** Signalised pedestrian crossing across the main street on the east leg. */
  crosswalk: { x0: -66.5, x1: -62.5 },
  /** Stop lines: main street lanes (x) and the north-south road lanes (z). */
  stop: { westbound: -61.5, eastbound: -76.5, southbound: -8.5, northbound: 8.5 },
  /** Combined signal poles (car heads + pedestrian heads + push buttons). */
  poleNorth: [-61.6, -3.95] as [number, number],
  poleSouth: [-61.6, 3.95] as [number, number],
  /** Push-button boxes (centre of the button, world). Face -X (towards the crossing band). */
  buttonNorth: [-61.72, 1.15, -3.95] as Vec3,
  buttonSouth: [-61.72, 1.15, 3.95] as Vec3,
};

export const SPEED_BUMPS = [-10, 18];

export const LAYBY = { x0: -50, x1: -16, zLane0: -7.5, zLane1: -3.5, zBack: -10.5 };
/** Pick-up waiting spots, 1 at the front (west, exit end), 5 at the entry (east). Car stops facing -X. */
export const PICKUP_SPOTS = [1, 2, 3, 4, 5].map((n, i) => {
  const x0 = -47 + i * 6;
  return { n, x0, x1: x0 + 6, cx: x0 + 3, carZ: -6.35, car: [x0 + 3, 0, -6.35] as Vec3, carRotY: Math.PI };
});
export const PICKUP_CANOPY = { x0: -47, x1: -19, zBack: -10.2, zFront: -7.75, h: 2.95 };
export const PICKUP_BENCH_X = [-41, -35, -29, -23];
export const ORGANIZER_SPOT: Vec3 = [-18.3, SW_H, -9.0];

export const BUS_STOP = {
  /** Where the bus stops (centre, westbound lane, facing -X so the door opens onto the north sidewalk). */
  bus: [30, 0, -1.9] as Vec3,
  busRotY: Math.PI,
  box: { x0: 22.5, x1: 37.5, z0: -3.25, z1: -0.35 },
  /** Yellow waiting line on the sidewalk (three child steps back from the curb at z = -3.5). */
  lineZ: -4.95,
  line: { x0: 22.5, x1: 37.5 },
  /** Footprints to stand on behind the line. */
  footprints: [24.8, 26.0, 27.2, 28.4].map((x) => [x, SW_H, -5.45] as Vec3),
  shelter: { x0: 30.0, x1: 35.4, zBack: -7.3, zFront: -5.75, roofY: 2.75 },
  bench: { x0: 30.6, x1: 34.8, z: -6.85, seatY: 0.6 },
  sign: [23.6, -4.05] as [number, number],
};

export const PARKING = {
  lot: { x0: 58, x1: 78, z0: -32, z1: -7.5 },
  driveway: { x0: 60, x1: 66 },
  walkway: { x0: 56.2, x1: 59.4 },
  aisle: { x0: 64.8, x1: 71.6 },
  /** West row: cars nose west (rotY = PI), wheel stops at x 60.3. */
  west: [-15.55, -18.25, -20.95, -23.65, -26.35, -29.05].map((z, i) => ({ id: `W${i + 1}`, z, car: [62.25, 0, z] as Vec3, rotY: Math.PI })),
  /** East row: cars nose east (rotY = 0), wheel stops at x 76.1. */
  east: [-12.85, -15.55, -18.25, -20.95, -23.65, -26.35, -29.05].map((z, i) => ({ id: `E${i + 1}`, z, car: [74.25, 0, z] as Vec3, rotY: 0 })),
  /** Bays filled with parked set-dressing cars. The others are free for cutscene cars. */
  occupied: ['W1', 'W2', 'W4', 'W6', 'E1', 'E3', 'E4', 'E6', 'E7'],
};

export const MOSQUE = {
  plot: { x0: -98, x1: -78, z0: -32, z1: -9.6 },
  gate: { x0: -90, x1: -86 },
  hall: { x0: -95, x1: -83, z0: -29, z1: -16, h: 5 },
  dome: [-89, 5, -22.5] as Vec3,
  minaret: [-80.6, -12.4] as [number, number],
};

export const ELECTRIC_CABINET: Vec3 = [17.2, SW_H, -7.05];

/** Street light poles: [x, side] with side -1 = north sidewalk, +1 = south; 'back' = pick-up sidewalk. */
export const STREET_LIGHTS: { x: number; z: number; arm: number }[] = [
  ...[-122, -97, -80, -57, -6, 6, 21, 40, 72, 98, 124].map((x) => ({ x, z: -4.15, arm: 1 })),
  ...[-48, -18].map((x) => ({ x, z: -7.95, arm: 1 })),
  ...[-110, -86, -60, -40, -6, 6, 28, 50, 74, 100, 126].map((x) => ({ x, z: 4.15, arm: -1 })),
];

/** Palms in square planters. */
export const PALMS: [number, number][] = [
  // south sidewalk (sidewalk_far)
  ...[-124, -112, -100, -88, -60, -48, -38, -7, 7, 19, 39, 61, 85, 109, 127].map((x) => [x, 6.55] as [number, number]),
  // north sidewalk outside the school frontage
  ...[-124, -110, 84, 96, 110, 124].map((x) => [x, -6.55] as [number, number]),
];
/** Benches on the south sidewalk, facing the street. */
export const BENCHES_SOUTH = [-94, -54, 13, 33, 72, 97, 118];

export const SIGNS = {
  schoolZoneNorth: [48, -4.05] as [number, number],
  speedNorth: [53, -4.05] as [number, number],
  schoolZoneSouth: [-46, 4.05] as [number, number],
  speedSouth: [-52, 4.05] as [number, number],
  pedNorth: [-3.3, -4.05] as [number, number],
  pedSouth: [3.3, 4.05] as [number, number],
  parking: [67.2, -4.25] as [number, number],
};

export const BOLLARD_X = [3.1, 4.3, 5.5];

/** Manhole covers in the road surface. The first is just west of the gate crossing, westbound lane. */
export const MANHOLES: [number, number][] = [
  [-7.5, -1.6],
  [9.5, 1.7],
  [44, -1.7],
  [-40, 1.7],
];
