/**
 * Shared pieces for the core rooms (classroom, lobby, corridors, stairs).
 * Rooms push static geometry into Batches (see batch.ts) and render it through <StaticRoom>,
 * which costs ~6 draw calls for a whole furnished room. Things that move or react to flags
 * (fans, clock hands, alarm beacons, the smartboard, doors) are small separate components.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStage } from '../../../core/stage';
import { GEO, PAL, mat, tileTexture, useViewTexture, canvasTexture, type ViewKind } from '../../kit';
import { Batch, stickerMat, vcMat, vcGlowMat, type V3 } from './batch';
import { drawBlob, drawRedCross } from './pictos';

/* ------------------------------------------------------------------ flags */

export interface RoomFlags {
  lightsOn: boolean;
  alarm: boolean;
  exitGlow: boolean;
  flags: Record<string, boolean | number | string>;
}

export function useRoomFlags(): RoomFlags {
  const flags = useStage((s) => s.flags);
  return {
    lightsOn: flags.lights !== 'off',
    alarm: flags.alarm === true || flags.alarm === 'true' || flags.alarm === 'on',
    exitGlow: flags.exitGlow === true || flags.exitGlow === 'true',
    flags,
  };
}

/** Emergency glow materials (exit signs, green floor strips, emergency lamps) brighten when lights are off or exitGlow is set. */
const GLOW_MATS = new Set<THREE.MeshBasicMaterial>();
function registerGlow<T extends THREE.MeshBasicMaterial>(m: T): T {
  GLOW_MATS.add(m);
  return m;
}
const emergencyMat = registerGlow(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
const glowStickerMats = new Map<string, THREE.MeshBasicMaterial>();
function glowStickerMat(tex: THREE.Texture) {
  let m = glowStickerMats.get(tex.uuid);
  if (!m) {
    m = registerGlow(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true, alphaTest: 0.05 }));
    glowStickerMats.set(tex.uuid, m);
  }
  return m;
}

/** Ceiling light panels: glowing when lights are on, dull grey when off. */
const panelOn = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const panelOff = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, color: '#7A7F86' });
const ceilingMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: '#C9C2B4', emissiveIntensity: 0.55 });
const ceilingMatDark = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: '#3A3F48', emissiveIntensity: 0.35 });

function GlowController() {
  const { lightsOn, exitGlow } = useRoomFlags();
  useEffect(() => {
    const k = exitGlow || !lightsOn ? 1.25 : 0.8;
    GLOW_MATS.forEach((m) => m.color.setScalar(k));
  }, [lightsOn, exitGlow]);
  return null;
}

/* ------------------------------------------------------------------ static room */

export interface Kit4 {
  /** Matte solid parts (+ stickers drawn into the room atlas). */
  s: Batch;
  /** Glossy parts (boards, glass-like plastic, metal, polished floor details). */
  g: Batch;
  /** Emergency glow parts and glowing stickers (exit signs, green strips, emergency lamps). */
  e: Batch;
  /** Ceiling light panels (switch with the `lights` flag). */
  l: Batch;
  /** Soft contact shadows on the floor (only `blob()` calls, collected as stickers). */
  sh: Batch;
  /** Ceilings (slightly self-lit so they never turn brown under the indoor hemisphere light). */
  c: Batch;
}

type Built = {
  s: THREE.BufferGeometry | null;
  g: THREE.BufferGeometry | null;
  e: THREE.BufferGeometry | null;
  l: THREE.BufferGeometry | null;
  st: { geo: THREE.BufferGeometry; tex: THREE.CanvasTexture } | null;
  est: { geo: THREE.BufferGeometry; tex: THREE.CanvasTexture } | null;
  sh: THREE.BufferGeometry | null;
  c: THREE.BufferGeometry | null;
};

const blobTex = () => canvasTexture('core:blob', 64, 64, drawBlob);
const blobMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });

/** Soft round contact shadow on the floor at (x, z), size sx by sz, rotated by rotY. */
export function blob(k: Kit4, x: number, z: number, sx: number, sz: number, y = 0.004, rotY = 0) {
  k.sh.at([x, y, z], [-Math.PI / 2, 0, rotY], () => k.sh.quad([0, 0, 0], [sx, sz], '#000000'));
}

