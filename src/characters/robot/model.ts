/**
 * Alrashed's object hierarchy and per-frame animator. Built imperatively (one RobotModel per Robot
 * component) from the shared geometry in geometry.ts; Robot.tsx only mounts `model.root` and calls
 * `model.update()` every frame.
 *
 * Hierarchy (root = actor position, rotated by actor.rotY; +Z forward, +X his left):
 *   root > pelvis > spine > neck > head (head shell, face screen, antenna light)
 *                         > upperArm_s > forearm_s > hand_s (fingers, thumb, socket_s)
 *        > pelvis > thigh_s > shin_s > foot_s
 */
import * as THREE from 'three';
import type { ActorState } from '../../core/stage';
import { clipDef, poseFor, seatedLegs, type ClipCtx } from './clips';
import { FaceScreen, type FaceInput } from './face';
import { FINGER, THUMB, robotGeometry, robotMaterials } from './geometry';
import {
  DIM,
  REST,
  clamp,
  copyPose,
  damp,
  lerp,
  lerpPose,
  restPose,
  sideSign,
  smooth,
  solveTwoBone,
  type Pose,
  type Side,
} from './rig';

const SIDES: Side[] = ['l', 'r'];
const FADE = 0.22;
/** Clips that do not use the arms (seated hands may rest on the thighs, overlays may take the arms). */
const ARM_FREE = new Set(['idle', 'nod', 'headShake', 'lookLeft', 'lookRight', 'lookLRL', 'walk', 'jog', 'holdHandWalk', 'crouch', 'talk']);
/** Clips that steer the head themselves (lookAt tracking is reduced). */
const HEAD_CLIPS = new Set(['lookLeft', 'lookRight', 'lookLRL', 'headShake', 'nod', 'coverFace', 'washHands', 'bandage', 'gloves']);
/** Gait cycle speed a walking clip previews at when the actor is not actually moving. */
const NOMINAL: Record<string, number> = { walk: 1.2, jog: 2.2, holdHandWalk: 1.1 };

interface ArmBones {
  upper: THREE.Group;
  fore: THREE.Group;
  hand: THREE.Group;
  fingers: [THREE.Group, THREE.Group][];
  thumb: [THREE.Group, THREE.Group];
  socket: THREE.Group;
}
interface LegBones {
  thigh: THREE.Group;
  shin: THREE.Group;
  foot: THREE.Group;
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const q3 = new THREE.Quaternion();
const e1 = new THREE.Euler();
const m1 = new THREE.Matrix4();
const m2 = new THREE.Matrix4();

type Flags = Record<string, boolean | number | string>;
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
/** 'l' / 'r' / 'both' from a flag value (true = default side). */
function sidesOf(v: unknown, def: Side): Side[] {
  if (v === undefined || v === false || v === 0 || v === '') return [];
  if (v === 'both' || v === 'lr') return ['l', 'r'];
  if (v === 'l' || v === 'left') return ['l'];
  if (v === 'r' || v === 'right') return ['r'];
  return [def];
}

export class RobotModel {
  readonly root = new THREE.Group();
  readonly face = new FaceScreen();
  private pelvis = new THREE.Group();
  private spine = new THREE.Group();
  private neck = new THREE.Group();
  private head = new THREE.Group();
  private arms = {} as Record<Side, ArmBones>;
  private legs = {} as Record<Side, LegBones>;
  private antennaMat: THREE.MeshStandardMaterial;
  private haloMat: THREE.MeshBasicMaterial;
  private screenMat: THREE.MeshBasicMaterial;
  private antennaCol = new THREE.Color('#8A94A6');

  private out: Pose = restPose();
  private cur: Pose = restPose();
  private from: Pose = restPose();
  private fadeT = FADE;
  private clipKey = '';
  private moveT0 = 0;
  private phase = 0;
  private lastNow = -1;
  private gazeX = 0;
  private gazeY = 0;
  private lookW = 0;
  private turnW = 0;
  private target = new THREE.Vector3();

