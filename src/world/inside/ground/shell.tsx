/**
 * Batched room shell for the ground-floor rooms: floor, ceiling, walls with window/door openings
 * (same look as kit RoomShell, but merged into the room's batch), painted window views merged into
 * one mesh, ceiling light panels that follow the `lights` flag, door leaves that open with a flag,
 * a short corridor stub behind each door, exit signs (`exitGlow`) and alarm strobes (`alarm`).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, glow, mat, PAL, useViewTexture, canvasTexture, type Opening, type ViewKind, type WallSide } from '../../kit';
import type { Vec3 } from '../../../core/types';
import { useStage } from '../../../core/stage';
import { Batch, type Col } from './batch';
import { aoFoot, drawExit } from './paint';

export const T = 0.2; // wall thickness (same as kit)

export interface ShellSpec {
  size: [number, number];
  height: number;
  wall: string;
  low: string | null;
  lowHeight?: number;
  /** Material for the lower band (e.g. tiles); default mat(low). */
  lowMat?: THREE.Material;
  floor: THREE.Material;
  ceiling?: string;
  openings: Opening[];
  skirting?: string;
  /** Ceiling panel centres [x, z]; default a grid. false for none. */
  panels?: [number, number][] | false;
  panelSize?: [number, number];
  /** Corridor stub behind doors / open passages (default true). */
  vestibule?: boolean;
  /** Draw the ceiling (default true). */
  drawCeiling?: boolean;
}

export interface ShellOut {
  views: Partial<Record<ViewKind, THREE.BufferGeometry>>;
  panels: THREE.BufferGeometry | null;
  /** Ceiling plane (rendered by CeilingPanels so it can dim with the `lights` flag). */
  ceiling: THREE.BufferGeometry | null;
  ceilingColor: string;
}

