import * as THREE from 'three';
import { LOCATIONS, cameraSpot, isIndoor, robotSpot } from '../core/locations';
import { useStage } from '../core/stage';
import { useApp } from '../core/store';
import type { LocationId, TimeOfDay, Weather } from '../core/types';
import { playSfx } from '../audio/sfx';
import { abortError, abortable, animate, ease, sleep, tick } from './abort';
import { clock } from './clock';
import { cancelTurn, turnActor, wrapAngle } from './driver';
import { cutCamera, rig, waitFrames } from './rig';

/**
 * Moving Alrashed and the camera between locations.
 *
 *  - fade (indoor↔outdoor, room↔room, far apart): dip to the paper color (~300 ms), switch
 *    `location`, put Alrashed on the location's robot spot, cut the camera to its default camera,
 *    set weather/time, wait until the new set has drawn a few frames, fade back (~350 ms).
 *  - fly (both outdoor and < 60 m apart): a 1.5-2.5 s camera arc from the current view to the new
 *    default camera; Alrashed is repositioned (and location/weather/time switched) at the top of the arc.
 *  - same place: weather/time set, camera glides back to the default view, Alrashed turns to his facing.
 *
 * `useApp.traveling` is true while it runs and `useApp.fade` (0..1) drives the fade overlay.
 * Only the newest travel owns the fade/camera: an aborted travel that nothing replaced fades back in.
 */

let travelGen = 0;
const app = () => useApp.getState();
const ROBOT = 'alrashed';

export interface TravelOpts {
  weather?: Weather | null;
  time?: TimeOfDay | null;
  signal: AbortSignal;
}

function setFade(v: number) {
  const f = Math.max(0, Math.min(1, v));
  if (Math.abs(app().fade - f) > 1e-4) useApp.setState({ fade: f });
}

/** Fade the overlay to `target` at a rate of `msFull` per full 0→1 change. */
export async function fadeTo(target: number, msFull: number, signal?: AbortSignal) {
  const f0 = app().fade;
  const d = target - f0;
  if (Math.abs(d) < 1e-3) {
    setFade(target);
    return;
  }
  await animate(msFull * Math.abs(d), (t) => setFade(f0 + d * t), signal, clock.now);
}

/** Resolves when `cond()` is true (polled every frame/tick). */
function waitUntil(cond: () => boolean, signal?: AbortSignal): Promise<void> {
  return abortable<void>(signal, (resolve) => {
    let cancel = () => {};
    const check = () => {
      if (cond()) resolve();
      else cancel = tick(check);
    };
    check();
    return () => cancel();
  });
}

function applyConditions(o: { weather?: Weather | null; time?: TimeOfDay | null }) {
  const patch: { weather?: Weather; time?: TimeOfDay } = {};
  if (o.weather && o.weather !== app().weather) patch.weather = o.weather;
  if (o.time && o.time !== app().time) patch.time = o.time;
  if (patch.weather || patch.time) app().set(patch);
}

/** Put Alrashed on a location's robot spot, standing (pose flags cleared; hand items kept). */
export function placeRobotAt(id: LocationId) {
  const r = robotSpot(id);
  const s = useStage.getState();
  const a = s.actors[ROBOT];
  cancelTurn(ROBOT);
  const prev = a?.move?.onArrive;
  s.upsertActor({
    id: ROBOT,
    kind: 'robot',
    pos: r.pos,
    rotY: r.rotY,
    move: undefined,
    lookAt: null,
    visible: true,
    flags: {},
    clip: 'idle',
    clipStart: clock.now(),
    clipDuration: 0,
    clipSpeed: 1,
  });
  prev?.();
}

function arrive(id: LocationId, o: { weather?: Weather | null; time?: TimeOfDay | null }) {
  if (app().location !== id) app().set({ location: id });
  placeRobotAt(id);
  applyConditions(o);
}