  constructor() {
    const g = robotGeometry();
    const m = robotMaterials();
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], parent: THREE.Object3D) => {
      const o = new THREE.Mesh(geo, mat);
      o.castShadow = true;
      parent.add(o);
      return o;
    };
    this.root.name = 'alrashed';
    this.root.add(this.pelvis);
    mesh(g.pelvis, m.shell, this.pelvis);
    this.spine.position.set(0, DIM.WAIST_DY, 0);
    this.pelvis.add(this.spine);
    mesh(g.torso, m.torso, this.spine);
    mesh(g.badge, m.badge, this.spine).castShadow = false;
    this.neck.position.set(0, DIM.NECK_DY, 0);
    this.spine.add(this.neck);
    this.head.position.set(0, DIM.HEAD_DY, 0);
    this.neck.add(this.head);
    mesh(g.head, m.shell, this.head);
    this.screenMat = new THREE.MeshBasicMaterial({ map: this.face.texture, toneMapped: false, alphaTest: 0.5 }); // clear canvas corners show the head shell
    mesh(g.screen, this.screenMat, this.head).castShadow = false;
    this.antennaMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: this.antennaCol, emissiveIntensity: 1.6, roughness: 0.25, toneMapped: false });
    mesh(g.antennaBall, this.antennaMat, this.head).castShadow = false;
    this.haloMat = new THREE.MeshBasicMaterial({ color: this.antennaCol, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const halo = mesh(g.antennaBall, this.haloMat, this.head);
    halo.castShadow = false;
    halo.renderOrder = 2;
    const ab = g.antennaBall.boundingSphere ?? (g.antennaBall.computeBoundingSphere(), g.antennaBall.boundingSphere!);
    halo.position.copy(ab.center).multiplyScalar(1 - 1.7);
    halo.scale.setScalar(1.7);

    for (const s of SIDES) {
      const sg = sideSign(s);
      const upper = new THREE.Group();
      upper.position.set(sg * DIM.SHOULDER_X, DIM.SHOULDER_DY, 0);
      this.spine.add(upper);
      mesh(g.upperArm[s], m.shell, upper);
      const fore = new THREE.Group();
      fore.position.set(0, -DIM.UPPER, 0);
      upper.add(fore);
      mesh(g.forearm[s], m.shell, fore);
      const hand = new THREE.Group();
      hand.position.set(0, -DIM.FORE, 0);
      fore.add(hand);
      mesh(g.hand[s], m.shell, hand);
      const fingers: [THREE.Group, THREE.Group][] = [];
      for (let i = 0; i < 4; i++) {
        const a = new THREE.Group();
        a.position.set(-sg * FINGER.X, -DIM.PALM + 0.004, FINGER.Z[i]);
        hand.add(a);
        mesh(g.fingerA, m.shell, a);
        const b = new THREE.Group();
        b.position.set(0, -FINGER.A - 0.002, 0);
        a.add(b);
        mesh(g.fingerB, m.shell, b);
        if (i === 0 || i === 3) a.scale.set(0.95, i === 3 ? 0.82 : 0.95, 0.95);
        fingers.push([a, b]);
      }
      const ta = new THREE.Group();
      ta.position.set(-sg * 0.01, -0.026, 0.04);
      hand.add(ta);
      const tsc = THUMB.R / FINGER.R;
      mesh(g.fingerA, m.shell, ta).scale.set(tsc, THUMB.A / FINGER.A, tsc);
      const tb = new THREE.Group();
      tb.position.set(0, -THUMB.A - 0.002, 0);
      ta.add(tb);
      mesh(g.fingerB, m.shell, tb).scale.set(tsc, THUMB.B / FINGER.B, tsc);
      const socket = new THREE.Group();
      socket.position.set(-sg * 0.024, -DIM.GRIP + 0.004, 0.004);
      hand.add(socket);
      this.arms[s] = { upper, fore, hand, fingers, thumb: [ta, tb], socket };

      const thigh = new THREE.Group();
      thigh.position.set(sg * DIM.HIP_X, DIM.HIP_DY, 0);
      this.pelvis.add(thigh);
      mesh(g.thigh, m.shell, thigh);
      const shin = new THREE.Group();
      shin.position.set(0, -DIM.THIGH, 0);
      thigh.add(shin);
      mesh(g.shin, m.shell, shin);
      const foot = new THREE.Group();
      foot.position.set(0, -DIM.SHIN, 0);
      shin.add(foot);
      mesh(g.foot, m.shell, foot);
      this.legs[s] = { thigh, shin, foot };
    }
    this.apply(REST);
  }

  /** The hand socket (grip point) a held item is attached to. */
  socket(s: Side) {
    return this.arms[s].socket;
  }

  dispose() {
    this.face.dispose();
    this.screenMat.dispose();
    this.antennaMat.dispose();
    this.haloMat.dispose();
  }

  /**
   * Advance one frame. `now` = performance.now() (ms). `camPos` = world camera position (for the
   * turnToCamera flag).
   */
  update(a: ActorState, now: number, face: Omit<FaceInput, 'gazeX' | 'gazeY' | 'flags'>, statusColor: string, camPos: THREE.Vector3) {
    const dt = this.lastNow < 0 ? 1 / 60 : clamp((now - this.lastNow) / 1000, 0, 0.1);
    this.lastNow = now;
    const root = this.root;
    root.position.set(a.pos[0], a.pos[1], a.pos[2]);
    root.rotation.set(0, a.rotY, 0);
    root.visible = a.visible;
    const flags: Flags = a.flags ?? {};

    // ---- which clip, since when
    let name: string = a.move ? a.move.clip : a.clip;
    if (name === 'run' || name === 'chaseBall') name = 'jog';
    else if (name === 'holdHands') name = 'holdHandWalk';
    else if (name === 'walkDistracted') name = 'walk';
    else if (name === 'sit' || name === 'drive') name = name === 'drive' ? 'sitDrive' : 'idle';
    const key = a.move ? `${name}|move` : `${name}|${a.clipStart}`;
    if (key !== this.clipKey) {
      const wasMove = this.clipKey.endsWith('|move');
      this.clipKey = key;
      copyPose(this.from, this.out);
      this.fadeT = 0;
      if (a.move && !wasMove) this.moveT0 = now;
    }
    const def = clipDef(name);
    const t = a.move ? (now - this.moveT0) / 1000 : Math.max(0, ((now - a.clipStart) / 1000) * (a.clipSpeed || 1));
    const D = a.move || !(a.clipDuration > 0) ? Infinity : a.clipDuration;
    const speed = a.move ? a.move.speed : 0;
    if (def.gait) this.phase += def.gait(speed > 0.1 ? speed : NOMINAL[name] ?? 1.2) * dt;

    // ---- look target in root space
    let target: THREE.Vector3 | null = null;
    if (a.lookAt) {
      target = this.target.set(a.lookAt[0] - a.pos[0], a.lookAt[1] - a.pos[1], a.lookAt[2] - a.pos[2]);
      target.applyAxisAngle(THREE.Object3D.DEFAULT_UP, -a.rotY);
    }
    const holdR = !!a.hold && a.hold !== 'phoneless';
    const holdL = !!a.holdLeft && a.holdLeft !== 'phoneless';
    const ctx: ClipCtx = { phase: this.phase, speed, target, flags, holdR, holdL };
    const p = poseFor(this.cur, name, t, D, ctx);
    this.overlays(p, name, t, ctx, a, camPos, dt);

    // ---- crossfade from the previous clip
    this.fadeT += dt;
    if (this.fadeT < FADE) lerpPose(this.out, this.from, p, smooth(this.fadeT / FADE));
    else copyPose(this.out, p);
    const o = this.out;

    // ---- head tracking toward lookAt (after the fade so it stays smooth across clips)
    const wantLook = target && !HEAD_CLIPS.has(name) ? 1 : 0;
    this.lookW += (wantLook - this.lookW) * damp(5, dt);
    let gx = 0;
    let gy = 0;
    if (target) {
      const neckY = DIM.PELVIS_Y + DIM.WAIST_DY + DIM.NECK_DY + o.py;
      const yaw = Math.atan2(target.x, Math.max(target.z, -2));
      const bodyYaw = o.hy + o.sy;
      const want = clamp(yaw - bodyYaw, -1.15, 1.15);
      const pitch = -Math.atan2(target.y - (neckY + 0.14), Math.hypot(target.x, target.z));
      const wantP = clamp(pitch, -0.45, 0.55);
      o.ny = lerp(o.ny, want + (o.ny - 0) * 0.15, this.lookW);
      o.np = lerp(o.np, wantP + o.np * 0.2, this.lookW);
      if (Math.abs(yaw - bodyYaw) > 1.15 && !a.move) o.sy += clamp(yaw - bodyYaw - Math.sign(yaw) * 1.15, -0.5, 0.5) * this.lookW;
      gx = clamp((yaw - (o.hy + o.sy + o.ny)) / 0.45, -1, 1);
      gy = clamp((pitch - o.np) / 0.4, -1, 1);
    }
    this.gazeX += (gx - this.gazeX) * damp(10, dt);
    this.gazeY += (gy - this.gazeY) * damp(10, dt);

    this.apply(o);
    this.orientSockets(o);

    // ---- face and antenna
    this.face.update(now / 1000, dt, { ...face, gazeX: this.gazeX, gazeY: this.gazeY, flags });
    this.antennaCol.lerp(_c.set(statusColor), damp(6, dt));
    const pulse = 1.35 + 0.35 * Math.sin(now / 1000 * 4.2);
    this.antennaMat.emissive.copy(this.antennaCol);
    this.antennaMat.emissiveIntensity = pulse;
    this.haloMat.color.copy(this.antennaCol);
    this.haloMat.opacity = 0.2 + 0.1 * Math.sin(now / 1000 * 4.2);
  }

  /* -------------------------------------------------------------------------- overlays */

  private overlays(p: Pose, name: string, t: number, c: ClipCtx, a: ActorState, camPos: THREE.Vector3, dt: number) {
    const f = c.flags;
    const armFree = ARM_FREE.has(name);
    const seated = !!f.seated || !!f.inBus || name === 'sitDrive';
    const seatH = num(f.seatHeight, 0.42);
    if (seated && name !== 'sitDrive') {
      // keep the clip's upper body, replace pelvis height and legs
      seatedLegs(p, seatH);
      if (armFree) {
        for (const s of SIDES) {
          const sg = sideSign(s);
          ikTo(p, s, sg * 0.15, seatH + 0.2, 0.2, 1, 0.45);
          armVals(p, s, { wy: -0.9, wx: 0.25, fi: 0.2, fm: 0.25, fr: 0.3, fp: 0.35, t: 0.3 }, 1);
        }
      }
    }

    // turn around in the seat (or standing) toward the camera
    const turn = !!f.turnToCamera;
    this.turnW += ((turn ? 1 : 0) - this.turnW) * damp(4, dt);
    if (this.turnW > 0.001) {
      v1.copy(camPos).sub(this.root.parent ? this.root.parent.localToWorld(v2.copy(this.root.position)) : this.root.position);
      v1.applyAxisAngle(THREE.Object3D.DEFAULT_UP, -a.rotY);
      const yaw = Math.atan2(v1.x, v1.z);
      const w = this.turnW;
      const pel = clamp(yaw * 0.2, -0.3, 0.3);
      const sp = clamp(yaw * 0.45, -0.75, 0.75);
      p.hy += pel * w;
      p.sy += sp * w;
      p.ny = lerp(p.ny, clamp(yaw - pel - sp, -1.1, 1.1), w);
      p.np = lerp(p.np, 0.02, w);
      if (name === 'sitDrive') {
        // the hand on the side he turns toward leaves the wheel and talks; the other stays on it
        const s: Side = yaw > 0 ? 'l' : 'r';
        const beat = Math.sin(t * Math.PI * 2 * 0.8);
        armVals(p, s, { ik: 0, sx: 0.45 + 0.08 * beat, sz: 0.3, sy: 0.3, e: 1.25 + 0.15 * beat, wy: -1.1, wx: -0.2, fi: 0.1, fm: 0.12, fr: 0.16, fp: 0.2, t: 0.25 }, w);
      }
    }

    // holding a child's hand (holdHandWalk clip, or flag holdHand: 'r'|'l'|'both')
    const hh = sidesOf(f.holdHand ?? (name === 'holdHandWalk' ? 'r' : undefined), 'r');
    if (hh.length && name !== 'sitDrive') {
      const y = num(f.holdHandY, 0.62);
      const swing = name === 'holdHandWalk' || name === 'walk' ? Math.sin(c.phase * Math.PI * 2) * 0.03 : 0;
      for (const s of hh) {
        const sg = sideSign(s);
        ikTo(p, s, sg * num(f.holdHandX, 0.3), y + 0.015 * Math.abs(swing), num(f.holdHandZ, 0.06) + swing, 1, 0.85);
        armVals(p, s, { wy: -0.2, wx: 0.15, wz: 0.1, fi: 0.62, fm: 0.66, fr: 0.7, fp: 0.74, t: 0.45 }, 1);
      }
    }

    // a hand resting on a child's shoulder (flag handOnShoulder: 'r'|'l')
    for (const s of sidesOf(f.handOnShoulder, 'r')) {
      const sg = sideSign(s);
      ikTo(p, s, sg * num(f.shoulderX, 0.3), num(f.shoulderY, 0.98), num(f.shoulderZ, 0.18), 1, 0.9);
      armVals(p, s, { wy: 1.35, wx: 0.45, wz: 0, fi: 0.3, fm: 0.32, fr: 0.36, fp: 0.4, t: 0.3 }, 1);
    }

    // reaching forward to grip something (goal post, swing chain, door, cart): flag reach: 'r'|'l'|'both'
    for (const s of sidesOf(f.reach, 'r')) {
      const sg = sideSign(s);
      ikTo(p, s, sg * num(f.reachX, 0.16), num(f.reachY, 1.0), num(f.reachZ, 0.36), 1, 0.6);
      armVals(p, s, { wy: -0.1, wx: 0.1, wz: 0.2, fi: 0.86, fm: 0.9, fr: 0.92, fp: 0.94, t: 0.7 }, 1);
    }

    // open umbrella held up (flag umbrellaOpen, or simply holding 'umbrella')
    const umb = !!f.umbrellaOpen || a.hold === 'umbrella' || a.holdLeft === 'umbrella';
    if (umb && name !== 'closeUmbrella') {
      const s: Side = a.holdLeft === 'umbrella' && a.hold !== 'umbrella' ? 'l' : f.umbrellaOpen === 'l' ? 'l' : 'r';
      const sg = sideSign(s);
      const walk = c.speed > 0.1 ? Math.sin(c.phase * Math.PI * 4) * 0.008 : 0;
      ikTo(p, s, sg * 0.15, (seated ? seatH + 0.5 : 0.92) + walk, 0.22, 1, 0.3);
      armVals(p, s, { wy: -0.2, wx: 0.1, fi: 0.86, fm: 0.9, fr: 0.92, fp: 0.94, t: 0.7 }, 1);
    }

    // anything held: fingers close around it
    if (c.holdR) armVals(p, 'r', { fi: 0.86, fm: 0.9, fr: 0.92, fp: 0.94, t: 0.7 }, 0.85);
    if (c.holdL) armVals(p, 'l', { fi: 0.86, fm: 0.9, fr: 0.92, fp: 0.94, t: 0.7 }, 0.85);
  }

  /* -------------------------------------------------------------------------- apply */

  private apply(p: Readonly<Pose>) {
    this.pelvis.position.set(p.px, DIM.PELVIS_Y + p.py, p.pz);
    this.pelvis.rotation.set(p.hp, p.hy, p.hr, 'YXZ');
    this.spine.rotation.set(p.sp, p.sy, p.sr, 'YXZ');
    this.neck.rotation.set(p.np, p.ny, p.nr, 'YXZ');
    this.pelvis.updateMatrix();
    this.spine.updateMatrix();
    // spine frame in root space
    m1.multiplyMatrices(this.pelvis.matrix, this.spine.matrix);
    q3.setFromRotationMatrix(m1);
    const spineInv = q2.copy(q3).invert();

    for (const s of SIDES) {
      const A = this.arms[s];
      const sg = sideSign(s);
      e1.set(-p[`${s}sx`], -sg * p[`${s}sy`], sg * p[`${s}sz`], 'ZXY');
      A.upper.quaternion.setFromEuler(e1);
      let elbow = p[`${s}e`];
      const w = clamp(p[`${s}ik`], 0, 1);
      if (w > 0.001) {
        const start = v1.copy(A.upper.position).applyMatrix4(m1);
        const tgt = v2.set(p[`${s}ikx`], p[`${s}iky`], p[`${s}ikz`]);
        const po = clamp(p[`${s}po`], 0, 1);
        const pole = v3.set(sg * po, lerp(-0.45, -0.2, po), lerp(-1, -0.25, po)).normalize();
        const bend = solveTwoBone(start, tgt, DIM.UPPER, DIM.FORE, pole, 1, q1);
        q1.premultiply(spineInv);
        A.upper.quaternion.slerp(q1, w);
        elbow = lerp(elbow, bend, w);
      }
      A.fore.rotation.set(-Math.max(0, elbow), 0, 0);
      A.hand.rotation.set(-p[`${s}wz`], -sg * p[`${s}wy`], -sg * p[`${s}wx`], 'YZX');
      const curls = [p[`${s}fi`], p[`${s}fm`], p[`${s}fr`], p[`${s}fp`]];
      for (let i = 0; i < 4; i++) {
        const cu = clamp(curls[i], -0.1, 1);
        A.fingers[i][0].rotation.set(0, 0, -sg * 1.5 * cu);
        A.fingers[i][1].rotation.set(0, 0, -sg * 1.6 * cu);
      }
      const th = clamp(p[`${s}t`], 0, 1);
      A.thumb[0].rotation.set(lerp(-1.15, -0.5, th), 0, lerp(sg * 0.15, -sg * 1.05, th), 'XZY');
      A.thumb[1].rotation.set(0, 0, -sg * lerp(0.05, 0.9, th));
    }

    // legs: two-bone IK in root space, feet planted where the pose puts the ankles
    const pelInv = q2.copy(this.pelvis.quaternion).invert();
    for (const s of SIDES) {
      const L = this.legs[s];
      const sg = sideSign(s);
      const hip = v1.copy(L.thigh.position).applyMatrix4(this.pelvis.matrix);
      const ankle = v2.set(sg * DIM.HIP_X + p[`${s}ax`], DIM.ANKLE_H + p[`${s}ay`], p[`${s}az`]);
      const aw = p[`${s}aw`];
      const pole = v3.set(Math.sin(aw) + sg * 0.12, 0, Math.cos(aw)).normalize();
      const bend = solveTwoBone(hip, ankle, DIM.THIGH, DIM.SHIN, pole, -1, q1);
      L.thigh.quaternion.copy(q1).premultiply(pelInv);
      L.shin.rotation.set(bend, 0, 0);
      // foot orientation in root space: yaw then pitch
      e1.set(p[`${s}ap`], aw, 0, 'YXZ');
      q3.setFromEuler(e1);
      q1.multiply(L.shin.quaternion).invert(); // inverse of the shin's root-space orientation
      L.foot.quaternion.copy(q1).multiply(q3);
    }
  }

  /** Held items stay upright in the robot's frame (tilted by the pose's ix / iz). */
  private orientSockets(p: Readonly<Pose>) {
    this.root.updateMatrix();
    for (const s of SIDES) {
      const A = this.arms[s];
      // hand orientation relative to the root
      m2.copy(this.pelvis.matrix).multiply(this.spine.matrix);
      for (const o of [A.upper, A.fore, A.hand]) {
        o.updateMatrix();
        m2.multiply(o.matrix);
      }
      q1.setFromRotationMatrix(m2).invert();
      e1.set(p[`${s}ix`], 0, p[`${s}iz`], 'XYZ');
      A.socket.quaternion.copy(q1).multiply(q3.setFromEuler(e1));
    }
  }
}

const _c = new THREE.Color();

function ikTo(p: Pose, s: Side, x: number, y: number, z: number, k: number, po: number) {
  p[`${s}ik`] = lerp(p[`${s}ik`], 1, k);
  p[`${s}ikx`] = x;
  p[`${s}iky`] = y;
  p[`${s}ikz`] = z;
  p[`${s}po`] = lerp(p[`${s}po`], po, k);
}
function armVals(p: Pose, s: Side, v: Record<string, number>, k: number) {
  for (const key in v) {
    const pk = `${s}${key}` as keyof Pose;
    p[pk] = lerp(p[pk], v[key], k);
  }
}