function buildBlobGeo(b: Batch): THREE.BufferGeometry | null {
  if (!b.chunks.length) return null;
  const g = b.build();
  // add uvs (each quad is 6 vertices from the plane template: its uv attribute order)
  const tpl = new THREE.PlaneGeometry(1, 1).toNonIndexed();
  const tuv = tpl.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.position.count;
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    uv[i * 2] = tuv.getX(i % 6);
    uv[i * 2 + 1] = tuv.getY(i % 6);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.deleteAttribute('color');
  return g;
}

/**
 * Renders a room's static geometry. `build` runs once per mount (and when `deps` changes).
 */
export function StaticRoom({ id, build, deps = [] }: { id: string; build: (k: Kit4) => void; deps?: unknown[] }) {
  const built = useMemo<Built>(() => {
    const k: Kit4 = { s: new Batch(), g: new Batch(), e: new Batch(), l: new Batch(), sh: new Batch(), c: new Batch() };
    build(k);
    return {
      s: k.s.chunks.length ? k.s.build() : null,
      g: k.g.chunks.length ? k.g.build() : null,
      e: k.e.chunks.length ? k.e.build() : null,
      l: k.l.chunks.length ? k.l.build() : null,
      st: k.s.buildStickers(`core:${id}:atlas`),
      est: k.e.buildStickers(`core:${id}:glowatlas`, 1024),
      sh: buildBlobGeo(k.sh),
      c: k.c.chunks.length ? k.c.build() : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ...deps]);
  useEffect(
    () => () => {
      for (const g of [built.s, built.g, built.e, built.l, built.st?.geo, built.est?.geo, built.sh, built.c]) g?.dispose();
    },
    [built],
  );
  const { lightsOn } = useRoomFlags();
  if (!blobMat.map) blobMat.map = blobTex();
  return (
    <group>
      <GlowController />
      {built.s && <mesh geometry={built.s} material={vcMat()} receiveShadow />}
      {built.g && <mesh geometry={built.g} material={vcMat(0.3, 0.05)} />}
      {built.e && <mesh geometry={built.e} material={emergencyMat} />}
      {built.l && <mesh geometry={built.l} material={lightsOn ? panelOn : panelOff} />}
      {built.st && <mesh geometry={built.st.geo} material={stickerMat(built.st.tex)} />}
      {built.est && <mesh geometry={built.est.geo} material={glowStickerMat(built.est.tex)} />}
      {built.sh && <mesh geometry={built.sh} material={blobMat} renderOrder={1} />}
      {built.c && <mesh geometry={built.c} material={lightsOn ? ceilingMat : ceilingMatDark} />}
    </group>
  );
}

/** A small extra batch (e.g. a flag-toggled group) rendered with the matte material. */
export function BatchMesh({ build, deps = [], gloss = false, visible = true }: { build: (b: Batch) => void; deps?: unknown[]; gloss?: boolean; visible?: boolean }) {
  const geo = useMemo(() => {
    const b = new Batch();
    build(b);
    return b.chunks.length ? b.build() : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return <mesh geometry={geo} material={gloss ? vcMat(0.3, 0.05) : vcMat()} visible={visible} />;
}

/* ------------------------------------------------------------------ floors */

export function TileFloor({ w, d, p = [0, 0, 0], tile = 0.6, base = PAL.tile, lineColor = PAL.tileLine, rough = 0.55 }: { w: number; d: number; p?: V3; tile?: number; base?: string; lineColor?: string; rough?: number }) {
  const m = useMemo(() => mat('#FFFFFF', { map: tileTexture(base, lineColor, [Math.max(1, Math.round(w / tile)), Math.max(1, Math.round(d / tile))]), rough }), [w, d, tile, base, lineColor, rough]);
  return <mesh position={p} rotation={[-Math.PI / 2, 0, 0]} scale={[w, d, 1]} geometry={GEO.plane} material={m} receiveShadow />;
}

/* ------------------------------------------------------------------ walls */

export type Side = 'n' | 's' | 'e' | 'w';
export interface Hole {
  wall: Side;
  /** Centre along the wall in room axes (x for n/s walls, z for e/w walls). */
  at: number;
  width: number;
  height: number;
  /** Bottom edge (0 for doors / openings). */
  sill?: number;
}

export interface WallStyle {
  color?: string;
  low?: string | null;
  lowH?: number;
  /** Colored stripe on top of the low band. */
  rail?: string | null;
  skirting?: string | null;
  thick?: number;
}

/**
 * Four walls with rectangular holes, pushed into the batch. Interior x in [-w/2, w/2], z in [-d/2, d/2],
 * y in [y0, y0 + h]. Walls sit outside the interior box. `skip` omits whole walls.
 */
export function walls(b: Batch, w: number, d: number, h: number, holes: Hole[], st: WallStyle = {}, skip: Side[] = [], y0 = 0) {
  const T = st.thick ?? 0.2;
  const color = st.color ?? PAL.wall;
  const low = st.low === undefined ? PAL.wallLow : st.low;
  const lowH = st.lowH ?? 1.1;
  const rail = st.rail === undefined ? PAL.teal : st.rail;
  const skirting = st.skirting === undefined ? '#B9A88C' : st.skirting;
  const sides: Side[] = ['n', 's', 'e', 'w'];
  for (const side of sides) {
    if (skip.includes(side)) continue;
    // wall local frame: +X along the wall, +Z into the room, origin at the wall's inner face centre
    const len = side === 'n' || side === 's' ? w : d;
    const full = len + T * 2;
    let pos: V3;
    let rot: number;
    if (side === 'n') (pos = [0, y0, -d / 2]), (rot = 0);
    else if (side === 's') (pos = [0, y0, d / 2]), (rot = Math.PI);
    else if (side === 'w') (pos = [-w / 2, y0, 0]), (rot = Math.PI / 2);
    else (pos = [w / 2, y0, 0]), (rot = -Math.PI / 2);
    // at (room axes) -> wall local x
    const toLocal = (at: number) => (side === 'n' ? at : side === 's' ? -at : side === 'w' ? -at : at);
    const hs = holes.filter((o) => o.wall === side).map((o) => ({ ...o, x: toLocal(o.at), sill: o.sill ?? 0 })).sort((a, b2) => a.x - b2.x);
    b.at(pos, rot, () => {
      const pieces: { x0: number; x1: number; y0: number; y1: number }[] = [];
      let cur = -full / 2;
      for (const o of hs) {
        const x0 = o.x - o.width / 2;
        const x1 = o.x + o.width / 2;
        if (x0 > cur) pieces.push({ x0: cur, x1: x0, y0: 0, y1: h });
        if (o.sill > 0) pieces.push({ x0, x1, y0: 0, y1: o.sill });
        if (o.sill + o.height < h) pieces.push({ x0, x1, y0: o.sill + o.height, y1: h });
        cur = Math.max(cur, x1);
      }
      if (cur < full / 2) pieces.push({ x0: cur, x1: full / 2, y0: 0, y1: h });
      for (const pc of pieces) {
        const pw = pc.x1 - pc.x0;
        const ph = pc.y1 - pc.y0;
        if (pw <= 0.001 || ph <= 0.001) continue;
        const cx = (pc.x0 + pc.x1) / 2;
        b.box([cx, (pc.y0 + pc.y1) / 2, -T / 2], [pw, ph, T], color);
        if (low && pc.y0 < lowH) {
          const top = Math.min(pc.y1, lowH);
          b.box([cx, (pc.y0 + top) / 2, 0.006], [pw, top - pc.y0, 0.012], low);
          if (rail && pc.y1 >= lowH) b.box([cx, lowH, 0.014], [pw, 0.07, 0.028], rail);
        }
        if (skirting && pc.y0 === 0) b.box([cx, 0.06, 0.016], [pw, 0.12, 0.032], skirting);
      }
    });
  }
}

/** Ceiling plane (pushed into the ceiling batch k.c) at height h. */
export function ceiling(k: Kit4, w: number, d: number, h: number, color: string = PAL.ceiling, p: V3 = [0, 0, 0]) {
  k.c.quad([p[0], h, p[2]], [w + 0.4, d + 0.4], color, [Math.PI / 2, 0, 0]);
}

/** Recessed light panel (into the `l` batch) with a trim (into `s`). */
export function lightPanel(k: Kit4, x: number, y: number, z: number, w = 1.2, d = 0.6, rotY = 0) {
  k.s.at([x, y, z], rotY, () => k.s.box([0, -0.012, 0], [w + 0.08, 0.02, d + 0.08], '#E6E2D8'));
  k.l.at([x, y, z], rotY, () => k.l.box([0, -0.024, 0], [w, 0.012, d], '#FFFBEF'));
}

/* ------------------------------------------------------------------ doors and windows */

/** Door frame + closed leaf (into batch b), local frame: centred on the floor at the wall face, facing +Z. */
export function doorParts(b: Batch, w: number, h: number, color: string, opts: { glass?: boolean; frame?: string; leaf?: boolean; double?: boolean; kick?: boolean } = {}) {
  const frame = opts.frame ?? PAL.doorFrame;
  b.box([-w / 2 - 0.05, h / 2, 0], [0.1, h, 0.26], frame);
  b.box([w / 2 + 0.05, h / 2, 0], [0.1, h, 0.26], frame);
  b.box([0, h + 0.05, 0], [w + 0.2, 0.1, 0.26], frame);
  if (opts.leaf === false) return;
  const leaves = opts.double ? 2 : 1;
  const lw = w / leaves;
  for (let i = 0; i < leaves; i++) {
    const cx = -w / 2 + lw * (i + 0.5);
    b.rbox([cx, h / 2, -0.04], [lw - 0.03, h - 0.02, 0.06], color, 0.015);
    if (opts.glass !== false) {
      b.box([cx + (opts.double ? 0 : lw * 0.18), h * 0.7, -0.005], [lw * (opts.double ? 0.5 : 0.28), h * 0.3, 0.012], '#2C3E50');
      b.box([cx + (opts.double ? 0 : lw * 0.18), h * 0.7, -0.0], [lw * (opts.double ? 0.44 : 0.22), h * 0.26, 0.012], '#9DD3EE');
    }
    const hx = opts.double ? (i === 0 ? cx + lw / 2 - 0.12 : cx - lw / 2 + 0.12) : cx - lw / 2 + 0.1;
    b.box([hx, h * 0.47, 0.01], [0.04, 0.04, 0.06], PAL.metal);
    b.box([hx + (opts.double ? (i === 0 ? -0.06 : 0.06) : 0.06), h * 0.47, 0.045], [0.14, 0.03, 0.03], PAL.metal);
    if (opts.kick !== false) b.box([cx, 0.12, -0.005], [lw - 0.08, 0.18, 0.012], '#C7CED6');
  }
}

/** Painted view behind a window opening + a faint glass. Local frame: centre of the opening at the wall's inner face, facing +Z. */
export function WindowView({ p, rotY = 0, w, h, view = 'yard', depth = 0.5 }: { p: V3; rotY?: number; w: number; h: number; view?: ViewKind; depth?: number }) {
  const tex = useViewTexture(view);
  const viewMat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [tex]);
  useEffect(() => () => viewMat.dispose(), [viewMat]);
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0, -depth]} scale={[w + 0.6, h + 0.5, 1]} geometry={GEO.plane} material={viewMat} />
      <mesh position={[0, 0, -0.12]} scale={[w, h, 1]} geometry={GEO.plane} material={glassMat} />
    </group>
  );
}
const glassMat = new THREE.MeshStandardMaterial({ color: '#CFEFFF', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false });

