/**
 * All static geometry of the neighborhood set: terrain, skyline, side road and flood dip, six villas,
 * the park, the roadworks. Added to one Builder, merged per (zone, material class).
 */
import * as THREE from 'three';
import { PAL } from '../../kit';
import type { Vec3 } from '../../../core/types';
import { groundHeight } from '../../../core/ground';
import { Builder, U, circle, flatShape, gridSurface, matrixOf, rand, roundRect, IDENTITY } from './build';
import { cellUV, type CellName } from './atlas';
import { DIP, GATES, GATE_W, HOME, PARK, PLOT_XS, PLOT_Z1, POLES, SIDE_ROAD, VILLA_Z0, WALL_Z, WORKS } from './layout';

const C = {
  sand: '#E4CB9B',
  sandDark: '#D6BB86',
  sandLight: '#EBD6A9',
  asphalt: '#3B4049',
  white: '#F4F4F0',
  yellow: '#F2C230',
  concrete: '#CFC6B3',
  concreteDark: '#A99F8C',
  paver: '#D9CDB7',
  paverDark: '#CBBD9F',
  trunk: PAL.palmTrunk,
  leaf: PAL.palmLeaf,
  leaf2: '#4CAF5A',
  dates: '#C58B3A',
  pink: '#E0479E',
  pink2: '#F27DB8',
  bushGreen: '#3F8F47',
  grass: '#69B34C',
  grassLight: '#76BF58',
  teal: '#14B8A6',
  cone: '#FF7A1A',
  ink: '#1E2A3B',
  metal: '#B8C1CC',
  dark: '#4A5563',
  rubber: '#C4573F',
  rubberBlue: '#3B82C4',
  rubberYellow: '#F2B632',
};

const dec = (b: Builder, cell: CellName, p: [number, number, number], w: number, h: number, rotY = 0, color = '#FFFFFF') =>
  b.decal(p, w, h, cellUV(cell), rotY, color);

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}

/* ------------------------------------------------------------------ palms */

/** A cartoon palm: leaning trunk, ring marks, fronds, dates. */
export function palm(b: Builder, x: number, z: number, h: number, seed: number, y0 = 0, lo = false) {
  const lean = (rand(seed) - 0.5) * 0.9;
  const dir = rand(seed + 3) * Math.PI * 2;
  const tx = Math.cos(dir) * lean;
  const tz = Math.sin(dir) * lean;
  const top: [number, number, number] = [x + tx, y0 + h, z + tz];
  b.rod('solid', [x, y0, z], top, 0.3, C.trunk, 6);
  if (!lo) for (let i = 1; i < 6; i++) b.cyl('solid', [x + (tx * i) / 6, y0 + (h * i) / 6.4, z + (tz * i) / 6.4], [0.37, 0.1, 0.37], '#86623B', undefined, 6);
  const n = lo ? 5 : 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    b.frame(top, a, () => {
      const m = matrixOf([1.15, -0.2, 0], [2.4, 0.08, 0.6], [0, 0, -0.42 - (i % 2) * 0.12]);
      b.add('solid', U.sphereLo, m, i % 2 ? C.leaf : C.leaf2);
    });
  }
  b.ball('solid', [top[0], top[1] - 0.15, top[2]], [0.55, 0.45, 0.55], C.dates, undefined, true);
}

/** Round shade tree. */
function tree(b: Builder, x: number, z: number, s: number, seed: number) {
  b.cyl('solid', [x, 1.0 * s, z], [0.3 * s, 2 * s, 0.3 * s], '#7B5A3A', undefined, 6);
  const g = ['#4E9D4A', '#5BAA52', '#46903F'];
  b.ball('solid', [x, 2.6 * s, z], [2.6 * s, 2 * s, 2.6 * s], g[seed % 3]);
  b.ball('solid', [x + 0.9 * s, 2.2 * s, z + 0.3 * s], [1.6 * s, 1.4 * s, 1.6 * s], g[(seed + 1) % 3]);
  b.ball('solid', [x - 0.8 * s, 2.3 * s, z - 0.4 * s], [1.5 * s, 1.3 * s, 1.5 * s], g[(seed + 2) % 3]);
}

/* ---------------------------------------------------------------- terrain */

function terrain(b: Builder) {
  b.inZone('terrain', () => {
    const R = 900;
    const r = SIDE_ROAD;
    b.add(
      'soft',
      flatShape(
        [[-R, -R], [R, -R], [R, R], [-R, R]],
        [
          [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]],
          // the roadworks trench is cut through the terrain as well (see WORKS.pit)
          [[WORKS.pit.x0, WORKS.pit.z0], [WORKS.pit.x1, WORKS.pit.z0], [WORKS.pit.x1, WORKS.pit.z1], [WORKS.pit.x0, WORKS.pit.z1]],
        ],
        -0.02,
      ),
      IDENTITY,
      C.sand,
    );
    // soft darker/lighter sand patches near the playable area, so the plain is not a flat colour
    for (let i = 0; i < 60; i++) {
      const x = (rand(i * 3 + 1) - 0.5) * 340;
      const z = (rand(i * 3 + 2) - 0.2) * 300;
      if (Math.abs(x + 72) < 9) continue;
      if (Math.abs(z) < 12 && Math.abs(x) < 135) continue;
      const w = 8 + rand(i * 7) * 26;
      if (z < -8 && z > -85 && Math.abs(x) < 60) continue; // school compound
      // never under the side road / dip, houses and park (a patch at y -0.012 would poke through the sunk asphalt)
      if (x > -72 - w / 2 && x < 64 + w / 2 && z > -10 - w / 2 && z < 50 + w / 2) continue;
      b.add('soft', U.disc, matrixOf([x, -0.012, z], [w, 1, w * (0.5 + rand(i * 5) * 0.4)], rand(i) * 3), i % 3 ? C.sandDark : C.sandLight);
    }
  });
}

/* --------------------------------------------------------------- skyline */

const FAR_WALLS = ['#E9D8B8', '#F2ECE0', '#DDC59A', '#EADFC8', '#D9BF93', '#F5F1E8', '#CFB68A'];

function skyline(b: Builder) {
  b.inZone('far', () => {
    // desert scrub and small rocks on the open sand around the compound (kept off every built area)
    for (let i = 0; i < 160; i++) {
      const x = (rand(i * 11 + 1) - 0.5) * 300;
      const z = -100 + rand(i * 11 + 2) * 160;
      if (z > -12 && z < 12) continue; // street band
      if (Math.abs(x + 72) < 12) continue; // signal road
      if (Math.abs(x) < 60 && z < -6 && z > -84) continue; // school compound
      if (x > -75 && x < 66 && z > 4 && z < 52) continue; // park, houses, side road
      if (x > 52 && x < 85 && z > -36 && z < -6) continue; // parking
      if (x > -102 && x < -75 && z > -36 && z < -6) continue; // mosque
      const sc = 0.7 + rand(i * 3) * 0.9;
      if (i % 4 === 0) {
        b.add('far', U.sphereLo, matrixOf([x, 0.2 * sc, z], [0.9 * sc, 0.5 * sc, 0.7 * sc], rand(i) * 3), '#BFA77B');
      } else {
        for (let j = 0; j < 3; j++) b.add('far', U.sphereLo, matrixOf([x + (j - 1) * 0.5 * sc, 0.3 * sc, z + (rand(i + j) - 0.5) * 0.5], [0.8 * sc, 0.55 * sc, 0.7 * sc]), j === 1 ? '#7C9A57' : '#8FA866');
      }
    }
    // low hills
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rand(i) * 0.3;
      const d = 470 + rand(i + 9) * 110;
      const w = 160 + rand(i + 4) * 160;
      const h = 22 + rand(i + 7) * 38;
      b.add('far', U.sphere, matrixOf([Math.cos(a) * d, -h * 0.35, Math.sin(a) * d - 40], [w, h * 1.4, w * 0.7], a), i % 2 ? '#CDB287' : '#BFA574');
    }
    // buildings: one per grid cell at most, sized so neighbours never touch or intersect
    const cell = 17;
    for (let gx = -340; gx <= 340; gx += cell)
      for (let gz = -330; gz <= 250; gz += cell) {
        const k = gx * 0.37 + gz * 1.13;
        if (rand(k) > 0.5) continue;
        const x = gx + (rand(k + 1) - 0.5) * 2.5;
        const z = gz + (rand(k + 2) - 0.5) * 2.5;
        if (x > -146 && x < 146 && z > -104 && z < 64) continue;
        if (Math.abs(x + 72) < 9) continue; // signal road runs the whole map
        const dist = Math.hypot(x, z + 20);
        const w = 7.5 + rand(k + 3) * 3.5;
        const d = 7.5 + rand(k + 4) * 3;
        const floors = Math.max(2, Math.round((4.5 + rand(k + 5) * 7) * (1 + dist / 260) / 3.2));
        const fh = 3.2;
        const h = floors * fh;
        const col = FAR_WALLS[Math.floor(rand(k + 6) * FAR_WALLS.length)];
        const trim = shade(col, 0.88);
        b.box('far', [x, h / 2, z], [w, h, d], col);
        b.box('far', [x, 0.35, z], [w + 0.2, 0.7, d + 0.2], shade(col, 0.82)); // plinth
        // flat roof with a parapet, and a set-back top storey on some of the taller blocks
        for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][])
          b.box('far', [x + (sx * (w - 0.3)) / 2, h + 0.4, z + (sz * (d - 0.3)) / 2], [sx ? 0.3 : w, 0.8, sz ? 0.3 : d], trim);
        let top = h;
        if (floors >= 4 && rand(k + 7) > 0.5) {
          b.box('far', [x, h + fh * 0.5, z], [w * 0.62, fh, d * 0.62], shade(col, 0.95));
          top = h + fh;
        }
        // regular window grid on all four faces: dark glass with a pale lintel above each
        const cols = Math.max(2, Math.floor(w / 3));
        const rowsD = Math.max(2, Math.floor(d / 3));
        for (let f = 0; f < floors; f++) {
          const y = f * fh + fh * 0.58 + (f === 0 ? 0.2 : 0);
          for (let c = 0; c < cols; c++) {
            const wx = x - w / 2 + ((c + 0.5) * w) / cols;
            for (const sz of [1, -1]) {
              if (f === 0 && sz === 1 && c === Math.floor(cols / 2)) continue; // door instead
              b.box('far', [wx, y, z + (sz * d) / 2], [1.0, 1.5, 0.12], '#6F8796');
              b.box('far', [wx, y + 0.95, z + (sz * d) / 2], [1.3, 0.16, 0.14], trim);
            }
          }
          for (let c = 0; c < rowsD; c++) {
            const wz = z - d / 2 + ((c + 0.5) * d) / rowsD;
            for (const sx of [1, -1]) {
              b.box('far', [x + (sx * w) / 2, y, wz], [0.12, 1.5, 1.0], '#6F8796');
              b.box('far', [x + (sx * w) / 2, y + 0.95, wz], [0.14, 0.16, 1.3], trim);
            }
          }
        }
        b.box('far', [x, 1.0, z + d / 2 + 0.05], [1.4, 2.0, 0.12], shade(col, 0.5)); // door
        // roof clutter: a water tank on legs, a stair-head box, air-conditioning units
        const rr = rand(k + 9);
        if (rr > 0.55) {
          b.cyl('far', [x - w * 0.25, top + 1.5, z - d * 0.2], [1.5, 1.3, 1.5], '#E9ECEF', undefined, 12);
          b.box('far', [x - w * 0.25, top + 0.5, z - d * 0.2], [1.6, 0.8, 1.6], trim);
        } else if (rr > 0.25) {
          b.box('far', [x + w * 0.2, top + 1.0, z + d * 0.1], [2.0, 1.6, 2.0], shade(col, 0.93));
        }
        if (rand(k + 10) > 0.6) b.box('far', [x + w * 0.3, top + 0.6, z - d * 0.3], [1.0, 0.7, 0.7], '#C9CED4');
        if (rand(k + 8) > 0.92) {
          // a minaret with a little green cap
          b.cyl('far', [x - w * 0.4, top + 5, z], [1.4, 10, 1.4], '#F5F1E8', undefined, 8);
          b.cone('far', [x - w * 0.4, top + 11, z], [1.8, 2.4, 1.8], '#2E9E6A', undefined, 8);
        }
      }
    // distant palms
    for (let i = 0; i < 170; i++) {
      const x = (rand(i * 5 + 1) - 0.5) * 520;
      const z = (rand(i * 5 + 2) - 0.45) * 440;
      if (x > -142 && x < 142 && z > -100 && z < 60) continue;
      if (Math.abs(x + 72) < 6) continue;
      const h = 6 + rand(i + 3) * 4;
      b.rod('far', [x, 0, z], [x + 0.4, h, z], 0.35, C.trunk, 6);
      for (let j = 0; j < 4; j++)
        b.frame([x + 0.4, h, z], (j / 4) * Math.PI * 2 + i, () => b.add('far', U.sphereLo, matrixOf([1.3, -0.2, 0], [2.8, 0.1, 0.8], [0, 0, -0.4]), C.leaf));
    }
  });
}

