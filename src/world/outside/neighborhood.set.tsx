/**
 * The neighborhood (set-neighborhood): the base terrain and distant skyline of the whole world, the
 * side road with the flood dip, six villas south of the street, the park and the roadworks on the
 * south sidewalk. WORLD coordinates. Landmarks: docs/sets/neighborhood.md and ./neighborhood/layout.ts.
 *
 * Static geometry is merged per (zone, material class) by ./neighborhood/build.ts and static.ts. The
 * dynamic bits are small: flowing flood water, swings, fountain drops, birds, a cat, yard cars.
 * Stage flags read here:
 *   floodWater   true | false     force the flood-dip stream on / off (default: follows wet / rain)
 *   swingAmp     number (radians) swing of the first park swing (default 0, the second sways softly)
 *   swingRider   true             hides the first park swing (a boy on the 'swing' clip brings his own)
 *   neighborhoodLife false        hides birds, the cat and the background people
 *   yardCars     false            hides the cars parked in the villa front yards
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { canvasTexture } from '../kit';
import { registerWet } from '../wet';
import { useApp } from '../../core/store';
import { useStage } from '../../core/stage';
import { weatherBlend } from '../../weather';
import { CarModel } from '../../props/models';
import { StaticPerson } from '../../characters/Human';
import { Builder, CASTS, type Cls } from './neighborhood/build';
import { buildNeighborhoodStatic } from './neighborhood/static';
import { neighborhoodAtlas } from './neighborhood/atlas';
import { CAT, DIP, PARK, POLES, WATER, YARD_CARS } from './neighborhood/layout';

/* --------------------------------------------------------------- materials */

type MatKey = Cls | 'terrain';
let materials: Record<MatKey, THREE.Material> | null = null;

function neighborhoodMaterials(): Record<MatKey, THREE.Material> {
  if (materials) return materials;
  const std = (o: THREE.MeshStandardMaterialParameters, wet: boolean) => {
    const m = new THREE.MeshStandardMaterial({ color: '#FFFFFF', vertexColors: true, roughness: 0.85, ...o });
    if (wet) registerWet(m);
    return m;
  };
  materials = {
    solid: std({ roughness: 0.8 }, false),
    wet: std({ roughness: 0.8 }, true),
    flat: std({ roughness: 0.9 }, true),
    soft: std({ roughness: 0.95 }, false),
    paint: std({ roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }, true),
    terrain: std({ roughness: 1, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8 }, false),
    atlas: new THREE.MeshStandardMaterial({
      map: neighborhoodAtlas(),
      vertexColors: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    far: std({ roughness: 1 }, false),
  };
  return materials;
}

/* --------------------------------------------------------------- geometry */

let built: { zone: string; cls: Cls; geometry: THREE.BufferGeometry }[] | null = null;
function buildAll() {
  if (built) return built;
  const b = new Builder();
  buildNeighborhoodStatic(b);
  built = b.build();
  return built;
}

/** Roadworks warning lamps: the two alternating groups flash at 1.4 Hz. */
function BlinkMesh({ geometry, material, phase }: { geometry: THREE.BufferGeometry; material: THREE.Material; phase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.visible = (clock.elapsedTime * 1.4 + phase) % 1 < 0.5;
  });
  return <mesh ref={ref} geometry={geometry} material={material} />;
}

function NeighborhoodStatic() {
  const parts = useMemo(buildAll, []);
  const mats = useMemo(neighborhoodMaterials, []);
  const quality = useApp((s) => s.settings.quality);
  const shadows = quality !== 'low';
  return (
    <group name="neighborhood-static">
      {parts.map(({ zone, cls, geometry }, i) =>
        zone === 'lampA' || zone === 'lampB' ? (
          <BlinkMesh key={i} geometry={geometry} material={mats[cls]} phase={zone === 'lampA' ? 0 : 0.5} />
        ) : (
        <mesh
          key={i}
          geometry={geometry}
          material={mats[zone === 'terrain' ? 'terrain' : cls]}
          castShadow={shadows && CASTS[cls] && zone !== 'far'}
          receiveShadow={cls !== 'glow' && cls !== 'far'}
        />
        ),
      )}
    </group>
  );
}

/* ------------------------------------------------------------- flood water */

function waterTexture() {
  return canvasTexture(
    'neighborhood-water-v1',
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#9A7B52';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const y = (i * 53) % h;
        const x = (i * 97) % w;
        const len = 30 + ((i * 37) % 70);
        ctx.strokeStyle = i % 3 ? 'rgba(235,215,170,0.55)' : 'rgba(95,70,40,0.5)';
        ctx.lineWidth = 2 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len / 2, y + ((i % 5) - 2) * 3, x + len, y);
        ctx.stroke();
        ctx.moveTo(x - w, y);
        ctx.quadraticCurveTo(x - w + len / 2, y + ((i % 5) - 2) * 3, x - w + len, y);
        ctx.stroke();
      }
    },
    { repeat: [3, 1] },
  );
}