/** Window frame (into batch) for an opening of w x h; local frame like WindowView. */
export function windowFrame(b: Batch, w: number, h: number, mullions = 1, color = '#FFFFFF', sillColor = '#E9E2D2') {
  const f = 0.07;
  const z = -0.12;
  b.box([0, h / 2 - f / 2, z], [w, f, 0.1], color);
  b.box([0, -h / 2 + f / 2, z], [w, f, 0.1], color);
  b.box([-w / 2 + f / 2, 0, z], [f, h, 0.1], color);
  b.box([w / 2 - f / 2, 0, z], [f, h, 0.1], color);
  for (let i = 1; i <= mullions; i++) b.box([-w / 2 + (w / (mullions + 1)) * i, 0, z], [0.05, h, 0.08], color);
  b.box([0, h * 0.1, z], [w, 0.04, 0.07], color);
  // reveal (wall thickness) and sill
  b.box([0, -h / 2 - 0.03, 0.04], [w + 0.16, 0.05, 0.3], sillColor);
  b.box([-w / 2 - 0.005, 0, -0.1], [0.01, h, 0.2], '#EDE5D6');
  b.box([w / 2 + 0.005, 0, -0.1], [0.01, h, 0.2], '#EDE5D6');
  b.box([0, h / 2 + 0.005, -0.1], [w, 0.01, 0.2], '#EDE5D6');
}

