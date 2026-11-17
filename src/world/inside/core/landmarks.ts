/**
 * Landmarks of the core rooms in LOCAL room coordinates (metres, relative to the location origin;
 * y = height above the room floor). Cutscenes convert with ctx.at(x, z, y) when the scenario's
 * location is that room, or with `coreWorld(room, p)` from anywhere.
 * See docs/sets/core.md for the full description.
 */
import { LOCATIONS } from '../../../core/locations';
import type { Vec3 } from '../../../core/types';

export type CoreRoom = 'classroom' | 'lobby' | 'corridor_ground' | 'corridor_first' | 'stairs';

/** Local landmark -> world point. */
export function coreWorld(room: CoreRoom, p: Vec3): Vec3 {
  const o = LOCATIONS[room].origin;
  return [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
}

/* ------------------------------------------------------------------ classroom (12 x 10, h 3.6) */

/** Desk columns (pair centres) and rows (desk centres); the board is on the north wall (z = -5). */
export const DESK_COLS = [-3.95, -1.35, 1.35, 3.95];
export const DESK_ROWS = [-0.55, 0.95, 2.45];
/** Chair (seat centre) offset behind a desk centre. */
export const CHAIR_DZ = 0.46;

/** 24 student seats: where a boy sits (spawn with clip 'sitDesk', rotY = Math.PI to face the board). */
export const CLASS_SEATS: { id: string; desk: Vec3; seat: Vec3 }[] = DESK_ROWS.flatMap((z, r) =>
  DESK_COLS.flatMap((cx, c) =>
    [-0.3, 0.3].map((dx, k) => ({
      id: `r${r + 1}c${c * 2 + k + 1}`,
      desk: [cx + dx, 0.64, z] as Vec3,
      seat: [cx + dx, 0, z + CHAIR_DZ] as Vec3,
    })),
  ),
);

export const CLASSROOM = {
  /** Robot spot (default), beside Alrashed's own desk. */
  robotSpot: [0.15, 0, -2.75] as Vec3,
  /** Alrashed's desk (centre of the top). */
  robotDesk: [-1.2, 0.8, -3.55] as Vec3,
  /** Where he stands to present at the smartboard (intro "two steps to the smartboard", exam). */
  atSmartboard: [0.45, 0, -4.15] as Vec3,
  smartboard: { centre: [1.75, 1.6, -4.96] as Vec3, w: 2.1, h: 1.22 },
  chalkboard: { centre: [-2.45, 1.55, -4.97] as Vec3, w: 3.3, h: 1.2 },
  /** Where a teacher stands writing on the chalkboard (facing north, rotY = Math.PI). */
  teacherAtBoard: [-2.3, 0, -4.35] as Vec3,
  teacherDesk: [-3.75, 0.74, -3.4] as Vec3,
  teacherChair: [-3.75, 0, -4.15] as Vec3,
  /** Door to the corridor (north wall, east end). Centre of the doorway on the floor. */
  door: [4.85, 0, -5] as Vec3,
  doorWidth: 1.0,
  /** Just inside the door / just outside it (2 m beyond is the corridor). */
  doorInside: [4.85, 0, -4.3] as Vec3,
  doorOutside: [4.85, 0, -6.2] as Vec3,
  /** Where a line of boys forms behind Alrashed for evacuation (front to back, facing north). */
  lineUp: [
    [4.6, 0, -3.6],
    [4.6, 0, -2.9],
    [4.6, 0, -2.2],
    [4.6, 0, -1.5],
    [5.25, 0, -0.8],
    [5.25, 0, -0.1],
    [5.25, 0, 0.6],
    [5.25, 0, 1.3],
  ] as Vec3[],
  fireAlarmButton: [3.75, 1.4, -4.97] as Vec3,
  alarmLight: [3.75, 2.5, -4.97] as Vec3,
  exitSign: [4.85, 2.55, -4.95] as Vec3,
  evacMap: [5.97, 1.55, -3.75] as Vec3,
  clock: [-0.05, 2.62, -4.97] as Vec3,
  /** Aisles running north-south (x) between desk columns; walkable from z -2 to z 3.3. */
  aisles: [-5.2, -2.65, 0, 2.65, 5.2],
  windows: [
    { centre: [-1.85, 1.9, 5] as Vec3, w: 3.4, h: 1.7, view: 'yard' },
    { centre: [1.85, 1.9, 5] as Vec3, w: 3.4, h: 1.7, view: 'street' },
  ],
  lockers: { x0: -5.7, x1: 5.7, z: 4.58, top: 0.98 },
  plant: [-5.45, 0, -4.45] as Vec3,
  bookshelf: [-5.78, 0, 1.6] as Vec3,
};

/* ------------------------------------------------------------------ lobby (12 x 12, h 4) */

export const LOBBY = {
  robotSpot: [0, 0, -0.6] as Vec3,
  /** Main glass doors to the yard (south wall), centre on the floor. */
  mainDoors: [0, 0, 6] as Vec3,
  mainDoorsWidth: 2.4,
  exitSign: [0, 3.0, 5.93] as Vec3,
  /** Opening to the corridor (north wall, east part). */
  corridorOpening: [3.9, 0, -6] as Vec3,
  corridorOpeningWidth: 2.6,
  schoolName: [-1.3, 3.05, -5.9] as Vec3,
  trophyCabinet: [-1.3, 0, -5.68] as Vec3,
  honorBoard: [-5.95, 1.75, -1.4] as Vec3,
  noticeBoard: [5.95, 1.6, 0.2] as Vec3,
  benches: [
    [-5.45, 0, -1.4],
    [-5.45, 0, 2.6],
    [5.45, 0, -2.3],
  ] as Vec3[],
  waterCooler: [5.6, 0, 2.9] as Vec3,
  evacMap: [3.2, 1.55, 5.93] as Vec3,
  medallion: [0, 0, 1.2] as Vec3,
};

/* ------------------------------------------------------------------ corridors (60 x 5, h 3.6) */

/**
 * Doors along the corridors: x along the corridor, side 'n' (z = -2.5) or 's' (z = +2.5).
 * `room` = the location that door leads to (when it is a real room).
 */
export interface CorridorDoor {
  x: number;
  side: 'n' | 's';
  width: number;
  num: string;
  name: string;
  room?: string;
  color: string;
  double?: boolean;
}

export const CORRIDOR = {
  halfWidth: 2.5,
  /** Centre line along z = 0; walking east (+x) the right side is z > 0 (south). */
  centreLineZ: 0,
  /** Lanes for "keep right": walking east use z = +1.1, walking west use z = -1.1. */
  laneEastZ: 1.1,
  laneWestZ: -1.1,
  ground: {
    robotSpot: [11.2, 0, 0.35] as Vec3,
    extinguisherCabinet: [13.4, 0, -2.5] as Vec3,
    /** Where Alrashed stands to take the extinguisher out (facing north, rotY = Math.PI). */
    atCabinet: [13.4, 0, -1.8] as Vec3,
    fireAlarmButton: [14.55, 1.4, -2.47] as Vec3,
    alarmLight: [14.55, 2.55, -2.47] as Vec3,
    elevatorDoor: [16.75, 0, -2.5] as Vec3,
    stairsOpening: { x0: 17.9, x1: 23.9, z: -2.5 },
    /** Bottom of the stairs seen through the opening (first step front edge). */
    stairsBottom: [19.2, 0, -8.3] as Vec3,
    /** Paper bin by the south wall (the bin fire in fire_extinguisher). Top rim at y 0.42. */
    paperBin: [17.6, 0, 2.18] as Vec3,
    /** Wet patch (when `wetFloor` is on): centre and size, plus the yellow sign. */
    wetPatch: { centre: [7.6, 0, 0.9] as Vec3, size: [2.6, 1.6] as [number, number] },
    wetSign: [7.0, 0, -0.05] as Vec3,
    cleanerCart: [5.0, 0, -1.85] as Vec3,
    fountain: [9.75, 0, 2.5] as Vec3,
    sink: [10.45, 0, 2.5] as Vec3,
    lobbyOpening: { x0: 5.6, x1: 8.2, z: 2.5 },
    eastExit: [30, 0, 0] as Vec3,
    westExit: [-30, 0, 0] as Vec3,
  },
  first: {
    robotSpot: [11.2, 0, 0.35] as Vec3,
    extinguisherCabinet: [13.4, 0, -2.5] as Vec3,
    atCabinet: [13.4, 0, -1.8] as Vec3,
    fireAlarmButton: [14.55, 1.4, -2.47] as Vec3,
    alarmLight: [14.55, 2.55, -2.47] as Vec3,
    elevatorDoor: [16.75, 0, -2.5] as Vec3,
    stairsOpening: { x0: 17.9, x1: 23.9, z: -2.5 },
    fountain: [9.6, 0, -2.5] as Vec3,
    windows: [17.5, 21.6, 25.7],
    eastExit: [30, 0, 0] as Vec3,
    westExit: [-30, 0, 0] as Vec3,
  },
};

/* ------------------------------------------------------------------ stairs (8 x 10, h 8; first floor at y 4) */

export const STAIR = {
  riser: 4 / 24,
  tread: 0.3,
  /** Flight 1 (ground -> landing, going north): x range and the z of the first step's front edge. */
  flight1: { x0: -3.9, x1: -1.3, zBottom: 0.1, zTop: -3.2, yBottom: 0, yTop: 2 },
  /** Flight 2 (landing -> first floor, going south). */
  flight2: { x0: -1.1, x1: 1.5, zBottom: -3.2, zTop: 0.1, yBottom: 2, yTop: 4 },
  landing: { x0: -3.9, x1: 1.5, z0: -5, z1: -3.2, y: 2 },
  firstFloorY: 4,
};

/**
 * Walking routes on the stairs (local). Straight lines between consecutive points follow the step
 * nosings within a few cm, so the StageDriver's linear y interpolation keeps feet on the steps.
 * "keep right": going UP flight 1 use its east half, going DOWN use its west half (and the mirror on
 * flight 2).
 */
export const STAIRS_ROUTES = {
  upKeepRight: [
    [-1.9, 0, 1.6], // ground floor, in front of the stairs (east half of flight 1)
    [-1.9, 0, 0.35], // bottom edge
    [-1.9, 2, -3.45], // top of flight 1 (landing edge)
    [-1.2, 2, -4.2], // across the landing
    [-0.55, 2, -3.45], // bottom of flight 2 (its west half = right side going south)
    [-0.55, 4, 0.35], // top of flight 2 (first floor)
    [-0.55, 4, 2.6], // first floor
    [-0.55, 4, 6.8], // first floor corridor (just inside the stair hall)
  ] as Vec3[],
  downKeepRight: [
    [0.95, 4, 6.8],
    [0.95, 4, 2.6],
    [0.95, 4, 0.35], // top of flight 2 (east half = right side going north)
    [0.95, 2, -3.45], // landing
    [-1.2, 2, -4.3],
    [-3.3, 2, -3.45], // top of flight 1 (west half = right side going south)
    [-3.3, 0, 0.35], // bottom
    [-3.3, 0, 1.6],
    [-1.6, 0, 5.5], // out toward the corridor
  ] as Vec3[],
  /** Single points. */
  bottomOfStairs: [-2.6, 0, 0.9] as Vec3,
  topOfFlight1: [-2.6, 2, -3.5] as Vec3,
  landingCentre: [-1.2, 2, -4.1] as Vec3,
  topOfFlight2: [0.2, 4, 0.4] as Vec3,
  firstFloor: [0.2, 4, 3.0] as Vec3,
  /** Handrail tops (child height) at the bottom and top of flight 1. */
  flight1InnerRail: { bottom: [-1.32, 0.75, 0.1] as Vec3, top: [-1.32, 2.75, -3.2] as Vec3 },
  flight1WallRail: { bottom: [-3.86, 0.75, 0.1] as Vec3, top: [-3.86, 2.75, -3.2] as Vec3 },
  /** Elevator door (ground floor and first floor). */
  elevatorDoor: [-3.2, 0, 5.2] as Vec3,
  elevatorDoorFirst: [-3.2, 4, 5.2] as Vec3,
  /** The robot's default spot (bottom of the stairs, facing the camera). */
  robotSpot: [-0.75, 0, 1.6] as Vec3,
  /** Toward the ground floor corridor (south). */
  toCorridor: [-0.2, 0, 7.4] as Vec3,
};

/* ------------------------------------------------------------------ corridor doors (derived from locations.ts) */

const corrX = (room: string, localX: number) => LOCATIONS[room as CoreRoom].origin[0] + localX - LOCATIONS.corridor_ground.origin[0];
const C = (room: string, side: 'n' | 's', num: string, color: string, width = 1.1, double = false, localX = 0): CorridorDoor => ({
  x: Math.round(corrX(room, localX) * 100) / 100,
  side,
  width,
  num,
  name: LOCATIONS[room as CoreRoom].name,
  room,
  color,
  double,
});

/**
 * Doors off the ground-floor corridor (x in corridor-local metres, side 'n' = z -2.5, 's' = z +2.5).
 * x comes from each room's origin in locations.ts. The lobby and the stairs are open passages, not doors.
 */
export const CORRIDOR_GROUND_DOORS: CorridorDoor[] = [
  C('clinic', 's', '١٠٤', '#E5484D'),
  C('canteen', 's', '١٠٣', '#FF8A3D', 1.9, true),
  C('classroom', 's', '١/أ', '#14B8A6', 1.2, false, 4.85),
  C('sports_hall', 'n', '١٠٦', '#2D8CFF', 2.2, true),
  C('principal', 'n', '١٠٢', '#8B5CF6'),
  C('prayer_room', 'n', '١٠٧', '#22B573'),
];

/** Doors off the first-floor corridor. */
export const CORRIDOR_FIRST_DOORS: CorridorDoor[] = [
  C('computer_lab', 's', '٢٠١', '#2D8CFF'),
  C('biology_lab', 's', '٢٠٢', '#22B573'),
  C('art_room', 's', '٢٠٣', '#FF8A3D'),
  C('library', 'n', '٢٠٤', '#8B5CF6', 2.0, true),
];

/* ------------------------------------------------------------------ stair steps (local, stairs room) */

/**
 * Centre of every step tread (x = centre of the half you walk on is up to you): flight 1 climbs north
 * (z decreasing) from z 0.1, flight 2 climbs south from z -3.2. Each entry is [z centre, y of the tread top].
 */
export const STAIR_STEPS = {
  count: 12,
  flight1: Array.from({ length: 12 }, (_, i) => [0.1 - (i + 0.5) * ((0.1 + 3.2) / 12), (i + 1) * (2 / 12)] as [number, number]),
  flight2: Array.from({ length: 12 }, (_, i) => [-3.2 + (i + 0.5) * ((0.1 + 3.2) / 12), 2 + (i + 1) * (2 / 12)] as [number, number]),
};
