/**
 * Shared room shell for the first-floor rooms: walls with a door and windows, ceiling, cornice,
 * door frame + corridor behind it, exit sign, light switch, emergency strips and ceiling light panels.
 * Also the swinging door leaf and the window views.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PAL } from '../../kit';
import type { ViewKind } from '../../kit';
import { BatchMesh, WindowView, behindDoor, ceiling, doorParts, lightPanel, useRoomFlags, walls, windowFrame, type Kit4, type WallStyle } from './common';
import { drawDoorSign, drawExitSign, type Ctx } from './paint';

export interface WindowDef {
  wall: 'n' | 's';
  /** Centre along x. */
  at: number;
  /** Height of the window centre. */
  y: number;
  w: number;
  h: number;
  mullions?: number;
}

export interface ShellCfg {
  id: string;
  W: number;
  D: number;
  H: number;
  door: { wall: 'n' | 's'; x: number; w?: number; h?: number };
  plaque: { name: string; num: string; color: string; icon?: (ctx: Ctx, x: number, y: number, s: number) => void };
  windows: WindowDef[];
  style: WallStyle;
  /** Ceiling light panel centres [x, z]. */
  lights: [number, number][];
  view?: ViewKind;
}

const DOOR_W = 1.0;
const DOOR_H = 2.2;

export function buildShell(k: Kit4, c: ShellCfg) {
  const { s, e } = k;
  const { W, D, H } = c;
  const dw = c.door.w ?? DOOR_W;
  const dh = c.door.h ?? DOOR_H;
  const holes = [
    { wall: c.door.wall, at: c.door.x, width: dw + 0.2, height: dh + 0.1 },
    ...c.windows.map((w) => ({ wall: w.wall, at: w.at, width: w.w, height: w.h, sill: w.y - w.h / 2 })),
  ];
  walls(s, W, D, H, holes, c.style);
  ceiling(k, W, D, H);
  const cz = (wall: 'n' | 's') => (wall === 'n' ? -D / 2 : D / 2);
  const rot = (wall: 'n' | 's') => (wall === 'n' ? 0 : Math.PI);
  // cornice
  for (const [p, sz] of [
    [[0, H - 0.04, -D / 2 + 0.03], [W, 0.08, 0.06]],
    [[0, H - 0.04, D / 2 - 0.03], [W, 0.08, 0.06]],
    [[-W / 2 + 0.03, H - 0.04, 0], [0.06, 0.08, D]],
    [[W / 2 - 0.03, H - 0.04, 0], [0.06, 0.08, D]],
  ] as [[number, number, number], [number, number, number]][])
    s.box(p, sz, '#EFE6D6');
  // door frame + corridor beyond
  const dz = cz(c.door.wall);
  s.at([c.door.x, 0, dz], rot(c.door.wall), () => {
    doorParts(s, dw, dh, PAL.door, { leaf: false });
    behindDoor(s, dw, dh, 2.6);
  });
  // plaque beside the door, exit sign over it
  const sgn = c.door.wall === 'n' ? 1 : -1;
  s.sticker(`${c.id}-plaque`, [c.door.x - 0.78 * sgn, 1.62, dz + (c.door.wall === 'n' ? 0.012 : -0.012)], 0.5, 0.2, (ctx, w, h) => drawDoorSign(ctx, w, h, c.plaque.name, c.plaque.num, c.plaque.color, c.plaque.icon), rot(c.door.wall), 420);
  e.at([c.door.x, 2.56, dz + (c.door.wall === 'n' ? 0.06 : -0.06)], rot(c.door.wall), () => {
    e.box([0, 0, -0.03], [0.62, 0.24, 0.05], '#1A9E52');
    e.sticker('exit-sign', [0, 0, 0.0], 0.58, 0.2, (ctx, w, h) => drawExitSign(ctx, w, h, 0), 0, 600);
  });
  // light switch
  s.at([c.door.x + 0.85 * sgn, 1.2, dz], rot(c.door.wall), () => {
    s.box([0, 0, 0.01], [0.09, 0.13, 0.02], '#FFFFFF');
    s.box([0, 0.02, 0.024], [0.03, 0.05, 0.01], '#D6DBE1');
  });
  // windows
  for (const w of c.windows) s.at([w.at, w.y, cz(w.wall)], rot(w.wall), () => windowFrame(s, w.w, w.h, w.mullions ?? 1));
  // emergency floor strips (glow)
  const strip = (len: number, p: [number, number, number], r: number) => e.at(p, r, () => e.box([0, 0, 0.034], [len, 0.022, 0.01], '#2BE07A'));
  strip(W - 0.2, [0, 0.135, -D / 2], 0);
  strip(W - 0.2, [0, 0.135, D / 2], Math.PI);
  strip(D - 0.2, [-W / 2, 0.135, 0], Math.PI / 2);
  strip(D - 0.2, [W / 2, 0.135, 0], -Math.PI / 2);
  for (const [x, z] of c.lights) lightPanel(k, x, H, z);
}

export function ShellWindows({ cfg }: { cfg: ShellCfg }) {
  return (
    <>
      {cfg.windows.map((w, i) => (
        <WindowView key={i} p={[w.at, w.y, w.wall === 'n' ? -cfg.D / 2 : cfg.D / 2]} rotY={w.wall === 'n' ? 0 : Math.PI} w={w.w} h={w.h} view={cfg.view ?? 'yard'} />
      ))}
    </>
  );
}

/** Corridor door leaf: closed by default, swings open (out into the corridor) with flag `door: 'open'`. */
export function FirstDoor({ cfg }: { cfg: ShellCfg }) {
  const { flags } = useRoomFlags();
  const open = flags.door === 'open' || flags.door === true;
  const ref = useRef<import('three').Group>(null);
  const ang = useRef(open ? -1.7 : 0);
  useFrame((_, dt) => {
    const target = open ? -1.7 : 0;
    ang.current += (target - ang.current) * Math.min(1, dt * 4);
    if (ref.current) ref.current.rotation.y = ang.current;
  });
  const w = cfg.door.w ?? DOOR_W;
  const h = cfg.door.h ?? DOOR_H;
  const north = cfg.door.wall === 'n';
  return (
    <group position={[cfg.door.x + (north ? w / 2 : -w / 2), 0, north ? -cfg.D / 2 + 0.02 : cfg.D / 2 - 0.02]} rotation={[0, north ? 0 : Math.PI, 0]}>
      <group ref={ref}>
        <BatchMesh
          deps={[w, h]}
          build={(b) =>
            b.at([-w / 2, 0, 0], 0, () => {
              b.rbox([0, h / 2, 0], [w - 0.03, h - 0.02, 0.05], PAL.door, 0.015);
              b.box([0.18, h * 0.7, 0.02], [0.26, 0.6, 0.012], '#2C3E50');
              b.box([0.18, h * 0.7, 0.026], [0.22, 0.54, 0.006], '#9DD3EE');
              b.box([-w / 2 + 0.1, h * 0.47, 0.035], [0.04, 0.04, 0.05], PAL.metal);
              b.box([-w / 2 + 0.16, h * 0.47, 0.06], [0.14, 0.03, 0.03], PAL.metal);
              b.box([0, 0.12, 0.028], [w - 0.08, 0.18, 0.006], '#C7CED6');
              b.box([0, h * 0.35, 0.03], [0.5, 0.012, 0.004], '#7CB2E6');
            })
          }
        />
      </group>
    </group>
  );
}
