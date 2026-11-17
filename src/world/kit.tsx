/**
 * Shared building blocks for every location set, so all rooms and streets share one look:
 * soft cartoon, flat clean colors, rounded where cheap, no realistic textures.
 *
 * Rules for set authors
 *  - Use mat(color) for materials (cached, shared) and the unit geometries below scaled per mesh,
 *    instead of creating new materials/geometries per object. Use drei <Instances>/<Merged> for
 *    anything repeated more than ~10 times (desks, chairs, fence posts, palms, books).
 *  - Sets never add real lights; Lighting (src/weather) lights the scene. Glowing things
 *    (ceiling panels, exit signs, screens) use emissive materials: glow(color).
 *  - Inside rooms are authored in LOCAL coordinates: the host renders each room inside
 *    <group position={origin}>, floor at y = 0, interior centred on x = 0, z = 0.
 *    Outdoor parts are authored in WORLD coordinates (see src/core/locations.ts).
 *  - All signs and labels are Arabic (Label for 3D text, useCanvasTexture for painted pictures).
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { FONT_AR_BOLD, FONT_FAMILY, fontsReady } from '../core/fonts';
import { useApp } from '../core/store';
import type { Vec3, Weather, TimeOfDay } from '../core/types';
import { registerWet } from './wet';

/* ------------------------------------------------------------------ palette */

export const PAL = {
  // building
  wall: '#F4EBDD',
  wallLow: '#DCE9E4', // lower wall band in corridors and classrooms
  trim: '#C9B59A',
  ceiling: '#FBF8F2',
  tile: '#E9E3D6',
  tileLine: '#D6CDBB',
  wood: '#C98F5A',
  woodDark: '#8E5B34',
  door: '#4F86C6',
  doorFrame: '#E0D3BD',
  glass: '#BFE3F5',
  metal: '#B8C1CC',
  darkMetal: '#4A5563',
  board: '#2F6B4F', // green chalkboard
  screen: '#1C2430',
  // school brand
  teal: '#14B8A6',
  ink: '#1E2A3B',
  paper: '#FFF8EC',
  blue: '#2D8CFF',
  green: '#22B573',
  amber: '#FFAA1F',
  purple: '#8B5CF6',
  red: '#F0476B',
  safetyRed: '#E23B3B',
  exitGreen: '#1FAE5B',
  yellow: '#F7C531',
  // outdoors
  sand: '#E4CB9B',
  sandDark: '#CDAE79',
  asphalt: '#3B4049',
  asphaltWet: '#262A31',
  laneWhite: '#F4F4F0',
  laneYellow: '#F2C230',
  curbBlack: '#22262B',
  curbYellow: '#F2C230',
  paving: '#D9CDB7',
  grass: '#69B34C',
  turf: '#3FA34D',
  palmTrunk: '#9A7348',
  palmLeaf: '#3E9B4F',
  bougainvillea: '#E0479E',
  villaBeige: '#E8D6B5',
  villaWhite: '#F5F1E8',
  villaSand: '#D9BF93',
  mosqueGreen: '#2E9E6A',
} as const;

/* --------------------------------------------------------------- materials */

type MatOpts = { rough?: number; metal?: number; emissive?: string; emissiveIntensity?: number; opacity?: number; side?: THREE.Side; map?: THREE.Texture | null };
const matCache = new Map<string, THREE.MeshStandardMaterial>();

/** Cached standard material. Same args -> same material instance (never dispose it). */
export function mat(color: string, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${o.rough ?? 0.8}|${o.metal ?? 0}|${o.emissive ?? ''}|${o.emissiveIntensity ?? 1}|${o.opacity ?? 1}|${o.side ?? 0}|${o.map?.uuid ?? ''}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.rough ?? 0.8,
      metalness: o.metal ?? 0,
      emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0, 0, 0),
      emissiveIntensity: o.emissiveIntensity ?? 1,
      transparent: (o.opacity ?? 1) < 1,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
      map: o.map ?? null,
    });
    matCache.set(key, m);
  }
  return m;
}

/**
 * Like mat() but registered as a wettable outdoor surface (darker and glossier in rain / after rain).
 * Use for asphalt, sidewalk tiles, yard paving, curbs, roofs, benches, cars' bodies are handled by props.
 */
