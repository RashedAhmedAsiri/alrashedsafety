import { useStage, type ActorState, type PropState, type StageState } from '../core/stage';
import { useApp } from '../core/store';
import { LOCATIONS } from '../core/locations';
import { groundHeight } from '../core/ground';
import type { Vec3 } from '../core/types';
import { ease } from './abort';

/**
 * The stage driver core (no React): advances everything that moves on the stage by `dt` seconds.
 * <StageDriver/> calls advanceStage() once per rendered frame; tests call it directly with a fake clock.
 *
 *  - actors' `move`: walk along the remaining waypoints at `speed` (horizontal metres per second),
 *    y interpolated linearly between waypoints, turning smoothly to face the travel direction;
 *    on arrival `move` is cleared and `onArrive` is called.
 *  - one-shot clips (`clipDuration > 0`, wall-clock seconds) go back to looping 'idle' when done.
 *  - engine turns (turnActor): smooth rotation toward a target angle (e.g. "turn to the camera").
 *  - props' `anim`: tween (`from`→`to` over `dur` with `ease`) or drive (`path` at `speed`, outdoors
 *    riding on groundHeight, braking softly into the last waypoint, `faceTravel` turning like a car);
 *    `onDone` when finished.
 *  - `shake` is cleared once it has expired.
 * All changes of one frame are written with a single setState; callbacks run after it.
 */

const ACTOR_TURN_RATE = 10; // 1/s, exponential approach while walking
const PROP_TURN_RATE = 5;
const BRAKE_DECEL = 3.5; // m/s² soft stop at the end of a drive
const MIN_BRAKE_SPEED = 0.6;

/** Angle (rotY) at which a character (forward = +Z) faces from `from` toward `to`. */
export function facingAngle(from: Vec3, to: Vec3): number {
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}

/** rotY at which a vehicle (forward = +X) points along dx, dz. */
export function vehicleAngle(dx: number, dz: number): number {
  return Math.atan2(-dz, dx);
}

/** Wrap to (-π, π]. */
export function wrapAngle(a: number): number {
  let x = a % (Math.PI * 2);
  if (x > Math.PI) x -= Math.PI * 2;
  if (x <= -Math.PI) x += Math.PI * 2;
  return x;
}

function approachAngle(cur: number, target: number, rate: number, dt: number): number {
  const d = wrapAngle(target - cur);
  if (Math.abs(d) < 1e-3) return target;
  return wrapAngle(cur + d * (1 - Math.exp(-rate * dt)));
}

/* --------------------------------------------------------------- turns */

const turns = new Map<string, { target: number; rate: number }>();

/** Smoothly rotate an actor toward `target` (radians). Cancelled by a new walk or ctx face(). */
export function turnActor(id: string, target: number, rate = 7) {
  turns.set(id, { target, rate });
}
export function cancelTurn(id: string) {
  turns.delete(id);
}
export function clearTurns() {
  turns.clear();
}
export function isTurning(id: string) {
  return turns.has(id);
}

/* ------------------------------------------------------------- advance */

type Cb = (() => void) | undefined;

function stepMove(a: ActorState, dt: number, cbs: Cb[]): ActorState {
  const m = a.move!;
  let x = a.pos[0];
  let y = a.pos[1];
  let z = a.pos[2];
  let budget = Math.max(0, m.speed) * dt;
  const path = m.path;
  let i = 0;
  let heading: number | null = null;
  while (i < path.length) {
    const [tx, ty, tz] = path[i];
    const dx = tx - x;
    const dz = tz - z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-4) heading = Math.atan2(dx, dz);
    if (d <= budget || d <= 1e-4) {
      x = tx;
      y = ty;
      z = tz;
      budget -= d;
      i++;
      continue;
    }
    if (budget <= 0) break;
    const f = budget / d;
    x += dx * f;
    z += dz * f;
    y += (ty - y) * f;
    budget = 0;
    break;
  }
  let rotY = a.rotY;
  if (heading !== null) rotY = approachAngle(a.rotY, heading, ACTOR_TURN_RATE, dt);
  if (i >= path.length) {
    // Arrived: finish the turn toward the last heading smoothly, then hand back the base clip.
    if (heading !== null) turns.set(a.id, { target: heading, rate: ACTOR_TURN_RATE });
    cbs.push(m.onArrive);
    return { ...a, pos: [x, y, z], rotY, move: undefined };
  }
  return { ...a, pos: [x, y, z], rotY, move: i > 0 ? { ...m, path: path.slice(i) } : m };
}

function outdoorNow(): boolean {
  const loc = LOCATIONS[useApp.getState().location];
  return !!loc && loc.kind !== 'inside';
}

