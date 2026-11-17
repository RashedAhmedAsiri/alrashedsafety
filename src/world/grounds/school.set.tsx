/**
 * Alrashed school grounds (set-school): everything inside the school fence. WORLD coordinates.
 *
 *   compound ground (sand paving, painted yard, football turf, back lawn), fence + railing, main gate with
 *   sliding leaf, guard room and waiting area, the two-floor building exterior, the assembly yard
 *   (canopy, stage, benches, coolers, palms, assembly point sign), the football field.
 *
 * All static geometry is baked into a few vertex-colored meshes (./school/batch.ts); ground, rails, nets
 * and signs use shared painted textures. Landmarks: ./school/layout.ts (SCHOOL_LANDMARKS) and
 * docs/sets/school.md.
 *
 * Stage flags this set reads:
 *   gateOpen     true            the sliding gate leaf slides open (default closed)
 *   alarm        true            the red beacons on the building flash
 *   exitGlow     true            the green exit signs glow brighter
 *   schoolPeople false           hides the background students
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../../core/store';
import { useStage } from '../../core/stage';
import { Crowd, StaticPerson, type CrowdMember } from '../../characters/Human';
import { Batch } from './school/batch';
import { buildBuilding, type Batches } from './school/building';
import { buildFence, buildGate, buildGuardRoom, buildWaiting, type Extra } from './school/compound';
import { buildYard } from './school/yard';
import { buildField } from './school/field';
import { COMPOUND, FIELD, GATE, NOTCH, SLIDING_GATE, YARD_TEX } from './school/layout';
import { PAVING_REPEAT_M } from './school/textures';
import { schoolMats, rectsGeometry, subtract, type Rect } from './school/materials';

/* ------------------------------------------------------------ geometry (built once per page load) */

interface Built {
  dry: THREE.BufferGeometry;
  wet: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  clear: THREE.BufferGeometry;
  glow: THREE.BufferGeometry;
  sign: THREE.BufferGeometry;
  signGlow: THREE.BufferGeometry;
  alarm: THREE.BufferGeometry;
  rail: THREE.BufferGeometry;
  net: THREE.BufferGeometry;
  chain: THREE.BufferGeometry;
  leafDry: THREE.BufferGeometry;
  leafRail: THREE.BufferGeometry;
  paving: THREE.BufferGeometry;
  grass: THREE.BufferGeometry;
  yard: THREE.BufferGeometry;
  turf: THREE.BufferGeometry;
  ramp: THREE.BufferGeometry;
}

let built: Built | null = null;

