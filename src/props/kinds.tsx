// OWNER: props worker. One renderer per PropKind (static shapes are merged geometries from items.ts).
// Props sit on the surface at their origin (centre of the footprint), +Z is their front, size = real world.
import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mat } from '../world/kit';
import type { PropKind } from '../core/types';
import { GeoBuilder, LGEO, basic, cached, trs, vcMat } from './geo';
import * as I from './items';
import { Particles } from './fx';
import {
  basketballTexture,
  boardTexture,
  bubbleTexture,
  chevronTexture,
  footballTexture,
  allergyStickerTexture,
  holeTexture,
  manholeCoverTexture,
  peanutTexture,
  softDotTexture,
  pedSignalTexture,
  stopTexture,
  stripeTexture,
  wetFloorTexture,
  type BoardImage,
  type BubbleIcon,
} from './textures';

export type P = Record<string, unknown>;
const str = (p: P, k: string, d: string) => (typeof p[k] === 'string' ? (p[k] as string) : d);
const num = (p: P, k: string, d: number) => (typeof p[k] === 'number' && Number.isFinite(p[k]) ? (p[k] as number) : d);
const bool = (p: P, k: string, d: boolean) => (typeof p[k] === 'boolean' ? (p[k] as boolean) : d);

type V3 = [number, number, number];

/** A vertex-coloured merged mesh. */
function VC({ g, rough = 0.65, cast = true, p, r, s }: { g: THREE.BufferGeometry; rough?: number; cast?: boolean; p?: V3; r?: V3; s?: V3 | number }) {
  return <mesh geometry={g} material={vcMat(rough)} castShadow={cast} position={p} rotation={r} scale={s as never} />;
}

const texMat = (map: THREE.Texture, o: { rough?: number; side?: THREE.Side; transparent?: boolean } = {}) => {
  const key = `tm|${map.uuid}|${o.rough ?? 0.6}|${o.side ?? 0}|${o.transparent ?? false}`;
  return cached(key, () => {
    const m = new THREE.MeshStandardMaterial({ map, roughness: o.rough ?? 0.6, side: o.side ?? THREE.FrontSide, transparent: o.transparent ?? false, alphaTest: o.transparent ? 0.05 : 0 });
    return m;
  });
};

const glassM = cached('glassM', () => new THREE.MeshStandardMaterial({ color: '#CFEFFF', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }));

/* ---------------------------------------------------------------- balls, street */

