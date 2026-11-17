/**
 * Library (المكتبة). Local coordinates: x -7..7, z -6..6, floor y 0, ceiling 3.4.
 * Door from the corridor on the SOUTH wall (east end), windows on the north wall. Low bookshelves on the
 * walls and two double-sided island shelves, reading carpet with bean bags in the middle, the librarian
 * desk at the east, a globe and a reading table on the west.
 */
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GEO, canvasTexture, mat } from '../../kit';
import type { Batch } from './batch';
import { AlarmBeacon, CeilingFan, ClockHands, StaticRoom, TileFloor, blob, type Kit4 } from './common';
import { FirstDoor, ShellWindows, buildShell, type ShellCfg } from './shell';
import { LIBRARY as L, ROOM_H } from './landmarks';
import { acUnit, bookRow, lowShelf, pottedPlant, schoolChair, swivelChair, wallClock, BOOK_COLS } from './furn';
import { drawBookPoster, drawCarpet, drawGlobe, drawLibraryBanner, drawNamePlate, drawReadingMural } from './draw';

const W = 14;
const D = 12;
const H = ROOM_H;
const N = -D / 2;
const BAGS = ['#E5484D', '#2D8CFF', '#F5C518', '#22B573', '#8B5CF6', '#FF8A3D'];

export const LIBRARY_CFG: ShellCfg = {
  id: 'lib',
  W,
  D,
  H,
  door: { wall: 's', x: L.door[0] },
  plaque: { name: 'المكتبة', num: '١٠٤', color: '#8B5CF6' },
  windows: L.windows.map((w) => ({ wall: 'n' as const, at: w.centre[0], y: w.centre[1], w: w.w, h: w.h })),
  style: { low: '#EFE3CF', rail: '#8B5CF6', lowH: 1.0 },
  lights: [-3.5, 0, 3.5].flatMap((z) => [-4.5, 0, 4.5].map((x) => [x, z] as [number, number])),
};

/* ------------------------------------------------------------------ pieces */

function beanBag(b: Batch, color: string) {
  b.ball([0, 0.26, 0], [0.9, 0.55, 0.85], color);
  b.ball([0, 0.46, 0.0], [0.5, 0.2, 0.46], color);
  b.ball([0.1, 0.53, -0.1], [0.2, 0.12, 0.2], color);
  b.torus([0, 0.2, 0], 0.88, '#FFFFFF', [Math.PI / 2, 0, 0], 0.05);
  b.torus([0.3, 0.5, 0.2], 0.12, color, [0, 0.4, 0], 0.5);
}

function readingTable(b: Batch) {
  b.rbox([0, 0.6, 0], [1.7, 0.04, 0.9], '#F2DDB4', 0.015);
  b.box([0, 0.575, 0], [1.66, 0.014, 0.86], '#8B5CF6');
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) b.rbox([sx * 0.76, 0.29, sz * 0.38], [0.06, 0.58, 0.06], '#8E99A8', 0.01);
  // open books and a lamp
  b.box([-0.35, 0.625, 0.1], [0.24, 0.012, 0.18], '#FFFFFF', 0.2);
  b.box([-0.35, 0.634, 0.1], [0.002, 0.01, 0.18], '#C9D2DC', 0.2);
  b.box([0.35, 0.625, -0.12], [0.22, 0.014, 0.16], '#E5484D', -0.3);
  b.box([0.37, 0.64, -0.12], [0.2, 0.014, 0.15], '#2D8CFF', -0.2);
  b.cyl([0.65, 0.63, 0.25], [0.12, 0.02, 0.12], '#2B2F36');
  b.cyl([0.65, 0.76, 0.25], [0.016, 0.26, 0.016], '#2B2F36');
  b.cone([0.65, 0.9, 0.25], [0.16, 0.12, 0.16], '#F5C518');
}