/** Wall frame: centre of the wall's inner face and rotation (local +Z faces into the room). */
export function wallFrame(side: WallSide, w: number, d: number): { pos: Vec3; rotY: number; len: number } {
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

/** `at` in room axes (x for n/s, z for e/w) -> wall-local x. */
export const wallLocalX = (side: WallSide, at: number) => (side === 'n' || side === 'e' ? at : -at);

/**
 * A point on a wall's inner face: `at` along the wall in room axes, height y, `off` metres into
 * the room. Returns the position and the rotation that makes local +Z face into the room
 * (local +X then runs along the wall).
 */
export function onWall(side: WallSide, at: number, y: number, off: number, size: [number, number]): { p: Vec3; rotY: number } {
  const [w, d] = size;
  switch (side) {
    case 'n':
      return { p: [at, y, -d / 2 + off], rotY: 0 };
    case 's':
      return { p: [at, y, d / 2 - off], rotY: Math.PI };
    case 'w':
      return { p: [-w / 2 + off, y, at], rotY: Math.PI / 2 };
    case 'e':
      return { p: [w / 2 - off, y, at], rotY: -Math.PI / 2 };
  }
}

/** Push a frame on a wall (see onWall). Remember to pop(). */
export function pushWall(b: Batch, side: WallSide, at: number, y: number, off: number, size: [number, number]) {
  const f = onWall(side, at, y, off, size);
  return b.push(f.p, f.rotY);
}

export function buildShell(b: Batch, s: ShellSpec): ShellOut {
  const [w, d] = s.size;
  const H = s.height;
  const lowH = s.lowHeight ?? 1.1;
  const viewB = new Map<ViewKind, Batch>();
  const glassM = mat(PAL.glass, { opacity: 0.18, rough: 0.1 });
  const ao = aoFoot();

  // floor + ceiling
  b.floorPlane([0, 0, 0], [w + T * 2, d + T * 2], s.floor);
  let ceiling: THREE.BufferGeometry | null = null;
  if (s.drawCeiling !== false) {
    const cb = new Batch();
    cb.add(GEO.plane, PAL.ceiling, [0, H, 0], [w + T * 2, d + T * 2, 1], [Math.PI / 2, 0, 0]);
    ceiling = cb.buildGeometry();
  }

  for (const side of ['n', 's', 'e', 'w'] as WallSide[]) {
    const f = wallFrame(side, w, d);
    const len = f.len + T * 2;
    const ops = s.openings.filter((o) => o.wall === side).map((o) => ({ ...o, x: wallLocalX(side, o.at) }));
    ops.sort((a, c) => a.x - c.x);
    b.push(f.pos, f.rotY);
    const pieces: { x0: number; x1: number; y0: number; y1: number }[] = [];
    let cursor = -len / 2;
    for (const o of ops) {
      const x0 = o.x - o.width / 2;
      const x1 = o.x + o.width / 2;
      const sill = o.kind === 'window' ? o.sill ?? 0.9 : 0;
      if (x0 > cursor) pieces.push({ x0: cursor, x1: x0, y0: 0, y1: H });
      if (sill > 0) pieces.push({ x0, x1, y0: 0, y1: sill });
      if (sill + o.height < H) pieces.push({ x0, x1, y0: sill + o.height, y1: H });
      cursor = Math.max(cursor, x1);
    }
    if (cursor < len / 2) pieces.push({ x0: cursor, x1: len / 2, y0: 0, y1: H });
    for (const pc of pieces) {
      const cx = (pc.x0 + pc.x1) / 2;
      const pw = pc.x1 - pc.x0;
      b.box([cx, (pc.y0 + pc.y1) / 2, -T / 2], [pw, pc.y1 - pc.y0, T], s.wall);
      if (s.low && pc.y0 < lowH) {
        const top = Math.min(pc.y1, lowH);
        b.box([cx, (pc.y0 + top) / 2, 0.005], [pw, top - pc.y0, 0.01], s.lowMat ?? s.low);
        if (pc.y1 > lowH) b.box([cx, lowH, 0.012], [pw, 0.035, 0.024], PAL.trim);
      }
      if (pc.y0 === 0) {
        if (s.skirting) b.box([cx, 0.05, 0.02], [pw, 0.1, 0.02], s.skirting);
        b.plane([cx, 0.16, 0.035], [pw, 0.32], ao);
      }
    }
    for (const o of ops) {
      if (o.kind === 'window') {
        const sill = o.sill ?? 0.9;
        const ww = o.width;
        const wh = o.height;
        const fr = 0.07;
        b.push([o.x, sill + wh / 2, -T / 2], 0);
        // reveal (the wall thickness around the opening)
        b.box([0, wh / 2 + 0.005, 0], [ww, 0.01, T], s.wall);
        b.box([-ww / 2 - 0.005, 0, 0], [0.01, wh, T], s.wall);
        b.box([ww / 2 + 0.005, 0, 0], [0.01, wh, T], s.wall);
        b.plane([0, 0, 0], [ww, wh], glassM);
        b.box([0, wh / 2 - fr / 2, 0.02], [ww + fr, fr, 0.12], '#FFFFFF');
        b.box([0, -wh / 2 + fr / 2, 0.08], [ww + 0.14, fr, 0.26], '#FFFFFF');
        b.box([-ww / 2, 0, 0.02], [fr, wh, 0.12], '#FFFFFF');
        b.box([ww / 2, 0, 0.02], [fr, wh, 0.12], '#FFFFFF');
        b.box([0, 0, 0.02], [0.045, wh, 0.06], '#FFFFFF');
        b.pop();
        const kind = o.view ?? (side === 'n' ? 'back' : 'yard');
        let vb = viewB.get(kind);
        if (!vb) viewB.set(kind, (vb = new Batch()));
        // same transform stack: compute the view plane in room space
        vb.push(f.pos, f.rotY);
        vb.plane([o.x, sill + wh / 2, -T - 0.6], [ww + 1.2, wh + 0.9], PAL.wall);
        vb.pop();
      } else {
        // door or open passage: frame/casing
        const ow = o.width;
        const oh = o.height;
        b.box([o.x - ow / 2 - 0.05, oh / 2, -T / 2], [0.1, oh, T + 0.05], PAL.doorFrame);
        b.box([o.x + ow / 2 + 0.05, oh / 2, -T / 2], [0.1, oh, T + 0.05], PAL.doorFrame);
        b.box([o.x, oh + 0.05, -T / 2], [ow + 0.2, 0.1, T + 0.05], PAL.doorFrame);
        b.box([o.x, 0.004, -T / 2], [ow, 0.008, T], PAL.trim);
        if (s.vestibule !== false) {
          // short corridor stub so an open door does not show the void
          const vd = 2.6;
          const vw = Math.max(ow + 2.4, 3.4);
          b.push([o.x, 0, -T - vd / 2], 0);
          b.box([0, -0.01, 0], [vw, 0.02, vd], PAL.tile);
          b.box([0, 0.004, 0.2], [vw, 0.01, 0.1], PAL.tileLine);
          b.box([0, 1.8, -vd / 2 - 0.1], [vw, 3.6, 0.2], PAL.wall);
          b.box([0, 0.55, -vd / 2 + 0.005], [vw, 1.1, 0.01], PAL.wallLow);
          b.box([0, 1.1, -vd / 2 + 0.012], [vw, 0.035, 0.024], PAL.trim);
          b.box([-vw / 2 - 0.1, 1.8, 0], [0.2, 3.6, vd], PAL.wall);
          b.box([vw / 2 + 0.1, 1.8, 0], [0.2, 3.6, vd], PAL.wall);
          b.box([0, 3.2, 0], [vw, 0.02, vd], PAL.ceiling);
          b.box([0, 3.18, -0.2], [1.0, 0.03, 0.4], '#FFFDF0');
          // a notice board on the far corridor wall
          b.box([0, 1.55, -vd / 2 + 0.02], [1.2, 0.8, 0.03], PAL.wood);
          b.box([0, 1.55, -vd / 2 + 0.04], [1.1, 0.7, 0.01], '#E9D6A8');
          b.box([-0.25, 1.62, -vd / 2 + 0.05], [0.3, 0.38, 0.005], '#7CC4FA');
          b.box([0.2, 1.5, -vd / 2 + 0.05], [0.34, 0.26, 0.005], '#FFAA1F');
          b.pop();
        }
      }
    }
    b.pop();
  }

  // ceiling light panels
  let panels: THREE.BufferGeometry | null = null;
  if (s.panels !== false) {
    const pb = new Batch();
    const [pw, pd] = s.panelSize ?? [1.2, 0.6];
    const list =
      s.panels ??
      Array.from({ length: Math.max(1, Math.round(w / 4)) }).flatMap((_, i, arr) =>
        Array.from({ length: Math.max(1, Math.round(d / 4)) }).map((__, j, arr2) => [-w / 2 + (w / arr.length) * (i + 0.5), -d / 2 + (d / arr2.length) * (j + 0.5)] as [number, number]),
      );
    for (const [x, z] of list) {
      pb.box([x, H - 0.025, z], [pw, 0.03, pd], '#FFFFFF');
      b.box([x, H - 0.012, z], [pw + 0.08, 0.02, pd + 0.08], '#E4E1DA');
    }
    panels = pb.buildGeometry();
  }

  const views: ShellOut['views'] = {};
  for (const [k, vb] of viewB) views[k] = vb.buildGeometry() ?? undefined;
  return { views, panels, ceiling, ceilingColor: s.ceiling ?? PAL.ceiling };
}

/* ------------------------------------------------------------------ runtime parts */

export const useRoomFlags = () => useStage((s) => s.flags);

/** Painted outside views behind all windows of a room (one draw call per view kind). */
export function WindowViews({ views }: { views: ShellOut['views'] }) {
  return (
    <>
      {(Object.keys(views) as ViewKind[]).map((k) => (views[k] ? <ViewMesh key={k} kind={k} geo={views[k]!} /> : null))}
    </>
  );
}

function ViewMesh({ kind, geo }: { kind: ViewKind; geo: THREE.BufferGeometry }) {
  const tex = useViewTexture(kind);
  const m = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [tex]);
  useEffect(() => () => m.dispose(), [m]);
  return <mesh geometry={geo} material={m} />;
}