function BallProp({ p }: { p: P }) {
  const kind = str(p, 'kind', 'football');
  const color = str(p, 'color', kind === 'dodge' ? '#E5484D' : '#FFFFFF');
  const r = kind === 'basketball' ? 0.12 : kind === 'dodge' ? 0.105 : 0.11;
  const m = useMemo(() => {
    if (kind === 'football') return new THREE.MeshStandardMaterial({ map: footballTexture(), roughness: 0.55, color: color === '#FFFFFF' ? '#FFFFFF' : color });
    if (kind === 'basketball') return new THREE.MeshStandardMaterial({ map: basketballTexture(), roughness: 0.7, color: color === '#FFFFFF' ? '#FFFFFF' : color });
    return new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
  }, [kind, color]);
  useEffect(() => () => m.dispose(), [m]);
  return (
    <group position={[0, r, 0]}>
      <mesh geometry={LGEO.sphere} material={m} scale={r * 2} castShadow />
      {kind === 'dodge' && (
        <>
          <mesh geometry={LGEO.torus} material={mat('#FFFFFF', { rough: 0.5 })} scale={[r * 2.02, r * 2.02, r * 2.02 * 2.6]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={LGEO.torus} material={mat('#FFFFFF', { rough: 0.5 })} scale={[r * 2.02, r * 2.02, r * 2.02 * 2.6]} rotation={[0, Math.PI / 2, 0]} />
        </>
      )}
    </group>
  );
}

function ConeProp() {
  return <VC g={I.coneGeo()} rough={0.5} />;
}

function BarrierTape({ p }: { p: P }) {
  const L = Math.max(0.5, num(p, 'length', 3));
  const key = Math.round(L * 20) / 20;
  const tape = useMemo(
    () =>
      cached(`tapeGeo:${key}`, () => {
        const g = new THREE.PlaneGeometry(key, 0.075, 28, 1);
        const pos = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const u = (2 * x) / key;
          pos.setY(i, pos.getY(i) + 0.9 - 0.07 * (1 - u * u));
        }
        g.computeVertexNormals();
        return g;
      }),
    [key],
  );
  const tm = useMemo(() => {
    const t = stripeTexture('#E23B3B', '#FFFFFF', [1, 1]).clone();
    t.repeat.set(key / 0.32, 1);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.6 });
  }, [key]);
  useEffect(() => () => tm.dispose(), [tm]);
  const post = cached('tapePost', () =>
    new GeoBuilder()
      .cyl([0, 0.5, 0], [0.04, 1.0, 0.04], '#E23B3B', undefined, 8)
      .cyl([0, 0.56, 0], [0.042, 0.1, 0.042], '#FFFFFF', undefined, 8)
      .cyl([0, 0.76, 0], [0.042, 0.1, 0.042], '#FFFFFF', undefined, 8)
      .cyl([0, 0.02, 0], [0.34, 0.04, 0.34], '#2B2F36', undefined, 14)
      .sphere([0, 1.01, 0], [0.06, 0.05, 0.06], '#E23B3B', undefined, true)
      .build(),
  );
  return (
    <group>
      <mesh geometry={tape} material={tm} castShadow />
      <VC g={post} p={[-key / 2, 0, 0]} />
      <VC g={post} p={[key / 2, 0, 0]} />
    </group>
  );
}

function Manhole() {
  const hole = useMemo(() => new THREE.MeshBasicMaterial({ map: holeTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), []);
  const cover = useMemo(() => new THREE.MeshStandardMaterial({ map: manholeCoverTexture(), roughness: 0.6, metalness: 0.3 }), []);
  useEffect(
    () => () => {
      hole.dispose();
      cover.dispose();
    },
    [hole, cover],
  );
  return (
    <group>
      {/* the open hole: dark disc with a raised iron rim */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} material={hole}>
        <circleGeometry args={[0.36, 24]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} material={mat('#5A5F68', { rough: 0.5, metal: 0.4 })}>
        <ringGeometry args={[0.34, 0.41, 24]} />
      </mesh>
      {/* cover lying beside it, slightly tilted */}
      <group position={[0.95, 0.035, 0.1]} rotation={[0.05, 0.4, -0.04]}>
        <mesh geometry={LGEO.cyl20} material={mat('#4A4F58', { rough: 0.6, metal: 0.4 })} scale={[0.72, 0.05, 0.72]} castShadow />
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.0255, 0]} material={cover}>
          <circleGeometry args={[0.36, 24]} />
        </mesh>
      </group>
    </group>
  );
}