/* --------------------------------------------------------- side road, dip */

/** Ribbon of the given width following the road height, at +dy. */
function strip(b: Builder, cls: 'paint' | 'wet', x0: number, x1: number, z0: number, z1: number, dy: number, color: string) {
  const zs: number[] = [];
  for (let z = z0; z < z1 - 1e-6; z += 0.5) zs.push(z);
  zs.push(z1);
  b.add(cls, gridSurface([x0, x1], zs, (x, z) => groundHeight((x0 + x1) / 2, z) + dy), IDENTITY, color);
}

function sideRoad(b: Builder) {
  b.inZone('road', () => {
    const r = SIDE_ROAD;
    const xs = [r.x0, (r.x0 + r.x1) / 2, r.x1];
    const zs: number[] = [];
    for (let z = r.z0; z < r.z1 - 1e-6; z += z > 13.5 && z < 26.5 ? 0.5 : 2.5) zs.push(z);
    zs.push(r.z1);
    b.add('flat', gridSurface(xs, zs, (x, z) => groundHeight(x, z)), IDENTITY, C.asphalt);
    // edge lines and a dashed centre line, following the dip
    strip(b, 'paint', r.x0 + 0.35, r.x0 + 0.5, 7.7, r.z1 - 0.3, 0.012, C.white);
    strip(b, 'paint', r.x1 - 0.5, r.x1 - 0.35, 7.7, r.z1 - 0.3, 0.012, C.white);
    for (let z = 9; z < r.z1 - 3; z += 3) strip(b, 'paint', -14.06, -13.94, z, z + 1.5, 0.012, C.white);
    // stop line at the main street
    b.rect('paint', r.x0 + 0.5, -14.1, 8.2, 8.5, 0.012, C.white);
    // end of the road: speed hump-free turning bay and a low barrier with yellow blocks
    b.box('wet', [-14, 0.3, 43.6], [7.2, 0.6, 0.5], C.concrete);
    for (let i = 0; i < 7; i++) b.box('paint', [-17.1 + i * 1.0, 0.5, 43.33], [0.5, 0.2, 0.02], i % 2 ? C.ink : C.yellow);
    // low kerbs along both sides, and retaining walls where the dip sinks below the surroundings
    for (const [x, sx] of [[r.x0 - 0.075, -1], [r.x1 + 0.075, 1]] as [number, number][]) {
      b.box('wet', [x, 0.04, (7.5 + r.z1) / 2], [0.15, 0.08, r.z1 - 7.5], C.concrete);
      void sx;
    }
    const n = 28;
    for (const [x, face] of [[r.x0, 1], [r.x1, -1]] as [number, 1 | -1][])
      for (let i = 0; i < n; i++) {
        const z0 = DIP.z - DIP.half + (2 * DIP.half * i) / n;
        const z1 = DIP.z - DIP.half + (2 * DIP.half * (i + 1)) / n;
        const y0 = Math.min(groundHeight(x - face * 0.1, z0), groundHeight(x - face * 0.1, z1));
        if (y0 > -0.01) continue;
        const h = -y0 + 0.02;
        // each step is a thin concrete slab so the wall follows the dip profile
        b.box('wet', [x + face * 0.05, y0 + h / 2 - 0.02, (z0 + z1) / 2], [0.12, h, z1 - z0 + 0.01], C.concreteDark);
      }
    // yellow-black warning posts at both ends of the dip, and a depth gauge in the middle
    for (const z of [DIP.z - 6.6, DIP.z + 6.6])
      for (const x of [r.x0 + 0.5, r.x1 - 0.5]) {
        b.cyl('wet', [x, 0.45, z], [0.16, 0.9, 0.16], C.yellow, undefined, 8);
        b.cyl('wet', [x, 0.62, z], [0.17, 0.16, 0.17], C.ink, undefined, 8);
        b.cyl('wet', [x, 0.3, z], [0.17, 0.12, 0.17], C.ink, undefined, 8);
      }
    const gx = r.x1 - 0.35;
    b.box('solid', [gx, -0.35 + 0.55, DIP.z], [0.12, 1.1, 0.06], C.white);
    for (let i = 0; i < 7; i++) b.box('solid', [gx, -0.35 + 0.08 + i * 0.15, DIP.z - 0.035], [0.13, 0.075, 0.02], i % 2 ? C.white : '#D7263D');
    // pavement slabs along the park side (the raised-feeling walking route beside the dip)
    b.rect('flat', r.x0 - 3.3, r.x0 - 0.15, 7.7, r.z1, 0.012, C.paver);
    for (let z = 8.2; z < r.z1; z += 2) b.rect('paint', r.x0 - 3.3, r.x0 - 0.15, z, z + 0.04, 0.014, C.paverDark);
    // sidewalk on the house side
    b.rect('flat', r.x1 + 0.15, r.x1 + 1.0, 7.7, r.z1, 0.012, C.paver);
  });
}

/* ------------------------------------------------------------------ houses */

interface Villa {
  w: number;
  d: number;
  wall: string;
  trim: string;
  gate: string;
  door: string;
  crenel: boolean;
  tower?: 'dome' | 'cone';
  shutters: boolean;
  wallFront: string;
}

const VILLAS: Villa[] = [
  { w: 7.6, d: 9.8, wall: '#E8D6B5', trim: '#F5F1E8', gate: '#3A3F47', door: '#9B6A3F', crenel: true, shutters: false, wallFront: '#EFE3C8' },
  { w: 8.8, d: 9.2, wall: '#F5F1E8', trim: '#D9BF93', gate: '#7A4B2A', door: '#6E4A2E', crenel: false, tower: 'dome', shutters: true, wallFront: '#E8D6B5' },
  { w: 8.6, d: 9.4, wall: '#F5F1E8', trim: PAL.teal, gate: PAL.teal, door: PAL.teal, crenel: false, shutters: false, wallFront: '#F5F1E8' },
  { w: 9.2, d: 9.6, wall: '#D9BF93', trim: '#F5F1E8', gate: '#2F6B52', door: '#5B3A22', crenel: true, shutters: true, wallFront: '#E8D6B5' },
  { w: 7.6, d: 9.0, wall: '#E8D6B5', trim: '#C9B59A', gate: '#3A3F47', door: '#8A5A34', crenel: false, tower: 'cone', shutters: false, wallFront: '#F5F1E8' },
  { w: 6.2, d: 9.0, wall: '#F5F1E8', trim: '#E8D6B5', gate: '#5A5F68', door: '#7A5230', crenel: false, shutters: true, wallFront: '#DCC9A5' },
];

