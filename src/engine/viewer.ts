import { useStage } from '../core/stage';
import { turnActor, wrapAngle } from './driver';
import { rig } from './rig';

/**
 * Keeping Alrashed's face toward the student. A teacher points at the thing, then turns back to the
 * class to explain it; without this he could stand with his back to the camera for a whole speech.
 */

/** Where the student watches from: the scripted shot's end position, else the live camera. */
function viewerPos(): [number, number, number] {
  const shot = useStage.getState().shot;
  return shot ? shot.pos : [rig.pos.x, rig.pos.y, rig.pos.z];
}

/** Angle between an actor's facing and the direction to the camera (0 = looking straight at it). */
export function angleFromViewer(id: string): number | null {
  const a = useStage.getState().actors[id];
  if (!a) return null;
  const v = viewerPos();
  return wrapAngle(a.rotY - Math.atan2(v[0] - a.pos[0], v[2] - a.pos[2]));
}

/**
 * Smoothly turn a standing actor to a three-quarter view of the camera when more than `limit`
 * radians away from it. He stops `keep` radians short on the side he was already facing, so he
 * still stands half toward whatever he was pointing at. Returns true when a turn was started.
 */
export function turnToViewer(id: string, opts: { limit?: number; keep?: number; rate?: number } = {}): boolean {
  const a = useStage.getState().actors[id];
  if (!a || a.move || !a.visible) return false;
  // seated, or already twisting toward the camera / holding a child (the script owns his pose)
  const f = a.flags ?? {};
  if (f.seated || f.inBus || f.turnToCamera || f.holdHand || f.handOnShoulder || f.reach) return false;
  if (a.clip === 'sitDrive' || a.clip === 'sit') return false;
  const off = angleFromViewer(id);
  if (off === null || Math.abs(off) <= (opts.limit ?? 1.0)) return false;
  const v = viewerPos();
  const toCam = Math.atan2(v[0] - a.pos[0], v[2] - a.pos[2]);
  turnActor(id, wrapAngle(toCam + Math.sign(off) * (opts.keep ?? 0.5)), opts.rate ?? 6);
  return true;
}

/** Clips during which he may be turned: standing still and talking, not pointing or holding a pose. */
const TALKING = new Set(['idle', 'talk', 'explain1', 'explain2', 'explain3']);

/** True when the actor only stands and talks (so turning him does not break a pose). */
export function isTalkingPose(id: string): boolean {
  const a = useStage.getState().actors[id];
  return !!a && !a.move && TALKING.has(a.clip);
}