function Puddle({ p }: { p: P }) {
  const radius = num(p, 'radius', 0.8);
  const splash = bool(p, 'splash', false);
  const shape = useMemo(
    () =>
      cached('puddleShape', () => {
        const g = new THREE.CircleGeometry(1, 36);
        const pos = g.attributes.position as THREE.BufferAttribute;
        for (let i = 1; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const a = Math.atan2(y, x);
          const k = 1 + 0.11 * Math.sin(a * 3 + 0.7) + 0.07 * Math.sin(a * 5 + 2);
          pos.setXY(i, x * k, y * k * 0.88);
        }
        g.computeVertexNormals();
        return g;
      }),
    [],
  );
  const water = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5F93B8', roughness: 0.04, metalness: 0.25, transparent: true, opacity: 0.72, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), []);
  const rim = useMemo(() => new THREE.MeshBasicMaterial({ color: '#A9CBE0', transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), []);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: '#E8F6FF', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })), []);
  useEffect(
    () => () => {
      water.dispose();
      rim.dispose();
      mats.forEach((m) => m.dispose());
    },
    [water, rim, mats],
  );
  useFrame((st) => {
    if (!splash) return;
    const t = st.clock.elapsedTime;
    rings.current.forEach((m, i) => {
      if (!m) return;
      const k = (t * 0.55 + i / 3) % 1;
      m.scale.setScalar(0.12 + k * 0.85);
      mats[i].opacity = (1 - k) * 0.85;
      m.position.set(Math.sin(i * 2.1 + Math.floor(t * 0.55 + i / 3)) * 0.35, 0.025, Math.cos(i * 1.7 + Math.floor(t * 0.55 + i / 3)) * 0.25);
    });
  });
  return (
    <group scale={radius}>
      <mesh geometry={shape} material={rim} rotation-x={-Math.PI / 2} position={[0, 0.008, 0]} scale={1.05} />
      <mesh geometry={shape} material={water} rotation-x={-Math.PI / 2} position={[0, 0.014, 0]} />
      {splash &&
        [0, 1, 2].map((i) => (
          <mesh
            key={i}
            ref={(m) => {
              rings.current[i] = m;
            }}
            rotation-x={-Math.PI / 2}
            material={mats[i]}
          >
            <ringGeometry args={[0.86, 1, 28]} />
          </mesh>
        ))}
    </group>
  );
}

/* ---------------------------------------------------------------- fire, smoke, spray */

const flameGeo = cached('flameGeo', () => {
  const pts: THREE.Vector2[] = [
    [0.001, 0], [0.34, 0.06], [0.5, 0.22], [0.46, 0.42], [0.32, 0.62], [0.15, 0.82], [0.001, 1],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 8);
});