function villa(b: Builder, i: number) {
  const v = VILLAS[i];
  const x0 = PLOT_XS[i];
  const x1 = PLOT_XS[i + 1];
  const cx = (x0 + x1) / 2;
  const zc = VILLA_Z0 + v.d / 2;
  const hw = v.w / 2;
  const hd = v.d / 2;
  const win: CellName = v.shutters ? 'winShut' : 'winArch';
  const roofY = 6.45;
  b.frame([cx, 0, zc], 0, () => {
    // plinth, body, band, parapet
    b.box('solid', [0, 0.25, 0], [v.w + 0.24, 0.5, v.d + 0.24], shade(v.wall, 0.82));
    b.box('solid', [0, 3.45, 0], [v.w, 5.9, v.d], v.wall);
    b.box('solid', [0, 3.3, 0], [v.w + 0.18, 0.24, v.d + 0.18], v.trim);
    b.box('solid', [0, roofY - 0.05, 0], [v.w + 0.12, 0.22, v.d + 0.12], v.trim);
    const par = (px: number, pz: number, sx: number, sz: number) => b.box('solid', [px, roofY + 0.32, pz], [sx, 0.55, sz], v.wall);
    par(0, -hd + 0.1, v.w + 0.1, 0.22);
    par(0, hd - 0.1, v.w + 0.1, 0.22);
    par(-hw + 0.1, 0, 0.22, v.d - 0.2);
    par(hw - 0.1, 0, 0.22, v.d - 0.2);
    b.box('wet', [0, roofY + 0.06, 0], [v.w - 0.3, 0.1, v.d - 0.3], '#8D8A83');
    if (v.crenel) {
      for (let x = -hw + 0.5; x <= hw - 0.4; x += 0.95) {
        b.box('solid', [x, roofY + 0.78, -hd + 0.1], [0.42, 0.34, 0.24], v.wall);
        b.box('solid', [x, roofY + 0.78, hd - 0.1], [0.42, 0.34, 0.24], v.wall);
      }
      for (let z = -hd + 1.2; z <= hd - 1.1; z += 0.95) {
        b.box('solid', [-hw + 0.1, roofY + 0.78, z], [0.24, 0.34, 0.42], v.wall);
        b.box('solid', [hw - 0.1, roofY + 0.78, z], [0.24, 0.34, 0.42], v.wall);
      }
    } else b.box('solid', [0, roofY + 0.62, -hd + 0.1], [v.w + 0.2, 0.08, 0.3], v.trim);

    // front: porch with balcony above
    const bw = Math.min(v.w * 0.62, 5.4);
    b.box('solid', [0, 3.35, -hd - 0.8], [bw, 0.22, 1.7], v.trim);
    for (const sx of [-1, 1]) b.cyl('solid', [sx * (bw / 2 - 0.25), 1.85, -hd - 1.45], [0.3, 3.1, 0.3], v.trim, undefined, 12);
    dec(b, 'rail', [0, 3.46 + 0.4, -hd - 1.62], bw, 0.8, Math.PI);
    for (const sx of [-1, 1]) dec(b, 'rail', [sx * (bw / 2 - 0.02), 3.46 + 0.4, -hd - 0.8], 1.6, 0.8, sx * (Math.PI / 2));
    b.box('wet', [0, 0.14, -hd - 0.5], [2.4, 0.28, 0.9], '#CBBD9F');
    dec(b, 'door', [0, 0.5 + 1.15, -hd - 0.02], 1.5, 2.3, Math.PI, v.door);
    dec(b, 'glassDoor', [0, 3.5 + 1.1, -hd - 0.02], 1.3, 2.2, Math.PI);
    dec(b, `plate${i + 1}` as CellName, [hw - 0.6, 1.9, -hd - 0.03], 0.46, 0.46, Math.PI);
    const wx = Math.max(1.9, hw - 1.1);
    for (const sx of [-1, 1]) {
      dec(b, win, [sx * wx, 1.95, -hd - 0.02], 1.1, 1.5, Math.PI);
      dec(b, win, [sx * wx, 4.95, -hd - 0.02], 1.1, 1.5, Math.PI);
      // frame trim around upper windows
      b.box('solid', [sx * wx, 5.78, -hd - 0.03], [1.3, 0.12, 0.08], v.trim);
    }
    // side windows
    for (const sx of [-1, 1])
      for (const z of [-hd * 0.45, hd * 0.2, hd * 0.6]) {
        dec(b, win, [sx * (hw + 0.02), 1.95, z], 1.0, 1.4, sx * (Math.PI / 2));
        dec(b, win, [sx * (hw + 0.02), 4.95, z], 1.0, 1.4, sx * (Math.PI / 2));
      }
    // wall AC units on the east side wall, one per floor, plus the water tanks and dish on the roof
    for (const [y, z] of [[4.3, hd * 0.2 + 1.1], [1.4, hd * 0.6 + 0.9]] as [number, number][]) {
      b.box('wet', [hw + 0.2, y, z], [0.4, 0.62, 0.9], '#EEF1F4');
      dec(b, 'grille', [hw + 0.41, y, z], 0.6, 0.6, Math.PI / 2);
      b.box('solid', [hw + 0.12, y - 0.38, z], [0.28, 0.06, 0.6], C.dark);
    }
    const ry = roofY + 0.11;
    b.box('solid', [-hw * 0.45, ry + 1.2, hd - 2.4], [2.1, 2.4, 2.4], v.wall);
    b.box('solid', [-hw * 0.45, ry + 2.45, hd - 2.4], [2.4, 0.16, 2.7], v.trim);
    for (const [x, z] of [[hw * 0.25, hd - 1.2], [hw * 0.25 + 1.4, hd - 1.2]] as [number, number][]) {
      for (const sx of [-0.4, 0.4]) b.box('solid', [x + sx, ry + 0.3, z], [0.12, 0.6, 0.12], C.dark);
      b.cyl('solid', [x, ry + 1.2, z], [1.15, 1.2, 1.15], i % 2 ? '#2D3440' : '#F2F2EE', undefined, 12);
      b.cyl('solid', [x, ry + 1.85, z], [1.2, 0.1, 1.2], '#9AA3AE', undefined, 12);
    }
    b.rod('solid', [hw * 0.55, ry, -hd + 1.5], [hw * 0.55, ry + 1.1, -hd + 1.5], 0.07, C.dark, 6);
    b.add('solid', U.disc, matrixOf([hw * 0.55, ry + 1.3, -hd + 1.5 - 0.1], [0.8, 1, 0.8], [0.9, 0, 0]), '#E9EDF0');
    b.box('wet', [-hw * 0.7, ry + 0.25, -hd + 2], [0.9, 0.5, 0.6], '#EEF1F4');
    // corner towers
    if (v.tower) {
      const tx = -hw + 0.2;
      const tz = -hd + 0.2;
      b.cyl('solid', [tx, 3.9, tz], [2.3, 7.8, 2.3], v.trim, undefined, 12);
      b.cyl('solid', [tx, 7.9, tz], [2.5, 0.2, 2.5], v.wall, undefined, 12);
      if (v.tower === 'dome') {
        b.add('solid', U.dome, matrixOf([tx, 8.0, tz], [2.4, 2.0, 2.4]), '#3E7CB1');
        b.ball('solid', [tx, 10.1, tz], [0.25, 0.25, 0.25], '#E7C873', undefined, true);
      } else b.cone('solid', [tx, 9.1, tz], [2.6, 2.3, 2.6], '#B5553A');
      for (const y of [2.1, 5.2]) dec(b, 'winArch', [tx + 0.0, y, tz - 1.17], 0.8, 1.1, Math.PI);
    }
  });
}

function houses(b: Builder) {
  for (let i = 0; i < 6; i++) {
    b.inZone(i < 3 ? 'housesW' : 'housesE', () => {
      const v = VILLAS[i];
      const x0 = PLOT_XS[i];
      const x1 = PLOT_XS[i + 1];
      const cx = (x0 + x1) / 2;
      const gx = GATES[i];
      const gw = GATE_W[i];
      const wallC = i % 2 ? '#F0E6D2' : '#E6D3AE';
      // paving in the yard, the gate path and the pavement strip along the street
      b.rect('flat', x0 + 0.2, x1 - 0.2, WALL_Z - 2.5, WALL_Z + 3.6, 0.012, '#D6C7AA');
      b.rect('flat', gx - 0.9, gx + 0.9, WALL_Z, VILLA_Z0 - 0.4, 0.016, C.paver);
      if (Math.abs(gx - cx) > 0.2) b.rect('flat', Math.min(gx, cx) - 0.9, Math.max(gx, cx) + 0.9, 13.0, 14.4, 0.016, C.paver);
      b.rect('flat', cx - 0.9, cx + 0.9, 13.9, VILLA_Z0 - 0.4, 0.016, C.paver);
      // grass strip and planters
      b.rect('soft', x0 + 0.5, Math.min(gx, cx) - 1.2, WALL_Z + 0.5, WALL_Z + 1.8, 0.02, C.grass);
      b.rect('soft', Math.max(gx, cx) + 1.2, x1 - 0.5, WALL_Z + 0.5, WALL_Z + 1.8, 0.02, C.grassLight);
      // front wall with railing, pillars either side of the gate and on the plot edges
      const runs: [number, number][] = [[x0, gx - gw / 2], [gx + gw / 2, x1]];
      for (const [a, c] of runs) {
        b.box('wet', [(a + c) / 2, 0.52, WALL_Z], [c - a, 1.04, 0.3], wallC);
        b.box('wet', [(a + c) / 2, 1.07, WALL_Z], [c - a, 0.07, 0.4], v.trim === PAL.teal ? PAL.teal : '#F5F1E8');
        const n = Math.max(1, Math.round((c - a) / 2));
        for (let k = 0; k < n; k++) dec(b, 'rail', [a + ((k + 0.5) * (c - a)) / n, 1.1 + 0.4, WALL_Z], (c - a) / n - 0.5, 0.8, Math.PI, '#4A5563');
      }
      const pillars = [gx - gw / 2 - 0.22, gx + gw / 2 + 0.22, x0 + 0.2, x1 - 0.2];
      for (const px of pillars) {
        b.box('solid', [px, 0.85, WALL_Z], [0.44, 1.7, 0.44], wallC);
        b.box('wet', [px, 1.74, WALL_Z], [0.56, 0.1, 0.56], v.trim === PAL.teal ? PAL.teal : '#F5F1E8');
        b.ball('glow', [px, 1.98, WALL_Z], [0.28, 0.28, 0.28], '#FFE9A8', undefined, true);
      }
      dec(b, 'gate', [gx, 0.97, WALL_Z], gw, 1.72, Math.PI, v.gate);
      b.box('wet', [gx, 0.04, WALL_Z], [gw, 0.08, 0.34], C.concrete);
      dec(b, `plate${i + 1}` as CellName, [gx - gw / 2 - 0.22, 1.2, WALL_Z - 0.23], 0.4, 0.4, Math.PI);
      // side and back walls
      if (i === 0) b.box('solid', [x0, 0.95, (WALL_Z + PLOT_Z1) / 2], [0.3, 1.9, PLOT_Z1 - WALL_Z], '#E6D3AE');
      b.box('solid', [x1, 0.95, (WALL_Z + PLOT_Z1) / 2], [0.3, 1.9, PLOT_Z1 - WALL_Z], '#E6D3AE');
      b.box('solid', [(x0 + x1) / 2, 0.95, PLOT_Z1], [x1 - x0, 1.9, 0.3], '#E6D3AE');
      // bougainvillea over the front wall and on the side wall
      for (let x = x0 + 0.7; x < x1 - 0.5; x += 1.15) {
        if (Math.abs(x - gx) < gw / 2 + 0.55) continue;
        const r = rand(x * 13 + i);
        const s = 0.55 + r * 0.45;
        b.ball('solid', [x, 1.28 + r * 0.25, WALL_Z + (r - 0.5) * 0.4], [s, s * 0.8, s * 0.8], r > 0.5 ? C.pink : C.pink2, undefined, true);
        b.ball('solid', [x + 0.35, 0.95, WALL_Z + 0.35], [0.55, 0.5, 0.5], C.bushGreen, undefined, true);
        if (r > 0.4) b.ball('solid', [x - 0.25, 1.62, WALL_Z - 0.2], [0.42, 0.36, 0.36], C.pink, undefined, true);
      }
      // palms in the yard
      palm(b, x0 + 1.5, WALL_Z + 2.3, 5 + rand(i) * 2, i * 11 + 1);
      if (i % 2 === 0) palm(b, x1 - 1.3, WALL_Z + 3.1, 4.2 + rand(i + 5) * 1.5, i * 11 + 5);
      villa(b, i);
    });
  }
}

