/**
 * HumanModel: one animated person (merged skinned mesh + procedural rig + clip playback with
 * crossfades, gait phase, head tracking, blinking, hand sockets). Used by Human, StaticPerson and Crowd.
 */
import * as THREE from 'three';
import type { BoySpec, CharacterKind, HumanClip, Vec3 } from '../../core/types';
import { getBody, type BodyTemplate } from './body';
import { CLIPS, applyFlags, type ClipCtx, type Flags } from './clips';
import { lookFor, hashString, seedUnit } from './looks';
import { Pose, RigInstance } from './rig';

const FADE = 0.2;
export const HUMAN_MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true });

const smooth = (k: number) => {
  const t = Math.min(1, Math.max(0, k));
  return t * t * (3 - 2 * t);
};
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** Clip names allowed in a move / actor clip, mapped to a real HumanClip. */
export function resolveClip(name: string | undefined): HumanClip {
  if (!name) return 'idle';
  if (name === 'jog') return 'run';
  if (name in CLIPS) return name as HumanClip;
  return 'idle';
}

/** Clips that steer the head themselves or lie down: look-at tracking is off. */
const NO_LOOK = new Set<HumanClip>(['lieDown', 'faint', 'forwardRoll', 'slide', 'slideRail', 'noseTiltBack', 'noseLeanForward', 'coverNose', 'headShake', 'nod', 'lookLRL', 'washHands', 'cough']);

export interface HumanInput {
  clip: string;
  clipStart: number;
  clipDuration: number;
  clipSpeed: number;
  moving: boolean;
  moveSpeed: number;
  flags: Flags;
  holdR: boolean;
  holdL: boolean;
  /** Local-space look target relative to the person (rotated into the person's frame) or null. */
  lookLocal: Vec3 | null;
}

export class HumanModel {
  readonly root = new THREE.Group();
  readonly mesh: THREE.SkinnedMesh;
  readonly tpl: BodyTemplate;
  readonly rig: RigInstance;
  readonly socketR = new THREE.Group();
  readonly socketL = new THREE.Group();
  readonly seed: number;
  height: number;

  private out = new Pose();
  private cur = new Pose();
  private from = new Pose();
  private fadeT = FADE;
  private clipKey = '';
  private moveT0 = 0;
  private phase = 0;
  private mem: Record<string, number> = {};
  private lastNow = -1;
  private lookW = 0;
  private lookYaw = 0;
  private lookPitch = 0;
  private blinkAt: number;
  private blinkT = -1;
  private gaitCycle = 0;

  constructor(kind: CharacterKind, id: string, spec?: Partial<BoySpec>, det = 1) {
    const look = lookFor(kind === 'boy' ? 'boy' : kind, id, spec);
    this.tpl = getBody(look, { det });
    this.height = this.tpl.dims.H;
    this.rig = new RigInstance(this.tpl);
    this.mesh = new THREE.SkinnedMesh(this.tpl.geometry, HUMAN_MATERIAL);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.add(this.rig.root);
    this.mesh.bind(this.rig.skeleton, new THREE.Matrix4());
    this.root.add(this.mesh);
    this.seed = seedUnit(id);
    this.blinkAt = 1 + (hashString(id) % 300) / 100;
    for (const [s, name] of [[this.socketR, 'handR'], [this.socketL, 'handL']] as const) {
      s.position.copy(this.tpl.socket);
      this.rig.bones.find((b) => b.name === name)!.add(s);
    }
    this.cur.reset();
    this.out.reset();
    this.from.reset();
  }

  dispose() {
    this.rig.skeleton.dispose();
  }

