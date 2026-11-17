import { LOCATIONS, locAt, cameraSpot } from '../core/locations';
import { useStage, type ActorState, type PropState } from '../core/stage';
import { useApp } from '../core/store';
import type { CharacterKind, HumanClip, LocationId, RobotClip, SfxName, Status, Vec3 } from '../core/types';
import { playSfx, stopSfx } from '../audio/sfx';
import type { ActorHandle, CameraOpts, Cutscene, CutsceneCtx, PropHandle } from './api';
import { abortable, abortError, isAbort, sleep } from '../engine/abort';
import { clock } from '../engine/clock';
import { cancelTurn, facingAngle, turnActor } from '../engine/driver';
import { switchLocation } from '../engine/travel';

// OWNER: engine worker. Implements CutsceneCtx over the stage store. Keep exports exactly.

/* ------------------------------------------------------------------------------------------------
 * Runtime state shared with the conversation controller (src/engine/conversation.ts).
 * ---------------------------------------------------------------------------------------------- */

const runtime = {
  /** True while Alrashed speaks: cutscenes then leave the status pill alone. */
  speechActive: false,
  /** Status shown during cutscenes when Alrashed is neither walking nor waving. */
  baseStatus: 'explaining' as Status,
  robotWalks: 0,
  robotWaves: 0,
  /** Looping sounds started by cutscenes (stopped when the scene is cleared). */
  loops: new Set<SfxName>(),
};

export function setSpeechActive(on: boolean) {
  runtime.speechActive = on;
}
export function setBaseStatus(s: Status) {
  runtime.baseStatus = s;
}
/** Stop every looping sound a cutscene started and reset the walking/waving bookkeeping. */
export function stopCutsceneSounds() {
  for (const n of runtime.loops) {
    try {
      stopSfx(n);
    } catch {
      /* ignore */
    }
  }
  runtime.loops.clear();
  runtime.robotWalks = 0;
  runtime.robotWaves = 0;
}

/* ------------------------------------------------------------------------------------------------ */

const ROBOT = 'alrashed';
const ADULTS: CharacterKind[] = ['teacher', 'counselor', 'guard', 'organizer', 'cleaner', 'stranger', 'parent'];

/** Default speeds (m/s) from ARCHITECTURE: boys 1.3, adults 1.4, robot 1.2, running 3.2. */
function defaultSpeed(kind: ActorState['kind'], clip: string | undefined): number {
  switch (clip) {
    case 'run':
    case 'chaseBall':
      return 3.2;
    case 'jog':
      return 2.2;
    case 'walkDistracted':
      return 1.0;
    case 'holdHandWalk':
    case 'holdHands':
      return 1.1;
  }
  if (kind === 'robot') return 1.2;
  if (ADULTS.includes(kind as CharacterKind)) return 1.4;
  return 1.3;
}

function defaultMoveClip(kind: ActorState['kind'], speed: number): RobotClip | HumanClip {
  if (kind === 'robot') return speed >= 1.9 ? 'jog' : 'walk';
  return speed >= 2.4 ? 'run' : 'walk';
}

const copy3 = (v: Vec3): Vec3 => [v[0], v[1], v[2]];
/** Mark a promise as handled so fire-and-forget calls never report an unhandled AbortError. */
function quiet<T>(p: Promise<T>): Promise<T> {
  p.catch(() => {});
  return p;
}
const isVec3 = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && typeof v[0] === 'number';

const st = () => useStage.getState();
const app = () => useApp.getState();

/** Rotate `local` by rotY around Y (three.js convention) and add `base`. */
export function offsetPoint(base: Vec3, rotY: number, local: Vec3): Vec3 {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [base[0] + local[0] * c + local[2] * s, base[1] + local[1], base[2] - local[0] * s + local[2] * c];
}