/** A short "space behind the door" so an open door or door glass shows a corridor, not a void. Local: doorway centre on the floor, +Z into the room. */
export function behindDoor(b: Batch, w: number, h: number, depth = 3, far: string = PAL.wall) {
  b.box([0, -0.01, -depth / 2 - 0.1], [w + 3, 0.02, depth], '#DCD4C4');
  b.box([0, h / 2 + 0.6, -depth - 0.1], [w + 3, h + 1.2, 0.1], far);
  b.box([0, 0.55, -depth - 0.04], [w + 3, 1.1, 0.02], PAL.wallLow);
  b.box([-w / 2 - 1.5, h / 2 + 0.6, -depth / 2 - 0.1], [0.1, h + 1.2, depth], far);
  b.box([w / 2 + 1.5, h / 2 + 0.6, -depth / 2 - 0.1], [0.1, h + 1.2, depth], far);
  b.box([0, h + 1.2, -depth / 2 - 0.1], [w + 3, 0.05, depth], PAL.ceiling);
}

/* ------------------------------------------------------------------ animated bits */

const fanGeo = (() => {
  const b = new Batch();
  b.cyl([0, 0, 0], [0.2, 0.12, 0.2], '#FFFFFF');
  b.cyl([0, -0.07, 0], [0.12, 0.04, 0.12], '#E3E7EC');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.at([0, 0, 0], a, () => {
      b.box([0.18, 0, 0], [0.16, 0.02, 0.05], '#D6DBE1');
      b.rbox([0.58, 0, 0], [0.72, 0.018, 0.17], '#FFFFFF', 0.008, [0.12, 0, 0]);
    });
  }
  return b.build();
})();