/* ---------------------------------------------------------- poles & wires */

function poles(b: Builder) {
  b.inZone('housesW', () => {
    const { z, xs, top } = POLES;
    for (const x of xs) {
      b.cyl('solid', [x, top / 2, z], [0.22, top, 0.22], '#7B5A3A', undefined, 8);
      b.box('solid', [x, top - 0.3, z], [0.12, 0.12, 1.6], '#6A4D31');
      b.box('solid', [x, top - 0.55, z], [0.12, 0.12, 1.2], '#6A4D31');
    }
    for (const oz of [-0.7, 0, 0.7])
      for (let k = 0; k < xs.length - 1; k++) {
        const xa = xs[k];
        const xb = xs[k + 1];
        const steps = 8;
        let prev: [number, number, number] = [xa, top - 0.3, z + oz];
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const cur: [number, number, number] = [xa + (xb - xa) * t, top - 0.3 - Math.sin(Math.PI * t) * 0.55, z + oz];
          b.rod('solid', prev, cur, 0.035, '#1E2A3B', 6);
          prev = cur;
        }
      }
  });
}

/* ------------------------------------------------------------------- park */

function fenceRun(b: Builder, ax: number, az: number, bx: number, bz: number, gap?: [number, number]) {
  const len = Math.hypot(bx - ax, bz - az);
  const ang = Math.atan2(bx - ax, bz - az); // facing direction normal handled by double sided decals
  const dx = (bx - ax) / len;
  const dz = (bz - az) / len;
  const n = Math.ceil(len / 2);
  for (let i = 0; i < n; i++) {
    const t0 = (len * i) / n;
    const t1 = (len * (i + 1)) / n;
    if (gap && t1 > gap[0] && t0 < gap[1]) continue;
    const tm = (t0 + t1) / 2;
    const px = ax + dx * tm;
    const pz = az + dz * tm;
    b.box('wet', [px, 0.2, pz], [Math.abs(dx) * (t1 - t0) + Math.abs(dz) * 0.22, 0.4, Math.abs(dz) * (t1 - t0) + Math.abs(dx) * 0.22], '#E6D3AE');
    dec(b, 'rail', [px, 0.4 + 0.4, pz], t1 - t0 - 0.2, 0.8, ang + Math.PI / 2, '#2E7D5B');
    b.box('solid', [ax + dx * t0, 0.55, az + dz * t0], [0.2, 1.1, 0.2], '#E6D3AE');
    b.box('wet', [ax + dx * t0, 1.13, az + dz * t0], [0.28, 0.06, 0.28], '#F5F1E8');
  }
}

function lampPost(b: Builder, x: number, z: number) {
  b.cyl('solid', [x, 0.15, z], [0.3, 0.3, 0.3], C.dark, undefined, 8);
  b.cyl('solid', [x, 1.8, z], [0.1, 3.6, 0.1], '#2E7D5B', undefined, 8);
  b.cyl('solid', [x, 3.62, z], [0.22, 0.08, 0.22], C.dark, undefined, 8);
  b.ball('glow', [x, 3.82, z], [0.36, 0.36, 0.36], '#FFF1B8', undefined, true);
  b.cone('solid', [x, 4.05, z], [0.5, 0.22, 0.5], '#2E7D5B', undefined, 8);
}

function bench(b: Builder, x: number, z: number, face: 'n' | 's' | 'e' | 'w', shaded: boolean) {
  const rot = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 }[face];
  b.frame([x, 0.01, z], rot, () => {
    // facing +Z in local space: three seat slats, two back slats, dark cast-iron ends with armrests
    for (const sz of [-0.15, 0.0, 0.15]) b.box('wet', [0, 0.45, sz + 0.02], [2.0, 0.045, 0.12], '#C98F5A');
    for (const sy of [0.66, 0.84]) b.box('wet', [0, sy, -0.23], [2.0, 0.12, 0.04], '#C98F5A');
    for (const sx of [-0.88, 0.88]) {
      b.box('solid', [sx, 0.21, 0.13], [0.07, 0.42, 0.07], C.dark);
      b.box('solid', [sx, 0.21, -0.17], [0.07, 0.42, 0.07], C.dark);
      b.box('solid', [sx, 0.62, -0.2], [0.07, 0.5, 0.06], C.dark, [0.12, 0, 0]);
      b.box('solid', [sx, 0.66, 0.0], [0.08, 0.05, 0.42], C.dark);
      b.box('solid', [sx, 0.43, -0.02], [0.08, 0.05, 0.4], C.dark);
    }
    if (shaded) {
      // shade structure: four posts, a pergola roof with a coloured shade cloth
      for (const sx of [-1.5, 1.5])
        for (const sz of [-0.9, 1.3]) b.cyl('solid', [sx, 1.4, sz], [0.14, 2.8, 0.14], C.metal, undefined, 8);
      b.box('wet', [0, 2.85, 0.2], [3.5, 0.08, 2.6], '#E6D3AE');
      b.box('wet', [0, 2.9, 0.2], [3.6, 0.05, 2.7], '#2E9E8F');
      for (let k = -1; k <= 1; k++) b.box('solid', [k * 1.2, 2.78, 0.2], [0.08, 0.1, 2.7], '#8E5B34');
    }
  });
}

function fountain(b: Builder) {
  const { x, z, r } = PARK.fountain;
  b.cyl('wet', [x, 0.22, z], [r * 2 + 0.5, 0.44, r * 2 + 0.5], '#E6D3AE', undefined, 20);
  b.cyl('wet', [x, 0.46, z], [r * 2 + 0.7, 0.06, r * 2 + 0.7], '#F5F1E8', undefined, 20);
  b.cyl('soft', [x, 0.38, z], [r * 2 - 0.1, 0.02, r * 2 - 0.1], '#6DC4E0', undefined, 20);
  b.cyl('wet', [x, 0.7, z], [0.5, 0.6, 0.5], '#E6D3AE', undefined, 12);
  b.cyl('wet', [x, 1.05, z], [1.5, 0.12, 1.5], '#F5F1E8', undefined, 20);
  b.cyl('soft', [x, 1.13, z], [1.3, 0.04, 1.3], '#6DC4E0', undefined, 20);
  b.cyl('wet', [x, 1.4, z], [0.3, 0.6, 0.3], '#E6D3AE', undefined, 12);
  b.cone('soft', [x, 1.95, z], [0.4, 0.8, 0.4], '#CDEFFA', undefined, 8);
  b.ball('soft', [x, 2.38, z], [0.3, 0.3, 0.3], '#E4F7FD', undefined, true);
}

/* ------------------------------------------------------------- playground */

const PG = {
  floor: '#2F9C8E',
  floorLight: '#58B9D8',
  floorSun: '#F2C14E',
  curb: '#E6D3AE',
  frame: '#2F6FB0',
  accent: '#F2B632',
  red: '#E4473C',
  orange: '#FF8A3D',
  steel: '#D5DDE5',
  footing: '#B9B2A3',
  zone: '#FFD23F',
};

/** Low playground fence from a to c (x, z): round posts ~2 m apart, top and bottom rails, pickets. */
function pgFenceRun(b: Builder, a: [number, number], c: [number, number], gap?: [number, number]) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const dx = (c[0] - a[0]) / len;
  const dz = (c[1] - a[1]) / len;
  const at = (t: number, y: number): Vec3 => [a[0] + dx * t, y, a[1] + dz * t];
  const spans: [number, number][] = gap ? [[0, gap[0]], [gap[1], len]] : [[0, len]];
  for (const [s, e] of spans) {
    if (e - s < 0.05) continue;
    const n = Math.max(1, Math.round((e - s) / 2));
    const posts: number[] = [];
    for (let k = 0; k <= n; k++) posts.push(s + ((e - s) * k) / n);
    for (const t of posts) {
      const gatePost = gap && (Math.abs(t - gap[0]) < 0.01 || Math.abs(t - gap[1]) < 0.01);
      const h = gatePost ? 1.15 : 0.95;
      b.cyl('solid', at(t, h / 2), [0.09, h, 0.09], PG.frame, undefined, 8);
      b.ball('solid', at(t, h + 0.03), [0.13, 0.13, 0.13], gatePost ? PG.red : PG.accent, undefined, true);
    }
    b.rod('solid', at(s, 0.86), at(e, 0.86), 0.06, PG.frame, 6);
    b.rod('solid', at(s, 0.14), at(e, 0.14), 0.05, PG.frame, 6);
    const rot = Math.atan2(dx, dz);
    for (let t = s + 0.11; t < e - 0.05; t += 0.22) {
      if (posts.some((p) => Math.abs(p - t) < 0.08)) continue;
      b.box('solid', at(t, 0.5), [0.035, 0.7, 0.035], PG.accent, rot);
    }
  }
}

