/**
 * School grounds layout (WORLD coordinates, metres; north is -Z, east is +X, ground y = 0).
 * Everything the school set builds is positioned from these numbers, and cutscene writers can import
 * SCHOOL_LANDMARKS to walk characters to the gate, benches, coolers, goals, doors, etc.
 * docs/sets/school.md lists the same landmarks with explanations.
 */
import type { Vec3 } from '../../../core/types';

/* ------------------------------------------------------------ compound */

export const COMPOUND = { x0: -56, x1: 56, z0: -80, z1: -7.5 };
/** Lay-by notch outside the fence (belongs to the street set). */
export const NOTCH = { x0: -50, x1: -16, z: -10.5 };
/** Main gate opening on the front fence. */
export const GATE = { x0: -4, x1: 4, z: -7.5 };

/* ------------------------------------------------------------ building */

export const BLD = {
  x0: -36,
  x1: 24,
  /** North (back) facade. */
  z0: -74,
  /** South facade wall (faces the yard). */
  z1: -40,
  /** Front line of the arcade roof / columns. */
  arcadeZ: -37.8,
  floor1: 4,
  roof: 8,
  parapetTop: 9,
  /** Main entrance portal (lobby), protrudes into the yard. */
  portal: { x0: -9, x1: 3, z: -37.2, top: 10.4 },
  /** Fly-in classroom window (ground floor, centred on x = 14). */
  classWindow: { x0: 12.3, x1: 15.7, y0: 0.8, y1: 3.0 },
};

/** Arcade column centres (x), z = -38.25. */
export const ARCADE_COLS_LEFT = Array.from({ length: 8 }, (_, i) => -35.6 + (i * (35.6 - 9.3)) / 7);
export const ARCADE_COLS_RIGHT = [3.3, 7.65, 12, 16, 20, 23.6];
export const ARCADE_COL_Z = -38.25;

/* ------------------------------------------------------------ yard */

export const YARD = { x0: -22, x1: 22, z0: -36, z1: -9 };
/** Painted yard texture frame (covers the yard and the gate front strip). */
export const YARD_TEX = { x0: -22, x1: 22, z0: -36, z1: -7.5 };
/** Shade canopy (west half of the yard). */
export const CANOPY = { x0: -22, x1: -4, z0: -33.5, z1: -13.5, eave: 5.2, rise: 1.4 };
/** Central walkway from the gate to the entrance. */
export const WALKWAY = { x0: -3, x1: 3 };
/** Small stage, front edge faces south (toward the class rows). */
export const STAGE = { x0: 4.5, x1: 11.5, z0: -35.8, z1: -32.6, h: 0.6 };
/** Class row lines: x of each painted line, running z0 (front, near stage) to z1. */
export const CLASS_LINES = { xs: [4, 6, 8, 10, 12, 14], z0: -30.5, z1: -19 };
/** Fire assembly point area (south-east corner of the yard), sign post at its south edge facing north. */
export const ASSEMBLY = { x0: 15.5, x1: 21.5, z0: -16, z1: -10.8, sign: [18.5, 0, -10.3] as Vec3 };

/* ------------------------------------------------------------ gate area */

export const GUARD_ROOM = { x0: -8, x1: -4.85, z0: -11.3, z1: -7.85, h: 2.9 };
export const WAITING = { x0: -16, x1: -9.2, z0: -12.6, z1: -8.0, h: 2.85 };
export const GATE_CANOPY = { x0: -4.9, x1: 4.9, z0: -10.1, z1: -7.0, h: 3.7 };
/** Sliding gate leaf: closed covers x -4..4; open slides east to x 4.6..12.6. */
export const SLIDING_GATE = { z: -7.97, closedX: 0, openX: 8.6, len: 8.2, h: 2.0 };

/* ------------------------------------------------------------ football field */

export const FIELD = { x0: 26, x1: 52, z0: -44, z1: -10 };
export const PITCH = { x0: 29, x1: 49, z0: -41, z1: -13 };
export const GOAL = { w: 5, h: 2, depth: 1.4 };
/** Field netting entrance gap on the west side (from the yard path). */
export const FIELD_GAP = { z0: -21.8, z1: -19.2 };
export const DUGOUT = { x0: 26.25, x1: 27.95, z0: -31.5, z1: -24.0 };

/* ------------------------------------------------------------ landmarks */

/**
 * Points cutscenes need (world coordinates, y = ground/seat). Facing angles are rotY radians
 * (0 faces +Z / south, PI faces north, PI/2 faces east, -PI/2 faces west).
 */