export function createCutsceneCtx(location: LocationId, signal: AbortSignal): CutsceneCtx {
  let locId: LocationId = location;
  /** onArrive / onDone callbacks this ctx installed (so abort only freezes our own movers). */
  const ourMoves = new Set<() => void>();
  const ourAnims = new Set<() => void>();

  const freeze = () => {
    const s = st();
    let actors: Record<string, ActorState> | null = null;
    for (const [id, a] of Object.entries(s.actors)) {
      if (a.move?.onArrive && ourMoves.has(a.move.onArrive)) {
        actors ??= { ...s.actors };
        actors[id] = { ...a, move: undefined };
      }
    }
    let props: Record<string, PropState> | null = null;
    for (const [id, p] of Object.entries(s.props)) {
      if (p.anim?.onDone && ourAnims.has(p.anim.onDone)) {
        props ??= { ...s.props };
        props[id] = { ...p, anim: undefined };
      }
    }
    if (actors || props) useStage.setState({ ...(actors ? { actors } : {}), ...(props ? { props } : {}) });
    ourMoves.clear();
    ourAnims.clear();
  };
  if (signal.aborted) freeze();
  else signal.addEventListener('abort', freeze, { once: true });

  const wait = (seconds: number) => quiet(sleep(Math.max(0, seconds) * 1000, signal));

  const restoreStatus = () => {
    if (signal.aborted || runtime.speechActive) return;
    if (runtime.robotWalks > 0) return void app().set({ status: 'walking' });
    if (runtime.robotWaves > 0) return void app().set({ status: 'waving' });
    const cur = app().status;
    if (cur === 'walking' || cur === 'waving') app().set({ status: runtime.baseStatus });
  };

  function actorHandle(id: string): ActorHandle {
    const get = () => st().actors[id];
    return {
      id,
      walkTo(to, opts = {}) {
        const a = get();
        if (!a) return Promise.resolve();
        const path = (isVec3(to) ? [to] : (to as Vec3[])).map(copy3);
        if (!path.length) return Promise.resolve();
        const speed = opts.speed ?? defaultSpeed(a.kind, opts.clip);
        const clip = opts.clip ?? defaultMoveClip(a.kind, speed);
        const isRobot = id === ROBOT;
        let onArrive!: () => void;
        const p = abortable<void>(signal, (resolve) => {
          onArrive = () => {
            ourMoves.delete(onArrive);
            resolve();
          };
          return () => ourMoves.delete(onArrive);
        });
        quiet(p);
        if (signal.aborted) return p;
        ourMoves.add(onArrive);
        const prev = a.move?.onArrive;
        cancelTurn(id);
        st().patchActor(id, { move: { path, speed, clip, onArrive } });
        prev?.(); // a replaced walk counts as finished
        if (isRobot) {
          runtime.robotWalks++;
          if (!runtime.speechActive) app().set({ status: 'walking' });
          const done = () => {
            runtime.robotWalks = Math.max(0, runtime.robotWalks - 1);
            restoreStatus();
          };
          p.then(done, done);
        }
        return p;
      },
      place(pos, rotY) {
        const a = get();
        if (!a) return;
        const prev = a.move?.onArrive;
        cancelTurn(id);
        st().patchActor(id, { pos: copy3(pos), ...(rotY !== undefined ? { rotY } : {}), move: undefined });
        prev?.();
      },
      face(target) {
        const a = get();
        if (!a) return;
        const rotY = typeof target === 'number' ? target : facingAngle(a.pos, target);
        // While he speaks ('during' parts) a turn is seen on camera, so it is a quick smooth turn, not a snap.
        if (runtime.speechActive && a.visible && !a.move) {
          turnActor(id, rotY, 10);
          return;
        }
        cancelTurn(id);
        st().patchActor(id, { rotY });
      },
      play(clip, opts = {}) {
        if (!get()) return Promise.resolve();
        const dur = opts.dur && opts.dur > 0 ? opts.dur : 0;
        st().patchActor(id, { clip, clipStart: clock.now(), clipDuration: dur, clipSpeed: opts.speed ?? 1 });
        if (!dur) {
          if (id === ROBOT && clip === 'wave' && !runtime.speechActive) app().set({ status: 'waving' });
          return Promise.resolve();
        }
        const p = wait(dur);
        if (id === ROBOT && clip === 'wave') {
          runtime.robotWaves++;
          if (!runtime.speechActive && runtime.robotWalks === 0) app().set({ status: 'waving' });
          const done = () => {
            runtime.robotWaves = Math.max(0, runtime.robotWaves - 1);
            restoreStatus();
          };
          p.then(done, done);
        }
        return p;
      },
      hold(item, hand = 'right') {
        if (!get()) return;
        st().patchActor(id, hand === 'left' ? { holdLeft: item } : { hold: item });
      },
      lookAt(target) {
        if (!get()) return;
        st().patchActor(id, { lookAt: target ? copy3(target) : null });
      },
      flag(name, value) {
        const a = get();
        if (!a) return;
        st().patchActor(id, { flags: { ...(a.flags ?? {}), [name]: value } });
      },
      show(visible) {
        if (!get()) return;
        st().patchActor(id, { visible });
      },
      remove() {
        const a = get();
        if (!a) return;
        a.move?.onArrive?.();
        if (id === ROBOT) {
          // Alrashed is persistent: hide him instead.
          st().patchActor(id, { visible: false, move: undefined });
          return;
        }
        cancelTurn(id);
        st().removeActor(id);
      },
      pos() {
        const a = get();
        return a ? copy3(a.pos) : [0, 0, 0];
      },
    };
  }

  function propHandle(id: string): PropHandle {
    const get = () => st().props[id];
    const startAnim = (anim: NonNullable<PropState['anim']>, register: (done: () => void) => void): Promise<void> => {
      let onDone!: () => void;
      const p = abortable<void>(signal, (resolve) => {
        onDone = () => {
          ourAnims.delete(onDone);
          resolve();
        };
        return () => ourAnims.delete(onDone);
      });
      quiet(p);
      if (signal.aborted) return p;
      ourAnims.add(onDone);
      const prev = get()?.anim?.onDone;
      register(onDone);
      st().patchProp(id, { anim: { ...anim, onDone } });
      prev?.();
      return p;
    };
    return {
      id,
      set(patch) {
        const p = get();
        if (!p) return;
        const next: Partial<PropState> = {};
        if (patch.pos) next.pos = copy3(patch.pos);
        if (patch.rotY !== undefined) next.rotY = patch.rotY;
        if (patch.scale !== undefined) next.scale = patch.scale;
        if (patch.visible !== undefined) next.visible = patch.visible;
        if (patch.params) next.params = { ...p.params, ...patch.params };
        st().patchProp(id, next);
      },
      moveTo(pos, dur, easeKind = 'inOut') {
        const p = get();
        if (!p) return Promise.resolve();
        if (!(dur > 0)) {
          const prev = p.anim?.onDone;
          st().patchProp(id, { pos: copy3(pos), anim: undefined });
          prev?.();
          return signal.aborted ? quiet(Promise.reject(abortError())) : Promise.resolve();
        }
        return startAnim({ path: [], from: copy3(p.pos), to: copy3(pos), dur, t: 0, ease: easeKind }, () => {});
      },
      drive(path, speed) {
        if (!get()) return Promise.resolve();
        return startAnim({ path: path.map(copy3), speed, faceTravel: true }, () => {});
      },
      remove() {
        const p = get();
        if (!p) return;
        p.anim?.onDone?.();
        st().removeProp(id);
      },
      pos() {
        const p = get();
        return p ? copy3(p.pos) : [0, 0, 0];
      },
    };
  }

  const ctx: CutsceneCtx = {
    get loc() {
      return LOCATIONS[locId];
    },
    signal,
    go(target, opts = {}) {
      return quiet(
        (async () => {
          if (signal.aborted) throw abortError();
          await switchLocation(target, { fade: opts.fade !== false, signal });
          locId = target;
        })(),
      );
    },
    at: (dx, dz, dy = 0) => locAt(locId, dx, dz, dy),
    offset: offsetPoint,
    wait,
    cam(o: CameraOpts) {
      const dur = o.dur ?? 1.2;
      return quiet(abortable<void>(signal, (resolve) => {
        st().setShot({
          pos: copy3(o.pos),
          look: copy3(o.look),
          fov: o.fov ?? cameraSpot(locId).fov,
          dur: Math.max(0, dur),
          ease: o.ease ?? 'inOut',
          startedAt: clock.now(),
          onDone: () => resolve(),
        });
      }));
    },
    shake(strength = 0.05, seconds = 0.6) {
      useStage.setState({ shake: { strength, until: clock.now() + seconds * 1000 } });
    },
    robot: actorHandle(ROBOT),
    spawn(id, kind, opts) {
      if (id === ROBOT) {
        const h = actorHandle(ROBOT);
        h.place(opts.pos, opts.rotY);
        return h;
      }
      cancelTurn(id);
      const old = st().actors[id];
      old?.move?.onArrive?.();
      st().upsertActor({
        id,
        kind,
        spec: opts.spec,
        pos: copy3(opts.pos),
        rotY: opts.rotY ?? 0,
        clip: opts.clip ?? 'idle',
        clipStart: clock.now(),
        clipDuration: 0,
        clipSpeed: 1,
        hold: opts.hold ?? null,
        holdLeft: null,
        lookAt: null,
        visible: true,
        move: undefined,
        flags: {},
      });
      return actorHandle(id);
    },
    actor: (id) => actorHandle(id),
    prop(id, kind, opts) {
      const existing = st().props[id];
      const running = existing?.anim?.onDone;
      st().upsertProp({
        id,
        kind,
        pos: copy3(opts.pos),
        ...(opts.rotY !== undefined ? { rotY: opts.rotY } : existing ? {} : { rotY: 0 }),
        ...(opts.scale !== undefined ? { scale: opts.scale } : existing ? {} : { scale: 1 }),
        params: { ...(existing && existing.kind === kind ? existing.params : {}), ...(opts.params ?? {}) },
        visible: true,
        anim: undefined,
      });
      running?.(); // a re-placed prop stops its running animation
      return propHandle(id);
    },
    sfx(name, opts) {
      if (signal.aborted) return;
      if (opts?.loop) runtime.loops.add(name);
      playSfx(name, opts);
    },
    stopSfx(name) {
      runtime.loops.delete(name);
      stopSfx(name);
    },
    expr(e) {
      if (signal.aborted) return;
      app().set({ expression: e });
    },
    status(s) {
      if (signal.aborted) return;
      runtime.baseStatus = s;
      app().set({ status: s });
    },
    weather(w) {
      if (signal.aborted) return;
      app().set({ weather: w });
    },
    time(t) {
      if (signal.aborted) return;
      app().set({ time: t });
    },
    setFlag(name, value) {
      if (signal.aborted) return;
      st().setFlag(name, value);
    },
  };
  return ctx;
}

/**
 * Run one cutscene part. Resolves when it finishes or is aborted (AbortError is swallowed); any
 * other error is rethrown so the caller can log it and carry on.
 */
export async function runCutscene(c: Cutscene, location: LocationId, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  const ctx = createCutsceneCtx(location, signal);
  try {
    await c.run(ctx);
  } catch (e) {
    if (isAbort(e)) return;
    throw e;
  }
}
