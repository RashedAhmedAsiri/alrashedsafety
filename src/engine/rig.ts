import * as THREE from 'three';
import { LOCATIONS, cameraSpot, robotSpot } from '../core/locations';
import { useStage } from '../core/stage';
import { useApp } from '../core/store';
import type { Vec3 } from '../core/types';
import { clock } from './clock';

/**
 * Shared camera state between the CameraRig (inside the Canvas) and the engine code outside it
 * (travel, fly-in, conversation). `pos`/`look`/`fov` are the logical camera without shake.
 *
 * CameraRig modes, checked in this order every frame:
 *   override  rig.override is set (travel fly, the opening fly-in): it writes pos/look/fov.
 *   shot      useStage.shot is set: blend from the camera at the moment the shot appeared.
 *   hold      something plays (app.playing / traveling / not in a mode): keep the camera still.
 *   free      OrbitControls around Alrashed; soft snap back to the home view after 5 s untouched.
 */
export const rig = {
  pos: new THREE.Vector3(40, 75, 75),
  look: new THREE.Vector3(5, 0, -20),
  fov: 50,
  override: null as null | ((now: number) => void),
  /** Free look bookkeeping. */
  lastTouch: -1e9,
  dragging: false,
  /** Bumped whenever the camera is cut so the free-look controls re-sync. */
  cutGen: 0,
  /** Rendered frames (bumped by the StageDriver); used to wait for a new set to draw. */
  frame: 0,
  /** True once the Canvas exists. */
  live: false,
};

export function cutCamera(pos: Vec3 | THREE.Vector3, look: Vec3 | THREE.Vector3, fov?: number) {
  if (Array.isArray(pos)) rig.pos.set(pos[0], pos[1], pos[2]);
  else rig.pos.copy(pos);
  if (Array.isArray(look)) rig.look.set(look[0], look[1], look[2]);
  else rig.look.copy(look);
  if (fov) rig.fov = fov;
  rig.cutGen++;
}

/** Cut to a location's default camera. */
export function cutToLocation(id = useApp.getState().location) {
  const c = cameraSpot(id);
  cutCamera(c.pos, c.look, c.fov);
}

/** Free look restarts its 5 s snap-back timer as if the student touched `msAgo` ms ago. */
export function scheduleHome(inMs: number) {
  rig.lastTouch = clock.now() - 5000 + Math.max(0, inMs);
}

const CHEST = 1.0;

/**
 * The resting free-look view: the location's default camera, moved along with Alrashed when he
 * ended somewhere else. The orbit pivot is the default look point, or his chest when that point is
 * not on him (> 1.5 m away).
 */
export function homePose(): { pos: THREE.Vector3; look: THREE.Vector3; fov: number } {
  const id = useApp.getState().location;
  const def = cameraSpot(id);
  const spot = robotSpot(id).pos;
  const r = useStage.getState().actors.alrashed?.pos ?? spot;
  const d = [r[0] - spot[0], r[1] - spot[1], r[2] - spot[2]];
  const pos = new THREE.Vector3(def.pos[0] + d[0], def.pos[1] + d[1], def.pos[2] + d[2]);
  const look = new THREE.Vector3(def.look[0] + d[0], def.look[1] + d[1], def.look[2] + d[2]);
  const chest = new THREE.Vector3(r[0], r[1] + CHEST, r[2]);
  if (look.distanceTo(chest) > 1.5) look.copy(chest);
  return { pos, look, fov: def.fov };
}

/** Orbit distance limits for the current location. */
export function orbitLimits(): { minDist: number; maxDist: number } {
  const loc = LOCATIONS[useApp.getState().location];
  return loc.orbit ?? (loc.kind === 'inside' ? { minDist: 2, maxDist: 6 } : { minDist: 3, maxDist: 12 });
}

/** Resolves after `n` more frames have been rendered (or after `timeoutMs` if nothing renders). */
export function waitFrames(n: number, timeoutMs = 600): Promise<void> {
  const start = rig.frame;
  const t0 = clock.now();
  return new Promise((resolve) => {
    const check = () => {
      if (rig.frame - start >= n || clock.now() - t0 > timeoutMs) resolve();
      else setTimeout(check, 16);
    };
    check();
  });
}