/** Glide the camera to a pose with rig.override (no stage shot involved). */
async function glideCamera(to: { pos: THREE.Vector3; look: THREE.Vector3; fov: number }, ms: number, signal: AbortSignal) {
  const p0 = rig.pos.clone();
  const l0 = rig.look.clone();
  const f0 = rig.fov;
  const t0 = clock.now();
  const prog = () => Math.min(1, (clock.now() - t0) / ms);
  const self = () => {
    const e = ease('inOut', prog());
    rig.pos.lerpVectors(p0, to.pos, e);
    rig.look.lerpVectors(l0, to.look, e);
    rig.fov = f0 + (to.fov - f0) * e;
  };
  rig.override = self;
  try {
    await waitUntil(() => prog() >= 1, signal);
  } finally {
    if (rig.override === self) rig.override = null;
  }
  cutCamera(to.pos, to.look, to.fov);
}

const v3 = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);

/** Low-level travel used by the conversation controller (which adds presentation handling). */
export async function doTravel(id: LocationId, o: TravelOpts): Promise<void> {
  const { signal } = o;
  if (signal.aborted) throw abortError();
  if (!LOCATIONS[id]) throw new Error(`unknown location ${id}`);
  const gen = ++travelGen;
  const a = app();
  const from = a.location;
  const robot = useStage.getState().actors[ROBOT];
  const spot = robotSpot(id);
  const dist = robot ? Math.hypot(robot.pos[0] - spot.pos[0], robot.pos[2] - spot.pos[2]) : Infinity;
  const cam = cameraSpot(id);
  try {
    // Already there: only conditions, facing and the default view.
    if (from === id && dist < 0.35 && a.fade < 0.01 && Math.abs((robot?.pos[1] ?? 0) - spot.pos[1]) < 0.1) {
      applyConditions(o);
      useStage.getState().setShot(null);
      if (robot && Math.abs(wrapAngle(spot.rotY - robot.rotY)) > 0.05) turnActor(ROBOT, spot.rotY, 8);
      const far = rig.pos.distanceTo(v3(cam.pos)) > 0.4 || rig.look.distanceTo(v3(cam.look)) > 0.4;
      if (far) await glideCamera({ pos: v3(cam.pos), look: v3(cam.look), fov: cam.fov }, 900, signal);
      return;
    }
    useApp.setState({ traveling: true });
    const bothOutdoor = !isIndoor(from) && !isIndoor(id);
    const canFly = bothOutdoor && dist < 60 && a.fade < 0.01 && rig.live && (a.phase === 'mode' || a.phase === 'menu');
    if (canFly) await fly(id, o, dist);
    else await fadeAcross(id, o);
  } finally {
    if (gen === travelGen) {
      useApp.setState({ traveling: false });
      if (app().fade > 0) fadeTo(0, 350).catch(() => {});
    }
  }
}

async function fadeAcross(id: LocationId, o: TravelOpts) {
  const { signal } = o;
  await fadeTo(1, 300, signal);
  arrive(id, o);
  useStage.getState().setShot(null);
  const c = cameraSpot(id);
  cutCamera(c.pos, c.look, c.fov);
  // Let the new set mount and draw (first frames compile its materials) while the screen is covered.
  await waitFrames(3, 1500);
  await sleep(90, signal);
  await fadeTo(0, 350, signal);
}

async function fly(id: LocationId, o: TravelOpts, dist: number) {
  const { signal } = o;
  const c = cameraSpot(id);
  const p0 = rig.pos.clone();
  const l0 = rig.look.clone();
  const f0 = rig.fov;
  const p1 = v3(c.pos);
  const l1 = v3(c.look);
  const d = Math.max(p0.distanceTo(p1), dist);
  const ms = THREE.MathUtils.clamp(1500 + d * 22, 1500, 2500);
  const h = THREE.MathUtils.clamp(3 + d * 0.3, 3.5, 16);
  useStage.getState().setShot(null);
  playSfx('whoosh', { volume: 0.35 });
  const t0 = clock.now();
  const prog = () => Math.min(1, (clock.now() - t0) / ms);
  const self = () => {
    const e = ease('inOut', prog());
    const arc = Math.sin(Math.PI * e);
    rig.pos.lerpVectors(p0, p1, e);
    rig.pos.y += h * arc;
    rig.look.lerpVectors(l0, l1, e);
    rig.look.y += h * 0.25 * arc;
    rig.fov = f0 + (c.fov - f0) * e;
  };
  rig.override = self;
  try {
    await waitUntil(() => prog() >= 0.5, signal);
    arrive(id, o);
    await waitUntil(() => prog() >= 1, signal);
  } finally {
    if (rig.override === self) rig.override = null;
  }
  cutCamera(c.pos, c.look, c.fov);
}