function swingSet(b: Builder) {
  const S = PARK.swings;
  const legInset = (y: number) => S.legZ * (1 - y / S.beamY);
  for (const x of [S.beamX0, S.beamX1]) {
    for (const s of [-1, 1]) {
      b.rod('solid', [x, 0, S.z + s * S.legZ], [x, S.beamY + 0.04, S.z], 0.11, PG.frame, 8);
      b.cyl('soft', [x, 0.035, S.z + s * S.legZ], [0.26, 0.05, 0.26], PG.footing, undefined, 8);
    }
    // cross brace and apex cap
    b.rod('solid', [x, 0.95, S.z - legInset(0.95)], [x, 0.95, S.z + legInset(0.95)], 0.07, PG.frame, 6);
    b.box('solid', [x, S.beamY, S.z], [0.2, 0.22, 0.24], PG.accent);
  }
  b.rod('solid', [S.beamX0 - 0.2, S.beamY, S.z], [S.beamX1 + 0.2, S.beamY, S.z], 0.13, PG.accent, 8);
  for (const sx of S.xs)
    for (const d of [-0.22, 0.22]) b.box('solid', [sx + d, S.beamY - 0.09, S.z], [0.05, 0.08, 0.08], C.dark);
  // painted keep-out zone around the swing arc (yellow outline with corner ticks) on the rubber floor
  const Z = S.zone;
  const w = 0.1;
  const y = 0.042;
  b.rect('paint', Z.x0, Z.x1, Z.z0, Z.z0 + w, y, PG.zone);
  b.rect('paint', Z.x0, Z.x1, Z.z1 - w, Z.z1, y, PG.zone);
  b.rect('paint', Z.x0, Z.x0 + w, Z.z0, Z.z1, y, PG.zone);
  b.rect('paint', Z.x1 - w, Z.x1, Z.z0, Z.z1, y, PG.zone);
}

function slideTower(b: Builder) {
  const sl = PARK.slide;
  const T = sl.topY;
  const h = 0.7; // half deck
  const roofY = T + 1.25;
  // four corner posts up to the roof, with footings
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      b.cyl('solid', [sl.x + sx * (h - 0.05), roofY / 2, sl.z + sz * (h - 0.05)], [0.12, roofY, 0.12], PG.frame, undefined, 8);
      b.cyl('soft', [sl.x + sx * (h - 0.05), 0.035, sl.z + sz * (h - 0.05)], [0.26, 0.05, 0.26], PG.footing, undefined, 8);
    }
  // deck, side panels (north and south), top rails, peaked roof
  b.box('solid', [sl.x, T - 0.05, sl.z], [h * 2 + 0.04, 0.1, h * 2 + 0.04], PG.accent);
  b.box('solid', [sl.x, T - 0.16, sl.z], [h * 2 - 0.1, 0.12, 0.08], PG.frame);
  for (const sz of [-1, 1]) {
    b.box('solid', [sl.x, T + 0.42, sl.z + sz * (h - 0.05)], [h * 2 - 0.16, 0.66, 0.05], PG.red);
    b.cyl('solid', [sl.x, T + 0.42, sl.z + sz * (h - 0.02)], [0.36, 0.02, 0.36], PG.accent, [Math.PI / 2, 0, 0], 12);
    b.rod('solid', [sl.x - h + 0.05, T + 0.86, sl.z + sz * (h - 0.05)], [sl.x + h - 0.05, T + 0.86, sl.z + sz * (h - 0.05)], 0.06, PG.frame);
  }
  b.cone('solid', [sl.x, roofY + 0.33, sl.z], [2.1, 0.7, 2.1], PG.red, Math.PI / 8, 8);
  b.cyl('solid', [sl.x, roofY + 0.01, sl.z], [1.75, 0.06, 1.75], PG.accent, Math.PI / 8, 8);
  b.ball('solid', [sl.x, roofY + 0.74, sl.z], [0.16, 0.16, 0.16], PG.accent, undefined, true);

  // ladder on the west side: stringers, flat rungs, handrails that reach above the deck
  const x1 = sl.x - h;
  const x0 = sl.ladderX;
  for (const sz of [-0.3, 0.3]) {
    b.rod('solid', [x0, 0, sl.z + sz], [x1, T, sl.z + sz], 0.07, PG.frame, 6);
    b.rod('solid', [x0 - 0.02, 0.95, sl.z + sz * 1.15], [x1, T + 0.9, sl.z + sz * 1.15], 0.05, PG.accent, 6);
    b.rod('solid', [x0, 0, sl.z + sz * 1.15], [x0 - 0.02, 0.95, sl.z + sz * 1.15], 0.05, PG.accent, 6);
    b.rod('solid', [x1, T + 0.9, sl.z + sz * 1.15], [x1 + 0.05, T + 0.86, sl.z + Math.sign(sz) * (h - 0.05)], 0.05, PG.accent, 6);
  }
  for (let k = 1; k <= 5; k++) {
    const t = k / 6;
    b.box('solid', [x0 + (x1 - x0) * t, T * t, sl.z], [0.12, 0.04, 0.62], PG.steel);
  }

  // chute: stainless bed with orange side walls, then a flat run-out on two legs
  const cx0 = sl.x + h;
  const y0 = T + 0.02;
  const cx1 = sl.chuteX1;
  const y1 = 0.42;
  const L = Math.hypot(cx1 - cx0, y0 - y1);
  const ang = Math.atan2(y0 - y1, cx1 - cx0);
  const mx = (cx0 + cx1) / 2;
  const my = (y0 + y1) / 2;
  const nx = Math.sin(ang); // surface normal (x, y) of the slope
  const ny = Math.cos(ang);
  b.box('solid', [mx - nx * 0.025, my - ny * 0.025, sl.z], [L + 0.04, 0.05, 0.62], PG.steel, [0, 0, -ang]);
  b.box('solid', [mx - nx * 0.07, my - ny * 0.07, sl.z], [L, 0.05, 0.5], PG.frame, [0, 0, -ang]);
  for (const sz of [-0.33, 0.33]) b.box('solid', [mx + nx * 0.09, my + ny * 0.09, sl.z + sz], [L + 0.04, 0.24, 0.05], PG.orange, [0, 0, -ang]);
  const rl = sl.runX - cx1;
  b.box('solid', [cx1 + rl / 2, y1 - 0.025, sl.z], [rl + 0.02, 0.05, 0.62], PG.steel);
  for (const sz of [-0.33, 0.33]) b.box('solid', [cx1 + rl / 2, y1 + 0.09, sl.z + sz], [rl + 0.02, 0.24, 0.05], PG.orange);
  for (const sz of [-0.22, 0.22]) b.cyl('solid', [sl.runX - 0.15, (y1 - 0.05) / 2, sl.z + sz], [0.07, y1 - 0.05, 0.07], PG.frame, undefined, 6);
  // entry hoop over the top of the chute
  b.rod('solid', [cx0, T, sl.z - 0.38], [cx0, T + 0.8, sl.z - 0.38], 0.06, PG.accent);
  b.rod('solid', [cx0, T, sl.z + 0.38], [cx0, T + 0.8, sl.z + 0.38], 0.06, PG.accent);
  b.rod('solid', [cx0, T + 0.8, sl.z - 0.38], [cx0, T + 0.8, sl.z + 0.38], 0.06, PG.accent);
}

function seesaw(b: Builder) {
  const sw = PARK.seesaw;
  const tilt = 0.14;
  b.box('soft', [sw.x, 0.03, sw.z], [0.6, 0.05, 0.8], PG.footing);
  for (const sz of [-0.24, 0.24]) b.add('solid', U.prism, matrixOf([sw.x, 0.04, sw.z + sz], [0.5, 0.5, 0.08]), PG.frame);
  b.cyl('solid', [sw.x, 0.52, sw.z], [0.09, 0.62, 0.09], C.dark, [Math.PI / 2, 0, 0], 8);
  b.frame([sw.x, 0.6, sw.z], 0, () => {
    const r: Vec3 = [0, 0, tilt];
    const p = (lx: number, ly: number): Vec3 => [lx * Math.cos(tilt) - ly * Math.sin(tilt), lx * Math.sin(tilt) + ly * Math.cos(tilt), 0];
    b.add('solid', U.box, matrixOf(p(0, 0), [3.4, 0.07, 0.3], r), PG.accent);
    for (const s of [-1, 1]) {
      const [hx, hy] = p(s * 1.2, 0.2);
      b.add('solid', U.box, matrixOf(p(s * 1.45, 0.06), [0.5, 0.06, 0.34], r), PG.red);
      b.rod('solid', p(s * 1.2, 0.03), [hx, hy + 0.12, 0], 0.05, PG.frame);
      b.rod('solid', [hx, hy + 0.12, -0.17], [hx, hy + 0.12, 0.17], 0.05, PG.frame);
    }
  });
  // rubber bumper under the low (west) end
  b.cyl('solid', [sw.x - 1.5, 0.08, sw.z], [0.36, 0.14, 0.36], '#2B2E33', undefined, 8);
}

function climbDome(b: Builder) {
  const { x, z, r } = PARK.dome;
  const M = 8;
  const N = 4;
  const pt = (i: number, j: number): Vec3 => {
    const th = (i / M) * Math.PI * 2;
    const ph = (j / N) * (Math.PI / 2);
    return [x + r * Math.cos(ph) * Math.cos(th), 0.04 + r * Math.sin(ph), z + r * Math.cos(ph) * Math.sin(th)];
  };
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) b.rod('solid', pt(i, j), pt(i, j + 1), 0.055, PG.red, 6);
    for (let j = 0; j < N; j++) b.rod('solid', pt(i, j), pt(i + 1, j), j === 0 ? 0.08 : 0.05, j === 0 ? PG.frame : PG.accent, 6);
  }
  b.ball('solid', [x, 0.04 + r, z], [0.16, 0.16, 0.16], PG.accent, undefined, true);
  b.add('soft', U.disc, matrixOf([x, 0.038, z], [r * 2 + 1.1, 1, r * 2 + 1.1]), PG.floorSun);
}

function springRider(b: Builder, x: number, z: number, color: string, rotY: number) {
  b.frame([x, 0, z], rotY, () => {
    b.cyl('solid', [0, 0.03, 0], [0.5, 0.05, 0.5], C.dark, undefined, 12);
    for (let k = 0; k < 5; k++) b.add('solid', U.torus, matrixOf([0, 0.1 + k * 0.07, 0], [0.24, 0.24, 0.5], [Math.PI / 2, 0, 0]), '#4A5563');
    b.ball('solid', [0, 0.6, 0], [0.8, 0.38, 0.36], color);
    b.ball('solid', [0.36, 0.86, 0], [0.32, 0.36, 0.3], color);
    b.ball('solid', [0.5, 0.82, 0], [0.16, 0.14, 0.18], shade(color, 0.85), undefined, true);
    for (const s of [-1, 1]) {
      b.ball('solid', [0.46, 0.93, s * 0.1], [0.06, 0.07, 0.06], C.ink, undefined, true);
      b.ball('solid', [0.3, 1.04, s * 0.08], [0.07, 0.12, 0.05], shade(color, 0.85), undefined, true);
    }
    b.rod('solid', [0.22, 0.98, -0.2], [0.22, 0.98, 0.2], 0.05, PG.red);
    b.rod('solid', [0.1, 0.42, -0.24], [0.1, 0.42, 0.24], 0.04, PG.red);
    b.rbox('solid', [-0.08, 0.8, 0], [0.32, 0.07, 0.3], PG.red);
    b.ball('solid', [-0.42, 0.68, 0], [0.12, 0.16, 0.12], shade(color, 0.85), undefined, true);
  });
}