export function wetMat(color: string, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = `wet|${color}|${o.rough ?? 0.85}|${o.map?.uuid ?? ''}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, map: o.map ?? null });
    registerWet(m);
    matCache.set(key, m);
  }
  return m;
}

/** Self-lit material for lamps, exit signs, screens. */
export const glow = (color: string, intensity = 1.4) => mat(color, { emissive: color, emissiveIntensity: intensity, rough: 0.5 });

/* -------------------------------------------------------------- geometries */

/** Unit geometries centred on the origin; scale them per mesh. */
export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  /** Radius 0.5, height 1. */
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  cylLow: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  /** Radius 0.5. */
  sphere: new THREE.SphereGeometry(0.5, 20, 14),
  /** 1 x 1 plane facing +Z. */
  plane: new THREE.PlaneGeometry(1, 1),
  /** Rounded box (radius 0.08 of a unit cube) for furniture and toy-like shapes. */
  rbox: roundedBoxGeometry(1, 1, 1, 0.08, 3),
  cone: new THREE.ConeGeometry(0.5, 1, 16),
} as const;

function roundedBoxGeometry(w: number, h: number, d: number, r: number, seg: number) {
  // Box with bevelled edges built by pushing a subdivided box's vertices onto a rounded shape.
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const inner = new THREE.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const c = new THREE.Vector3(
      Math.max(-inner.x, Math.min(inner.x, v.x)),
      Math.max(-inner.y, Math.min(inner.y, v.y)),
      Math.max(-inner.z, Math.min(inner.z, v.z)),
    );
    const n = v.clone().sub(c);
    if (n.lengthSq() > 0) v.copy(c.add(n.normalize().multiplyScalar(r)));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------ primitives */

type BaseProps = {
  /** Centre position. */
  p?: Vec3;
  /** Size along x, y, z. */
  s?: Vec3;
  /** Euler rotation. */
  r?: Vec3;
  c?: string;
  m?: THREE.Material;
  cast?: boolean;
  receive?: boolean;
  onClick?: () => void;
};

/** Box centred at p with size s. */
export function Box({ p = [0, 0, 0], s = [1, 1, 1], r, c = PAL.wall, m, cast = false, receive = true }: BaseProps) {
  return <mesh position={p} rotation={r} scale={s} geometry={GEO.box} material={m ?? mat(c)} castShadow={cast} receiveShadow={receive} />;
}

/** Rounded box centred at p with size s (use for furniture, toys, cartoon shapes). */
export function RBox({ p = [0, 0, 0], s = [1, 1, 1], r, c = PAL.wall, m, cast = true, receive = true }: BaseProps) {
  return <mesh position={p} rotation={r} scale={s} geometry={GEO.rbox} material={m ?? mat(c)} castShadow={cast} receiveShadow={receive} />;
}

/** Cylinder centred at p; s = [diameter x, height, diameter z]. */
export function Cyl({ p = [0, 0, 0], s = [1, 1, 1], r, c = PAL.metal, m, cast = true, receive = true }: BaseProps) {
  return <mesh position={p} rotation={r} scale={s} geometry={GEO.cyl} material={m ?? mat(c)} castShadow={cast} receiveShadow={receive} />;
}

/** Sphere centred at p; s = diameters. */
export function Ball({ p = [0, 0, 0], s = [1, 1, 1], r, c = PAL.metal, m, cast = true, receive = false }: BaseProps) {
  return <mesh position={p} rotation={r} scale={s} geometry={GEO.sphere} material={m ?? mat(c)} castShadow={cast} receiveShadow={receive} />;
}

/** Flat plane centred at p, facing +Z unless rotated; s = [w, h, 1]. */
export function Plane({ p = [0, 0, 0], s = [1, 1, 1], r, c = PAL.wall, m, receive = true }: BaseProps) {
  return <mesh position={p} rotation={r} scale={s} geometry={GEO.plane} material={m ?? mat(c)} receiveShadow={receive} />;
}

/** Arabic 3D text (signs, room names, numbers). Faces +Z unless rotated. */
export function Label({
  text,
  p = [0, 0, 0],
  r,
  size = 0.3,
  color = PAL.ink,
  maxWidth,
  outline,
}: {
  text: string;
  p?: Vec3;
  r?: Vec3;
  size?: number;
  color?: string;
  maxWidth?: number;
  outline?: string;
}) {
  return (
    <Text
      position={p}
      rotation={r}
      font={FONT_AR_BOLD}
      fontSize={size}
      color={color}
      anchorX="center"
      anchorY="middle"
      direction="rtl"
      textAlign="center"
      maxWidth={maxWidth}
      outlineWidth={outline ? size * 0.06 : 0}
      outlineColor={outline ?? '#000'}
    >
      {text}
    </Text>
  );
}

/* --------------------------------------------------------- canvas textures */

const texCache = new Map<string, THREE.CanvasTexture>();

/**
 * A cached texture painted with the 2D canvas API (posters, signs with pictures, window views,
 * floor tiles). `key` must be unique per drawing. Drawn again once the Arabic font has loaded,
 * so ctx.font = `700 64px ${FONT_FAMILY}` text renders correctly.
 */
export function canvasTexture(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { repeat?: [number, number]; nearest?: boolean } = {},
): THREE.CanvasTexture {
  let t = texCache.get(key);
  if (t) return t;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.direction = 'rtl';
  draw(ctx, w, h);
  t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  if (opts.nearest) t.magFilter = THREE.NearestFilter;
  texCache.set(key, t);
  const tex = t;
  fontsReady.then(() => {
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h);
    tex.needsUpdate = true;
  });
  return t;
}

/** Hook form of canvasTexture. */
export function useCanvasTexture(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts?: { repeat?: [number, number] },
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => canvasTexture(key, w, h, draw, opts), [key]);
}

/** Arabic text on a canvas, centred. */
export function canvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, color: string, weight = 700) {
  ctx.font = `${weight} ${px}px ${FONT_FAMILY}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/** Square floor tiles (repeat = tiles across the surface). */
export function tileTexture(base: string = PAL.tile, line: string = PAL.tileLine, repeat: [number, number] = [10, 10]) {
  return canvasTexture(
    `tile:${base}:${line}:${repeat.join('x')}`,
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = line;
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, w, h);
    },
    { repeat },
  );
}

