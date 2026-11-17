// Shared helpers of the bus / car cutscenes (cut-bus). Not a cutscene file (registry only globs *.cut.ts).
import type { ActorHandle, CutsceneCtx, PropHandle } from '../api';
import type { BoySpec, Vec3 } from '../../core/types';
import { useStage } from '../../core/stage';
import { BUS, busSeat } from '../../props/points';

/** World point from world x/z (dy above the ground under it). Works for any outdoor location. */
export const W = (c: CutsceneCtx, x: number, z: number, dy = 0): Vec3 => c.at(x - c.loc.origin[0], z - c.loc.origin[2], dy);

/** Where the school bus stops at the bus stop (westbound lane, facing -X, door on the north sidewalk). */
export const BUS_POS: Vec3 = [30, 0, -1.9];
export const BUS_ROT = Math.PI;

/**
 * Bus local points (+X forward, +Y up, +Z right = the door side), taken from the bus model (BUS in props/points.ts);
 * floor = the interior floor height.
 */
export const BL = {
  floor: BUS.floor,
  /** hips of the driver (floor point under them) */
  driver: [BUS.driver[0], BUS.driver[2]] as [number, number],
  /** seat hip spots: ten rows from the front, left (-z) / right (+z) of the aisle */
  rowX: BUS.rowX,
  seatZ: BUS.seatZ,
  aisleZ: 0.0,
  /** inside the door, top of the steps (x, z) */
  doorTop: [BUS.doorTop[0], BUS.doorTop[2]] as [number, number],
  /** the treads going down and out: [x, z, height above the road] (the sidewalk is the last step) */
  steps: BUS.steps.map(([x, y, z]) => [x, z, y]) as [number, number, number][],
  /** a point on the sidewalk right outside the door (z) */
  outZ: BUS.outZ,
};

/** Actor facing for a vehicle whose +X is forward at vehicle rotation `rot`. */
export const fwd = (rot: number) => rot + Math.PI / 2;

/** Local point of a vehicle at base/rot (y = base y + local y). */
export const loc = (c: CutsceneCtx, base: Vec3, rot: number, x: number, y: number, z: number): Vec3 => c.offset(base, rot, [x, y, z]);

export const bus = (c: CutsceneCtx, x: number, y: number, z: number, base: Vec3 = BUS_POS, rot = BUS_ROT): Vec3 => loc(c, base, rot, x, y, z);

/** Seat hip spot (floor point) by row (0 = front), side (-1 left, +1 right / door side) and slot (-1 window, 0 middle, +1 aisle). */
export const seat = (c: CutsceneCtx, row: number, side: -1 | 1, slot: -1 | 0 | 1 = 0, base: Vec3 = BUS_POS, rot = BUS_ROT): Vec3 => {
  const [x, y, z] = busSeat(row, side, slot);
  return loc(c, base, rot, x, y, z);
};

export const driverPos = (c: CutsceneCtx, base: Vec3 = BUS_POS, rot = BUS_ROT): Vec3 => loc(c, base, rot, BL.driver[0], BL.floor, BL.driver[1]);

/** The way out of the parked bus: top landing, the three treads, then the sidewalk right outside the door. */
export const wayOut = (c: CutsceneCtx, base: Vec3 = BUS_POS, rot = BUS_ROT): Vec3[] => [
  bus(c, BL.doorTop[0], BL.floor, BL.doorTop[1], base, rot),
  ...BL.steps.map((s) => bus(c, s[0], s[2], s[1], base, rot)),
  onGround(c, bus(c, BL.doorTop[0], 0, BL.outZ, base, rot)),
];

/** The same world x/z on the ground (sidewalk height included). */
export const onGround = (c: CutsceneCtx, p: Vec3): Vec3 => W(c, p[0], p[2]);

/** Boy shirt looks (distinct per scenario). */
export const boy = (shirt: string, height: BoySpec['height'], extra: Partial<BoySpec> = {}): Partial<BoySpec> => ({ shirt, height, ...extra });

/** Put someone on a seat (bus-seat posture). */
export function sitDown(a: ActorHandle, pos: Vec3, rot: number, belt = false) {
  a.place(pos, rot);
  a.flag('seated', true);
  a.flag('inBus', true);
  if (belt) a.flag('seatbelt', true);
  a.play('sit');
}

export function standUp(a: ActorHandle) {
  a.flag('seated', false);
  a.flag('inBus', false);
  a.flag('seatbelt', false);
  a.play('idle');
}

const FILL_SHIRTS = ['#2F6FB5', '#3DBE6E', '#F5C518', '#E5484D', '#FFFFFF', '#9B6BF2', '#14B8A6', '#FF8A3D', '#7CC4FA', '#EC6FA8', '#64748B', '#A3E635', '#0EA5E9', '#F97316'];
const FILL_PACKS = ['#E5484D', '#2F6FB5', '#F5C518', '#3DBE6E', '#9B6BF2', '#FF8A3D'];
const HEIGHTS: BoySpec['height'][] = ['medium', 'small', 'tall'];