function Fire({ p }: { p: P }) {
  const size = num(p, 'size', 0.4);
  const out = bool(p, 'out', false);
  const tongues = useRef<(THREE.Mesh | null)[]>([]);
  const group = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Sprite>(null);
  const outK = useRef(out ? 1 : 0);
  const outRef = useRef(out);
  outRef.current = out;
  const glowMat = useMemo(() => new THREE.SpriteMaterial({ map: softDotTexture(), color: '#FF8A1F', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  useEffect(() => () => glowMat.dispose(), [glowMat]);
  const cfg = useMemo(
    () => [
      { x: 0, z: 0, h: 1.0, w: 0.42, c: '#FF6A1A', ph: 0 },
      { x: 0.1, z: 0.04, h: 0.8, w: 0.34, c: '#FF8A1F', ph: 1.7 },
      { x: -0.1, z: -0.03, h: 0.75, w: 0.34, c: '#FF7A1A', ph: 3.1 },
      { x: 0.02, z: -0.1, h: 0.6, w: 0.28, c: '#FF8A1F', ph: 4.4 },
      { x: 0.0, z: 0.0, h: 0.72, w: 0.24, c: '#FFC21F', ph: 0.6 },
      { x: 0.03, z: 0.02, h: 0.45, w: 0.14, c: '#FFF3A0', ph: 2.2 },
    ],
    [],
  );
  const mats = useMemo(() => cfg.map((c) => new THREE.MeshBasicMaterial({ color: c.c, toneMapped: false, transparent: true, opacity: 0.96 })), [cfg]);
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime;
    outK.current += ((outRef.current ? 1 : 0) - outK.current) * Math.min(1, dt * 2.4);
    const live = 1 - outK.current;
    if (group.current) group.current.visible = live > 0.03;
    tongues.current.forEach((m, i) => {
      if (!m) return;
      const c = cfg[i];
      const f = 1 + 0.22 * Math.sin(t * (9 + i * 1.7) + c.ph) + 0.1 * Math.sin(t * (17 + i) + c.ph * 2);
      const w = 1 + 0.12 * Math.sin(t * (7 + i) + c.ph + 1);
      m.scale.set(size * c.w * w * live, size * c.h * f * live, size * c.w * w * live);
      m.rotation.z = 0.12 * Math.sin(t * (4 + i) + c.ph);
      m.rotation.x = 0.1 * Math.cos(t * (3.3 + i) + c.ph);
    });
    if (glow.current) {
      glow.current.scale.setScalar(size * 2.6 * (0.9 + 0.1 * Math.sin(t * 11)) * live);
      glowMat.opacity = 0.28 * live;
    }
  });
  return (
    <group ref={group}>
      {cfg.map((c, i) => (
        <mesh
          key={i}
          ref={(m) => {
            tongues.current[i] = m;
          }}
          geometry={flameGeo}
          material={mats[i]}
          position={[c.x * size * 2, 0, c.z * size * 2]}
          renderOrder={4}
        />
      ))}
      <sprite ref={glow} position={[0, size * 0.5, 0]} material={glowMat} renderOrder={3} />
    </group>
  );
}

const SMOKE_PAL = ['#B9BDC4', '#CDD0D5', '#A4A9B1', '#D9DCE0'];
function Smoke({ p }: { p: P }) {
  const density = num(p, 'density', 0.5);
  if (density < 0.02) return null;
  return <Particles mode="smoke" count={46} palette={SMOKE_PAL} size={0.4} param={Math.min(1, density * 1.6)} period={3.6} seed={4} fraction={Math.min(1, 0.35 + density)} />;
}

function Spray() {
  return <Particles mode="spray" count={110} palette={['#FFFFFF', '#F1F5F9', '#E4ECF3']} size={0.1} param={2.0} period={0.75} seed={9} />;
}

const CONFETTI = ['#E5484D', '#F5C518', '#2D8CFF', '#22B573', '#FF6FA8', '#8B5CF6', '#FF8A3D'];
function Confetti() {
  return <Particles mode="confetti" count={170} palette={CONFETTI} size={0.07} param={0} period={3.4} seed={5} restart />;
}

function DustCloud({ p }: { p: P }) {
  const c = str(p, 'color', '#D9C6A0');
  const pal = useMemo(() => [c, c], [c]);
  return <Particles mode="dust" count={44} palette={pal} size={0.5} param={num(p, 'radius', 0.9)} period={2.4} seed={3} restart />;
}

/* ---------------------------------------------------------------- panels and icons */

function WetFloorSign() {
  const face = useMemo(() => new THREE.MeshStandardMaterial({ map: wetFloorTexture(), roughness: 0.5 }), []);
  useEffect(() => () => face.dispose(), [face]);
  const frame = useMemo(
    () =>
      cached('wetSignFrame', () => {
        const b = new GeoBuilder();
        b.rbox([0, 0.015, 0], [0.4, 0.03, 0.46], '#E8B400', undefined, true);
        return b.build();
      }),
    [],
  );
  const tilt = 0.2;
  return (
    <group>
      <VC g={frame} />
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0.03, s * 0.14]} rotation={[-s * tilt, 0, 0]}>
          <mesh geometry={LGEO.box} material={mat('#FFD21F', { rough: 0.5 })} position={[0, 0.3, 0]} scale={[0.31, 0.6, 0.02]} castShadow />
          <mesh position={[0, 0.3, s * 0.0105]} rotation-y={s > 0 ? 0 : Math.PI} material={face}>
            <planeGeometry args={[0.29, 0.435]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Umbrella({ p }: { p: P }) {
  const c1 = str(p, 'color', '#E5484D');
  const c2 = str(p, 'color2', '#FFFFFF');
  const g = I.umbrellaGeo(c1, c2, 0.0, 1.18, 0.9, 0.56, false);
  return (
    <group>
      <VC g={g} rough={0.7} />
      <mesh geometry={LGEO.cyl} material={mat('#3A3F49')} position={[0, 0.02, 0]} scale={[0.34, 0.04, 0.34]} castShadow />
    </group>
  );
}

function Beaker({ p }: { p: P }) {
  const g = I.beakerGeo(str(p, 'color', '#3DDC84'));
  return (
    <group>
      <VC g={g.liq} rough={0.3} cast={false} />
      <mesh geometry={g.glass} material={glassM} renderOrder={2} />
      <VC g={g.marks} cast={false} />
    </group>
  );
}

function TrafficLight({ p }: { p: P }) {
  const state = str(p, 'state', 'red');
  const redM = useRef<THREE.MeshBasicMaterial>(null);
  const grnM = useRef<THREE.MeshBasicMaterial>(null);
  const ms = useMemo(
    () => ({
      red: new THREE.MeshBasicMaterial({ map: pedSignalTexture('red'), toneMapped: false }),
      offRed: new THREE.MeshBasicMaterial({ map: pedSignalTexture('offRed'), toneMapped: false }),
      green: new THREE.MeshBasicMaterial({ map: pedSignalTexture('green'), toneMapped: false }),
      offGreen: new THREE.MeshBasicMaterial({ map: pedSignalTexture('offGreen'), toneMapped: false }),
    }),
    [],
  );
  useEffect(() => () => Object.values(ms).forEach((m) => m.dispose()), [ms]);
  const red = useRef<THREE.Mesh>(null);
  const grn = useRef<THREE.Mesh>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  useFrame((st) => {
    const s = stateRef.current;
    const flashOn = Math.floor(st.clock.elapsedTime * 2.5) % 2 === 0;
    if (red.current) red.current.material = s === 'red' ? ms.red : ms.offRed;
    if (grn.current) grn.current.material = s === 'green' || (s === 'greenFlash' && flashOn) ? ms.green : ms.offGreen;
  });
  void redM;
  void grnM;
  const body = cached('tlBody', () =>
    new GeoBuilder()
      .cyl([0, 1.2, 0], [0.09, 2.4, 0.09], '#6E7782', undefined, 12)
      .cyl([0, 0.04, 0], [0.3, 0.08, 0.3], '#4A5563', undefined, 14)
      .rbox([0, 2.2, 0], [0.34, 0.74, 0.2], '#2B2F36', undefined, true)
      .rbox([0, 2.2, -0.0], [0.38, 0.78, 0.18], '#1B1D22', undefined, true)
      .rbox([0.0, 1.5, 0.1], [0.12, 0.12, 0.06], '#E8B400', undefined, true) // push button box
      .cyl([0.0, 1.5, 0.14], [0.07, 0.02, 0.07], '#E23B3B', [Math.PI / 2, 0, 0], 14)
      .build(),
  );
  return (
    <group>
      <VC g={body} />
      <mesh ref={red} position={[0, 2.38, 0.102]} material={ms.red}>
        <planeGeometry args={[0.3, 0.3]} />
      </mesh>
      <mesh ref={grn} position={[0, 2.03, 0.102]} material={ms.offGreen}>
        <planeGeometry args={[0.3, 0.3]} />
      </mesh>
    </group>
  );
}

function SpeechBubble({ p }: { p: P }) {
  const icon = str(p, 'icon', 'question') as BubbleIcon;
  const m = useMemo(() => new THREE.MeshBasicMaterial({ map: bubbleTexture(icon), transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }), [icon]);
  useEffect(() => () => m.dispose(), [m]);
  const mesh = useRef<THREE.Mesh>(null);
  const t0 = useRef<number | null>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useFrame((st) => {
    const o = mesh.current;
    if (!o) return;
    if (t0.current === null) t0.current = st.clock.elapsedTime;
    const age = st.clock.elapsedTime - t0.current;
    const pop = age < 0.35 ? 1 - Math.pow(1 - age / 0.35, 3) * Math.cos(age * 14) : 1;
    o.scale.setScalar(Math.max(0.001, pop) * 0.6);
    o.position.y = Math.sin(st.clock.elapsedTime * 3) * 0.04;
    if (o.parent) {
      o.parent.getWorldQuaternion(q).invert();
      o.quaternion.copy(q).multiply(st.camera.quaternion);
    }
  });
  return (
    <mesh ref={mesh} material={m} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

const arrowShape = cached('arrowShape', () => {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.55);
  sh.lineTo(0.36, 0.1);
  sh.lineTo(0.15, 0.1);
  sh.lineTo(0.15, -0.5);
  sh.lineTo(-0.15, -0.5);
  sh.lineTo(-0.15, 0.1);
  sh.lineTo(-0.36, 0.1);
  sh.closePath();
  const g = new THREE.ShapeGeometry(sh);
  g.rotateX(-Math.PI / 2); // lie flat, tip toward -Z... flip so the tip points +Z
  g.rotateY(Math.PI);
  return g;
});

function ArrowMarker({ p }: { p: P }) {
  const color = str(p, 'color', '#FFD21F');
  const fill = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, toneMapped: false, depthWrite: false }), [color]);
  const halo = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }), [color]);
  const dark = useMemo(() => new THREE.MeshBasicMaterial({ color: '#1E2A3B', transparent: true, opacity: 0.55, depthWrite: false }), []);
  const chev = useMemo(() => {
    const t = chevronTexture().clone();
    t.needsUpdate = true;
    return new THREE.MeshBasicMaterial({ map: t, color: '#FFFFFF', transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false });
  }, []);
  useEffect(
    () => () => {
      fill.dispose();
      halo.dispose();
      dark.dispose();
      chev.dispose();
    },
    [fill, halo, dark, chev],
  );
  const g = useRef<THREE.Group>(null);
  const h = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    if (g.current) g.current.position.y = 0.06 + 0.05 * Math.sin(t * 3);
    if (h.current) {
      const k = 1.1 + 0.18 * Math.sin(t * 3 + 1);
      h.current.scale.set(k, 1, k);
      halo.opacity = 0.18 + 0.14 * Math.sin(t * 3 + 1);
    }
    const tex = chev.map;
    if (tex) tex.offset.y = -((t * 0.8) % 1);
  });
  return (
    <group>
      <mesh geometry={arrowShape} material={dark} position={[0, 0.012, 0]} scale={[1.14, 1, 1.1]} renderOrder={1} />
      <group ref={g}>
        <mesh ref={h} geometry={arrowShape} material={halo} position={[0, -0.02, 0]} renderOrder={2} />
        <mesh geometry={arrowShape} material={fill} renderOrder={3} />
      </group>
    </group>
  );
}