function stepProp(p: PropState, dt: number, cbs: Cb[], outdoor: boolean): PropState {
  const an = p.anim!;
  // Tween.
  if (an.from && an.to && an.dur !== undefined) {
    const t = (an.t ?? 0) + dt;
    const f = an.dur <= 0 ? 1 : Math.min(1, t / an.dur);
    const e = ease(an.ease ?? 'inOut', f);
    const pos: Vec3 = [
      an.from[0] + (an.to[0] - an.from[0]) * e,
      an.from[1] + (an.to[1] - an.from[1]) * e,
      an.from[2] + (an.to[2] - an.from[2]) * e,
    ];
    if (f >= 1) {
      cbs.push(an.onDone);
      return { ...p, pos: [an.to[0], an.to[1], an.to[2]], anim: undefined };
    }
    return { ...p, pos, anim: { ...an, t } };
  }
  // Drive.
  const path = an.path ?? [];
  if (!path.length) {
    cbs.push(an.onDone);
    return { ...p, anim: undefined };
  }
  const speed = Math.max(0.01, an.speed ?? 5);
  // Remaining distance along the path (for the soft brake into the last waypoint).
  let remaining = 0;
  {
    let px = p.pos[0];
    let pz = p.pos[2];
    for (const w of path) {
      remaining += Math.hypot(w[0] - px, w[2] - pz);
      px = w[0];
      pz = w[2];
    }
  }
  const v = Math.max(Math.min(speed, Math.sqrt(2 * BRAKE_DECEL * remaining)), Math.min(speed, MIN_BRAKE_SPEED));
  let budget = v * dt;
  let x = p.pos[0];
  let y = p.pos[1];
  let z = p.pos[2];
  let i = 0;
  let dirX = 0;
  let dirZ = 0;
  while (i < path.length) {
    const [tx, ty, tz] = path[i];
    const dx = tx - x;
    const dz = tz - z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-4) {
      dirX = dx;
      dirZ = dz;
    }
    if (d <= budget || d <= 1e-4) {
      x = tx;
      y = ty;
      z = tz;
      budget -= d;
      i++;
      continue;
    }
    if (budget <= 0) break;
    const f = budget / d;
    x += dx * f;
    z += dz * f;
    y += (ty - y) * f;
    budget = 0;
    break;
  }
  // Vehicles outdoors ride on the walkable surface (e.g. over the raised crossing).
  if (an.faceTravel && outdoor) y = Math.max(y, groundHeight(x, z));
  let rotY = p.rotY;
  if (an.faceTravel && (dirX !== 0 || dirZ !== 0)) rotY = approachAngle(p.rotY, vehicleAngle(dirX, dirZ), PROP_TURN_RATE, dt);
  if (i >= path.length) {
    cbs.push(an.onDone);
    return { ...p, pos: [x, y, z], rotY, anim: undefined };
  }
  return { ...p, pos: [x, y, z], rotY, anim: i > 0 ? { ...an, path: path.slice(i) } : an };
}

/**
 * Advance the stage by dt seconds at time `now` (ms, same base as clipStart). Returns true when
 * anything changed.
 */
export function advanceStage(dt: number, now: number): boolean {
  dt = Math.min(Math.max(dt, 0), 0.5);
  const st = useStage.getState();
  const cbs: Cb[] = [];
  let actors: StageState['actors'] = st.actors;
  let props: StageState['props'] = st.props;
  let actorsChanged = false;
  let propsChanged = false;

  for (const id in st.actors) {
    const a0 = st.actors[id];
    let a = a0;
    if (a.move) {
      turns.delete(id);
      a = stepMove(a, dt, cbs);
    }
    if (a.clipDuration > 0 && now - a.clipStart >= a.clipDuration * 1000) {
      a = { ...a, clip: 'idle', clipStart: now, clipDuration: 0, clipSpeed: 1 };
    }
    const turn = turns.get(id);
    if (turn && !a.move) {
      const r = approachAngle(a.rotY, turn.target, turn.rate, dt);
      if (Math.abs(wrapAngle(turn.target - r)) < 0.004) {
        turns.delete(id);
        a = { ...a, rotY: turn.target };
      } else a = { ...a, rotY: r };
    }
    if (a !== a0) {
      if (!actorsChanged) {
        actors = { ...actors };
        actorsChanged = true;
      }
      actors[id] = a;
    }
  }
  // Forget turns of actors that no longer exist.
  for (const id of turns.keys()) if (!st.actors[id]) turns.delete(id);

  let outdoor: boolean | null = null;
  for (const id in st.props) {
    const p0 = st.props[id];
    if (!p0.anim) continue;
    if (outdoor === null) outdoor = outdoorNow();
    const p = stepProp(p0, dt, cbs, outdoor);
    if (p !== p0) {
      if (!propsChanged) {
        props = { ...props };
        propsChanged = true;
      }
      props[id] = p;
    }
  }

  const shakeExpired = !!st.shake && now >= st.shake.until;
  if (actorsChanged || propsChanged || shakeExpired) {
    const patch: Partial<StageState> = {};
    if (actorsChanged) patch.actors = actors;
    if (propsChanged) patch.props = props;
    if (shakeExpired) patch.shake = null;
    useStage.setState(patch);
  }
  for (const cb of cbs) {
    if (!cb) continue;
    try {
      cb();
    } catch (e) {
      console.error('[engine] stage callback failed', e);
    }
  }
  return actorsChanged || propsChanged || shakeExpired;
}
