// OWNER: props worker. Dimensions and local points of the vehicles (shared by the models, the traffic and
// the cutscenes). Vehicle frame: origin on the ground under the centre, +X nose, +Y up, +Z right side.
// Convert with ctx.offset(base, rotY, [x, y, z]).
import type { Vec3 } from '../core/types';

type V2 = [number, number];
export type CarType = 'sedan' | 'suv' | 'pickup';

export interface CarSpec {
  L: number;
  W: number;
  H: number;
  wheelR: number;
  /** x of the front and rear axle */
  wheelX: [number, number];
  /** side silhouette of the lower body (x, y) */
  lower: V2[];
  /** greenhouse corners: front base, front top, rear top, rear base */
  cabin: [V2, V2, V2, V2];
  roofY: number;
  pillarZ: number;
  beltY: number;
  bPillarOff: number;
  bed?: { x0: number; x1: number; floorY: number; wall: number };
  seams: number[];
  handles: number[];
  lampY: number;
  floorY: number;
  /** x of the front seats and of the rear bench (hips) */
  seatX: [number, number];
  doorLen: number;
  /** hinge x (front edge) of the front and the rear door */
  doorHinge: [number, number];
  driverPos: Vec3;
  wiperX: number;
  wiperY: number;
  wiperTilt: number;
}

function finish(s: Omit<CarSpec, 'wiperX' | 'wiperY' | 'wiperTilt' | 'driverPos'>): CarSpec {
  const [fb, ft] = s.cabin;
  return {
    ...s,
    driverPos: [s.seatX[0], s.floorY + 0.04, -0.4],
    wiperX: fb[0] - 0.05,
    wiperY: fb[1] + 0.04,
    wiperTilt: Math.atan2(ft[1] - fb[1], ft[0] - fb[0]),
  };
}

export const CAR_SPECS: Record<CarType, CarSpec> = {
  sedan: finish({
    L: 4.5,
    W: 1.8,
    H: 1.57,
    wheelR: 0.34,
    wheelX: [1.4, -1.35],
    lower: [[-2.2, 0.3], [2.2, 0.3], [2.28, 0.5], [2.25, 0.72], [1.9, 0.82], [1.0, 0.9], [-1.9, 0.92], [-2.27, 0.8], [-2.3, 0.5]],
    // roof high enough for a grown-up driver's head (with his ghutra) to clear it
    cabin: [[1.1, 0.9], [0.45, 1.49], [-0.95, 1.49], [-1.5, 0.92]],
    roofY: 1.49,
    pillarZ: 0.78,
    beltY: 0.9,
    bPillarOff: 0.0,
    seams: [0.95, -0.1, -1.12],
    handles: [0.05, -1.0],
    lampY: 0.7,
    floorY: 0.3,
    seatX: [0.1, -0.95],
    doorLen: 1.0,
    doorHinge: [0.95, -0.1],
  }),
  suv: finish({
    L: 4.7,
    W: 1.92,
    H: 1.78,
    wheelR: 0.38,
    wheelX: [1.5, -1.45],
    lower: [[-2.3, 0.32], [2.3, 0.32], [2.37, 0.52], [2.33, 0.82], [2.0, 0.96], [1.1, 1.04], [-2.3, 1.06], [-2.38, 0.92], [-2.4, 0.52]],
    cabin: [[1.15, 1.04], [0.8, 1.74], [-2.15, 1.74], [-2.3, 1.06]],
    roofY: 1.74,
    pillarZ: 0.84,
    beltY: 1.04,
    bPillarOff: 0.1,
    seams: [1.0, -0.15, -1.2],
    handles: [0.0, -1.05],
    lampY: 0.78,
    floorY: 0.38,
    seatX: [0.15, -0.95],
    doorLen: 1.1,
    doorHinge: [1.0, -0.15],
  }),
  pickup: finish({
    L: 5.3,
    W: 1.94,
    H: 1.8,
    wheelR: 0.4,
    wheelX: [1.65, -1.75],
    lower: [[-0.6, 0.34], [2.6, 0.34], [2.67, 0.54], [2.63, 0.86], [2.25, 1.0], [1.3, 1.08], [-0.6, 1.08]],
    cabin: [[1.3, 1.08], [0.9, 1.72], [-0.2, 1.72], [-0.6, 1.08]],
    roofY: 1.72,
    pillarZ: 0.85,
    beltY: 1.08,
    bPillarOff: 0.15,
    bed: { x0: -2.65, x1: -0.62, floorY: 0.82, wall: 0.3 },
    seams: [1.0, -0.12],
    handles: [0.05, -0.12],
    lampY: 0.82,
    floorY: 0.4,
    seatX: [0.35, -0.3],
    doorLen: 1.1,
    doorHinge: [1.0, -0.15],
  }),
};

/** Body style for a seed: mostly sedans, some SUVs and pickups. */
export function carType(seed: number): CarType {
  return (['sedan', 'sedan', 'suv', 'sedan', 'suv', 'pickup'] as const)[Math.abs(Math.round(seed)) % 6];
}