function Rainbow() {
  const g = useMemo(
    () =>
      cached('rainbowGeo', () => {
        const b = new GeoBuilder();
        const cols = ['#FF4D4D', '#FF9A3D', '#FFE14D', '#5BD66B', '#4DB6FF', '#5B6BFF', '#A66CFF'];
        cols.forEach((c, i) => {
          const r0 = 5.0 - i * 0.22;
          const r1 = r0 - 0.22;
          const n = 40;
          for (let k = 0; k < n; k++) {
            const a0 = (k / n) * Math.PI;
            const a1 = ((k + 1) / n) * Math.PI;
            b.poly(
              [
                [Math.cos(a0) * r0, Math.sin(a0) * r0, 0],
                [Math.cos(a1) * r0, Math.sin(a1) * r0, 0],
                [Math.cos(a1) * r1, Math.sin(a1) * r1, 0],
                [Math.cos(a0) * r1, Math.sin(a0) * r1, 0],
              ],
              c,
            );
          }
        });
        return b.build();
      }),
    [],
  );
  const m = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, fog: false }), []);
  useEffect(() => () => m.dispose(), [m]);
  return <mesh geometry={g} material={m} renderOrder={1} />;
}

function BoardImageProp({ p }: { p: P }) {
  const image = str(p, 'image', 'blank') as BoardImage;
  const m = useMemo(() => new THREE.MeshBasicMaterial({ map: boardTexture(image), toneMapped: false }), [image]);
  useEffect(() => () => m.dispose(), [m]);
  const frame = cached('boardFrame', () => new GeoBuilder().rbox([0, 0.45, -0.02], [1.74, 1.04, 0.04], '#2B2F36', undefined, true).build());
  return (
    <group position={[0, 0.0, 0]}>
      <VC g={frame} p={[0, 0.0, 0]} />
      <mesh position={[0, 0.45, 0.001]} material={m}>
        <planeGeometry args={[1.6, 0.9]} />
      </mesh>
    </group>
  );
}

