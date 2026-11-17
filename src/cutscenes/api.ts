import type { LocationDef } from '../core/locations';
import type {
  BoySpec,
  CharacterKind,
  Ease,
  Expression,
  HoldItem,
  HumanClip,
  LocationId,
  PropKind,
  RobotClip,
  SfxName,
  Status,
  TimeOfDay,
  Vec3,
  Weather,
} from '../core/types';

/**
 * Cutscene authoring API. A cutscene is an async script; every await is a beat of the
 * shot list. The engine (src/cutscenes/engine.ts) implements CutsceneCtx on top of the
 * stage store. All waits reject with an AbortError when the student presses the status
 * button; scripts never need to catch it.
 *
 * Coordinates: ctx.at(dx, dz) is an offset from the scenario location's origin
 * (see src/core/locations.ts for the world layout). Heights default to the location's floor.
 *
 * Example:
 *   export default [
 *     cutscene('crossing_road', 'after', async (c) => {
 *       const s1 = c.spawn('s1', 'boy', { pos: c.at(-1, 0), spec: { shirt: '#E5484D' } });
 *       await c.cam({ pos: c.at(4, 1.2, 5), look: c.at(0, 1, 0), dur: 0 });
 *       c.robot.play('lookLRL');
 *       c.expr('lookLRL');
 *       await c.wait(2);
 *       await Promise.all([c.robot.walkTo(c.at(0, 7)), s1.walkTo(c.at(-0.6, 7))]);
 *     }),
 *   ];
 */

export interface ActorHandle {
  readonly id: string;
  /** Walk (or run) along one or more waypoints. Resolves on arrival. */
  walkTo(to: Vec3 | Vec3[], opts?: { speed?: number; clip?: RobotClip | HumanClip }): Promise<void>;
  /** Teleport. */
  place(pos: Vec3, rotY?: number): void;
  /** Turn to face a point or an absolute angle (radians, 0 = facing +Z). Instant. */
  face(target: Vec3 | number): void;
  /**
   * Start a clip. With `dur` (seconds) it plays once for that long, then returns to idle,
   * and the promise resolves at the end. Without `dur` it loops and resolves immediately.
   */
  play(clip: RobotClip | HumanClip, opts?: { dur?: number; speed?: number }): Promise<void>;
  hold(item: HoldItem | null, hand?: 'right' | 'left'): void;
  lookAt(target: Vec3 | null): void;
  flag(name: string, value: boolean | number | string): void;
  show(visible: boolean): void;
  remove(): void;
  /** Current world position (live). */
  pos(): Vec3;
}

export interface PropHandle {
  readonly id: string;
  set(patch: { pos?: Vec3; rotY?: number; scale?: number; visible?: boolean; params?: Record<string, unknown> }): void;
  /** Smooth move to a point over `dur` seconds. */
  moveTo(pos: Vec3, dur: number, ease?: Ease): Promise<void>;
  /** Drive along waypoints at `speed` m/s, turning to face the travel direction (cars, bus). */
  drive(path: Vec3[], speed: number): Promise<void>;
  remove(): void;
  pos(): Vec3;
}

export interface CameraOpts {
  pos: Vec3;
  look: Vec3;
  fov?: number;
  /** Blend seconds from the current view; 0 = hard cut (default 1.2). */
  dur?: number;
  ease?: Ease;
}

export interface CutsceneCtx {
  /** The current location (the scenario's location, or the last one passed to go()). */
  readonly loc: LocationDef;
  /**
   * Continue the scene in another location (multi-place scenarios: fire_evacuation, small_cut,
   * nosebleed, dismissal, heavy_rain, power_outage). Fades out, switches the active location
   * (rooms render one at a time), updates `loc` so at() is relative to the new place, and fades back
   * in. Actors and props are kept with their world positions, so re-place them before or right after.
   * With { fade: false } it switches instantly (both places outdoor and the camera is moved anyway).
   */
  go(location: LocationId, opts?: { fade?: boolean }): Promise<void>;
  readonly signal: AbortSignal;
  /** Offset from the location origin. dy is height above the location floor. */
  at(dx: number, dz: number, dy?: number): Vec3;
  /**
   * A point in an object's local frame (e.g. a seat inside the bus prop): `base` + `local`
   * rotated by `rotY` around Y. Local axes of vehicles: +X forward, +Y up, +Z to the right side.
   */
  offset(base: Vec3, rotY: number, local: Vec3): Vec3;
  wait(seconds: number): Promise<void>;
  /** Move the camera. Resolves when the blend ends. */
  cam(opts: CameraOpts): Promise<void>;
  /** Gentle shake (only crossing_with_friends uses it). */
  shake(strength?: number, seconds?: number): void;
  /** Alrashed. */
  readonly robot: ActorHandle;
  /** Add a person. `spec` only matters for boys; missing fields are random but stable per id. */
  spawn(
    id: string,
    kind: CharacterKind,
    opts: { pos: Vec3; rotY?: number; spec?: Partial<BoySpec>; clip?: HumanClip; hold?: HoldItem },
  ): ActorHandle;
  actor(id: string): ActorHandle;
  /** Add or update a prop. */
  prop(id: string, kind: PropKind, opts: { pos: Vec3; rotY?: number; scale?: number; params?: Record<string, unknown> }): PropHandle;
  sfx(name: SfxName, opts?: { volume?: number; loop?: boolean }): void;
  stopSfx(name: SfxName): void;
  /** Alrashed's face. */
  expr(e: Expression): void;
  status(s: Status): void;
  weather(w: Weather): void;
  time(t: TimeOfDay): void;
  /** Set a named switch on the location set (e.g. 'lights' -> 'off', 'board' -> 'logo', 'alarm' -> true). */
  setFlag(name: string, value: boolean | number | string): void;
}

/**
 * 'setup'  runs first, after travel and before every step of the scenario's order: it arranges the
 *          "Speaking setup" (actors, props, robot pose, camera). Keep it instant or very short.
 * 'before' / 'after' are the shot tables' Before and After rows.
 * 'during' runs alongside the speech and is aborted when the speech ends (gestures, board pictures).
 * The scene is NOT cleared between parts: actors and props spawned in 'setup' are still there in
 * 'after'. Everything non-persistent is cleared when the whole scenario ends or is stopped.
 */
export type CutscenePart = 'setup' | 'before' | 'after' | 'during';

export interface Cutscene {
  /** Scenario id from content (e.g. 'crossing_road'). */
  scenario: string;
  part: CutscenePart;
  run: (ctx: CutsceneCtx) => Promise<void>;
}

export const cutscene = (scenario: string, part: CutscenePart, run: (ctx: CutsceneCtx) => Promise<void>): Cutscene => ({
  scenario,
  part,
  run,
});