function librarianDesk(b: Batch) {
  // top at 0.76, centred, 2.4 wide (x) x 0.7 deep (z), front toward +Z (visitors on the south side)
  b.rbox([0, 0.74, 0], [2.4, 0.045, 0.7], '#C98F5A', 0.015);
  b.rbox([0, 0.38, 0.3], [2.3, 0.7, 0.05], '#8B5CF6', 0.02); // front panel (name plate goes here)
  b.rbox([-1.1, 0.37, 0], [0.06, 0.72, 0.66], '#B57B48', 0.015);
  b.rbox([1.1, 0.37, 0], [0.06, 0.72, 0.66], '#B57B48', 0.015);
  b.box([0.0, 0.58, 0.0], [2.2, 0.02, 0.5], '#B57B48');
  // monitor facing north (the librarian), keyboard, scanner, stamp, bell, books, plant
  b.rbox([-0.5, 1.05, -0.1], [0.5, 0.32, 0.04], '#1C2430', 0.012);
  b.box([-0.5, 0.93, -0.1], [0.05, 0.2, 0.03], '#2B2F36');
  b.cyl([-0.5, 0.775, -0.1], [0.2, 0.02, 0.2], '#2B2F36');
  b.rbox([-0.5, 0.775, -0.25], [0.42, 0.02, 0.13], '#F1F4F8', 0.008);
  b.rbox([-0.05, 0.8, -0.05], [0.07, 0.06, 0.14], '#E5484D', 0.02);
  b.rbox([0.1, 0.785, 0.1], [0.1, 0.04, 0.1], '#2B2F36', 0.012);
  b.cyl([0.1, 0.815, 0.1], [0.06, 0.02, 0.06], '#F5C518');
  b.cyl([0.4, 0.8, 0.12], [0.08, 0.05, 0.08], '#F5C518');
  b.ball([0.4, 0.835, 0.12], [0.025, 0.025, 0.025], '#C9A227', undefined, true);
  ['#E5484D', '#2D8CFF', '#22B573', '#F5C518', '#8B5CF6'].forEach((c, i) => b.box([0.8, 0.78 + i * 0.04, -0.05 + (i % 2) * 0.02], [0.3 - i * 0.02, 0.036, 0.22], c, i * 0.06 - 0.1));
  b.cyl([-1.0, 0.82, 0.18], [0.09, 0.14, 0.09], '#14B8A6');
  b.cyl([-0.99, 0.95, 0.18], [0.01, 0.15, 0.01], '#E5484D', [0, 0, 0.2], true);
  b.cyl([-1.02, 0.95, 0.18], [0.01, 0.15, 0.01], '#2D8CFF', [0, 0, -0.2], true);
  b.sticker('lib-nameplate', [0.0, 0.5, 0.3265], 0.7, 0.18, drawNamePlate, 0, 320);
}

function bookCart(b: Batch) {
  // length 1.0 along x, 0.45 deep, facing +Z
  b.rbox([0, 0.2, 0], [1.0, 0.03, 0.44], '#14B8A6', 0.01);
  b.rbox([0, 0.55, 0], [1.0, 0.03, 0.44], '#14B8A6', 0.01);
  b.rbox([0, 0.9, 0], [1.0, 0.03, 0.44], '#14B8A6', 0.01);
  for (const sx of [-1, 1]) {
    b.rbox([sx * 0.49, 0.5, 0], [0.03, 0.8, 0.44], '#2B8CBE', 0.01);
    b.cyl([sx * 0.42, 0.04, 0.16], [0.08, 0.04, 0.08], '#1E2228', [0, 0, Math.PI / 2], true);
    b.cyl([sx * 0.42, 0.04, -0.16], [0.08, 0.04, 0.08], '#1E2228', [0, 0, Math.PI / 2], true);
  }
  b.cyl([0.0, 1.0, 0.2], [0.025, 0.2, 0.025], '#8E99A8', [0, 0, Math.PI / 2]);
  bookRow(b, -0.44, 0.44, 0.215, 0.0, 0.3, 3, 0.18, 0.28);
  bookRow(b, -0.44, 0.44, 0.565, 0.0, 0.3, 11, 0.2, 0.3);
  bookRow(b, -0.44, 0.2, 0.915, 0.0, 0.3, 7, 0.2, 0.3);
}

function stand(b: Batch) {
  // globe stand: base, pole and meridian ring (globe sphere is a separate mesh)
  b.cyl([0, 0.02, 0], [0.5, 0.04, 0.5], '#8E5B34');
  b.cyl([0, 0.46, 0], [0.05, 0.92, 0.05], '#8E5B34');
  b.cyl([0, 0.78, 0], [0.16, 0.04, 0.16], '#C9A227');
  b.torus([0, 1.18, 0], 0.62, '#C9A227', [0, Math.PI / 2, 0.41], 0.35);
}