function PeanutSnack() {
  const front = useMemo(() => new THREE.MeshStandardMaterial({ map: peanutTexture(), roughness: 0.55 }), []);
  const sticker = useMemo(() => new THREE.MeshBasicMaterial({ map: allergyStickerTexture(), transparent: true, toneMapped: false }), []);
  useEffect(
    () => () => {
      front.dispose();
      sticker.dispose();
    },
    [front, sticker],
  );
  const bag = cached('peanutBag', () =>
    new GeoBuilder().rbox([0, 0.09, 0], [0.125, 0.18, 0.03], '#F5C518', undefined, true).box([0, 0.178, 0], [0.125, 0.012, 0.034], '#E5A800').build(),
  );
  return (
    <group rotation={[-0.08, 0, 0]}>
      <VC g={bag} />
      <mesh position={[0, 0.09, 0.0158]} material={front}>
        <planeGeometry args={[0.11, 0.165]} />
      </mesh>
      <mesh position={[0.036, 0.145, 0.0165]} material={sticker}>
        <planeGeometry args={[0.045, 0.045]} />
      </mesh>
    </group>
  );
}

function Goggles() {
  return (
    <group>
      <VC g={I.gogglesGeo()} rough={0.5} p={[0, 0.0, 0]} />
      <mesh geometry={I.goggleLensGeo()} material={glassM} renderOrder={2} />
    </group>
  );
}