/** Wood planks (sports hall, stage). */
export function plankTexture(base: string = PAL.wood, repeat: [number, number] = [4, 4]) {
  return canvasTexture(
    `plank:${base}:${repeat.join('x')}`,
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 3;
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (i * h) / 8);
        ctx.lineTo(w, (i * h) / 8);
        ctx.stroke();
        const off = (i * 97) % w;
        ctx.beginPath();
        ctx.moveTo(off, (i * h) / 8);
        ctx.lineTo(off, ((i + 1) * h) / 8);
        ctx.stroke();
      }
    },
    { repeat },
  );
}

/* ----------------------------------------------------------- window views */

export type ViewKind = 'yard' | 'back' | 'street' | 'hall';

function skyColors(weather: Weather, time: TimeOfDay): [string, string] {
  if (weather === 'rain') return ['#7D8A99', '#AEB7C2'];
  if (weather === 'dust') return ['#C98B4E', '#E2B57E'];
  if (weather === 'wet') return ['#8FB4D6', '#D7E6F2'];
  return time === 'afternoon' ? ['#6FB6F0', '#F6E3B8'] : ['#5AA9F2', '#CFEBFF'];
}

function paintView(ctx: CanvasRenderingContext2D, w: number, h: number, kind: ViewKind, weather: Weather, time: TimeOfDay) {
  const [top, bottom] = skyColors(weather, time);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const horizon = h * 0.62;
  const palm = (x: number, base: number, s: number) => {
    ctx.strokeStyle = PAL.palmTrunk;
    ctx.lineWidth = 6 * s;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + 6 * s, base - 60 * s, x + 2 * s, base - 110 * s);
    ctx.stroke();
    ctx.fillStyle = PAL.palmLeaf;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + 2 * s + Math.cos(a) * 26 * s, base - 110 * s + Math.sin(a) * 10 * s, 30 * s, 7 * s, a, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  if (kind === 'yard' || kind === 'street') {
    // fence + houses beyond, yard ground in front
    ctx.fillStyle = PAL.villaBeige;
    for (let i = 0; i < 6; i++) ctx.fillRect(i * (w / 6) + 10, horizon - 70 - (i % 2) * 20, w / 6 - 24, 80 + (i % 2) * 20);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) ctx.fillRect(i * (w / 6) + 30 + j * 40, horizon - 50, 18, 18);
    ctx.fillStyle = kind === 'yard' ? PAL.sand : PAL.asphalt;
    ctx.fillRect(0, horizon, w, h - horizon);
    ctx.fillStyle = '#E8E3D8';
    ctx.fillRect(0, horizon - 4, w, 10);
    for (let x = 30; x < w; x += 140) palm(x, horizon + 6, 1);
    if (kind === 'yard') {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, horizon + 20 + i * 22);
        ctx.lineTo(w, horizon + 20 + i * 22);
        ctx.stroke();
      }
    }
  } else if (kind === 'back') {
    ctx.fillStyle = PAL.villaSand;
    for (let i = 0; i < 4; i++) ctx.fillRect(i * (w / 4) + 20, horizon - 90 + (i % 2) * 25, w / 4 - 30, 100);
    ctx.fillStyle = PAL.sandDark;
    ctx.fillRect(0, horizon, w, h - horizon);
    for (let x = 80; x < w; x += 220) palm(x, horizon + 4, 0.9);
  } else {
    // 'hall': looking into a corridor through a door glass
    ctx.fillStyle = PAL.wall;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PAL.wallLow;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    ctx.fillStyle = PAL.tile;
    ctx.fillRect(0, h * 0.82, w, h * 0.18);
  }
  if (weather === 'rain') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 160; i++) {
      const x = (i * 73) % w;
      const y = (i * 131) % h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 16);
      ctx.stroke();
    }
  }
  if (weather === 'dust') {
    ctx.fillStyle = 'rgba(214,160,96,0.45)';
    ctx.fillRect(0, 0, w, h);
  }
}