/** Ceiling fan (rod + canopy are static; blades spin; they slow to a stop when the lights are off). */
export function CeilingFan({ p, ceilingY }: { p: [number, number]; ceilingY: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const speed = useRef(2.2);
  const { lightsOn } = useRoomFlags();
  useFrame((_, dt) => {
    const target = lightsOn ? 2.2 : 0;
    speed.current += (target - speed.current) * Math.min(1, dt * 0.6);
    if (ref.current) ref.current.rotation.y += speed.current * Math.min(dt, 0.1);
  });
  const y = ceilingY - 0.5;
  return (
    <group position={[p[0], 0, p[1]]}>
      <mesh position={[0, ceilingY - 0.02, 0]} scale={[0.18, 0.05, 0.18]} geometry={GEO.cyl} material={mat('#FFFFFF')} />
      <mesh position={[0, (ceilingY + y) / 2, 0]} scale={[0.04, ceilingY - y, 0.04]} geometry={GEO.cyl} material={mat('#E3E7EC')} />
      <mesh ref={ref} position={[0, y, 0]} geometry={fanGeo} material={vcMat(0.6)} />
    </group>
  );
}

/** Clock hands following real time, for a face of diameter d centred at p facing +Z after rotY. */
export function ClockHands({ p, rotY = 0, d }: { p: V3; rotY?: number; d: number }) {
  const h = useRef<THREE.Group>(null);
  const m = useRef<THREE.Group>(null);
  const s = useRef<THREE.Group>(null);
  useFrame(() => {
    const now = new Date();
    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;
    if (s.current) s.current.rotation.z = -(sec / 60) * Math.PI * 2;
    if (m.current) m.current.rotation.z = -(min / 60) * Math.PI * 2;
    if (h.current) h.current.rotation.z = -(hr / 12) * Math.PI * 2;
  });
  const r = d / 2;
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <group ref={h} position={[0, 0, 0.012]}>
        <mesh position={[0, r * 0.22, 0]} scale={[r * 0.08, r * 0.55, 0.006]} geometry={GEO.box} material={mat(PAL.ink)} />
      </group>
      <group ref={m} position={[0, 0, 0.02]}>
        <mesh position={[0, r * 0.32, 0]} scale={[r * 0.055, r * 0.78, 0.006]} geometry={GEO.box} material={mat(PAL.ink)} />
      </group>
      <group ref={s} position={[0, 0, 0.028]}>
        <mesh position={[0, r * 0.3, 0]} scale={[r * 0.02, r * 0.85, 0.004]} geometry={GEO.box} material={mat(PAL.safetyRed)} />
      </group>
      <mesh position={[0, 0, 0.032]} rotation={[Math.PI / 2, 0, 0]} scale={[r * 0.12, 0.01, r * 0.12]} geometry={GEO.cyl} material={mat(PAL.safetyRed)} />
    </group>
  );
}