function teddy(b: Batch) {
  b.ball([0, 0.1, 0], [0.18, 0.2, 0.16], '#C98F5A');
  b.ball([0, 0.26, 0.0], [0.15, 0.14, 0.13], '#C98F5A');
  b.ball([-0.06, 0.34, 0], [0.05, 0.05, 0.04], '#C98F5A');
  b.ball([0.06, 0.34, 0], [0.05, 0.05, 0.04], '#C98F5A');
  b.ball([0, 0.24, 0.06], [0.06, 0.05, 0.04], '#F2DDB4');
  b.ball([-0.035, 0.28, 0.062], [0.02, 0.02, 0.02], '#1E2A3B', undefined, true);
  b.ball([0.035, 0.28, 0.062], [0.02, 0.02, 0.02], '#1E2A3B', undefined, true);
  b.ball([0, 0.1, 0.07], [0.1, 0.12, 0.04], '#F2DDB4');
}

/* ------------------------------------------------------------------ static build */

function buildLibrary(k: Kit4) {
  const { s } = k;
  buildShell(k, LIBRARY_CFG);

  // ---- reading carpet + bean bags
  const c = L.carpet;
  s.box([c.centre[0], 0.004, c.centre[2]], [c.w + 0.06, 0.008, c.d + 0.06], '#F5C518');
  s.sticker('lib-carpet', [c.centre[0], 0.0095, c.centre[2]], c.w, c.d, drawCarpet, [-Math.PI / 2, 0, 0], 130);
  L.beanBags.forEach((p, i) => {
    s.at([p[0], 0, p[2]], i * 1.3, () => beanBag(s, BAGS[i % BAGS.length]));
    blob(k, p[0], p[2], 1.2, 1.1);
  });

  // ---- north wall: low shelves under the windows, banner, clock
  [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5].forEach((x, i) => {
    s.at([x, 0, N], 0, () => lowShelf(s, 2.1, 0.95, 0.35, 2, i * 7));
  });
  blob(k, 0, N + 0.3, 13.2, 0.8);
  s.sticker('lib-banner', [0, 1.95, N + 0.012], 3.0, 0.66, drawLibraryBanner, 0, 220);
  s.at([L.clock[0], L.clock[1], N], 0, () => wallClock(s, 0.5));
  // things on top of the north shelves: teddy, plants, a globe-like ball
  s.at([-5.6, 0.975, N + 0.2], 0.2, () => teddy(s));
  s.at([5.5, 0.975, N + 0.2], -0.2, () => teddy(s));
  s.at([-0.1, 0.96, N + 0.2], 0, () => pottedPlant(s, 0.3), [0.5, 0.5, 0.5]);

  // ---- west wall: shelves, AC, posters
  [-4.5, -2.3, -0.1, 2.1, 4.3].forEach((z, i) => {
    s.at([-W / 2, 0, z], Math.PI / 2, () => lowShelf(s, 2.1, 1.1, 0.35, 3, i * 5 + 3));
  });
  blob(k, -W / 2 + 0.3, 0, 0.8, 11.6);
  s.at([-W / 2, L.acUnit[1], L.acUnit[2]], Math.PI / 2, () => acUnit(s));
  s.sticker('lib-quiet', [-W / 2 + 0.012, 1.95, -3.4], 0.6, 0.75, drawBookPoster, Math.PI / 2, 300);
  s.sticker('lib-quiet', [-W / 2 + 0.012, 1.95, 4.3], 0.6, 0.75, drawBookPoster, Math.PI / 2, 300);
  s.sticker('lib-mural', [-W / 2 + 0.012, 1.95, -0.7], 2.4, 1.2, drawReadingMural, Math.PI / 2, 200);

  // ---- east wall: shelves, big mural
  [-4.5, -2.3, -0.1].forEach((z, i) => {
    s.at([W / 2, 0, z], -Math.PI / 2, () => lowShelf(s, 2.1, 1.1, 0.35, 3, i * 5 + 17));
  });
  blob(k, W / 2 - 0.3, -2.3, 0.8, 6.6);
  s.sticker('lib-mural', [W / 2 - 0.012, 1.95, -2.3], 2.4, 1.2, drawReadingMural, -Math.PI / 2, 200);
  s.sticker('lib-quiet', [W / 2 - 0.012, 1.95, 4.0], 0.6, 0.75, drawBookPoster, -Math.PI / 2, 300);
  s.at([W / 2 - 0.45, 0, 0.7], 0, () => pottedPlant(s, 1.3, '#8B5CF6'));
  blob(k, W / 2 - 0.45, 0.7, 0.8, 0.8);
  // returned-books drop box by the door
  s.rbox([W / 2 - 0.35, 0.45, 5.3], [0.5, 0.9, 0.5], '#2D8CFF', 0.04);
  s.box([W / 2 - 0.35, 0.74, 5.04], [0.3, 0.04, 0.02], '#1E2A3B');
  s.box([W / 2 - 0.35, 0.5, 5.045], [0.4, 0.22, 0.004], '#FFFFFF');
  blob(k, W / 2 - 0.35, 5.3, 0.9, 0.9);

  // ---- island shelves (double-sided)
  L.islandShelves.forEach((p, i) => {
    s.at([p[0], 0, p[2]], Math.PI / 2, () => lowShelf(s, 3.0, 1.1, 0.3, 3, 40 + i * 9));
    s.at([p[0], 0, p[2]], -Math.PI / 2, () => lowShelf(s, 3.0, 1.1, 0.3, 3, 50 + i * 9));
    blob(k, p[0], p[2], 1.4, 3.5);
  });

  // ---- librarian desk, chair, cart
  const ld = L.librarianDesk;
  s.at([ld[0], 0, ld[2]], 0, () => librarianDesk(s));
  blob(k, ld[0], ld[2], 3.0, 1.2);
  s.at([ld[0] - 1.6, 0, 1.95], Math.PI + 0.5, () => swivelChair(s, '#8B5CF6'));
  blob(k, ld[0] - 1.6, 1.95, 0.7, 0.7);
  s.at([2.2, 0, 4.4], 0.1, () => bookCart(s));
  blob(k, 2.2, 4.4, 1.3, 0.8);

  // ---- globe stand + reading table with chairs
  s.at([L.globe[0], 0, L.globe[2]], 0, () => stand(s));
  blob(k, L.globe[0], L.globe[2], 0.8, 0.8);
  const rt = L.readingTable;
  s.at([rt[0], 0, rt[2]], 0, () => readingTable(s));
  blob(k, rt[0], rt[2], 2.4, 1.6);
  [
    [-0.45, -0.75, Math.PI],
    [0.45, -0.75, Math.PI],
    [-0.45, 0.75, 0],
    [0.45, 0.75, 0],
  ].forEach(([dx, dz, r], i) => {
    s.at([rt[0] + dx, 0, rt[2] + dz], (r as number) + (i % 2) * 0.1, () => schoolChair(s, ['#2D8CFF', '#22B573', '#F5C518', '#FF8A3D'][i]));
    blob(k, rt[0] + dx, rt[2] + dz, 0.6, 0.6);
  });
  s.at([-W / 2 + 0.45, 0, 5.3], 0, () => pottedPlant(s, 1.4, '#E07A3F'));
  blob(k, -W / 2 + 0.45, 5.3, 0.8, 0.8);
  // a stack of picture books on the floor beside a bean bag
  [0, 1, 2].forEach((i) => s.box([-0.95, 0.02 + i * 0.04, -0.3 + i * 0.01], [0.3 - i * 0.02, 0.036, 0.22], BOOK_COLS[i * 3 + 1], i * 0.4));
}