const LEAVES: { z: number; v: number; ph: number; k: 'leaf' | 'bottle' }[] = [
  { z: 18.2, v: 0.9, ph: 0.0, k: 'leaf' },
  { z: 19.4, v: 1.1, ph: 0.35, k: 'bottle' },
  { z: 20.6, v: 0.8, ph: 0.6, k: 'leaf' },
  { z: 21.9, v: 1.0, ph: 0.15, k: 'leaf' },
  { z: 22.6, v: 0.85, ph: 0.8, k: 'leaf' },
  { z: 17.6, v: 0.95, ph: 0.5, k: 'leaf' },
];

/** The stream across the dip, visible while it is wet or raining (or forced by the floodWater flag). */
function FloodWater() {
  const root = useRef<THREE.Group>(null);
  const tex1 = useMemo(() => waterTexture().clone(), []);
  const tex2 = useMemo(() => waterTexture().clone(), []);
  const mats = useMemo(() => {
    tex1.needsUpdate = true;
    tex2.needsUpdate = true;
    tex2.repeat.set(5, 2);
    return [
      new THREE.MeshStandardMaterial({ map: tex1, transparent: true, opacity: 0.86, roughness: 0.25, metalness: 0.05, depthWrite: false, color: '#FFFFFF' }),
      new THREE.MeshStandardMaterial({ map: tex2, transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false, color: '#D8C7A0' }),
    ];
  }, [tex1, tex2]);
  const floaters = useRef<(THREE.Object3D | null)[]>([]);
  const { x0, x1, z0, z1, y } = WATER;
  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    const flag = useStage.getState().flags.floodWater;
    const amount = flag === true ? 1 : flag === false ? 0 : Math.min(1, Math.max(weatherBlend.wet, weatherBlend.rain) * 1.6);
    g.visible = amount > 0.03;
    if (!g.visible) return;
    mats[0].opacity = 0.86 * Math.min(1, amount * 1.4);
    mats[1].opacity = 0.35 * amount;
    tex1.offset.x -= dt * 0.35;
    tex2.offset.x -= dt * 0.6;
    tex2.offset.y += dt * 0.05;
    g.position.y = amount * 0.02;
    const t = performance.now() / 1000;
    const len = x1 - x0 - 1;
    LEAVES.forEach((l, i) => {
      const o = floaters.current[i];
      if (!o) return;
      const u = (((t * l.v) / len + l.ph) % 1 + 1) % 1;
      o.position.set(x0 + 0.5 + u * len, 0.015 + Math.sin(t * 3 + i) * 0.012, l.z + Math.sin(t * 0.8 + i * 2) * 0.12);
      o.rotation.y = t * 0.5 + i;
    });
  });
  return (
    <group ref={root} visible={false}>
      <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={mats[0]} receiveShadow>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, y + 0.012, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={mats[1]}>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
      </mesh>
      <group position={[0, y, 0]}>
        {LEAVES.map((l, i) => (
          <group key={i} ref={(o) => void (floaters.current[i] = o)}>
            {l.k === 'leaf' ? (
              <mesh scale={[0.16, 0.012, 0.09]}>
                <sphereGeometry args={[1, 8, 4]} />
                <meshStandardMaterial color={i % 2 ? '#7A9A3A' : '#8A6A35'} roughness={0.9} />
              </mesh>
            ) : (
              <group rotation={[0, 0, 0.1]}>
                <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.045, 0.045, 0.2, 10]} />
                  <meshStandardMaterial color="#CFE8F2" transparent opacity={0.85} roughness={0.2} />
                </mesh>
                <mesh position={[0.12, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.02, 0.03, 0.05, 8]} />
                  <meshStandardMaterial color="#2D8CFF" roughness={0.5} />
                </mesh>
              </group>
            )}
          </group>
        ))}
      </group>
      {/* a little white foam where the stream meets the kerbs */}
      {[z0 + 1.4, z1 - 1.4].map((z, i) => (
        <mesh key={i} position={[(x0 + x1) / 2, y + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[x1 - x0 - 0.4, 0.14]} />
          <meshStandardMaterial color="#F4EFE2" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* --------------------------------------------------------------- park life */

const swingMat = { seat: '#E4473C', clamp: '#F2B632', chain: '#9AA3AE' };

/** One swing hanging from the beam: two chains and a rubber strap seat. With flag swingRider true the
 *  first swing is hidden (a boy on the 'swing' clip brings his own seat and chains at the same spot). */
function Swing({ x, amp, phase, first }: { x: number; amp: 'flag' | number; phase: number; first?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const hidden = useStage((s) => !!first && s.flags.swingRider === true);
  useFrame(() => {
    if (!g.current) return;
    const a = amp === 'flag' ? Number(useStage.getState().flags.swingAmp ?? 0) : amp;
    g.current.rotation.x = a * Math.sin(performance.now() / 1000 * 2.3 + phase);
  });
  const S = PARK.swings;
  const L = S.beamY - 0.1 - S.seatY;
  if (hidden) return null;
  return (
    <group ref={g} position={[x, S.beamY - 0.1, S.z]}>
      {[-0.22, 0.22].map((dx) => (
        <mesh key={dx} position={[dx, -L / 2, 0]} scale={[0.018, L, 0.018]}>
          <cylinderGeometry args={[1, 1, 1, 5]} />
          <meshStandardMaterial color={swingMat.chain} metalness={0.5} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, -L, 0]} scale={[0.56, 0.06, 0.24]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={swingMat.seat} roughness={0.8} />
      </mesh>
      {[-0.22, 0.22].map((dx) => (
        <mesh key={dx} position={[dx, -L + 0.03, 0]} scale={[0.05, 0.06, 0.22]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={swingMat.clamp} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function FountainDrops() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const N = 10;
  useFrame(() => {
    const t = performance.now() / 1000;
    for (let i = 0; i < N; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const u = (t * 0.9 + i / N) % 1;
      const a = (i / N) * Math.PI * 2 * 3.1;
      const r = 0.15 + u * 0.95;
      m.position.set(Math.cos(a) * r, 2.35 + 4 * u * (1 - u) * 0.9 - u * 1.9, Math.sin(a) * r);
      m.visible = true;
    }
  });
  return (
    <group position={[PARK.fountain.x, 0, PARK.fountain.z]}>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(o) => void (refs.current[i] = o)} scale={0.07}>
          <sphereGeometry args={[1, 6, 4]} />
          <meshBasicMaterial color="#DFF4FB" />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------- wildlife */

function Bird({ p, rotY = 0, phase = 0, color = '#8C8F97', fly = false }: { p: [number, number, number]; rotY?: number; phase?: number; color?: string; fly?: boolean }) {
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  const wings = useRef<(THREE.Mesh | null)[]>([]);
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = performance.now() / 1000 + phase;
    if (fly && root.current) {
      const a = t * 0.35;
      const r = 9 + Math.sin(t * 0.2) * 1.5;
      root.current.position.set(p[0] + Math.cos(a) * r, p[1] + Math.sin(t * 0.7) * 0.8, p[2] + Math.sin(a) * r);
      root.current.rotation.y = -a - Math.PI / 2 + Math.PI;
      wings.current.forEach((w, i) => w && (w.rotation.x = (i ? -1 : 1) * Math.sin(t * 14) * 0.7));
      return;
    }
    if (head.current) {
      const peck = Math.max(0, Math.sin(t * 1.7) - 0.6) * 2.2;
      head.current.rotation.z = -peck * 0.7;
      head.current.rotation.y = Math.sin(t * 0.6) * 0.6 * (Math.sin(t * 0.23) > 0.2 ? 1 : 0);
    }
    if (tail.current) tail.current.rotation.z = 0.25 + Math.max(0, Math.sin(t * 2.3 + 1)) * 0.25;
  });
  return (
    <group ref={root} position={p} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.09, 0]} scale={[0.2, 0.13, 0.13]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0.06, 0.07, 0]} scale={[0.1, 0.09, 0.1]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#E8E4DA" roughness={0.9} />
      </mesh>
      <group ref={head} position={[0.13, 0.17, 0]}>
        <mesh scale={0.06}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[0.06, -0.005, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.025, 0.06, 0.025]}>
          <coneGeometry args={[1, 1, 6]} />
          <meshStandardMaterial color="#F2A83B" />
        </mesh>
      </group>
      <mesh ref={tail} position={[-0.17, 0.1, 0]} rotation={[0, 0, 0.25]} scale={[0.2, 0.02, 0.07]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5A5F68" roughness={0.9} />
      </mesh>
      {fly &&
        [-1, 1].map((s, i) => (
          <mesh key={s} ref={(o) => void (wings.current[i] = o)} position={[0, 0.12, s * 0.1]} scale={[0.14, 0.012, 0.22]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#6E727B" roughness={0.9} />
          </mesh>
        ))}
    </group>
  );
}

function Cat() {
  const tail = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const ear = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const t = performance.now() / 1000;
    if (tail.current) {
      tail.current.rotation.y = Math.sin(t * 1.6) * 0.45;
      tail.current.children.forEach((c, i) => (c.rotation.y = Math.sin(t * 1.6 - i * 0.8) * 0.35));
    }
    if (head.current) head.current.rotation.y = Math.sin(t * 0.4) * 0.5 * (Math.sin(t * 0.15) > 0 ? 1 : 0.3);
    if (ear.current) ear.current.rotation.z = Math.max(0, Math.sin(t * 5) - 0.85) * 1.5;
  });
  const fur = '#D98A3D';
  return (
    <group position={CAT.pos} rotation={[0, CAT.rotY, 0]}>
      <mesh position={[-0.02, 0.17, 0]} rotation={[0, 0, -0.35]} scale={[0.17, 0.3, 0.2]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color={fur} roughness={0.9} />
      </mesh>
      <mesh position={[0.07, 0.15, 0]} scale={[0.07, 0.17, 0.12]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#F4EBDD" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.1, 0.03, s * 0.085]} scale={[0.1, 0.05, 0.05]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#F4EBDD" roughness={0.9} />
        </mesh>
      ))}
      <group ref={head} position={[0.1, 0.36, 0]}>
        <mesh scale={[0.12, 0.11, 0.12]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={fur} roughness={0.9} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} ref={s === 1 ? ear : undefined} position={[0, 0.12, s * 0.07]} scale={[0.05, 0.08, 0.04]}>
            <coneGeometry args={[1, 1, 4]} />
            <meshStandardMaterial color={fur} roughness={0.9} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.1, 0.02, s * 0.05]} scale={0.02}>
            <sphereGeometry args={[1, 6, 4]} />
            <meshBasicMaterial color="#1E2A3B" />
          </mesh>
        ))}
        <mesh position={[0.115, -0.01, 0]} scale={0.018}>
          <sphereGeometry args={[1, 6, 4]} />
          <meshBasicMaterial color="#F28CA0" />
        </mesh>
      </group>
      <group ref={tail} position={[-0.14, 0.05, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} position={[-0.07 * (i ? 1 : 0), 0, 0]} rotation={[0, 0, 0]}>
            <mesh position={[-0.04, 0.0, 0]} scale={[0.1, 0.04, 0.04]}>
              <sphereGeometry args={[1, 6, 4]} />
              <meshStandardMaterial color={i === 3 ? '#8A5A2A' : fur} roughness={0.9} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Life() {
  const show = useStage((s) => s.flags.neighborhoodLife !== false);
  if (!show) return null;
  const wy = POLES.top - 0.3 - 0.5;
  return (
    <group name="neighborhood-life">
      <Cat />
      {/* birds on the utility wires in front of the houses */}
      <Bird p={[14.5, wy + 0.04, POLES.z]} rotY={0.3} phase={0} />
      <Bird p={[15.6, wy + 0.06, POLES.z]} rotY={Math.PI} phase={1.7} color="#B59A7A" />
      <Bird p={[17.0, wy + 0.06, POLES.z + 0.7]} rotY={0.2} phase={3.1} />
      <Bird p={[41, wy + 0.04, POLES.z - 0.7]} rotY={Math.PI} phase={2.2} color="#B59A7A" />
      {/* on roof edges, the park shade roof, a villa tank */}
      <Bird p={[31, 7.16, 15.45]} rotY={0.1} phase={1.1} />
      <Bird p={[8.2, 7.16, 15.45]} rotY={Math.PI} phase={4.0} color="#B59A7A" />
      <Bird p={[-42.4, 2.97, 33.45]} rotY={Math.PI / 2} phase={2.6} />
      {/* a pair flying over the park */}
      <Bird p={[-40, 13, 24]} phase={0} fly color="#6E727B" />
      <Bird p={[-40, 14, 24]} phase={2.4} fly color="#9A8F7A" />
      {/* background people: a father on the park bench, the park guard by his booth */}
      <StaticPerson kind="parent" seed={31} position={[-43.5, 0.01, 33.15]} rotY={Math.PI} clip="sit" />
      <StaticPerson kind="guard" seed={32} position={[-27.1, 0.02, 11.9]} rotY={Math.PI / 2} clip="idle" />
    </group>
  );
}

function YardCars() {
  const show = useStage((s) => s.flags.yardCars !== false);
  if (!show) return null;
  return (
    <group name="neighborhood-yard-cars">
      {YARD_CARS.map((c) => (
        <group key={c.seed} position={c.pos} rotation={[0, c.rotY, 0]}>
          <CarModel color={c.color} seed={c.seed} lights="off" />
        </group>
      ))}
    </group>
  );
}

function NeighborhoodSet() {
  const S = PARK.swings;
  return (
    <group name="set-neighborhood">
      <NeighborhoodStatic />
      <FloodWater />
      <Swing x={S.xs[0]} amp="flag" phase={0} first />
      <Swing x={S.xs[1]} amp={0.05} phase={1.3} />
      <FountainDrops />
      <Life />
      <YardCars />
    </group>
  );
}

void DIP;
export const outdoorParts = [NeighborhoodSet];
