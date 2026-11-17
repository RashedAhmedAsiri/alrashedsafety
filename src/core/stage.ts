import { create } from 'zustand';
import type { BoySpec, CharacterKind, Ease, HoldItem, HumanClip, PropKind, RobotClip, Vec3 } from './types';

/**
 * The stage: everything that moves in the 3D world and is controlled by code
 * (Alrashed, scenario characters, scenario props, the camera).
 *
 * - The robot is always actor id 'alrashed' (kind 'robot').
 * - Cutscenes add actors/props with ids of their own and the engine clears them when the
 *   cutscene ends or is stopped (ids not in `persistent`).
 * - Movement along `move` is advanced every frame by the StageDriver (src/engine/StageDriver.tsx),
 *   which also resolves the `onArrive` callback.
 * - Character components (src/characters) read their actor entry by id every frame
 *   (useStage.getState() inside useFrame, never re-render per frame).
 */

export interface ActorMove {
  path: Vec3[]; // remaining waypoints (world)
  speed: number; // m/s
  /** Clip to play while moving ('walk', 'run', 'jog'...). Reverts to the actor's `clip` on arrival. */
  clip: string;
  onArrive?: () => void;
}

export interface ActorState {
  id: string;
  kind: CharacterKind | 'robot';
  /** Only for kind 'boy'. Missing fields are randomized deterministically from the id. */
  spec?: Partial<BoySpec>;
  pos: Vec3;
  rotY: number;
  /** Current looping/base clip. */
  clip: RobotClip | HumanClip;
  /** Bumped every time a clip is (re)started so one-shot clips restart. */
  clipStart: number;
  /** Seconds; one-shot clips return to 'idle' after this many seconds. 0 = loop forever. */
  clipDuration: number;
  clipSpeed: number;
  hold: HoldItem | null;
  /** Second hand item (rare). */
  holdLeft?: HoldItem | null;
  /** World point the head turns toward, or null. */
  lookAt: Vec3 | null;
  visible: boolean;
  move?: ActorMove;
  /** Free-form flags for special poses (e.g. { inBus: true, seatbelt: true, umbrellaOpen: true }). */
  flags?: Record<string, boolean | number | string>;
}

export interface PropState {
  id: string;
  kind: PropKind;
  pos: Vec3;
  rotY: number;
  scale: number;
  visible: boolean;
  params: Record<string, unknown>;
  /** Tween or path animation advanced by the StageDriver. */
  anim?: {
    path: Vec3[];
    speed?: number; // m/s along path (drive)
    from?: Vec3; // tween
    to?: Vec3;
    dur?: number; // tween seconds
    t?: number; // tween elapsed
    ease?: Ease;
    faceTravel?: boolean; // rotate to face travel direction (vehicles)
    onDone?: () => void;
  };
}

export interface CameraShot {
  pos: Vec3;
  look: Vec3;
  fov: number;
  /** Seconds to blend from the previous camera to this one. 0 = cut. */
  dur: number;
  ease: Ease;
  /** Engine bookkeeping. */
  startedAt?: number;
  onDone?: () => void;
}

export interface StageState {
  actors: Record<string, ActorState>;
  props: Record<string, PropState>;
  /** 'free' = orbit controls around the robot (when nothing plays); 'shot' = scripted camera. */
  cameraMode: 'free' | 'shot';
  shot: CameraShot | null;
  shake: { strength: number; until: number } | null;
  /** Ids that survive clearScene() (the robot and the ambient crowd). */
  persistent: Set<string>;
  /** Named switches read by the active location set (e.g. lights: 'off', board: 'logo', alarm: true). */
  flags: Record<string, boolean | number | string>;

  upsertActor: (a: Partial<ActorState> & { id: string }) => void;
  patchActor: (id: string, patch: Partial<ActorState>) => void;
  removeActor: (id: string) => void;
  upsertProp: (p: Partial<PropState> & { id: string; kind: PropKind }) => void;
  patchProp: (id: string, patch: Partial<PropState>) => void;
  removeProp: (id: string) => void;
  setShot: (shot: CameraShot | null) => void;
  setFlag: (name: string, value: boolean | number | string) => void;
  /** Remove every non-persistent actor and prop and return the camera to free mode. */
  clearScene: () => void;
}

const defaultActor = (id: string): ActorState => ({
  id,
  kind: 'boy',
  pos: [0, 0, 0],
  rotY: 0,
  clip: 'idle',
  clipStart: 0,
  clipDuration: 0,
  clipSpeed: 1,
  hold: null,
  lookAt: null,
  visible: true,
});

const PROP_DEFAULTS = { pos: [0, 0, 0] as Vec3, rotY: 0, scale: 1, visible: true, params: {} };

export const useStage = create<StageState>((set, get) => ({
  actors: {
    alrashed: { ...defaultActor('alrashed'), kind: 'robot', pos: [14, 0, -47.6] },
  },
  props: {},
  cameraMode: 'free',
  shot: null,
  shake: null,
  persistent: new Set(['alrashed']),
  flags: {},

  upsertActor: (a) =>
    set((s) => ({ actors: { ...s.actors, [a.id]: { ...(s.actors[a.id] ?? defaultActor(a.id)), ...a } } })),
  patchActor: (id, patch) =>
    set((s) => (s.actors[id] ? { actors: { ...s.actors, [id]: { ...s.actors[id], ...patch } } } : s)),
  removeActor: (id) =>
    set((s) => {
      const actors = { ...s.actors };
      delete actors[id];
      return { actors };
    }),
  upsertProp: (p) =>
    set((s) => ({
      props: {
        ...s.props,
        [p.id]: { ...PROP_DEFAULTS, ...(s.props[p.id] ?? {}), ...p } as PropState,
      },
    })),
  patchProp: (id, patch) =>
    set((s) => (s.props[id] ? { props: { ...s.props, [id]: { ...s.props[id], ...patch } } } : s)),
  removeProp: (id) =>
    set((s) => {
      const props = { ...s.props };
      delete props[id];
      return { props };
    }),
  setShot: (shot) => set({ shot, cameraMode: shot ? 'shot' : 'free' }),
  setFlag: (name, value) => set((s) => ({ flags: { ...s.flags, [name]: value } })),
  clearScene: () => {
    const { actors, persistent } = get();
    const kept: Record<string, ActorState> = {};
    for (const [id, a] of Object.entries(actors)) if (persistent.has(id)) kept[id] = { ...a, move: undefined };
    set({ actors: kept, props: {}, shot: null, cameraMode: 'free', shake: null, flags: {} });
  },
}));

export const stage = () => useStage.getState();