/* ------------------------------------------------------------------ dynamic bits */

/** Slowly turning globe. */
function Globe() {
  const tex = useMemo(() => canvasTexture('first:globe', 512, 256, drawGlobe), []);
  const m = useMemo(() => mat('#FFFFFF', { map: tex, rough: 0.45 }), [tex]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.2;
  });
  const g = L.globe;
  return (
    <group position={[g[0], 1.18, g[2]]} rotation={[0, 0, 0.41]}>
      <mesh ref={ref} scale={[0.5, 0.5, 0.5]} geometry={GEO.sphere} material={m} />
    </group>
  );
}

export function Library() {
  return (
    <group>
      <TileFloor w={W + 0.4} d={D + 0.4} tile={0.6} base="#EADFC8" lineColor="#D9CBAE" />
      <StaticRoom id="library" build={buildLibrary} />
      <FirstDoor cfg={LIBRARY_CFG} />
      <ShellWindows cfg={LIBRARY_CFG} />
      <ClockHands p={[L.clock[0], L.clock[1], L.clock[2] + 0.045]} d={0.46} />
      <AlarmBeacon p={[2.6, 2.6, D / 2]} rotY={Math.PI} />
      <CeilingFan p={[-3.0, 1.5]} ceilingY={H} />
      <CeilingFan p={[3.0, 1.5]} ceilingY={H} />
      <Globe />
    </group>
  );
}