function buildAll(): Built {
  if (built) return built;
  const B: Batches & Extra = {
    dry: new Batch(),
    wet: new Batch({ ao: 0.1 }),
    glass: new Batch({ ao: 0 }),
    clear: new Batch({ ao: 0 }),
    glow: new Batch({ ao: 0 }),
    sign: new Batch({ ao: 0, uv: true }),
    signGlow: new Batch({ ao: 0, uv: true }),
    alarm: new Batch({ ao: 0 }),
    rail: new Batch({ ao: 0, uv: true }),
    net: new Batch({ ao: 0, uv: true }),
    chain: new Batch({ ao: 0, uv: true }),
    leafDry: new Batch({ ao: 0.1 }),
    leafRail: new Batch({ ao: 0, uv: true }),
  };
  buildBuilding(B);
  buildFence(B, B);
  buildGate(B, B);
  buildGuardRoom(B);
  buildWaiting(B);
  buildYard(B);
  buildField(B, B);

  /* ground: compound minus the lay-by notch, split into non-overlapping layers */
  const C = COMPOUND;
  const base: Rect[] = [
    { x0: C.x0, z0: C.z0, x1: C.x1, z1: NOTCH.z },
    { x0: C.x0, z0: NOTCH.z, x1: NOTCH.x0, z1: C.z1 },
    { x0: NOTCH.x1, z0: NOTCH.z, x1: C.x1, z1: C.z1 },
  ];
  const lawn: Rect[] = [{ x0: C.x0, z0: C.z0, x1: C.x1, z1: -75 }];
  const yardR: Rect = { x0: YARD_TEX.x0, z0: YARD_TEX.z0, x1: YARD_TEX.x1, z1: YARD_TEX.z1 };
  const fieldR: Rect = { x0: FIELD.x0, z0: FIELD.z0, x1: FIELD.x1, z1: FIELD.z1 };
  let rest = base;
  for (const cut of [...lawn, yardR, fieldR]) rest = subtract(rest, cut);
  const lawnRects = lawn;
  const yardUV = (x: number, z: number): [number, number] => [(x - YARD_TEX.x0) / (YARD_TEX.x1 - YARD_TEX.x0), 1 - (z - YARD_TEX.z0) / (YARD_TEX.z1 - YARD_TEX.z0)];
  const turfUV = (x: number, z: number): [number, number] => [(x - FIELD.x0) / (FIELD.x1 - FIELD.x0), 1 - (z - FIELD.z0) / (FIELD.z1 - FIELD.z0)];
  const worldUV = (rep: number) => (x: number, z: number): [number, number] => [x / rep, -z / rep];
  // yard texture pieces: the part north of the notch line spans the full yard, the strip beside the
  // notch (z > -10.5, x > -16) covers the gate front
  const yardPieces: Rect[] = [
    { x0: yardR.x0, z0: yardR.z0, x1: yardR.x1, z1: NOTCH.z },
    { x0: NOTCH.x1, z0: NOTCH.z, x1: yardR.x1, z1: yardR.z1 },
  ];

  /* gate threshold ramp: sidewalk 0.15 at z -7.5 down to 0 at z -7.9 */
  const ramp = new THREE.BufferGeometry();
  const rx0 = GATE.x0;
  const rx1 = GATE.x1;
  ramp.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([rx0, 0.004, -7.9, rx0, 0.15, -7.5, rx1, 0.15, -7.5, rx1, 0.004, -7.9], 3),
  );
  ramp.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0.37, 0, 1, 0.37, 0, 1, 0.37, 0, 1, 0.37], 3));
  ramp.setAttribute('uv', new THREE.Float32BufferAttribute([rx0 / 2.4, 7.9 / 2.4, rx0 / 2.4, 7.5 / 2.4, rx1 / 2.4, 7.5 / 2.4, rx1 / 2.4, 7.9 / 2.4], 2));
  ramp.setIndex([0, 1, 2, 0, 2, 3]);
  ramp.computeBoundingSphere();

  built = {
    dry: B.dry.build(),
    wet: B.wet.build(),
    glass: B.glass.build(),
    clear: B.clear.build(),
    glow: B.glow.build(),
    sign: B.sign.build(),
    signGlow: B.signGlow.build(),
    alarm: B.alarm.build(),
    rail: B.rail.build(),
    net: B.net.build(),
    chain: B.chain.build(),
    leafDry: B.leafDry.build(),
    leafRail: B.leafRail.build(),
    paving: rectsGeometry(rest, 0, worldUV(PAVING_REPEAT_M)),
    grass: rectsGeometry(lawnRects, 0.004, worldUV(4)),
    yard: rectsGeometry(yardPieces, 0.002, yardUV),
    turf: rectsGeometry([fieldR], 0.002, turfUV),
    ramp,
  };
  void SLIDING_GATE;
  return built;
}

/* ------------------------------------------------------------ parts */

function Static() {
  const g = useMemo(buildAll, []);
  const m = useMemo(schoolMats, []);
  const shadows = useApp((s) => s.settings.quality) !== 'low';
  const Mesh = ({ geo, mat, cast = false, receive = true }: { geo: THREE.BufferGeometry; mat: THREE.Material; cast?: boolean; receive?: boolean }) => (
    <mesh geometry={geo} material={mat} castShadow={cast && shadows} receiveShadow={receive} />
  );
  return (
    <group name="school-static">
      <Mesh geo={g.paving} mat={m.paving} />
      <Mesh geo={g.grass} mat={m.grass} />
      <Mesh geo={g.yard} mat={m.yard} />
      <Mesh geo={g.turf} mat={m.turf} />
      <Mesh geo={g.ramp} mat={m.paving} />
      <Mesh geo={g.dry} mat={m.dry} cast />
      <Mesh geo={g.wet} mat={m.wet} cast />
      <Mesh geo={g.glass} mat={m.glass} receive={false} />
      <Mesh geo={g.clear} mat={m.clear} receive={false} />
      <Mesh geo={g.glow} mat={m.glow} receive={false} />
      <Mesh geo={g.sign} mat={m.sign} />
      <Mesh geo={g.signGlow} mat={m.signGlow} receive={false} />
      <Mesh geo={g.alarm} mat={m.alarm} receive={false} />
      <Mesh geo={g.rail} mat={m.rail} cast />
      <Mesh geo={g.net} mat={m.net} />
      <Mesh geo={g.chain} mat={m.chain} />
    </group>
  );
}

const _c = new THREE.Color();