/**
 * ctx.go(): continue a scene in another location, keeping actors and props where they are.
 * With fade: dip to paper, switch, cut the camera (as a stage shot) to the new default camera,
 * wait for the set to draw, then resolve while the screen is still covered; the fade-in follows by
 * itself ~0.1 s later, so actors placed right after `await ctx.go()` never pop on screen.
 */
export async function switchLocation(id: LocationId, opts: { fade: boolean; signal: AbortSignal }) {
  const { signal } = opts;
  if (!LOCATIONS[id]) throw new Error(`unknown location ${id}`);
  if (!opts.fade) {
    if (app().location !== id) app().set({ location: id });
    return;
  }
  const gen = ++travelGen;
  await fadeTo(1, 300, signal);
  if (app().location !== id) app().set({ location: id });
  const c = cameraSpot(id);
  cutCamera(c.pos, c.look, c.fov);
  useStage.getState().setShot({ pos: c.pos, look: c.look, fov: c.fov, dur: 0, ease: 'linear', startedAt: clock.now() });
  await waitFrames(3, 1500);
  if (signal.aborted) throw abortError();
  (async () => {
    await sleep(110);
    await waitFrames(1, 400);
    if (gen === travelGen) await fadeTo(0, 350);
  })().catch(() => {});
}

/* ----------------------------------------------------------------------------- opening fly-in */

/**
 * The opening: the camera starts high above the street south-east of the school, sweeps over the
 * street and the yard and glides down to the classroom window (~4.2 s); a quick paper dip then lands
 * inside the classroom on Alrashed, and the phase becomes 'menu'.
 */
const FLY_POS: [number, number, number][] = [
  [52, 70, 78],
  [34, 38, 36],
  [20, 15, 4],
  [15, 5.5, -24],
  [14, 2.6, -33.5],
];
const FLY_LOOK: [number, number, number][] = [
  [6, 0, -22],
  [10, 2, -30],
  [14, 3, -40],
  [14, 2.4, -42],
  [14, 1.9, -45],
];
export const FLY_START = { pos: FLY_POS[0], look: FLY_LOOK[0], fov: 50 };
const FLY_MS = 4200;

let flyRunning = false;

export async function playFlyIn(opts: { skip?: boolean } = {}) {
  if (flyRunning) return;
  flyRunning = true;
  try {
    if (!opts.skip) {
      const pc = new THREE.CatmullRomCurve3(FLY_POS.map((p) => v3(p)), false, 'centripetal');
      const lc = new THREE.CatmullRomCurve3(FLY_LOOK.map((p) => v3(p)), false, 'centripetal');
      const t0 = clock.now();
      const prog = () => Math.min(1, (clock.now() - t0) / FLY_MS);
      const self = () => {
        // Equal curve-parameter time per segment: fast over the long high segments, slow near the
        // window; a sine ease softens the start and the landing.
        const e = 0.5 - 0.5 * Math.cos(Math.PI * prog());
        pc.getPoint(e, rig.pos);
        lc.getPoint(e, rig.look);
        rig.fov = 50 - 4 * e;
      };
      rig.override = self;
      self();
      await waitUntil(() => prog() >= 0.94);
      await fadeTo(1, 300);
      if (rig.override === self) rig.override = null;
    } else {
      setFade(1);
      rig.override = null;
    }
    // Into the classroom.
    useStage.getState().setShot(null);
    app().set({ phase: 'menu', location: 'classroom', expression: 'smile', status: 'ready' });
    placeRobotAt('classroom');
    const c = cameraSpot('classroom');
    cutCamera(c.pos, c.look, c.fov);
    await waitFrames(3, 2000);
    await sleep(150);
    await fadeTo(0, 450);
  } finally {
    flyRunning = false;
  }
}
