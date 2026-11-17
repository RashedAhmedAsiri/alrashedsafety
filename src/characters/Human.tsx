// OWNER: humans worker. Keep the export and props exactly. Renders any non-robot actor (boy or adult).
/**
 * Boys and adults. Reads the actor from the stage store every frame and animates the procedural rig in
 * ./human (merged skinned mesh, vertex colours, one draw call per person). See docs/humans.md.
 */
import { useEffect, useMemo, useRef } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStage } from '../core/stage';
import type { BoySpec, CharacterKind, HoldItem, HumanClip, Vec3 } from '../core/types';
import { HoldItemMesh } from '../props/holdItems';
import { HumanModel, type HumanInput } from './human/model';
import { hashString } from './human/looks';
import { CLIPS } from './human/clips';

export { HUMAN_CLIP_INFO } from './human/clips';

const camPos = new THREE.Vector3();
const EMPTY = {};

export function Human({ actorId }: { actorId: string }) {
  const kind = useStage((s) => s.actors[actorId]?.kind) ?? 'boy';
  const specJson = useStage((s) => JSON.stringify(s.actors[actorId]?.spec ?? null));
  const hold = useStage((s) => s.actors[actorId]?.hold ?? null);
  const holdLeft = useStage((s) => s.actors[actorId]?.holdLeft ?? null);
  const model = useMemo(
    () => new HumanModel((kind === 'robot' ? 'boy' : kind) as CharacterKind, actorId, JSON.parse(specJson) ?? undefined),
    [kind, actorId, specJson],
  );
  useEffect(() => () => model.dispose(), [model]);
  const input = useRef<HumanInput>({
    clip: 'idle', clipStart: 0, clipDuration: 0, clipSpeed: 1, moving: false, moveSpeed: 0, flags: EMPTY,
    holdR: false, holdL: false, lookLocal: null,
  });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const a = useStage.getState().actors[actorId];
    if (!a) {
      model.root.visible = false;
      return;
    }
    state.camera.getWorldPosition(camPos);
    model.root.position.set(a.pos[0], a.pos[1], a.pos[2]);
    model.root.rotation.set(0, a.rotY, 0);
    model.root.visible = a.visible;
    if (!a.visible) return;
    const i = input.current;
    i.clip = a.move ? a.move.clip : (a.clip as string);
    i.clipStart = a.clipStart;
    i.clipDuration = a.clipDuration;
    i.clipSpeed = a.clipSpeed;
    i.moving = !!a.move;
    i.moveSpeed = a.move?.speed ?? 0;
    i.flags = a.flags ?? EMPTY;
    i.holdR = !!a.hold && a.hold !== ('phoneless' as HoldItem);
    i.holdL = !!a.holdLeft && a.holdLeft !== ('phoneless' as HoldItem);
    if (a.lookAt) {
      tmp.set(a.lookAt[0] - a.pos[0], a.lookAt[1] - a.pos[1], a.lookAt[2] - a.pos[2]).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -a.rotY);
      i.lookLocal = [tmp.x, tmp.y, tmp.z];
    } else i.lookLocal = null;
    model.update(i, performance.now());
  });

  return (
    <>
      <primitive object={model.root} />
      {hold && hold !== ('phoneless' as HoldItem) ? createPortal(<HoldItemMesh item={hold} />, model.socketR) : null}
      {holdLeft && holdLeft !== ('phoneless' as HoldItem) ? createPortal(<HoldItemMesh item={holdLeft} />, model.socketL) : null}
    </>
  );
}

/** Static (non-actor) background person for set dressing; renders with a fixed clip. */
export function StaticPerson({
  kind = 'boy',
  seed,
  position,
  rotY = 0,
  clip = 'idle',
  spec,
  hold = null,
  flags,
}: {
  kind?: CharacterKind;
  seed?: number;
  position: [number, number, number];
  rotY?: number;
  clip?: HumanClip;
  spec?: Partial<BoySpec>;
  hold?: HoldItem | null;
  flags?: Record<string, boolean | number | string>;
}) {
  const id = `static#${seed ?? Math.round(position[0] * 13 + position[2] * 7)}#${kind}`;
  const specJson = JSON.stringify(spec ?? null);
  const model = useMemo(() => new HumanModel(kind === ('robot' as CharacterKind) ? 'boy' : kind, id, JSON.parse(specJson) ?? undefined, 0.8), [kind, id, specJson]);
  useEffect(() => () => model.dispose(), [model]);
  const inp = useMemo<HumanInput>(
    () => ({ clip, clipStart: 0, clipDuration: 0, clipSpeed: 1, moving: false, moveSpeed: 0, flags: flags ?? EMPTY, holdR: !!hold, holdL: false, lookLocal: null }),
    [clip, flags, hold],
  );
  useFrame(() => model.update(inp, performance.now()));
  return (
    <group position={position} rotation-y={rotY}>
      <primitive object={model.root} />
      {hold ? createPortal(<HoldItemMesh item={hold} />, model.socketR) : null}
    </group>
  );
}