function shadeRow(b: Builder) {
  const s = PARK.shade;
  for (const px of s.posts) {
    b.cyl('solid', [px, s.yBack / 2, s.zBack], [0.14, s.yBack, 0.14], '#F5F1E8', undefined, 8);
    b.cyl('soft', [px, 0.035, s.zBack], [0.3, 0.06, 0.3], PG.footing, undefined, 8);
    b.rod('solid', [px, s.yBack - 0.06, s.zBack], [px, s.yFront - 0.06, s.zFront + 0.1], 0.08, '#F5F1E8', 6);
    b.rod('solid', [px, 1.9, s.zBack], [px, s.yBack - 0.4, s.zBack - 0.9], 0.06, '#F5F1E8', 6);
  }
  const ang = Math.atan2(s.yBack - s.yFront, s.zBack - s.zFront);
  const depth = Math.hypot(s.yBack - s.yFront, s.zBack - s.zFront) + 0.3;
  const n = 12;
  const w = (s.x1 - s.x0) / n;
  const my = (s.yBack + s.yFront) / 2 + 0.03;
  const mz = (s.zBack + s.zFront) / 2;
  for (let k = 0; k < n; k++) {
    const x = s.x0 + w * (k + 0.5);
    const c = k % 2 ? '#F5F1E8' : '#2E9E8F';
    b.box('wet', [x, my, mz], [w + 0.01, 0.04, depth], c, [-ang, 0, 0]);
    b.box('solid', [x, s.yFront - 0.1, s.zFront - 0.13], [w + 0.01, 0.2, 0.02], c);
  }
}

function playground(b: Builder) {
  const P = PARK.playground;
  // soft rubber floor inside a pale concrete curb, light-blue and sunny panels under the equipment
  b.rect('soft', P.x0 - 0.15, P.x1 + 0.15, P.z0 - 0.15, P.z1 + 0.15, 0.022, PG.curb);
  b.rect('soft', P.x0 + 0.05, P.x1 - 0.05, P.z0 + 0.05, P.z1 - 0.05, 0.03, PG.floor);
  const Z = PARK.swings.zone;
  b.rect('soft', Z.x0 - 0.3, Z.x1 + 0.3, Z.z0 - 0.3, Z.z1 + 0.3, 0.034, PG.floorLight);
  const sl = PARK.slide;
  b.add('soft', U.disc, matrixOf([sl.runX + 0.3, 0.036, sl.z], [3.0, 1, 3.0]), PG.floorLight);
  b.rect('soft', sl.x - 1.6, sl.runX + 0.2, sl.z - 1.35, sl.z + 1.35, 0.034, PG.floorLight);
  b.rect('soft', PARK.shade.x0, PARK.shade.x1, PARK.shade.zFront - 0.1, P.z1 - 0.05, 0.034, PG.curb);
  // hopscotch on the west side and coloured stepping dots in the middle of the floor
  const hop: [number, number][] = [[0, 0], [0, 1], [-0.5, 2], [0.5, 2], [0, 3], [-0.5, 4], [0.5, 4], [0, 5]];
  for (const [hx, hz] of hop) {
    const cx = -52.2 + hx * 1.0;
    const cz = 22.6 + hz * 0.85;
    b.rect('paint', cx - 0.42, cx + 0.42, cz - 0.38, cz - 0.32, 0.04, '#F5F1E8');
    b.rect('paint', cx - 0.42, cx + 0.42, cz + 0.32, cz + 0.38, 0.04, '#F5F1E8');
    b.rect('paint', cx - 0.42, cx - 0.36, cz - 0.38, cz + 0.38, 0.04, '#F5F1E8');
    b.rect('paint', cx + 0.36, cx + 0.42, cz - 0.38, cz + 0.38, 0.04, '#F5F1E8');
  }
  const dots = ['#E4473C', '#F2B632', '#58B9D8', '#5DBB63'];
  for (let k = 0; k < 7; k++) b.add('paint', U.disc, matrixOf([-48.3 + (k % 2) * 0.9 + k * 0.35, 0.04, 26.9 + k * 0.62], [0.6, 1, 0.6]), dots[k % 4]);
  // fence on the four sides, openings on the north (to the track) and east (to the fountain path)
  pgFenceRun(b, [P.x0, P.z0], [P.x1, P.z0], [P.gateN[0] - P.x0, P.gateN[1] - P.x0]);
  pgFenceRun(b, [P.x0, P.z1], [P.x1, P.z1]);
  pgFenceRun(b, [P.x0, P.z0], [P.x0, P.z1]);
  pgFenceRun(b, [P.x1, P.z0], [P.x1, P.z1], [P.gateE[0] - P.z0, P.gateE[1] - P.z0]);
  // little sign over the north opening
  const gx = (P.gateN[0] + P.gateN[1]) / 2;
  b.rod('solid', [P.gateN[0], 1.15, P.z0], [P.gateN[0], 1.95, P.z0], 0.08, PG.frame);
  b.rod('solid', [P.gateN[1], 1.15, P.z0], [P.gateN[1], 1.95, P.z0], 0.08, PG.frame);
  b.box('solid', [gx, 1.95, P.z0], [P.gateN[1] - P.gateN[0] + 0.2, 0.36, 0.08], PG.accent);
  for (let k = 0; k < 4; k++) b.ball('solid', [gx - 0.75 + k * 0.5, 1.95, P.z0 - 0.05], [0.18, 0.18, 0.06], [PG.red, PG.frame, '#5DBB63', PG.orange][k], undefined, true);

  swingSet(b);
  slideTower(b);
  seesaw(b);
  climbDome(b);
  for (const r of PARK.riders) springRider(b, r.x, r.z, r.color, r.rotY);
  shadeRow(b);
}

function park(b: Builder) {
  b.inZone('park', () => {
    const { x0, x1, z0, z1, gateNorth, gateEast, track, booth } = PARK;
    // grass, with lighter mowing stripes
    b.rect('soft', x0 + 0.3, x1 - 0.3, z0 + 0.3, z1 - 0.3, 0.01, C.grass);
    for (let z = z0 + 0.3; z < z1 - 3; z += 6) b.rect('soft', x0 + 0.3, x1 - 0.3, z, z + 3, 0.012, C.grassLight);
    // paved forecourt and entry paths
    b.rect('flat', gateNorth.x - 1.8, gateNorth.x + 1.8, z0 + 0.3, z0 + 3, 0.02, C.paver);
    b.rect('flat', gateNorth.x - 1.1, gateNorth.x + 1.1, z0 + 3, track.cz - track.d / 2 + 0.4, 0.021, C.paver);
    b.rect('flat', gateNorth.x + 0.5, gateEast.x - 0.1, gateEast.z - 1.0, gateEast.z + 1.0, 0.021, C.paver);
    // walking track (terracotta rubber ring, dashed centre line)
    const outer = roundRect(track.cx, track.cz, track.w, track.d, track.r, 8);
    const inner = roundRect(track.cx, track.cz, track.w - track.width * 2, track.d - track.width * 2, track.r - track.width * 0.8, 8);
    b.add('soft', flatShape(outer, [inner], 0.02), IDENTITY, '#C97B52');
    const edgeOut = roundRect(track.cx, track.cz, track.w - 0.2, track.d - 0.2, track.r - 0.1, 8);
    const edgeIn = roundRect(track.cx, track.cz, track.w - 0.45, track.d - 0.45, track.r - 0.2, 8);
    b.add('paint', flatShape(edgeOut, [edgeIn], 0.024), IDENTITY, '#F5F1E8');
    const edgeOut2 = roundRect(track.cx, track.cz, track.w - track.width * 2 + 0.45, track.d - track.width * 2 + 0.45, track.r - track.width * 0.8 + 0.2, 8);
    const edgeIn2 = roundRect(track.cx, track.cz, track.w - track.width * 2 + 0.2, track.d - track.width * 2 + 0.2, track.r - track.width * 0.8 + 0.1, 8);
    b.add('paint', flatShape(edgeOut2, [edgeIn2], 0.024), IDENTITY, '#F5F1E8');
    // paths from the track to the playground openings (east, from the fountain; north, from the track)
    b.rect('flat', PARK.playground.x1 + 0.1, track.cx + track.w / 2 - track.width - 0.1, 24.3, 25.7, 0.021, C.paver);
    b.rect('flat', PARK.playground.gateN[0], PARK.playground.gateN[1], track.cz - track.d / 2 + track.width - 0.1, PARK.playground.z0 - 0.1, 0.021, C.paver);

    playground(b);
    fountain(b);

    // fence: west, south, north (with the gate gap) and east (with the side gate)
    fenceRun(b, x0, z0, x0, z1);
    fenceRun(b, x0, z1, x1, z1);
    fenceRun(b, x0, z0, x1, z0, [gateNorth.x - gateNorth.w / 2 - x0, gateNorth.x + gateNorth.w / 2 - x0]);
    fenceRun(b, x1, z0, x1, z1, [gateEast.z - gateEast.w / 2 - z0, gateEast.z + gateEast.w / 2 - z0]);
    // north gate: two pillars, arch beam with the painted sign, lanterns, wings of open gate
    const gx = gateNorth.x;
    const gwh = gateNorth.w / 2;
    for (const sx of [-1, 1]) {
      b.box('solid', [gx + sx * (gwh + 0.15), 1.4, z0], [0.7, 2.8, 0.7], '#F5F1E8');
      b.box('solid', [gx + sx * (gwh + 0.15), 0.35, z0], [0.8, 0.7, 0.8], '#E6D3AE');
      b.box('wet', [gx + sx * (gwh + 0.15), 2.86, z0], [0.86, 0.12, 0.86], '#2E7D5B');
      b.ball('glow', [gx + sx * (gwh + 0.15), 3.15, z0], [0.4, 0.4, 0.4], '#FFE9A8', undefined, true);
      dec(b, 'gate', [gx + sx * (gwh - 0.45), 0.97, z0 + 0.6], 1.1, 1.7, sx * 1.2 + Math.PI / 2 - sx * 0.3, '#2E7D5B');
    }
    b.box('solid', [gx, 2.55, z0], [gateNorth.w + 0.9, 0.9, 0.4], '#2E7D5B');
    b.box('wet', [gx, 3.06, z0], [gateNorth.w + 1.2, 0.12, 0.6], '#F5F1E8');
    dec(b, 'parkSign', [gx, 2.55, z0 - 0.22], 3.7, 0.8, Math.PI);
    dec(b, 'parkSign', [gx, 2.55, z0 + 0.22], 3.7, 0.8, 0);
    // east side gate
    const ex = gateEast.x;
    for (const sz of [-1, 1]) {
      b.box('solid', [ex, 0.85, gateEast.z + sz * (gateEast.w / 2 + 0.15)], [0.5, 1.7, 0.5], '#F5F1E8');
      b.ball('glow', [ex, 1.9, gateEast.z + sz * (gateEast.w / 2 + 0.15)], [0.3, 0.3, 0.3], '#FFE9A8', undefined, true);
    }

    // guard booth: small cabin with a window, door, flat overhanging roof, bench outside
    b.frame([booth.x, 0, booth.z], 0, () => {
      b.box('solid', [0, 1.25, 0], [2.4, 2.5, 2.2], '#F5F1E8');
      b.box('solid', [0, 0.15, 0], [2.6, 0.3, 2.4], '#CDB88F');
      b.box('wet', [0, 2.62, 0], [3.0, 0.16, 2.8], '#2E7D5B');
      b.box('wet', [0, 2.74, 0], [2.6, 0.1, 2.4], '#F5F1E8');
      dec(b, 'winShut', [0.0, 1.5, 1.12], 1.3, 1.1, 0);
      dec(b, 'door', [-1.22, 1.15, 0.2], 0.9, 2.1, -Math.PI / 2, '#4F86C6');
      b.box('wet', [0, 0.55, 1.45], [1.6, 0.07, 0.4], '#C98F5A');
    });

    // lamp posts, benches, palms, trees
    for (const [x, z] of PARK.lamps) lampPost(b, x, z);
    PARK.benches.forEach((bn) => bench(b, bn.x, bn.z, bn.face, bn.shade));
    PARK.palms.forEach(([x, z], i) => palm(b, x, z, 5.2 + rand(i + 20) * 2.2, i * 7 + 2));
    PARK.trees.forEach(([x, z], i) => tree(b, x, z, 1 + rand(i + 9) * 0.35, i));
    // flower beds beside the gate, bougainvillea on the fence
    for (const [fx, fz, w] of [[-34.5, 11.2, 2.2], [-22.8, 14, 1.6]] as [number, number, number][]) {
      b.box('wet', [fx, 0.12, fz], [w, 0.24, 1.1], '#E6D3AE');
      for (let k = 0; k < 7; k++) b.ball('solid', [fx - w / 2 + 0.2 + (k * (w - 0.4)) / 6, 0.42, fz + (k % 2) * 0.2 - 0.1], [0.34, 0.3, 0.34], ['#F27DB8', '#FFD23F', '#FF7A59', '#FFFFFF'][k % 4], undefined, true);
    }
    for (let x = x0 + 2; x < x1 - 1; x += 3.1) {
      if (Math.abs(x - gx) < 3.3) continue;
      b.ball('solid', [x, 0.9, z1 - 0.1], [0.9, 0.7, 0.5], C.pink, undefined, true);
      b.ball('solid', [x + 0.5, 0.55, z1 - 0.1], [0.7, 0.5, 0.45], C.bushGreen, undefined, true);
    }
  });
}