/**
 * Fill the parked bus with seated boys at the window halves of the given benches ([row, side]), facing forward,
 * most of them belted, bags off (under the seat: a bag on the back would poke through the seat back).
 * Spawned with ids `${prefix}0..`. Returns the handles.
 */
export function fillSeats(c: CutsceneCtx, seats: [number, -1 | 1][], prefix = 'p', base: Vec3 = BUS_POS, rot = BUS_ROT): ActorHandle[] {
  return seats.map(([row, side], i) => {
    const p = seat(c, row, side, -1, base, rot);
    const spec = boy(FILL_SHIRTS[i % FILL_SHIRTS.length], HEIGHTS[i % 3], { skin: (i * 3) % 5, striped: i % 4 === 2, hair: i % 5 === 3 ? 'brown' : 'black', backpack: FILL_PACKS[i % FILL_PACKS.length] });
    const a = c.spawn(`${prefix}${i}`, 'boy', { pos: p, rotY: fwd(rot), spec, clip: 'sit' });
    sitDown(a, p, fwd(rot), i % 3 !== 1);
    a.flag('backpack', false);
    return a;
  });
}

export interface Rider {
  a: ActorHandle;
  /** local offset (x forward, y up, z right) from the vehicle origin */
  at: Vec3;
  clip: string;
}

/** Resolves on the next animation frame (the stage driver advances every frame, so this keeps riders in step). */
export const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

/** Current yaw of a prop (the bus/car turns toward its travel direction while driving). */
const rotOf = (v: PropHandle, fallback: number): number => useStage.getState().props[v.id]?.rotY ?? fallback;

/** Put riders at their local spots of the vehicle's CURRENT position and yaw. */
export function carry(c: CutsceneCtx, v: PropHandle, riders: Rider[], fallbackRot: number) {
  const rot = rotOf(v, fallbackRot);
  const base = v.pos();
  for (const r of riders) r.a.place(c.offset(base, rot, r.at), fwd(rot));
}

/**
 * Drive a vehicle prop along `path` at `speed` and carry the riders with it every frame (actors do not follow
 * props by themselves), so they never slide against the seat. With `launch` seconds the vehicle first pulls away
 * smoothly (accelerating from a standstill to `speed`), the StageDriver brakes softly into the last waypoint
 * (3.5 m/s2) so arrivals are soft.
 */
export async function ride(c: CutsceneCtx, v: PropHandle, riders: Rider[], path: Vec3[], speed: number, rot: number, _brake = true, launch = 0): Promise<void> {
  void _brake;
  let done = false;
  const trip = (async () => {
    let p = path;
    if (launch > 0 && p.length > 1) {
      // cubic ease-in ends at 3 d / T: choose d so the launch ends exactly at `speed`
      const from = v.pos();
      const dx = p[1][0] - from[0];
      const dz = p[1][2] - from[2];
      const len = Math.hypot(dx, dz) || 1;
      const d = Math.min((speed * launch) / 3, len * 0.8);
      await v.moveTo([from[0] + (dx / len) * d, from[1], from[2] + (dz / len) * d], launch, 'in');
      p = p.slice(1);
    }
    await v.drive(p, speed);
  })();
  const tail = trip.then(
    () => {
      done = true;
    },
    () => {
      done = true;
    },
  );
  carry(c, v, riders, rot);
  while (!done && !c.signal.aborted) {
    await frame();
    carry(c, v, riders, rot);
  }
  await tail;
  carry(c, v, riders, rot);
}

/**
 * Hold the camera at a vehicle-local point (pos/look in the vehicle frame) every frame for `secs` seconds,
 * so a camera inside a moving bus stays fixed to the bus instead of lagging behind it.
 */
export async function rideCam(c: CutsceneCtx, v: PropHandle, rot: number, secs: number, pos: Vec3, look: Vec3, fov: number, sway = 0.012) {
  const t0 = performance.now();
  while (!c.signal.aborted) {
    const t = (performance.now() - t0) / 1000;
    if (t >= secs) break;
    const base = v.pos();
    const r = rotOf(v, rot);
    const bob = Math.sin(t * 9.3) * sway;
    const p = pos.slice() as Vec3;
    p[1] += bob;
    void c.cam({ pos: c.offset(base, r, p), look: c.offset(base, r, look), fov, dur: 0 });
    await frame();
  }
}

/**
 * Bounce a ball in place until the scene ends or the returned `stop()` is called (call it BEFORE removing the
 * ball: a moveTo on a removed prop resolves at once and would spin forever). Fire and forget.
 */
export function bounce(c: CutsceneCtx, ball: PropHandle, x: number, z: number, h = 0.5): () => void {
  let on = true;
  void (async () => {
    try {
      while (on) {
        await ball.moveTo(W(c, x, z, h), 0.38, 'out');
        if (!on) break;
        c.sfx('bounce', { volume: 0.5 });
        await ball.moveTo(W(c, x, z, 0), 0.38, 'in');
      }
    } catch {
      /* aborted */
    }
  })();
  return () => {
    on = false;
  };
}