/** The painted outside seen through a window. Follows the current weather and time of day. */
export function useViewTexture(kind: ViewKind) {
  const weather = useApp((s) => s.weather);
  const time = useApp((s) => s.time);
  return useMemo(
    () => canvasTexture(`view:${kind}:${weather}:${time}`, 512, 320, (ctx, w, h) => paintView(ctx, w, h, kind, weather, time)),
    [kind, weather, time],
  );
}

/* --------------------------------------------------------- room building */

export type WallSide = 'n' | 's' | 'e' | 'w';

export interface Opening {
  wall: WallSide;
  /** Centre of the opening along the wall, measured from the wall's centre (metres, +x / +z). */
  at: number;
  width: number;
  height: number;
  /** Bottom edge height (0 for doors). */
  sill?: number;
  kind: 'window' | 'door' | 'open';
  /** Window: the painted view. Default 'yard' on 's' walls, 'back' on 'n' walls. */
  view?: ViewKind;
  /** Door leaf color. */
  color?: string;
  /** Optional Arabic sign over a door. */
  sign?: string;
}

const T = 0.2; // wall thickness

/** Window: frame, glass and a painted view a little behind it. Local frame: centred, facing +Z (inside). */
export function WindowPane({ width, height, view = 'yard' }: { width: number; height: number; view?: ViewKind }) {
  const tex = useViewTexture(view);
  const viewMat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [tex]);
  useEffect(() => () => viewMat.dispose(), [viewMat]);
  const f = 0.07;
  return (
    <group>
      <mesh position={[0, 0, -0.6]} scale={[width + 1, height + 0.8, 1]} geometry={GEO.plane} material={viewMat} />
      <Plane s={[width, height, 1]} m={mat(PAL.glass, { opacity: 0.18, rough: 0.1 })} receive={false} />
      <Box p={[0, height / 2 - f / 2, 0.02]} s={[width + f, f, 0.12]} c="#FFFFFF" />
      <Box p={[0, -height / 2 + f / 2, 0.05]} s={[width + 0.12, f, 0.22]} c="#FFFFFF" />
      <Box p={[-width / 2, 0, 0.02]} s={[f, height, 0.12]} c="#FFFFFF" />
      <Box p={[width / 2, 0, 0.02]} s={[f, height, 0.12]} c="#FFFFFF" />
      <Box p={[0, 0, 0.02]} s={[0.04, height, 0.06]} c="#FFFFFF" />
    </group>
  );
}

/** Door: frame and a closed leaf with a small window, optional Arabic sign above. Centred on the floor, facing +Z. */
export function DoorLeaf({ width, height, color = PAL.door, sign, open = false }: { width: number; height: number; color?: string; sign?: string; open?: boolean }) {
  return (
    <group>
      <Box p={[-width / 2 - 0.05, height / 2, 0]} s={[0.1, height, T + 0.04]} c={PAL.doorFrame} />
      <Box p={[width / 2 + 0.05, height / 2, 0]} s={[0.1, height, T + 0.04]} c={PAL.doorFrame} />
      <Box p={[0, height + 0.05, 0]} s={[width + 0.2, 0.1, T + 0.04]} c={PAL.doorFrame} />
      {!open && (
        <group>
          <RBox p={[0, height / 2, 0]} s={[width - 0.02, height - 0.02, 0.06]} c={color} cast={false} />
          <Box p={[width * 0.25, height * 0.68, 0.035]} s={[width * 0.22, height * 0.22, 0.01]} c={PAL.glass} />
          <Ball p={[-width / 2 + 0.12, height * 0.48, 0.06]} s={[0.07, 0.07, 0.07]} c={PAL.metal} />
        </group>
      )}
      {sign && <Label text={sign} p={[0, height + 0.32, 0.02]} size={0.2} color={PAL.ink} />}
    </group>
  );
}