function StopSign() {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ map: stopTexture(true), transparent: true, side: THREE.DoubleSide, toneMapped: false, alphaTest: 0.3 }), []);
  useEffect(() => () => m.dispose(), [m]);
  return (
    <group>
      <VC g={I.stopSignGeo()} />
      <mesh position={[0, 1.55, 0.016]} material={m}>
        <planeGeometry args={[0.44, 0.44]} />
      </mesh>
      <mesh position={[0, 1.55, -0.016]} rotation-y={Math.PI} material={m}>
        <planeGeometry args={[0.44, 0.44]} />
      </mesh>
      <mesh geometry={LGEO.cyl} material={mat('#4A5563')} position={[0, 1.55, 0]} scale={[0.4, 0.02, 0.4]} rotation-x={Math.PI / 2} />
    </group>
  );
}

function BallCart() {
  const g = useMemo(
    () =>
      cached('ballCart', () => {
        const b = new GeoBuilder();
        const steel = '#8E98A6';
        b.rbox([0, 0.16, 0], [0.9, 0.04, 0.55], '#4A5563', undefined, true);
        for (const sx of [-1, 1])
          for (const sz of [-1, 1]) {
            b.beam([sx * 0.43, 0.16, sz * 0.26], [sx * 0.43, 0.95, sz * 0.26], 0.03, steel, true);
            b.cyl([sx * 0.38, 0.065, sz * 0.22], [0.1, 0.05, 0.1], '#2B2F36', [Math.PI / 2, 0, 0], 8);
            b.beam([sx * 0.38, 0.16, sz * 0.22], [sx * 0.38, 0.09, sz * 0.22], 0.02, steel, true);
          }
        for (const y of [0.45, 0.7, 0.95]) {
          b.beam([-0.43, y, -0.26], [0.43, y, -0.26], 0.02, steel, true);
          b.beam([-0.43, y, 0.26], [0.43, y, 0.26], 0.02, steel, true);
          b.beam([-0.43, y, -0.26], [-0.43, y, 0.26], 0.02, steel, true);
          b.beam([0.43, y, -0.26], [0.43, y, 0.26], 0.02, steel, true);
        }
        for (let i = 0; i < 6; i++) b.beam([-0.43 + i * 0.172, 0.2, -0.26], [-0.43 + i * 0.172, 0.95, -0.26], 0.012, '#B0B8C4', true);
        for (let i = 0; i < 6; i++) b.beam([-0.43 + i * 0.172, 0.2, 0.26], [-0.43 + i * 0.172, 0.95, 0.26], 0.012, '#B0B8C4', true);
        // push handle
        b.beam([-0.43, 0.95, -0.26], [-0.55, 1.02, -0.26], 0.03, steel, true);
        b.beam([-0.43, 0.95, 0.26], [-0.55, 1.02, 0.26], 0.03, steel, true);
        b.beam([-0.55, 1.02, -0.26], [-0.55, 1.02, 0.26], 0.034, '#2D8CFF', true);
        // balls
        const cols = ['#E5484D', '#F5C518', '#2D8CFF', '#FFFFFF', '#22B573', '#FF8A3D'];
        let i = 0;
        for (const x of [-0.25, 0.0, 0.25])
          for (const z of [-0.12, 0.12]) {
            b.sphere([x, 0.2 + 0.1, z], [0.2, 0.2, 0.2], cols[i++ % cols.length]);
          }
        for (const [x, z] of [[-0.12, 0], [0.12, 0.02]] as [number, number][]) b.sphere([x, 0.46, z], [0.21, 0.21, 0.21], cols[i++ % cols.length]);
        return b.build();
      }),
    [],
  );
  return <VC g={g} />;
}

