import type { ActorHandle, CutsceneCtx } from '../api';
import type { Vec3 } from '../../core/types';

/** Fire-and-forget background action; aborts and errors are swallowed (the scene is being torn down). */
export function bg(fn: () => Promise<void>): void {
  fn().catch(() => undefined);
}

/** Move an actor by repeated small placements so it can face one way and travel the other (running backwards). */
export async function slideTo(c: CutsceneCtx, a: ActorHandle, from: Vec3, to: Vec3, seconds: number, rotY: number): Promise<void> {
  const steps = Math.max(2, Math.round(seconds * 24));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    a.place([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t], rotY);
    await c.wait(seconds / steps);
  }
}

/**
 * Camera for the stairs room (flight 1, x -3.9..-1.3, climbs north from z 0.1). Flight 2 east of it is a solid block and
 * the first-floor slab hangs over z > 0.1 at y 3.7, so the only clear view of flight 1 is from the floor south of it,
 * slightly east (x -0.9), raised to look a little down on the people: "up and from the side", never at their feet.
 * `pts` are WORLD points (actor positions); the camera aims at their chest.
 */
export function stairCam(c: CutsceneCtx, pts: Vec3[], o: { dur?: number; zoom?: number; fov?: number } = {}) {
  const [ox, oy, oz] = c.loc.origin;
  const n = pts.length;
  const ax = pts.reduce((s, p) => s + p[0], 0) / n - ox;
  const az = pts.reduce((s, p) => s + p[2], 0) / n - oz;
  // aim between the lowest and the highest person, a little low so the people sit in the upper part of the frame
  // (the app's input bar covers the bottom quarter)
  const ys = pts.map((p) => p[1] - oy);
  const ay = (Math.min(...ys) + Math.max(...ys)) / 2 + 0.45;
  // stand 3 m behind (south of) the nearest person so everyone fits, as far back as the room allows
  const near = Math.max(...pts.map((p) => p[2] - oz));
  const z = Math.min(4.6, Math.max(1.4, near + 3.0 * (o.zoom ?? 1)));
  const y = Math.min(3.3, Math.max(1.6, ay + 1.0));
  const dur = o.dur ?? 0.9;
  return c.cam({ pos: c.at(-0.9, z, y), look: c.at(ax, az, ay), fov: o.fov ?? 50, dur, ease: dur > 0 && dur < 0.5 ? 'linear' : 'inOut' });
}

/** stairCam re-aimed every 0.35 s at `a` (and `with`) until `until` settles. */
export async function stairFollow(c: CutsceneCtx, a: ActorHandle, until: Promise<unknown>, o: { zoom?: number; with?: ActorHandle[] } = {}) {
  let done = false;
  void until.then(
    () => (done = true),
    () => (done = true),
  );
  const pts = () => [a.pos(), ...(o.with ?? []).map((h) => h.pos())];
  await stairCam(c, pts(), { dur: 0, zoom: o.zoom });
  while (!done) await stairCam(c, pts(), { dur: 0.35, zoom: o.zoom });
  await until;
}