/* --------------------------------------------------------------- roadworks */

/** Safety cone: truncated cone body (0.6 m) on a square base, two white reflective bands that follow its taper. */
const CONE = { r0: 0.14, r1: 0.035, h: 0.6, base: 0.04 };
const coneR = (h: number) => CONE.r0 + (CONE.r1 - CONE.r0) * (h / CONE.h);
const coneBody = new THREE.CylinderGeometry(CONE.r1, CONE.r0, CONE.h, 12);
const coneBand = (h0: number, h1: number) => new THREE.CylinderGeometry(coneR(h1) + 0.006, coneR(h0) + 0.006, h1 - h0, 12);
const CONE_BANDS: [THREE.CylinderGeometry, number][] = [
  [coneBand(0.36, 0.46), 0.41],
  [coneBand(0.2, 0.28), 0.24],
];

function cone(b: Builder, x: number, y: number, z: number) {
  b.box('solid', [x, y + CONE.base / 2, z], [0.38, CONE.base, 0.38], '#2B2E33');
  const y0 = y + CONE.base;
  b.add('solid', coneBody, matrixOf([x, y0 + CONE.h / 2, z], [1, 1, 1]), C.cone);
  for (const [g, hc] of CONE_BANDS) b.add('solid', g, matrixOf([x, y0 + hc, z], [1, 1, 1]), '#F5F5F5');
}

/**
 * One striped barricade unit along local x (rotY turns it): two rails on steel posts with sled feet,
 * orange/white stripes readable from both sides. A low barricade (rails 0.52..0.72 and 0.28..0.38, posts
 * 0.8) so people behind it stay fully visible from the road; the flashing lamp sits on a post top.
 */
const BAR_H = 0.8;
function barricade(b: Builder, x: number, y: number, z: number, len: number, rotY: number) {
  b.frame([x, y, z], rotY, () => {
    const h = len / 2;
    for (const sx of [-h, h]) {
      b.box('solid', [sx, BAR_H / 2, 0], [0.06, BAR_H, 0.06], '#ECE9E0');
      b.box('solid', [sx, 0.03, 0], [0.06, 0.06, 0.55], '#4F545C');
    }
    for (const [cy, ch] of [[0.62, 0.2], [0.33, 0.1]] as [number, number][]) {
      b.box('solid', [0, cy, 0], [len - 0.06, ch, 0.04], '#F7F4EC');
      dec(b, 'stripes', [0, cy, 0.0215], len - 0.07, ch - 0.01, 0);
      dec(b, 'stripes', [0, cy, -0.0215], len - 0.07, ch - 0.01, Math.PI);
    }
  });
}

/** Flashing amber lamp on a post top (housing here, the glowing lens in a blinking zone). */
function lamp(b: Builder, x: number, y: number, z: number, phase: 'a' | 'b') {
  b.cyl('solid', [x, y + BAR_H + 0.05, z], [0.15, 0.1, 0.15], '#2B2E33', undefined, 8);
  b.inZone(phase === 'a' ? 'lampA' : 'lampB', () => b.ball('glow', [x, y + BAR_H + 0.14, z], [0.14, 0.12, 0.14], '#FFB020', undefined, true));
}

/** Lying pipe along x. */
function pipeX(b: Builder, x0: number, x1: number, y: number, z: number, d: number, color: string) {
  b.add('solid', U.cyl20, matrixOf([(x0 + x1) / 2, y, z], [d, x1 - x0, d], [0, 0, Math.PI / 2]), color);
}