function Sandwich() {
  return <VC g={I.sandwichGeo()} />;
}

function Pencil({ p }: { p: P }) {
  return <VC g={I.pencilGeo(str(p, 'color', '#F5C518'))} p={[0, 0.0085, 0]} r={[0, Math.PI / 2, 0]} />;
}

/* ---------------------------------------------------------------- registry */

export const KIND_RENDERERS: Partial<Record<PropKind, (props: { p: P }) => ReactElement | null>> = {
  ball: BallProp,
  cone: () => <ConeProp />,
  barrierTape: BarrierTape,
  manhole: () => <Manhole />,
  puddle: Puddle,
  fire: Fire,
  smoke: Smoke,
  extinguisherSpray: () => <Spray />,
  extinguisher: () => <VC g={I.extinguisherStandGeo()} rough={0.45} />,
  wetFloorSign: () => <WetFloorSign />,
  umbrella: Umbrella,
  waterBottle: () => <VC g={I.waterBottleGeo()} rough={0.35} />,
  sodaCan: () => <VC g={I.sodaCanGeo()} rough={0.3} />,
  scissors: () => <VC g={I.scissorsFlatGeo()} p={[0, 0.006, 0]} rough={0.4} />,
  paperStar: () => <VC g={I.paperStarGeo()} rough={0.6} />,
  beaker: Beaker,
  brokenGlass: () => <VC g={I.brokenGlassGeo()} rough={0.2} cast={false} />,
  mat: () => <VC g={I.matGeo()} />,
  ballCart: () => <BallCart />,
  firstAidKit: () => <VC g={I.firstAidKitGeo()} />,
  chair: () => <VC g={I.chairGeo()} />,
  stool: () => <VC g={I.stoolGeo()} />,
  tray: () => <VC g={I.trayGeo()} />,
  lunchbox: () => <VC g={I.lunchboxGeo()} />,
  trafficLight: TrafficLight,
  speechBubbleIcon: SpeechBubble,
  arrowMarker: ArrowMarker,
  confetti: () => <Confetti />,
  dustCloud: DustCloud,
  rainbow: () => <Rainbow />,
  boardImage: BoardImageProp,
  sandwich: () => <Sandwich />,
  peanutSnack: () => <PeanutSnack />,
  cable: ({ p }) => <VC g={I.cableGeo(str(p, 'color', '#2E3138'))} rough={0.5} cast={false} />,
  powerStrip: () => <VC g={I.powerStripGeo()} />,
  socketCover: () => <VC g={I.socketCoverGeo()} />,
  goggles: () => <Goggles />,
  gloves: () => <VC g={I.glovesGeo()} rough={0.4} cast={false} />,
  bucket: ({ p }) => <VC g={I.bucketGeo(str(p, 'color', '#2D8CFF'))} rough={0.5} />,
  leaf: () => <VC g={I.leafGeo()} rough={0.6} cast={false} />,
  plasticBag: () => <VC g={I.plasticBagGeo()} rough={0.25} />,
  stopSign: () => <StopSign />,
  pencil: Pencil,
};

void basic;
void trs;