function wallFrame(side: WallSide, w: number, d: number): { pos: Vec3; rotY: number; len: number } {
  // Each wall's local +Z faces into the room.
  switch (side) {
    case 'n':
      return { pos: [0, 0, -d / 2], rotY: 0, len: w };
    case 's':
      return { pos: [0, 0, d / 2], rotY: Math.PI, len: w };
    case 'w':
      return { pos: [-w / 2, 0, 0], rotY: Math.PI / 2, len: d };
    case 'e':
      return { pos: [w / 2, 0, 0], rotY: -Math.PI / 2, len: d };
  }
}

/**
 * Floor, ceiling and four walls of a room with window/door openings cut out.
 * Interior is x in [-w/2, w/2], z in [-d/2, d/2], y in [0, height]. Walls sit outside that box.
 * `at` for openings is measured along the wall in WORLD/ROOM axes (x for n/s walls, z for e/w walls).
 */
export function RoomShell({
  size,
  height,
  openings = [],
  wallColor = PAL.wall,
  lowColor = PAL.wallLow,
  lowHeight = 1.1,
  floor,
  ceiling = true,
  ceilingLights = true,
  lightsOn = true,
}: {
  size: [number, number];
  height: number;
  openings?: Opening[];
  wallColor?: string;
  /** Lower wall band color (null for none). */
  lowColor?: string | null;
  lowHeight?: number;
  /** Floor material; default light tiles sized ~0.6 m. */
  floor?: THREE.Material;
  ceiling?: boolean;
  ceilingLights?: boolean;
  /** Ceiling panels glow (false when the 'lights' flag is 'off'). */
  lightsOn?: boolean;
}) {
  const [w, d] = size;
  const floorMat = useMemo(() => floor ?? mat('#FFFFFF', { map: tileTexture(PAL.tile, PAL.tileLine, [Math.round(w / 0.6), Math.round(d / 0.6)]), rough: 0.6 }), [floor, w, d]);
  const walls: WallSide[] = ['n', 's', 'e', 'w'];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[w + T * 2, d + T * 2, 1]} geometry={GEO.plane} material={floorMat} receiveShadow />
      {ceiling && <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[w + T * 2, d + T * 2, 1]} geometry={GEO.plane} material={mat(PAL.ceiling)} />}
      {ceiling &&
        ceilingLights &&
        Array.from({ length: Math.max(1, Math.round(w / 4)) }).flatMap((_, i, arr) =>
          Array.from({ length: Math.max(1, Math.round(d / 4)) }).map((__, j, arr2) => (
            <Box
              key={`${i}-${j}`}
              p={[-w / 2 + (w / arr.length) * (i + 0.5), height - 0.02, -d / 2 + (d / arr2.length) * (j + 0.5)]}
              s={[1.2, 0.03, 0.6]}
              m={lightsOn ? glow('#FFFDF5', 1.2) : mat('#D8D8D2')}
            />
          )),
        )}
      {walls.map((side) => {
        const f = wallFrame(side, w, d);
        const ops = openings.filter((o) => o.wall === side);
        // Convert `at` (room axes) to wall-local x (wall local +X).
        const toLocal = (at: number) => (side === 'n' ? at : side === 's' ? -at : side === 'w' ? -at : at);
        return (
          <group key={side} position={f.pos} rotation={[0, f.rotY, 0]}>
            <WallWithOpenings len={f.len + T * 2} height={height} color={wallColor} lowColor={lowColor} lowHeight={lowHeight} ops={ops.map((o) => ({ ...o, x: toLocal(o.at) }))} side={side} />
          </group>
        );
      })}
    </group>
  );
}