function works(b: Builder) {
  b.inZone('works', () => {
    const y = WORKS.y;
    const P = WORKS.pit;
    const Z = WORKS.zone;
    const fy = y - P.depth;
    const pcx = (P.x0 + P.x1) / 2;
    const pcz = (P.z0 + P.z1) / 2;

    /* ---- the trench: layered earth walls, plywood shoring with struts, floor, three pipes ---- */
    const bands: [number, number, string][] = [
      [fy, fy + 0.4, '#241B14'],
      [fy + 0.4, fy + 0.8, '#43342A'],
      [fy + 0.8, y, '#6E563D'],
    ];
    for (const [ya, yb, col] of bands) {
      b.aabb('solid', P.x0 - 0.1, ya, P.z0 - 0.1, P.x1 + 0.1, yb, P.z0, col); // north wall
      b.aabb('solid', P.x0 - 0.1, ya, P.z1, P.x1 + 0.1, yb, P.z1 + 0.1, col); // south wall
      b.aabb('solid', P.x0 - 0.1, ya, P.z0, P.x0, yb, P.z1, col); // west wall
      b.aabb('solid', P.x1, ya, P.z0, P.x1 + 0.1, yb, P.z1, col); // east wall
    }
    b.aabb('solid', P.x0, fy - 0.1, P.z0, P.x1, fy, P.z1, '#1D1611'); // floor
    b.box('solid', [pcx + 0.5, fy + 0.006, pcz + 0.28], [0.9, 0.012, 0.35], '#56697A'); // muddy water on the floor
    // plywood shoring panels on both long walls, braced across by two struts
    for (const px of [-28.85, -26.75]) {
      b.box('solid', [px, fy + 0.5, P.z0 + 0.025], [1.0, 0.7, 0.05], '#C9A66B');
      b.box('solid', [px, fy + 0.5, P.z1 - 0.025], [1.0, 0.7, 0.05], '#C9A66B');
      b.box('solid', [px, fy + 0.62, P.z0 + 0.06], [0.14, 0.1, 0.03], '#8E6B3F');
      b.box('solid', [px, fy + 0.62, P.z1 - 0.06], [0.14, 0.1, 0.03], '#8E6B3F');
      b.rod('solid', [px, fy + 0.62, P.z0 + 0.08], [px, fy + 0.62, P.z1 - 0.08], 0.07, '#9AA3AE', 6);
    }
    // sewer pipe along the bottom, broken open in the middle (dark bore), with collars
    const pz = P.z0 + 0.5;
    const pd = 0.42;
    pipeX(b, P.x0 - 0.1, -28.15, fy + pd / 2, pz, pd, '#B7B2A6');
    pipeX(b, -27.7, P.x1 + 0.1, fy + pd / 2, pz, pd, '#B7B2A6');
    pipeX(b, -28.45, -28.3, fy + pd / 2, pz, pd + 0.06, '#9C978B');
    pipeX(b, -27.55, -27.4, fy + pd / 2, pz, pd + 0.06, '#9C978B');
    pipeX(b, -28.153, -28.148, fy + pd / 2, pz, pd - 0.08, '#16181B');
    pipeX(b, -27.702, -27.697, fy + pd / 2, pz, pd - 0.08, '#16181B');
    // blue water main across the trench and a black cable duct along the south wall
    b.rod('solid', [-27.3, fy + 0.72, P.z0 - 0.1], [-27.3, fy + 0.72, P.z1 + 0.1], 0.13, '#2F6FB5', 8);
    pipeX(b, P.x0 - 0.1, P.x1 + 0.1, fy + 0.07, P.z1 - 0.12, 0.12, '#25282D');

    /* ---- rim: low soil lip, dug-up soil stains ---- */
    const kw = 0.07;
    b.aabb('solid', P.x0 - kw, y, P.z0 - kw, P.x1 + kw, y + 0.035, P.z0, '#8A6C4B');
    b.aabb('solid', P.x0 - kw, y, P.z1, P.x1 + kw, y + 0.035, P.z1 + kw, '#8A6C4B');
    b.aabb('solid', P.x0 - kw, y, P.z0, P.x0, y + 0.035, P.z1, '#7E6142');
    b.aabb('solid', P.x1, y, P.z0, P.x1 + kw, y + 0.035, P.z1, '#7E6142');
    // soil stains hugging the rim (outside the cut)
    b.rect('paint', P.x0 - 0.2, P.x1 + 0.2, P.z0 - 0.18, P.z0 - kw, y + 0.01, '#7B6246');
    b.rect('paint', P.x0 - 0.2, P.x1 + 0.2, P.z1 + kw, P.z1 + 0.2, y + 0.01, '#7B6246');
    b.rect('paint', P.x0 - 0.2, P.x0 - kw, P.z0 - kw, P.z1 + kw, y + 0.01, '#7B6246');
    b.rect('paint', P.x1 + kw, P.x1 + 0.2, P.z0 - kw, P.z1 + kw, y + 0.01, '#7B6246');

    /* ---- spoil heap beside the trench with a shovel stuck in it ---- */
    const [sx, , sz] = WORKS.sand;
    b.add('solid', U.cone12, matrixOf([sx, y + 0.46, sz], [2.0, 0.92, 1.2], 0.3), '#D3B27A');
    b.ball('solid', [sx - 0.05, y + 0.8, sz], [0.55, 0.3, 0.42], '#DBBC85', undefined, true);
    b.ball('solid', [sx + 0.95, y + 0.1, sz + 0.12], [0.9, 0.28, 0.7], '#C9A56B', undefined, true);
    b.ball('solid', [sx - 0.95, y + 0.09, sz - 0.1], [0.8, 0.24, 0.6], '#CFAE72', undefined, true);
    b.rod('solid', [sx + 0.28, y + 0.95, sz + 0.1], [sx + 0.55, y + 0.3, sz + 0.14], 0.035, '#8E5B34', 6);
    b.add('solid', U.box, matrixOf([sx + 0.6, y + 0.22, sz + 0.14], [0.2, 0.26, 0.015], [0, 0.1, 0.25]), '#9AA3AE');
    b.add('paint', U.disc, matrixOf([sx, y + 0.011, sz + 0.05], [2.5, 1, 1.5], 0.3), '#8A6C4B');

    /* ---- manhole cover lying flat west of the trench ---- */
    const [cx, , cz] = WORKS.cover;
    b.add('solid', U.cyl20, matrixOf([cx, y + 0.03, cz], [0.84, 0.06, 0.84]), '#4C525B');
    b.add('atlas', U.floor, matrixOf([cx, y + 0.0615, cz], [0.76, 1, 0.76], 0.3), '#FFFFFF', cellUV('cover'));
    b.box('solid', [cx + 0.6, y + 0.015, cz + 0.05], [0.9, 0.03, 0.04], '#6B7380'); // lifting hook bar

    /* ---- stacked pipes on sleepers, tools and a bucket east of the trench ---- */
    const [qx, , qz] = WORKS.pipes;
    for (const dx of [-0.5, 0.5]) b.box('solid', [qx + dx, y + 0.03, qz + 0.15], [0.1, 0.06, 0.9], '#8A6640');
    for (const [dz, dy] of [[0, 0], [0.27, 0], [0.135, 0.234]] as number[][]) {
      pipeX(b, qx - 0.65, qx + 0.65, y + 0.06 + 0.13 + dy, qz + dz, 0.26, '#D9792B');
      pipeX(b, qx + 0.649, qx + 0.654, y + 0.06 + 0.13 + dy, qz + dz, 0.2, '#24282D');
      pipeX(b, qx - 0.654, qx - 0.649, y + 0.06 + 0.13 + dy, qz + dz, 0.2, '#24282D');
    }
    // shovel and pickaxe laid parallel, a bucket at their end
    b.rod('solid', [qx - 0.65, y + 0.02, qz + 0.62], [qx + 0.25, y + 0.02, qz + 0.62], 0.035, '#8E5B34', 6);
    b.box('solid', [qx + 0.38, y + 0.012, qz + 0.62], [0.26, 0.016, 0.2], '#9AA3AE');
    b.rod('solid', [qx - 0.65, y + 0.02, qz + 0.84], [qx + 0.3, y + 0.02, qz + 0.84], 0.035, '#8E5B34', 6);
    b.box('solid', [qx + 0.3, y + 0.03, qz + 0.84], [0.04, 0.05, 0.5], '#6B7380');
    b.cyl('solid', [qx + 0.95, y + 0.16, qz + 0.72], [0.3, 0.32, 0.3], '#F2B632', undefined, 12);
    b.cyl('solid', [qx + 0.95, y + 0.322, qz + 0.72], [0.26, 0.012, 0.26], '#24282D', undefined, 12);

    /* ---- the fence: barricade line on the walkway side, cones + tape on the street side ---- */
    const n = Math.round((Z.x1 - Z.x0) / Z.barricadeLen);
    for (let k = 0; k < n; k++) barricade(b, Z.x0 + Z.barricadeLen * (k + 0.5), y, Z.zBarricade, Z.barricadeLen, 0);
    const endLen = Z.zBarricade - (Z.zCones + 0.15);
    for (const ex of [Z.x0, Z.x1]) barricade(b, ex, y, Z.zBarricade - endLen / 2, endLen, Math.PI / 2);
    for (let j = 0; j <= n; j++) lamp(b, Z.x0 + Z.barricadeLen * j, y, Z.zBarricade, j % 2 ? 'b' : 'a');
    // street side: tape stanchions every 2.6 m, a cone halfway between them
    const sp = 4;
    const posts: [number, number][] = [];
    for (let k = 0; k <= sp; k++) posts.push([Z.x0 + ((Z.x1 - Z.x0) * k) / sp, Z.zCones]);
    for (const [x, z] of posts) {
      b.cyl('solid', [x, y + 0.015, z], [0.3, 0.03, 0.3], '#2B2E33', undefined, 12);
      b.cyl('solid', [x, y + 0.5, z], [0.05, 0.97, 0.05], '#F5F5F5', undefined, 6);
      b.cyl('solid', [x, y + 0.98, z], [0.07, 0.04, 0.07], '#D7263D', undefined, 6);
    }
    for (let k = 0; k < sp; k++) cone(b, (posts[k][0] + posts[k + 1][0]) / 2, y, Z.zCones);
    for (let k = 0; k < sp; k++) {
      const [ax, az] = posts[k];
      const [bx, bz] = posts[k + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const m = Math.round(len / 0.16);
      for (let q = 0; q < m; q++) {
        const t = (q + 0.5) / m;
        const sag = Math.sin(Math.PI * t) * 0.06;
        b.add('solid', U.box, matrixOf([ax + (bx - ax) * t, y + 0.9 - sag, az + (bz - az) * t], [len / m + 0.002, 0.07, 0.006], Math.atan2(-(bz - az), bx - ax)), q % 2 ? '#D7263D' : '#F5F5F5');
      }
    }

    /* ---- pedestrian path: green mat with white edge lines and double arrows ---- */
    const S = WORKS.safe;
    b.rect('paint', S.x0, S.x1, S.z0, S.z1, y + 0.008, '#3E9A68');
    b.rect('paint', S.x0, S.x1, S.z0, S.z0 + 0.06, y + 0.016, '#F5F5F5');
    b.rect('paint', S.x0, S.x1, S.z1 - 0.06, S.z1, y + 0.016, '#F5F5F5');
    const az = (S.z0 + S.z1) / 2;
    for (let ax = S.x0 + 1.6; ax < S.x1 - 0.8; ax += 2.4) {
      b.rect('paint', ax - 0.4, ax + 0.4, az - 0.025, az + 0.025, y + 0.016, '#F5F5F5');
      for (const dir of [-1, 1]) for (const sgn of [-1, 1]) b.add('paint', U.floor, matrixOf([ax + dir * 0.4 - dir * 0.08, y + 0.016, az + sgn * 0.075], [0.22, 1, 0.05], dir * sgn * 0.7), '#F5F5F5');
    }

    /* ---- warning sign on a tripod stand: triangle (workers) over the «خطر / أعمال طرق» plate ---- */
    const [wx, , wz] = WORKS.sign;
    const face = -Math.PI / 2 - 0.45;
    b.cyl('solid', [wx, y + 0.98, wz], [0.05, 1.96, 0.05], C.metal, undefined, 8);
    for (const [fx, fz] of [[-0.42, 0.0], [0.24, 0.36], [0.24, -0.36]] as number[][]) {
      b.rod('solid', [wx, y + 0.75, wz], [wx + fx, y, wz + fz], 0.035, C.metal, 6);
      b.box('solid', [wx + fx, y + 0.015, wz + fz], [0.1, 0.03, 0.1], '#2B2E33');
    }
    b.frame([wx, y, wz], face, () => {
      b.add('solid', U.prism, matrixOf([0, 1.1, 0.04], [0.84, 0.76, 0.03]), '#F5F5F5');
      dec(b, 'warn', [0, 1.55, 0.065], 0.9, 0.9, 0);
      dec(b, 'warn', [0, 1.55, 0.015], 0.9, 0.9, Math.PI);
      b.box('solid', [0, 0.86, 0.04], [0.84, 0.44, 0.03], '#F2C230');
      dec(b, 'roadSign', [0, 0.86, 0.058], 0.8, 0.4, 0);
      dec(b, 'roadSign', [0, 0.86, 0.022], 0.8, 0.4, Math.PI);
    });
  });
}

/* ------------------------------------------------------------------- main */

export function buildNeighborhoodStatic(b: Builder) {
  terrain(b);
  skyline(b);
  sideRoad(b);
  houses(b);
  poles(b);
  park(b);
  works(b);
  void circle;
}