/** Sliding gate leaf plus flag-driven lights (alarm beacons, exit signs). */
function Dynamic() {
  const g = useMemo(buildAll, []);
  const m = useMemo(schoolMats, []);
  const leaf = useRef<THREE.Group>(null);
  const x = useRef(useStage.getState().flags.gateOpen === true ? SLIDING_GATE.openX : 0);
  useFrame((_, dt) => {
    const f = useStage.getState().flags;
    const target = f.gateOpen === true ? SLIDING_GATE.openX : 0;
    x.current += (target - x.current) * Math.min(1, dt * 3);
    if (Math.abs(target - x.current) < 0.002) x.current = target;
    if (leaf.current) leaf.current.position.x = x.current;
    const t = performance.now() / 1000;
    const on = f.alarm === true;
    const k = on ? (t % 0.8 < 0.4 ? 1 : 0.18) : 0.5;
    m.alarm.color.copy(_c.setRGB(k, k * 0.9, k * 0.9));
    m.signGlow.emissiveIntensity = f.exitGlow === true ? 1.6 : 0.7;
  });
  return (
    <group ref={leaf} name="school-gate-leaf" position={[x.current, 0, 0]}>
      <mesh geometry={g.leafDry} material={m.dry} castShadow receiveShadow />
      <mesh geometry={g.leafRail} material={m.rail} />
    </group>
  );
}

/* ------------------------------------------------------------ background students */

const YARD_KIDS: CrowdMember[] = [
  // east play area (sunny): two chasing, a group talking
  { kind: 'boy', seed: 21, position: [14.5, 0, -26], rotY: 0.6, clip: 'run', path: [[14.5, 0, -26], [19.5, 0, -24], [18.5, 0, -29], [14, 0, -29]], speed: 2.2 },
  { kind: 'boy', seed: 22, position: [16.5, 0, -24.5], rotY: 0.6, clip: 'run', path: [[16.5, 0, -24.5], [20, 0, -28], [16, 0, -30.5], [13.5, 0, -26]], speed: 2.0 },
  { kind: 'boy', seed: 23, position: [19.2, 0, -33.2], rotY: 2.8, clip: 'talk' },
  { kind: 'boy', seed: 24, position: [18.2, 0, -33.4], rotY: 3.4, clip: 'laugh' },
  { kind: 'boy', seed: 25, position: [18.8, 0, -34.4], rotY: 0.2, clip: 'talk' },
  // walkers between the building and the field path
  { kind: 'boy', seed: 26, position: [10, 0, -35], clip: 'walk', path: [[10, 0, -35.5], [22, 0, -35.5], [22, 0, -20.5], [10, 0, -20.5]], speed: 1.1 },
  { kind: 'boy', seed: 27, position: [22, 0, -28], clip: 'walk', path: [[22, 0, -28], [22, 0, -20.5], [10, 0, -20.5], [10, 0, -35.5], [22, 0, -35.5]], speed: 1.1 },
  // under the canopy
  { kind: 'boy', seed: 28, position: [-17.7, 0.44, -27.5], rotY: 0, clip: 'sit' },
  { kind: 'boy', seed: 29, position: [-17.0, 0.44, -27.5], rotY: 0, clip: 'sit' },
  { kind: 'boy', seed: 30, position: [-12.8, 0.44, -19.5], rotY: Math.PI, clip: 'sit' },
  { kind: 'boy', seed: 31, position: [-20.3, 0, -23.5], rotY: Math.PI / 2, clip: 'drink' },
  { kind: 'boy', seed: 32, position: [-9.5, 0, -30.5], rotY: 2.4, clip: 'talk' },
  { kind: 'boy', seed: 33, position: [-8.6, 0, -30.2], rotY: 3.6, clip: 'talk' },
  // arcade
  { kind: 'boy', seed: 34, position: [-21.2, 0.44, -39.2], rotY: 0, clip: 'sit' },
  { kind: 'boy', seed: 35, position: [-26, 0, -38.9], clip: 'walk', path: [[-33, 0, -38.9], [-18, 0, -38.9]], speed: 1.0 },
];

const FIELD_KIDS: CrowdMember[] = [
  { kind: 'boy', seed: 41, position: [35, 0, -36], clip: 'run', path: [[35, 0, -36], [43, 0, -32], [40, 0, -38], [34, 0, -33]], speed: 2.6 },
  { kind: 'boy', seed: 42, position: [42, 0, -34], clip: 'run', path: [[42, 0, -34], [36, 0, -37], [44, 0, -37]], speed: 2.4 },
  { kind: 'boy', seed: 43, position: [39, 0, -39.8], rotY: 0, clip: 'idle' },
  { kind: 'boy', seed: 44, position: [27.3, 0.44, -29.4], rotY: Math.PI / 2, clip: 'sit' },
  { kind: 'boy', seed: 45, position: [27.3, 0.44, -28.8], rotY: Math.PI / 2, clip: 'sit' },
];

function People() {
  const show = useStage((s) => s.flags.schoolPeople !== false);
  if (!show) return null;
  return (
    <group name="school-people">
      <Crowd people={YARD_KIDS} />
      <Crowd people={FIELD_KIDS} />
      <StaticPerson kind="teacher" seed={51} position={[1.2, 0, -37.0]} rotY={0.4} clip="idle" />
    </group>
  );
}

function SchoolSet() {
  return (
    <group name="set-school">
      <Static />
      <Dynamic />
      <People />
    </group>
  );
}

export const outdoorParts = [SchoolSet];
