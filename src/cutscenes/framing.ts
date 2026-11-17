import type { Vec3 } from '../core/types';
import type { ActorHandle, CutsceneCtx } from './api';

/**
 * Automatic camera framing for cutscenes. Every shot is computed from where the actors stand, so the
 * camera always looks at Alrashed and the children at a child's eye height and never ends up at their
 * feet, above the roof or behind a wall it cannot know about. Prefer these over hand-placed c.cam().
 *
 *   await shots.two(c, c.robot, boy)              // both in frame, side-on
 *   await shots.close(c, c.robot)                 // Alrashed talking to the viewer
 *   await shots.wide(c, c.robot.pos(), 0)         // establishing shot of the place
 *   await shots.follow(c, c.robot, c.robot.walkTo(p))  // walk with him from the side
 */

type Target = ActorHandle | Vec3;
const P = (t: Target): Vec3 => (Array.isArray(t) ? t : t.pos());

/** Eye level of the camera: a little above a child's head. */
const EYE = 1.35;
/** Where the camera aims: chest / face of a child and of Alrashed. */
const AIM = 0.8; // a little below the faces, so people sit above the input bar at the bottom of the screen

function mid(ps: Vec3[]): Vec3 {
  const n = ps.length || 1;
  const s = ps.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]] as Vec3, [0, 0, 0]);
  return [s[0] / n, s[1] / n, s[2] / n];
}

/** Floor height under the actors (their y), so shots work upstairs and on the stairs too. */
const floorY = (ps: Vec3[]) => Math.min(...ps.map((p) => p[1]));

export interface ShotOpts {
  /** Which side of the line between the actors (1 or -1). Keep it the same in a scene (180° rule). */
  side?: 1 | -1;
  /** Extra distance factor (1 = default). */
  zoom?: number;
  /** Camera height above the floor (default 1.35). */
  height?: number;
  fov?: number;
  /** Blend seconds; 0 = cut (default 0.9). */
  dur?: number;
  /** Absolute direction the camera looks along, radians (0 = toward -Z). Overrides the computed one. */
  heading?: number;
}

function place(c: CutsceneCtx, center: Vec3, dirX: number, dirZ: number, dist: number, o: ShotOpts) {
  const y0 = center[1];
  const h = o.height ?? EYE;
  let pos: Vec3 = [center[0] - dirX * dist, y0 + h, center[2] - dirZ * dist];
  pos = clampToLoc(c, pos, center);
  const dur = o.dur ?? 0.9;
  return c.cam({ pos, look: [center[0], y0 + AIM, center[2]], fov: o.fov ?? 50, dur, ease: dur > 0 && dur < 0.5 ? 'linear' : 'inOut' });
}

/** Keep the camera inside the current place (rooms are closed boxes; outdoor areas are generous). */
function clampToLoc(c: CutsceneCtx, pos: Vec3, center: Vec3): Vec3 {
  const loc = c.loc;
  if (loc.kind !== 'inside' || !loc.size) return pos;
  const [ox, , oz] = loc.origin;
  const hw = loc.size[0] / 2 - 0.35;
  const hd = loc.size[1] / 2 - 0.35;
  const x = Math.min(ox + hw, Math.max(ox - hw, pos[0]));
  const z = Math.min(oz + hd, Math.max(oz - hd, pos[2]));
  // If the wall pushed the camera too close, lift it a little so it looks down over the actors.
  const d = Math.hypot(x - center[0], z - center[2]);
  const lift = d < 2 ? (2 - d) * 0.35 : 0;
  return [x, pos[1] + lift, z];
}

const dirFromHeading = (a: number): [number, number] => [Math.sin(a), -Math.cos(a)];

export const shots = {
  /** Two (or more) actors, framed side-on, distance from how far apart they are. */
  two(c: CutsceneCtx, a: Target, b: Target | Target[], o: ShotOpts = {}) {
    const ps = [P(a), ...(Array.isArray(b) && !(typeof b[0] === 'number') ? (b as Target[]).map(P) : [P(b as Target)])];
    const m = mid(ps);
    m[1] = floorY(ps);
    const span = Math.max(1, ...ps.map((p) => Math.hypot(p[0] - m[0], p[2] - m[2]) * 2));
    let dx: number, dz: number;
    if (o.heading !== undefined) [dx, dz] = dirFromHeading(o.heading);
    else {
      const a0 = ps[0], b0 = ps[ps.length - 1];
      const lx = b0[0] - a0[0], lz = b0[2] - a0[2];
      const l = Math.hypot(lx, lz) || 1;
      const s = o.side ?? 1;
      // Perpendicular to the line between them.
      dx = (-lz / l) * s;
      dz = (lx / l) * s;
    }
    return place(c, m, dx, dz, (2.4 + span * 0.9) * (o.zoom ?? 1), o);
  },

  /** One actor from the front (the way he faces) at talking distance. */
  close(c: CutsceneCtx, a: ActorHandle | Vec3, facing: number = 0, o: ShotOpts = {}) {
    const p = P(a);
    // Camera stands in front: the actor faces +Z at 0, so the camera looks along -facing.
    const dx = -Math.sin(facing), dz = -Math.cos(facing);
    const side = (o.side ?? 1) * 0.35;
    return place(c, [p[0], p[1], p[2]], dx - dz * side, dz + dx * side, 2.4 * (o.zoom ?? 1), { fov: 45, ...o });
  },

  /** Establishing shot: a higher, wider view toward a point. */
  wide(c: CutsceneCtx, center: Target, heading: number, o: ShotOpts = {}) {
    const [dx, dz] = dirFromHeading(heading);
    return place(c, P(center), dx, dz, 7 * (o.zoom ?? 1), { height: 2.6, fov: 55, ...o });
  },

  /** Side tracking shot while `until` runs (a walk). Keeps the same side the whole time. */
  async follow(c: CutsceneCtx, a: ActorHandle, until: Promise<unknown>, o: ShotOpts & { with?: ActorHandle[] } = {}) {
    let done = false;
    void until.then(() => (done = true), () => (done = true));
    const frame = (dur: number) => {
      const ps = [a.pos(), ...(o.with ?? []).map((h) => h.pos())];
      const m = mid(ps);
      m[1] = floorY(ps);
      const [dx, dz] = dirFromHeading(o.heading ?? 0);
      return place(c, m, dx, dz, 4.2 * (o.zoom ?? 1), { ...o, dur });
    };
    await frame(o.dur ?? 0);
    while (!done) await frame(0.35);
    await until;
  },
};

/** Heading (for shots.wide / follow / two) that looks from point `from` toward point `to`. */
export function headingTo(from: Vec3, to: Vec3): number {
  return Math.atan2(to[0] - from[0], -(to[2] - from[2]));
}