function WallWithOpenings({
  len,
  height,
  color,
  lowColor,
  lowHeight,
  ops,
  side,
}: {
  len: number;
  height: number;
  color: string;
  lowColor: string | null;
  lowHeight: number;
  ops: (Opening & { x: number })[];
  side: WallSide;
}) {
  // Wall plane sits at local z = -T/2 (outside the interior), inner face at z = 0.
  const sorted = [...ops].sort((a, b) => a.x - b.x);
  const pieces: { x0: number; x1: number; y0: number; y1: number }[] = [];
  let cursor = -len / 2;
  for (const o of sorted) {
    const x0 = o.x - o.width / 2;
    const x1 = o.x + o.width / 2;
    const sill = o.kind === 'window' ? o.sill ?? 0.9 : 0;
    if (x0 > cursor) pieces.push({ x0: cursor, x1: x0, y0: 0, y1: height });
    if (sill > 0) pieces.push({ x0, x1, y0: 0, y1: sill });
    if (sill + o.height < height) pieces.push({ x0, x1, y0: sill + o.height, y1: height });
    cursor = Math.max(cursor, x1);
  }
  if (cursor < len / 2) pieces.push({ x0: cursor, x1: len / 2, y0: 0, y1: height });
  const wm = mat(color);
  const lm = lowColor ? mat(lowColor) : null;
  return (
    <group>
      {pieces.map((pc, i) => (
        <group key={i}>
          <mesh position={[(pc.x0 + pc.x1) / 2, (pc.y0 + pc.y1) / 2, -T / 2]} scale={[pc.x1 - pc.x0, pc.y1 - pc.y0, T]} geometry={GEO.box} material={wm} receiveShadow />
          {lm && pc.y0 < lowHeight && (
            <mesh
              position={[(pc.x0 + pc.x1) / 2, (pc.y0 + Math.min(pc.y1, lowHeight)) / 2, 0.005]}
              scale={[pc.x1 - pc.x0, Math.min(pc.y1, lowHeight) - pc.y0, 0.01]}
              geometry={GEO.box}
              material={lm}
            />
          )}
        </group>
      ))}
      {sorted.map((o, i) => {
        const sill = o.kind === 'window' ? o.sill ?? 0.9 : 0;
        if (o.kind === 'window')
          return (
            <group key={`o${i}`} position={[o.x, sill + o.height / 2, -T / 2]}>
              <WindowPane width={o.width} height={o.height} view={o.view ?? (side === 'n' ? 'back' : 'yard')} />
            </group>
          );
        if (o.kind === 'door')
          return (
            <group key={`o${i}`} position={[o.x, 0, -T / 2]}>
              <DoorLeaf width={o.width} height={o.height} color={o.color} sign={o.sign} />
            </group>
          );
        return null;
      })}
    </group>
  );
}

/* --------------------------------------------------------------- outdoors */

/** A cartoon palm tree, base at p. Use <Instances> if you need dozens. */
export function Palm({ p = [0, 0, 0], h = 5, lean = 0.08, seed = 0 }: { p?: Vec3; h?: number; lean?: number; seed?: number }) {
  const leaves = 8;
  const rot = (seed * 1.37) % (Math.PI * 2);
  return (
    <group position={p} rotation={[0, rot, lean]}>
      <Cyl p={[0, h / 2, 0]} s={[0.32, h, 0.32]} c={PAL.palmTrunk} />
      {Array.from({ length: 5 }).map((_, i) => (
        <Cyl key={i} p={[0, (h / 5) * i + 0.4, 0]} s={[0.4, 0.12, 0.4]} c="#86623B" cast={false} />
      ))}
      {Array.from({ length: leaves }).map((_, i) => {
        const a = (i / leaves) * Math.PI * 2;
        return (
          <group key={`l${i}`} position={[0, h, 0]} rotation={[0, a, 0]}>
            <mesh position={[1.1, -0.25, 0]} rotation={[0, 0, -0.45]} scale={[2.3, 0.08, 0.55]} geometry={GEO.sphere} material={mat(i % 2 ? PAL.palmLeaf : '#4CAF5A')} castShadow />
          </group>
        );
      })}
      <Ball p={[0, h - 0.1, 0]} s={[0.55, 0.45, 0.55]} c="#C58B3A" />
    </group>
  );
}

/** Square planter box with a palm, base at p. */
export function PalmPlanter({ p = [0, 0, 0], h = 4.5, seed = 0 }: { p?: Vec3; h?: number; seed?: number }) {
  return (
    <group position={p}>
      <RBox p={[0, 0.3, 0]} s={[1.3, 0.6, 1.3]} c={PAL.villaWhite} />
      <Box p={[0, 0.61, 0]} s={[1.1, 0.02, 1.1]} c="#7A5A3A" />
      <Palm p={[0, 0.6, 0]} h={h} seed={seed} />
    </group>
  );
}