/** One background person in a Crowd. */
export interface CrowdMember {
  kind?: CharacterKind;
  seed?: number | string;
  spec?: Partial<BoySpec>;
  position?: Vec3;
  pos?: Vec3;
  rotY?: number;
  clip?: HumanClip;
  path?: Vec3[];
  speed?: number;
}

const CROWD_CLIPS = new Set<string>(['idle', 'talk', 'laugh', 'cheer', 'clap', 'wave', 'raiseHand', 'walk', 'run', 'sit', 'sitDesk', 'eat', 'drink']);

interface CrowdRun {
  m: HumanModel;
  mem: CrowdMember;
  inp: HumanInput;
  seg: number;
  x: number;
  z: number;
  frame: number;
}

/**
 * Many background people. Each is one skinned mesh (reduced detail, shared geometry per look) updated
 * at a rate that drops with distance; members with a `path` walk it in a loop.
 */
export function Crowd({ people }: { people: CrowdMember[]; shadows?: boolean }) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const runs = useMemo<CrowdRun[]>(
    () =>
      people.map((p, idx) => {
        const kind = p.kind ?? 'boy';
        const id = `crowd#${p.seed ?? idx}#${kind}`;
        const m = new HumanModel(kind, id, p.spec, 0.6);
        const clip = p.clip && CROWD_CLIPS.has(p.clip) ? p.clip : 'idle';
        const pos = p.position ?? p.pos ?? p.path?.[0] ?? [0, 0, 0];
        const moving = !!p.path && p.path.length > 1;
        m.root.position.set(pos[0], pos[1], pos[2]);
        m.root.rotation.y = p.rotY ?? 0;
        const inp: HumanInput = {
          clip: moving ? (p.clip === 'run' ? 'run' : 'walk') : clip,
          clipStart: -idx * 997,
          clipDuration: 0, clipSpeed: 1, moving, moveSpeed: p.speed ?? 1.3, flags: EMPTY, holdR: false, holdL: false, lookLocal: null,
        };
        if (clip === 'sit' || clip === 'sitDesk') inp.flags = { seated: true };
        return { m, mem: p, inp, seg: 0, x: pos[0], z: pos[2], frame: idx };
      }),
    [people],
  );
  useEffect(() => () => runs.forEach((r) => r.m.dispose()), [runs]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const now = performance.now();
    for (const r of runs) {
      const root = r.m.root;
      const path = r.mem.path;
      if (path && path.length > 1) {
        const a = path[r.seg % path.length];
        const b = path[(r.seg + 1) % path.length];
        const dx = b[0] - r.x;
        const dz = b[2] - r.z;
        const dist = Math.hypot(dx, dz);
        const step = (r.mem.speed ?? 1.3) * dt;
        if (dist <= step) {
          r.x = b[0];
          r.z = b[2];
          r.seg = (r.seg + 1) % path.length;
        } else {
          r.x += (dx / dist) * step;
          r.z += (dz / dist) * step;
          const target = Math.atan2(dx, dz);
          let da = target - root.rotation.y;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          root.rotation.y += da * Math.min(1, dt * 8);
        }
        root.position.set(r.x, a[1], r.z);
      }
      const dx = root.position.x - camera.position.x;
      const dz = root.position.z - camera.position.z;
      const d2 = dx * dx + dz * dz;
      const far = d2 > 90 * 90;
      root.visible = !far;
      if (far) continue;
      r.frame++;
      // distant people update less often
      if (d2 > 30 * 30 && r.frame % 3) continue;
      if (d2 > 15 * 15 && r.frame % 2) continue;
      r.m.update(r.inp, now);
    }
  });
  return (
    <group ref={group}>
      {runs.map((r, i) => (
        <primitive key={i} object={r.m.root} />
      ))}
    </group>
  );
}

void hashString;
void CLIPS;