/** Local points of a car of the given type/seed. All in the car frame; y of seats = hip spot height for the `drive`/`sit` clips. */
export function carPoints(typeOrSeed: CarType | number) {
  const t = typeof typeOrSeed === 'number' ? carType(typeOrSeed) : typeOrSeed;
  const s = CAR_SPECS[t];
  const hw = s.W / 2;
  const y = s.floorY + 0.04;
  return {
    type: t,
    length: s.L,
    width: s.W,
    /** driver (left side) actor position; clip 'drive' with its default seat height 0.3 */
    driver: [s.seatX[0], y, -0.4] as Vec3,
    /** front passenger (right) */
    frontPassenger: [s.seatX[0], y, 0.4] as Vec3,
    /** rear seats: left, middle, right */
    rear: [[s.seatX[1], y, -0.42], [s.seatX[1], y, 0], [s.seatX[1], y, 0.42]] as Vec3[],
    /** where to stand to use each door (outside, on the ground; right side doors face the sidewalk) */
    doorStand: {
      fr: [s.doorHinge[0] - s.doorLen * 0.5, 0, hw + 0.75] as Vec3,
      rr: [s.doorHinge[1] - s.doorLen * 0.5, 0, hw + 0.75] as Vec3,
      fl: [s.doorHinge[0] - s.doorLen * 0.5, 0, -hw - 0.75] as Vec3,
      rl: [s.doorHinge[1] - s.doorLen * 0.5, 0, -hw - 0.75] as Vec3,
    },
    /** centre of each door on the body surface */
    doorCentre: {
      fr: [s.doorHinge[0] - s.doorLen * 0.5, 0.65, hw] as Vec3,
      rr: [s.doorHinge[1] - s.doorLen * 0.5, 0.65, hw] as Vec3,
      fl: [s.doorHinge[0] - s.doorLen * 0.5, 0.65, -hw] as Vec3,
      rl: [s.doorHinge[1] - s.doorLen * 0.5, 0.65, -hw] as Vec3,
    },
    steeringWheel: [s.seatX[0] + 0.57, s.floorY + 0.72, -0.4] as Vec3,
    roofY: s.roofY,
    /** a point just ahead of the nose / behind the tail on the ground */
    nose: [s.L / 2 + 0.3, 0, 0] as Vec3,
    tail: [-s.L / 2 - 0.3, 0, 0] as Vec3,
  };
}

/* ---------------------------------------------------------------- the school bus */

/** Local points of the school bus: a conventional ("nose") school bus, the engine under a hood ahead of the
 * windscreen. Frame: +X nose, +Z right/door side, origin on the ground under the middle of the bus. */
export const BUS = {
  length: 10.8,
  width: 2.5,
  height: 3.05,
  /** x of the front bumper face and of the tail */
  noseX: 5.5,
  tailX: -5.3,
  /** x of the front wall of the passenger body (windscreen); the hood runs from here to the grille */
  frontX: 3.85,
  /** interior floor height */
  floor: 0.82,
  /** hip spot of the driver (floor point), clip 'sit' with flags seated+inBus, seatH 0.42 */
  driver: [3.05, 0.82, -0.62] as Vec3,
  steeringWheel: [3.57, 1.77, -0.62] as Vec3,
  /** door: centre of the doorway in the right wall, x range, and the walkable line */
  doorCentre: [3.39, 1.5, 1.25] as Vec3,
  doorX: [3.0, 3.78] as [number, number],
  /** the stairwell is recessed into the body: the floor ends at this z, the treads fill z stairZ..1.25 */
  stairZ: 0.5,
  /** top landing inside the door (floor point) */
  doorTop: [3.39, 0.82, 0.3] as Vec3,
  /** the three treads going down and out: [x, y of the tread top, z centre]; the sidewalk (0.15) is the next step */
  steps: [
    [3.39, 0.65, 0.63],
    [3.39, 0.48, 0.88],
    [3.39, 0.31, 1.12],
  ] as Vec3[],
  /** axles (x); wheel radius 0.5; the rear axle has dual wheels */
  frontAxle: 4.5,
  rearAxle: -1.6,
  /** «حافلة مدرسية» sign on the front cap above the windscreen, centre (x, y) */
  roofSign: [3.9, 2.72] as [number, number],
  /** hinge x of the stop arm (left side, folded flat toward +x) */
  stopArmX: 2.72,
  /** ground point on the sidewalk just outside the steps (z; y = ground there) */
  outZ: 2.35,
  /** ten seat rows from the front (x of the hips), a bench on each side of the aisle */
  rowX: [2.2, 1.45, 0.7, -0.05, -0.8, -1.55, -2.3, -3.05, -3.8, -4.55],
  /** z of a bench centre; a bench seats two: z +-0.8 plus or minus 0.17 */
  seatZ: 0.8,
  seatWindow: 0.17,
  aisleZ: 0,
  /** height of the seat surface above the floor point (flag seatH) */
  seatH: 0.42,
  ceiling: 2.75,
};

/** Hip spot (floor point) of a passenger. row 0 = front. side -1 = left (street side), +1 = right (door side).
 * slot -1 = window half of the bench, +1 = aisle half, 0 = bench centre. */
export function busSeat(row: number, side: -1 | 1, slot: -1 | 0 | 1 = 0): Vec3 {
  return [BUS.rowX[row], BUS.floor, BUS.seatZ * side + side * slot * -BUS.seatWindow];
}