/**
 * Ceiling and its light panels: panels glow and the ceiling catches a little bounce light while the
 * lights are on; both go dull when the `lights` flag is 'off'.
 */
export function CeilingPanels({ shell, warm = false }: { shell: ShellOut; warm?: boolean }) {
  const flags = useRoomFlags();
  const on = flags.lights !== 'off';
  const c = shell.ceilingColor;
  return (
    <>
      {shell.ceiling && <mesh geometry={shell.ceiling} material={on ? mat(c, { emissive: c, emissiveIntensity: 0.32 }) : mat(c)} />}
      {shell.panels && <mesh geometry={shell.panels} material={on ? glow(warm ? '#FFF1D6' : '#FFFDF5', 1.2) : mat('#CFCFC8')} />}
    </>
  );
}

/**
 * Door leaf (or a pair) in an opening. p = floor centre of the opening on the wall's inner face,
 * rotY = the wall's into-room rotation (from onWall). Opens into the room by `openAngle`.
 */
export function Door({
  p,
  rotY,
  width,
  height,
  color = PAL.door,
  open = false,
  double = false,
  cross,
  window = true,
  hinge = 'left',
}: {
  p: Vec3;
  rotY: number;
  width: number;
  height: number;
  color?: string;
  open?: boolean;
  double?: boolean;
  /** Color of a cross symbol on both faces of the leaf (clinic). */
  cross?: string;
  window?: boolean;
  hinge?: 'left' | 'right';
}) {
  const leaves = double ? [-1, 1] : [hinge === 'left' ? -1 : 1];
  const lw = double ? width / 2 : width;
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      {leaves.map((sideSign) => {
        // hinge at x = sideSign * width/2, leaf extends toward the centre
        // positive rotation about Y swings a leaf hinged on the right (+x) into the room (+z)
        const ang = open ? sideSign * 1.75 : 0;
        return (
          <group key={sideSign} position={[(sideSign * width) / 2, 0, -T / 2]} rotation={[0, ang, 0]}>
            <group position={[(-sideSign * lw) / 2, 0, 0]}>
              <mesh position={[0, height / 2, 0]} scale={[lw - 0.03, height - 0.02, 0.05]} geometry={GEO.rbox} material={mat(color)} />
              {window && <mesh position={[0, height * 0.7, 0]} scale={[lw * 0.36, height * 0.24, 0.056]} geometry={GEO.box} material={mat(PAL.glass, { rough: 0.15 })} />}
              <mesh position={[(-sideSign * (lw / 2 - 0.12)), height * 0.47, 0]} scale={[0.04, 0.04, 0.12]} geometry={GEO.box} material={mat(PAL.metal, { metal: 0.6, rough: 0.35 })} />
              <mesh position={[(-sideSign * (lw / 2 - 0.08)), height * 0.47, 0]} scale={[0.14, 0.03, 0.15]} geometry={GEO.box} material={mat(PAL.metal, { metal: 0.6, rough: 0.35 })} />
              {cross && (
                <group position={[0, height * 0.42, 0]}>
                  <mesh position={[0, 0, 0]} scale={[0.34, 0.34, 0.058]} geometry={GEO.cyl} rotation={[Math.PI / 2, 0, 0]} material={mat('#FFFFFF')} />
                  <mesh scale={[0.08, 0.24, 0.062]} geometry={GEO.box} material={mat(cross)} />
                  <mesh scale={[0.24, 0.08, 0.062]} geometry={GEO.box} material={mat(cross)} />
                </group>
              )}
            </group>
          </group>
        );
      })}
    </group>
  );
}