export const SCHOOL_LANDMARKS = {
  /* gate */
  gateCentre: [0, 0, -7.5] as Vec3,
  /** Just inside the gate, under the gate canopy. */
  gateInside: [0, 0, -9.0] as Vec3,
  /** Street side of the gate (on the sidewalk, y 0.15). */
  gateOutside: [0, 0.15, -6.6] as Vec3,
  /** Bottom of the gate threshold ramp (sidewalk 0.15 -> yard 0 between z -7.5 and -7.9). */
  gateRampFoot: [0, 0, -7.95] as Vec3,
  /** Under the gate canopy, west half (heavy_rain start). */
  gateCanopySpot: [-1.6, 0, -9.0] as Vec3,
  /** Traffic organizer's painted spot. */
  organizerSpot: [2.7, 0, -9.3] as Vec3,
  /** Guard room window (outside, facing north into the compound). Stand here to talk to the guard. */
  guardWindow: [-5.9, 0, -12.0] as Vec3,
  /** Guard room door (north face); the guard steps out here. */
  guardDoor: [-7.25, 0, -11.9] as Vec3,
  /** Guard's seat inside the guard room. */
  guardSeatInside: [-6.4, 0, -9.6] as Vec3,
  /** Waiting-area benches (seat centre, floor point; seat height 0.42, face south toward the street). */
  waitingBenches: [
    [-14.6, 0, -10.55],
    [-12.3, 0, -10.55],
    [-10.05, 0, -10.55],
  ] as Vec3[],
  /** The bench right beside the guard room (stranger_at_gate: S1 sits here). */
  benchBesideGuard: [-10.05, 0, -10.55] as Vec3,

  /* yard */
  yardCentre: [0, 0, -22] as Vec3,
  /** Front of the stage (ground, south of the steps); the stage top is y 0.6. */
  stageFront: [8, 0, -31.9] as Vec3,
  stageTop: [8, 0.6, -33.6] as Vec3,
  microphone: [8, 0.6, -33.0] as Vec3,
  /** Class row lines: first student spot of each line (front, near the stage); students face north. */
  classLineFronts: [4, 6, 8, 10, 12, 14].map((x) => [x, 0, -30.2]) as Vec3[],
  /** Spacing between students along a line (towards +z). */
  classLineSpacing: 0.8,
  /** Canopy (shade) area, centre and a shaded bench. */
  shadeCentre: [-13, 0, -23.5] as Vec3,
  shadedBenches: [
    [-17.5, 0, -27.5],
    [-12.5, 0, -27.5],
    [-17.5, 0, -19.5],
    [-12.5, 0, -19.5],
    [-7.5, 0, -27.5],
    [-7.5, 0, -19.5],
  ] as Vec3[],
  /** Water coolers in the yard (stand here facing the taps: coolers face east, stand 0.6 m east). */
  yardCoolers: [
    [-21.0, 0, -29.0],
    [-21.0, 0, -23.5],
  ] as Vec3[],
  /** Fire assembly point: centre of the green area; the sign post is at its south edge. */
  assemblyPoint: [18.5, 0, -13.4] as Vec3,
  assemblySign: [18.5, 0, -10.3] as Vec3,
  /** Open sunny play area (ball games, chasing). */
  playArea: [16, 0, -24] as Vec3,

  /* building doors (outside, on the ground in front of each door) */
  mainEntrance: [-3, 0, -37.0] as Vec3,
  /** Main entrance doors (inside the portal recess). */
  mainDoors: [-3, 0, -38.3] as Vec3,
  /** East corridor door (toward the football field). */
  eastDoor: [24.8, 0, -55] as Vec3,
  /** West corridor door. */
  westDoor: [-36.8, 0, -55] as Vec3,
  /** Under the arcade in front of the classroom window (fly-in target window centre is x 14, y 1.9, z -40). */
  classroomWindow: [14, 1.9, -40] as Vec3,

  /* football field */
  fieldCentre: [39, 0, -27] as Vec3,
  /** Goal mouths (centre of the goal line). North goal opens south (+z), south goal opens north (-z). */
  goalNorth: [39, 0, -41] as Vec3,
  goalSouth: [39, 0, -13] as Vec3,
  /** Crossbar centre heights: y 2.0. Goal posts at x 36.5 and 41.5. */
  goalPostsX: [36.5, 41.5] as [number, number],
  /** Team bench under the shade (west side, faces east); seat centre floor point. */
  teamBench: [27.35, 0, -27.75] as Vec3,
  fieldCooler: [27.3, 0, -23.0] as Vec3,
  /** Entrance gap in the west netting. */
  fieldEntrance: [26, 0, -20.5] as Vec3,
  /** Penalty spots. */
  penaltyNorth: [39, 0, -35] as Vec3,
  penaltySouth: [39, 0, -19] as Vec3,
  bikeRack: [-24.6, 0, -14] as Vec3,
};