const haloTex = () =>
  canvasTexture('core:halo', 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,60,50,0.9)');
    g.addColorStop(0.3, 'rgba(255,60,50,0.35)');
    g.addColorStop(1, 'rgba(255,60,50,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

/**
 * Wall-mounted fire alarm beacon (red dome on a white base) that flashes while the `alarm` flag is on.
 * Local frame: on the wall face, +Z out of the wall.
 */
export function AlarmBeacon({ p, rotY = 0, scale = 1 }: { p: V3; rotY?: number; scale?: number }) {
  const { alarm } = useRoomFlags();
  const domeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#D62828', emissive: '#FF2A1A', emissiveIntensity: 0.15, roughness: 0.3 }), []);
  const halo = useMemo(() => new THREE.MeshBasicMaterial({ map: haloTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 }), []);
  useEffect(() => () => (domeMat.dispose(), halo.dispose()), [domeMat, halo]);
  useFrame(() => {
    if (!alarm) {
      domeMat.emissiveIntensity = 0.15;
      halo.opacity = 0;
      return;
    }
    const t = performance.now() / 1000;
    const k = Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 2.2), 2);
    domeMat.emissiveIntensity = 0.3 + k * 2.6;
    halo.opacity = 0.15 + k * 0.85;
  });
  return (
    <group position={p} rotation={[0, rotY, 0]} scale={scale}>
      <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} scale={[0.17, 0.06, 0.17]} geometry={GEO.cyl} material={mat('#F2F2F2')} />
      <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]} scale={[0.13, 0.13, 0.13]} geometry={GEO.sphere} material={domeMat} />
      <mesh position={[0, 0, 0.13]} scale={[0.9, 0.9, 1]} geometry={GEO.plane} material={halo} renderOrder={2} />
    </group>
  );
}

/** Red cross icon on an elevator door (flag-driven). Local frame on the door face. */
export function ElevatorCross({ p, rotY = 0, show }: { p: V3; rotY?: number; show: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const t0 = useRef(0);
  const m = useMemo(() => new THREE.MeshBasicMaterial({ map: canvasTexture('core:redcross', 256, 256, drawRedCross), transparent: true, toneMapped: false }), []);
  useEffect(() => () => m.dispose(), [m]);
  useEffect(() => {
    t0.current = performance.now();
  }, [show]);
  useFrame(() => {
    if (!ref.current) return;
    const k = Math.min(1, (performance.now() - t0.current) / 250);
    const s = show ? 0.55 * (k < 1 ? 0.6 + 0.6 * Math.sin(k * Math.PI * 0.75) : 1) : 0;
    ref.current.scale.set(s, s, 1);
    ref.current.visible = show;
  });
  return <mesh ref={ref} position={p} rotation={[0, rotY, 0]} geometry={GEO.plane} material={m} />;
}