let exitTex: THREE.CanvasTexture | null = null;
const exitMats = new Map<string, THREE.Material>();
function exitMat(bright: boolean) {
  exitTex ??= canvasTexture('ground:exit', 256, 112, drawExit);
  const k = bright ? 'b' : 'n';
  let m = exitMats.get(k);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: exitTex, toneMapped: false, color: new THREE.Color(bright ? 1.25 : 0.92, bright ? 1.25 : 0.92, bright ? 1.25 : 0.92) });
    exitMats.set(k, m);
  }
  return m;
}
const haloMat = new THREE.MeshBasicMaterial({ color: '#4DFF9A', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

/** Green exit sign box; brighter with a halo when the `exitGlow` flag is set. Faces local +Z. */
export function ExitSign({ p, rotY, scale = 1 }: { p: Vec3; rotY: number; scale?: number }) {
  const flags = useRoomFlags();
  const bright = !!flags.exitGlow;
  return (
    <group position={p} rotation={[0, rotY, 0]} scale={scale}>
      <mesh position={[0, 0, -0.03]} scale={[0.5, 0.24, 0.06]} geometry={GEO.box} material={mat('#F4F4F0')} />
      <mesh position={[0, 0, 0.002]} scale={[0.46, 0.2, 1]} geometry={GEO.plane} material={exitMat(bright)} />
      {bright && <mesh position={[0, 0, 0.01]} scale={[0.9, 0.5, 1]} geometry={GEO.plane} material={haloMat} />}
    </group>
  );
}

const strobeOn = new THREE.MeshBasicMaterial({ color: '#FF2A2A', toneMapped: false });
const strobeHalo = new THREE.MeshBasicMaterial({ color: '#FF3B3B', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

/** Wall alarm horn/strobe; flashes red while the `alarm` flag is true. Faces local +Z. */
export function AlarmStrobe({ p, rotY }: { p: Vec3; rotY: number }) {
  const flags = useRoomFlags();
  const on = !!flags.alarm;
  const lens = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!lens.current) return;
    lens.current.visible = on && Math.floor(performance.now() / 260) % 2 === 0;
  });
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0, 0.03]} scale={[0.16, 0.2, 0.06]} geometry={GEO.rbox} material={mat(PAL.safetyRed)} />
      <mesh position={[0, 0.03, 0.065]} scale={[0.09, 0.05, 0.03]} geometry={GEO.rbox} material={mat('#F7D2D2', { rough: 0.3 })} />
      <mesh position={[0, -0.05, 0.062]} scale={[0.1, 0.06, 0.01]} geometry={GEO.box} material={mat('#9E1F1F')} />
      <group ref={lens} visible={false}>
        <mesh position={[0, 0.03, 0.082]} scale={[0.1, 0.06, 0.01]} geometry={GEO.box} material={strobeOn} />
        <mesh position={[0, 0.03, 0.09]} scale={[0.9, 0.9, 1]} geometry={GEO.plane} material={strobeHalo} />
      </group>
    </group>
  );
}

/** Thin falling water stream (a tap that is running). Top at p, length len. */
const waterMat = new THREE.MeshStandardMaterial({ color: '#9AD8FF', transparent: true, opacity: 0.65, roughness: 0.1, emissive: '#5FB8F0', emissiveIntensity: 0.35 });
export function TapStream({ p, len, on }: { p: Vec3; len: number; on: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current && on) ref.current.scale.x = ref.current.scale.z = 0.022 + Math.sin(performance.now() / 45) * 0.003;
  });
  if (!on) return null;
  return (
    <group position={p}>
      <mesh ref={ref} position={[0, -len / 2, 0]} scale={[0.022, len, 0.022]} geometry={GEO.cyl} material={waterMat} />
      <mesh position={[0, -len + 0.01, 0]} scale={[0.07, 0.015, 0.07]} geometry={GEO.cyl} material={waterMat} />
    </group>
  );
}

export type { Col };
