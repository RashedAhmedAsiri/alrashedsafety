/**
 * Pose data and skeleton instances for humans.
 *
 * A Pose holds, per bone, an Euler rotation (XYZ, radians, relative to the bind frame), a position
 * offset (metres, parent space) and a uniform scale (toggle bones: 0 = hidden, 1 = shown).
 * Conventions (model space: facing +Z, character's left = +X):
 *   arm / leg forward  = negative X rotation;  knee / elbow bend = +X on shin, -X on forearm
 *   head / spine pitch forward (look down) = positive X;  head turn to his left = +Y
 *   left arm out sideways = +Z, right arm out = -Z
 */
import * as THREE from 'three';
import { BONE_NAMES, BI, PARENT_INDEX, type BodyTemplate, type BoneName } from './body';

export const NB = BONE_NAMES.length;

/** Toggle bones hidden unless a clip/flag shows them. */
const HIDDEN_BY_DEFAULT: BoneName[] = [
  'eyesHappy', 'eyesSleep', 'mouthD', 'mouthO', 'indexR', 'thumbR', 'goggles', 'glovesL', 'glovesR',
  'skinShinR', 'scrape', 'bandage', 'nosebleed', 'swing', 'belt', 'lapBelt', 'collar',
];
const DEFAULT_SCALE = new Float32Array(NB).fill(1);
for (const b of HIDDEN_BY_DEFAULT) DEFAULT_SCALE[BI[b]] = 0;

export class Pose {
  r = new Float32Array(NB * 3);
  o = new Float32Array(NB * 3);
  s = new Float32Array(NB);
  /** 0 = eyes open, 1 = closed (blink squash). */
  blink = 0;
  constructor() {
    this.reset();
  }
  reset() {
    this.r.fill(0);
    this.o.fill(0);
    this.s.set(DEFAULT_SCALE);
    this.blink = 0;
    return this;
  }
  copy(p: Pose) {
    this.r.set(p.r);
    this.o.set(p.o);
    this.s.set(p.s);
    this.blink = p.blink;
    return this;
  }
  /** this = lerp(a, b, k). */
  lerp(a: Pose, b: Pose, k: number) {
    for (let i = 0; i < this.r.length; i++) {
      this.r[i] = a.r[i] + (b.r[i] - a.r[i]) * k;
      this.o[i] = a.o[i] + (b.o[i] - a.o[i]) * k;
    }
    for (let i = 0; i < NB; i++) this.s[i] = a.s[i] + (b.s[i] - a.s[i]) * k;
    this.blink = a.blink + (b.blink - a.blink) * k;
    return this;
  }
  /** Add rotation (radians). */
  rot(b: BoneName, x = 0, y = 0, z = 0) {
    const i = BI[b] * 3;
    this.r[i] += x;
    this.r[i + 1] += y;
    this.r[i + 2] += z;
    return this;
  }
  /** Add position offset (metres, parent space). */
  off(b: BoneName, x = 0, y = 0, z = 0) {
    const i = BI[b] * 3;
    this.o[i] += x;
    this.o[i + 1] += y;
    this.o[i + 2] += z;
    return this;
  }
  show(b: BoneName, v = 1) {
    this.s[BI[b]] = v;
    return this;
  }
  get(b: BoneName, axis: 0 | 1 | 2) {
    return this.r[BI[b] * 3 + axis];
  }
}

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();

/** One animated skeleton for a body template: Bone objects under a root, bound to the template. */
export class RigInstance {
  bones: THREE.Bone[];
  skeleton: THREE.Skeleton;
  local: THREE.Vector3[];
  tpl: BodyTemplate;
  constructor(tpl: BodyTemplate) {
    this.tpl = tpl;
    this.bones = BONE_NAMES.map((n) => {
      const b = new THREE.Bone();
      b.name = n;
      return b;
    });
    this.local = BONE_NAMES.map((_, i) => {
      const p = PARENT_INDEX[i];
      return tpl.bind[i].clone().sub(p >= 0 ? tpl.bind[p] : new THREE.Vector3());
    });
    this.bones.forEach((b, i) => {
      b.position.copy(this.local[i]);
      b.quaternion.copy(tpl.bindQ[i]);
      const p = PARENT_INDEX[i];
      if (p >= 0) this.bones[p].add(b);
    });
    this.bones[0].updateMatrixWorld(true);
    // inverses from the bind pose (model space)
    const inverses = this.bones.map((b) => b.matrixWorld.clone().invert());
    this.skeleton = new THREE.Skeleton(this.bones, inverses);
  }
  get root() {
    return this.bones[0];
  }
  apply(p: Pose) {
    const { bones, local, tpl } = this;
    for (let i = 0; i < NB; i++) {
      const b = bones[i];
      const k = i * 3;
      b.position.set(local[i].x + p.o[k], local[i].y + p.o[k + 1], local[i].z + p.o[k + 2]);
      _e.set(p.r[k], p.r[k + 1], p.r[k + 2]);
      if (i === BI.belt) {
        _q.setFromEuler(_e);
        b.quaternion.copy(tpl.bindQ[i]).multiply(_q);
        // the shoulder belt grows along its -Y while being pulled across
        const s = p.s[i];
        if (s < 0.01) b.scale.setScalar(1e-4);
        else b.scale.set(1, s, 1);
        continue;
      }
      b.rotation.copy(_e);
      const s = p.s[i];
      if (i === BI.eyes) b.scale.set(1, Math.max(0.08, s * (1 - p.blink * 0.92)), 1);
      else b.scale.setScalar(s < 0.001 ? 1e-4 : s);
    }
  }
}