  update(inp: HumanInput, now: number, camLimit = 0) {
    void camLimit;
    const dt = this.lastNow < 0 ? 1 / 60 : clamp((now - this.lastNow) / 1000, 0, 0.1);
    this.lastNow = now;
    const name = resolveClip(inp.clip);
    const def = CLIPS[name];
    const key = inp.moving ? `${name}|move` : `${name}|${inp.clipStart}`;
    if (key !== this.clipKey) {
      const wasMove = this.clipKey.endsWith('|move');
      const first = this.clipKey === '';
      this.clipKey = key;
      if (!first) {
        this.from.copy(this.out);
        this.fadeT = 0;
      }
      if (inp.moving && !wasMove) this.moveT0 = now;
      if (!inp.moving) this.mem = {};
    }
    const d = this.tpl.dims;
    const speedMul = inp.clipSpeed || 1;
    let t = inp.moving ? ((now - this.moveT0) / 1000) * speedMul : Math.max(0, ((now - inp.clipStart) / 1000) * speedMul);
    const D = inp.moving || !(inp.clipDuration > 0) ? Infinity : inp.clipDuration;
    if (def.loop) {
      /* looping: t as is */
    } else if (Number.isFinite(D)) t = Math.min(t, D) * (def.dur / D);
    else if (def.repeat) t = t % def.dur;
    else t = Math.min(t, def.dur);

    // gait phase (cycles) follows the real speed so feet do not slide
    let speed = inp.moving ? inp.moveSpeed : def.nominal ?? 0;
    if (def.gait) {
      const sp = speed > 0.05 ? speed : def.nominal ?? 1.2;
      const run = sp > 2.2;
      const stride = (run ? 1.2 : 0.68) * d.H;
      const cyc = def.gait === 'climb' ? sp / (0.5 * d.H) : sp / stride;
      this.gaitCycle = cyc;
      this.phase += cyc * dt * speedMul;
      speed = sp;
    }
    const ctx: ClipCtx = {
      phase: this.phase,
      speed,
      moving: inp.moving,
      flags: inp.flags,
      holdR: inp.holdR,
      holdL: inp.holdL,
      seed: this.seed,
      d,
      mem: this.mem,
      dt,
    };
    const p = this.cur.reset();
    def.fill(p, t, ctx);
    applyFlags(p, ctx, name, t);

    // blink
    if (this.blinkT < 0 && now / 1000 > this.blinkAt) {
      this.blinkT = 0;
      this.blinkAt = now / 1000 + 2.2 + this.seed * 3.2;
    }
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      p.blink = Math.max(p.blink, Math.sin(clamp(this.blinkT / 0.16, 0, 1) * Math.PI));
      if (this.blinkT > 0.16) this.blinkT = -1;
    }

    // crossfade
    this.fadeT += dt;
    if (this.fadeT < FADE) this.out.lerp(this.from, p, smooth(this.fadeT / FADE));
    else this.out.copy(p);
    const o = this.out;

    // head tracking after the fade
    const wantLook = inp.lookLocal && !NO_LOOK.has(name) && !inp.flags.lieDown ? 1 : 0;
    const k = 1 - Math.exp(-6 * dt);
    this.lookW += (wantLook - this.lookW) * k;
    if (inp.lookLocal) {
      const [lx, ly, lz] = inp.lookLocal;
      const yaw = clamp(Math.atan2(lx, Math.max(lz, -0.5 + 1e-3)) , -1.1, 1.1);
      const pitch = clamp(-Math.atan2(ly - d.H * 0.9, Math.hypot(lx, lz) + 0.01), -0.4, 0.45);
      this.lookYaw += (yaw - this.lookYaw) * k;
      this.lookPitch += (pitch - this.lookPitch) * k;
    } else {
      this.lookYaw += (0 - this.lookYaw) * k;
      this.lookPitch += (0 - this.lookPitch) * k;
    }
    if (this.lookW > 0.01) {
      const w = this.lookW;
      o.rot('head', this.lookPitch * 0.7 * w, this.lookYaw * 0.65 * w, 0).rot('neck', this.lookPitch * 0.3 * w, this.lookYaw * 0.35 * w, 0);
    }
    this.rig.apply(o);
  }

  get gaitRate() {
    return this.gaitCycle;
  }
}
