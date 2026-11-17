/**
 * Landmarks of the first-floor rooms owned by set-first, in LOCAL room coordinates (metres, relative
 * to the location origin; y = height above the room floor, which is world y = 4).
 * Cutscenes for a scenario in that room use ctx.at(x, z, y); from anywhere else use firstWorld().
 * Facing angles (rotY) follow the stage convention: 0 faces +Z (south), Math.PI faces -Z (north),
 * Math.PI / 2 faces +X (east), -Math.PI / 2 faces -X (west).
 * See docs/sets/first.md for the full description.
 */
import { LOCATIONS } from '../../../core/locations';
import type { Vec3 } from '../../../core/types';

export type FirstRoom = 'computer_lab' | 'biology_lab' | 'art_room' | 'library';

/** Local landmark -> world point. */
export function firstWorld(room: FirstRoom, p: Vec3): Vec3 {
  const o = LOCATIONS[room].origin;
  return [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
}

export const ROOM_H = 3.4;

/* ================================================================== computer lab (14 x 10) */

/** Computers along the west wall (students face west), centres of the keyboard along z. */
export const CL_WALL_Z = [-3.15, -2.05, -0.95, 0.15, 1.25];
/** Computers on the central island, per side (west side faces west, east side faces east). */
export const CL_ISLAND_Z = [-3.15, -2.05, -0.95];

export interface Workstation {
  id: string;
  /** Centre of the keyboard on the desk (y = desk top). */
  keyboard: Vec3;
  /** Where the student's chair stands (seat centre on the floor). */
  seat: Vec3;
  /** rotY of a student sitting at it (facing the monitor). */
  rotY: number;
  /** Monitor screen centre. */
  monitor: Vec3;
}

const DESK_TOP = 0.66;
function ws(id: string, deskEdgeX: number, z: number, dir: 1 | -1): Workstation {
  // dir = -1: the monitor is to the west (student faces west). dir = 1: monitor to the east.
  return {
    id,
    keyboard: [deskEdgeX + dir * 0.2, DESK_TOP, z],
    seat: [deskEdgeX - dir * 0.42, 0, z],
    rotY: dir < 0 ? -Math.PI / 2 : Math.PI / 2,
    monitor: [deskEdgeX + dir * 0.5, 0.96, z],
  };
}

/** All 16 computers: W1..W5 (west wall, north to south), E1..E5 (east wall), IW1..IW3 / IE1..IE3 (island). */
export const CL_STATIONS: Workstation[] = [
  ...CL_WALL_Z.map((z, i) => ws(`W${i + 1}`, -6.3, z, -1)),
  ...CL_WALL_Z.map((z, i) => ws(`E${i + 1}`, 6.3, z, 1)),
  ...CL_ISLAND_Z.map((z, i) => ws(`IW${i + 1}`, -0.75, z, 1)).map((s) => ({ ...s, ...flipIsland(s, -1) })),
  ...CL_ISLAND_Z.map((z, i) => ws(`IE${i + 1}`, 0.75, z, -1)).map((s) => ({ ...s, ...flipIsland(s, 1) })),
];
function flipIsland(s: Workstation, side: -1 | 1): Partial<Workstation> {
  // island stations: the student sits outside the island facing its centre
  const edge = side * 0.75;
  return {
    keyboard: [edge - side * 0.2, DESK_TOP, s.keyboard[2]],
    seat: [edge + side * 0.45, 0, s.keyboard[2]],
    rotY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
    monitor: [edge - side * 0.5, 0.96, s.keyboard[2]],
  };
}

export const COMPUTER_LAB = {
  size: [14, 10] as [number, number],
  robotSpot: [0, 0, 1.5] as Vec3,
  /** Door to the corridor (north wall, east end): centre of the doorway on the floor. */
  door: [5.7, 0, -5] as Vec3,
  doorInside: [5.7, 0, -4.3] as Vec3,
  doorOutside: [5.7, 0, -6.2] as Vec3,
  /** Projector screen on the north wall (centre, size). */
  screen: { centre: [0, 1.95, -4.94] as Vec3, w: 2.6, h: 1.45 },
  /** Ceiling projector (lens). */
  projector: [0, 3.02, -1.0] as Vec3,
  /** Where the teacher stands to present (beside the screen, facing the class). */
  presenter: [-1.9, 0, -4.2] as Vec3,
  teacherDesk: [-3.4, 0.74, -4.05] as Vec3,
  /** Hero workstation of electricity_lab: W5, the southernmost west-wall computer (S1 sits here). */
  heroStation: 'W5',
  /** S1's chair seat (sitDesk facing west, rotY -PI/2) and his keyboard. */
  s1Seat: [-5.88, 0, 1.25] as Vec3,
  s1Keyboard: [-6.5, 0.66, 1.25] as Vec3,
  /** Where an open juice box stands next to S1's keyboard (flag juice: 'desk'). */
  juiceOnDesk: [-6.45, 0.66, 1.68] as Vec3,
  /** The drinks shelf on the west wall, just south of the desks (flag juice: 'shelf', the default). */
  drinksShelf: [-6.86, 1.05, 3.2] as Vec3,
  juiceOnShelf: [-6.84, 1.07, 3.05] as Vec3,
  /** The uncovered wall socket at child height (west wall face). */
  socket: [-6.99, 0.38, 2.4] as Vec3,
  /** S2 kneels here facing the socket (rotY -PI/2). */
  s2Kneel: [-6.45, 0, 2.4] as Vec3,
  /** Alrashed stands here to snap the cover on / point at the socket (facing west). */
  robotAtSocket: [-5.6, 0, 2.6] as Vec3,
  /** Box of tissues on the desk near S1 (he dries his hands). */
  tissues: [-6.55, 0.66, 1.85] as Vec3,
  /** Cable trays: wall trunking at this height along the west, north and east walls. */
  cableTrayY: 0.98,
  /** A clear spot in the front aisle for a medium shot of S1 + S2 + Alrashed. */
  aisleWest: [-4.2, 0, 1.6] as Vec3,
  printer: [6.35, 0.78, 3.55] as Vec3,
  noFoodSigns: [
    [4.35, 1.65, -4.98],
    [-6.98, 1.72, 3.2],
  ] as Vec3[],
  acUnit: [-4.6, 2.95, -4.87] as Vec3,
  clock: [3.0, 2.65, -4.96] as Vec3,
  windows: [
    { centre: [-3.4, 1.8, 5] as Vec3, w: 3.0, h: 1.5 },
    { centre: [2.6, 1.8, 5] as Vec3, w: 3.0, h: 1.5 },
  ],
};

/* ================================================================== biology lab (14 x 10) */

export const BIO_BENCH = { w: 3.2, d: 1.2, h: 0.86 };
/** Bench centres (floor). Front row z = -0.3, back row z = -2.9; columns either side of the centre aisle. */
export const BIO_BENCHES: Vec3[] = [
  [-3.1, 0, -0.3],
  [3.1, 0, -0.3],
  [-3.1, 0, -2.9],
  [3.1, 0, -2.9],
];
/** Each bench's sink sits at the aisle end of the bench (x = centre -/+ 1.15). */
export const bioSink = (i: number): Vec3 => {
  const b = BIO_BENCHES[i];
  return [b[0] - Math.sign(b[0]) * 1.15, BIO_BENCH.h, b[2]];
};

export const BIOLOGY_LAB = {
  size: [14, 10] as [number, number],
  robotSpot: [0, 0, 1.5] as Vec3,
  door: [5.7, 0, -5] as Vec3,
  doorInside: [5.7, 0, -4.3] as Vec3,
  doorOutside: [5.7, 0, -6.2] as Vec3,
  /** Hero bench of the biology_lab scenario: the front-east bench (index 1). */
  heroBench: [3.1, 0, -0.3] as Vec3,
  /** Boys stand on the south side of the hero bench facing north (rotY = Math.PI). */
  s1Stand: [2.7, 0, 0.62] as Vec3,
  s2Stand: [3.7, 0, 0.62] as Vec3,
  /** Alrashed at the bench end, beside the sink (faces the boys / east). */
  robotAtBench: [1.25, 0, 0.75] as Vec3,
  /** Hero bench sink and tap (wash hands here, facing west from x ~ 2.45 or from the aisle). */
  heroSink: [1.95, 0.86, -0.3] as Vec3,
  washSpot: [1.95, 0, 0.55] as Vec3,
  /** Microscope on the hero bench (a leaf slide goes here). */
  heroMicroscope: [3.35, 0.86, -0.55] as Vec3,
  /** Test-tube rack and the beaker of green liquid on the hero bench. */
  heroRack: [4.05, 0.86, -0.45] as Vec3,
  greenBeaker: [2.85, 0.86, -0.05] as Vec3,
  /** Floor spot beside the hero bench where a dropped test tube breaks. */
  breakSpot: [3.75, 0, 1.25] as Vec3,
  /** Goggles + gloves hook board (north wall), and the hook positions of the six goggles. */
  hookBoard: [-3.3, 1.45, -4.96] as Vec3,
  goggleHooks: [-4.05, -3.75, -3.45, -3.15, -2.85, -2.55].map((x) => [x, 1.6, -4.88] as Vec3),
  gloveHooks: [-3.9, -3.3, -2.7].map((x) => [x, 1.18, -4.88] as Vec3),
  /** Glass cabinet with colored liquids in labeled bottles (north wall, behind the robot). */
  cabinet: [0, 0, -4.73] as Vec3,
  /** Broken-glass bin (yellow) with brush and dustpan hanging above it. */
  glassBin: [1.85, 0, -4.6] as Vec3,
  brushAndPan: [2.35, 0.9, -4.95] as Vec3,
  /** Eyewash station on the north wall (bowl centre) + where a student stands to use it. */
  eyewash: [3.55, 1.0, -4.8] as Vec3,
  eyewashStand: [3.55, 0, -4.15] as Vec3,
  skeleton: [-6.2, 0, -4.2] as Vec3,
  fishTank: [-6.55, 0.8, 1.2] as Vec3,
  /** Plant pots under the grow light (east wall shelf). */
  plants: [6.6, 0.8, 1.6] as Vec3,
  acUnit: [-6.87, 2.95, -1.6] as Vec3,
  clock: [-1.95, 2.7, -4.96] as Vec3,
  windows: [
    { centre: [-3.4, 1.8, 5] as Vec3, w: 3.0, h: 1.5 },
    { centre: [3.0, 1.8, 5] as Vec3, w: 3.0, h: 1.5 },
  ],
};

/* ================================================================== art room (12 x 10) */

export const ART_TABLE_H = 0.64;
export const ART_ROOM = {
  size: [12, 10] as [number, number],
  robotSpot: [0, 0, 1.2] as Vec3,
  door: [4.8, 0, -5] as Vec3,
  doorInside: [4.8, 0, -4.3] as Vec3,
  doorOutside: [4.8, 0, -6.2] as Vec3,
  /** The big shared table of sharp_tools (centre on the floor, 2.6 x 1.3, top at 0.64). */
  heroTable: { centre: [0, 0, -0.5] as Vec3, w: 2.6, d: 1.3 },
  /** Side tables (long along z). */
  sideTables: [
    { centre: [-4.0, 0, 0.3] as Vec3, w: 1.3, d: 2.4 },
    { centre: [4.0, 0, 0.3] as Vec3, w: 1.3, d: 2.4 },
  ],
  /** Alrashed stands at the south side of the hero table (Speaking setup). */
  robotAtTable: [0, 0, 0.55] as Vec3,
  /** Seats (stools) at the hero table: S1..S3 on the north side facing south (rotY 0), S4/S5 at the ends. */
  seats: {
    s1: { seat: [-0.8, 0, -1.42] as Vec3, rotY: 0 },
    s2: { seat: [0.0, 0, -1.42] as Vec3, rotY: 0 },
    s3: { seat: [0.8, 0, -1.42] as Vec3, rotY: 0 },
    s4: { seat: [-1.72, 0, -0.5] as Vec3, rotY: Math.PI / 2 },
    s5: { seat: [1.72, 0, -0.5] as Vec3, rotY: -Math.PI / 2 },
  },
  /** Paper on the table in front of S1 (cut a star here). */
  s1Paper: [-0.8, 0.64, -0.9] as Vec3,
  /** The tool box (round-tip scissors tray) the boys drop tools into. */
  toolBox: [0.35, 0.64, -0.45] as Vec3,
  /** Where S3 stands up beside his stool. */
  s3Stand: [0.8, 0, -1.85] as Vec3,
  /** Paper stars on a string above the hero table (flag stars: true). */
  starString: { from: [-1.4, 1.95, -0.5] as Vec3, to: [1.4, 1.95, -0.5] as Vec3 },
  sink: [5.62, 0.86, -2.6] as Vec3,
  washSpot: [5.05, 0, -2.6] as Vec3,
  dryingRack: [-5.2, 0, -4.35] as Vec3,
  easels: [
    [-2.6, 0, -3.9],
    [-0.9, 0, -4.05],
    [2.0, 0, -3.95],
  ] as Vec3[],
  suppliesShelf: [-5.8, 0, -0.6] as Vec3,
  acUnit: [-5.87, 2.95, 2.8] as Vec3,
  clock: [0.55, 2.75, -4.96] as Vec3,
  windows: [
    { centre: [-2.8, 1.8, 5] as Vec3, w: 3.0, h: 1.5 },
    { centre: [2.6, 1.8, 5] as Vec3, w: 3.0, h: 1.5 },
  ],
};

/* ================================================================== library (14 x 12) */

export const LIBRARY = {
  size: [14, 12] as [number, number],
  robotSpot: [0, 0, 2] as Vec3,
  /** Door from the corridor on the SOUTH wall (the library is north of the corridor). */
  door: [4.6, 0, 6] as Vec3,
  doorInside: [4.6, 0, 5.3] as Vec3,
  doorOutside: [4.6, 0, 7.2] as Vec3,
  /** Reading carpet (centre, size) and the bean bags around it. */
  carpet: { centre: [0, 0, -1.2] as Vec3, w: 4.4, d: 3.4 },
  beanBags: [
    [-1.55, 0, -2.35],
    [0.0, 0, -2.6],
    [1.6, 0, -2.3],
    [-1.85, 0, -0.35],
    [1.9, 0, -0.4],
  ] as Vec3[],
  /** Librarian desk (centre of top) and where the librarian stands behind it (faces south). */
  librarianDesk: [4.9, 0.76, 2.6] as Vec3,
  librarianStand: [4.9, 0, 1.75] as Vec3,
  globe: [-2.3, 0, 1.4] as Vec3,
  readingTable: [-4.4, 0, 3.6] as Vec3,
  /** Freestanding low shelves (double-sided), centres. */
  islandShelves: [
    [-4.1, 0, -2.0],
    [4.1, 0, -2.0],
  ] as Vec3[],
  acUnit: [-6.87, 2.95, 1.0] as Vec3,
  clock: [0, 2.85, -5.96] as Vec3,
  windows: [
    { centre: [-3.5, 2.0, -6] as Vec3, w: 2.8, h: 1.4 },
    { centre: [3.5, 2.0, -6] as Vec3, w: 2.8, h: 1.4 },
  ],
};
