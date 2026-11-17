// OWNER: props worker. Merged, vertex-coloured geometries of the small props and hand items.
// Props: origin on the surface they stand on (centre of the footprint). Hold items: origin at the grip
// (+Y up through the closed fist, +Z forward from the knuckles), see docs/props.md.
import * as THREE from 'three';
import { GeoBuilder, LGEO, cached, rng, trs } from './geo';

type V3 = [number, number, number];

const INK = '#1E2A3B';
const WHITE = '#FFFFFF';
const STEEL = '#B8C1CC';
const DARK = '#2B2F36';

/** Slim wrapper so each builder reads like a list of parts. */
const mk = (f: (b: GeoBuilder) => void) => {
  const b = new GeoBuilder();
  f(b);
  return b.build();
};

/* ------------------------------------------------------------------ small shapes */

function starPts(n: number, ro: number, ri: number, rot = Math.PI / 2): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = rot + (i * Math.PI) / n;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

function arc(b: GeoBuilder, cx: number, cy: number, cz: number, rad: number, a0: number, a1: number, t: number, color: string, plane: 'xy' | 'xz' = 'xy', n = 10) {
  for (let i = 0; i < n; i++) {
    const u0 = a0 + ((a1 - a0) * i) / n;
    const u1 = a0 + ((a1 - a0) * (i + 1)) / n;
    const p = (u: number): V3 => (plane === 'xy' ? [cx + Math.cos(u) * rad, cy + Math.sin(u) * rad, cz] : [cx + Math.cos(u) * rad, cy, cz + Math.sin(u) * rad]);
    b.beam(p(u0), p(u1), t, color, true);
  }
}

/* ------------------------------------------------------------------ umbrella */

/** Open canopy (8 gores) with its pole, origin at the pole at the height of the grip/base. */
export function umbrellaGeo(color: string, color2: string, poleBottom: number, poleTop: number, canopyY: number, radius: number, handle: boolean) {
  return cached(`umbrella:${color}:${color2}:${poleBottom}:${poleTop}:${canopyY}:${radius}:${handle}`, () =>
    mk((b) => {
      const gores = 8;
      const rings = 5;
      for (let g = 0; g < gores; g++) {
        const col = g % 2 === 0 ? color : color2;
        const a0 = (g / gores) * Math.PI * 2;
        const a1 = ((g + 1) / gores) * Math.PI * 2;
        const pt = (ring: number, a: number): V3 => {
          const u = ring / rings; // 0 apex .. 1 rim
          const rr = Math.sin(u * 1.35) / Math.sin(1.35) * radius;
          const hy = Math.cos(u * 1.35) / 1 * radius * 0.42 - Math.cos(1.35) * radius * 0.42;
          // scallop the rim between ribs
          const mid = (a - a0) / (a1 - a0);
          const scallop = ring === rings ? Math.sin(Math.PI * mid) * 0.03 : 0;
          return [Math.cos(a) * rr, canopyY + hy + scallop * 0 - (ring === rings ? scallop : 0), Math.sin(a) * rr];
        };
        for (let ring = 0; ring < rings; ring++) {
          const A = pt(ring, a0), Bp = pt(ring, a1), C = pt(ring + 1, a1), D = pt(ring + 1, a0);
          if (ring === 0) b.poly([A, D, C], col, 0.006);
          else b.poly([A, D, C, Bp], col, 0.006);
        }
      }
      // double-sided: draw the inside again darker so thin gores show from below
      for (let g = 0; g < gores; g++) {
        const a = (g / gores) * Math.PI * 2;
        b.beam([0, canopyY + radius * 0.33 - 0.03, 0], [Math.cos(a) * radius * 0.97, canopyY - 0.025, Math.sin(a) * radius * 0.97], 0.012, '#4A5563');
      }
      b.cyl([0, (poleBottom + poleTop) / 2, 0], [0.022, poleTop - poleBottom, 0.022], '#3A3F49', undefined, 8);
      b.sphere([0, canopyY + radius * 0.33 + 0.02, 0], [0.04, 0.05, 0.04], '#3A3F49', undefined, true);
      if (handle) {
        // J handle at the bottom of the pole
        b.cyl([0, poleBottom - 0.0, 0], [0.034, 0.12, 0.034], '#7A4B2A', undefined, 8);
        arc(b, 0.04, poleBottom - 0.07, 0, 0.04, Math.PI, Math.PI * 2, 0.034, '#7A4B2A', 'xy', 6);
      }
    }),
  );
}

/** Closed (furled) umbrella, crook at the top, tip down. */
export function umbrellaClosedGeo() {
  return cached('umbrellaClosed', () =>
    mk((b) => {
      // crook above the grip
      b.cyl([0, 0.0, 0], [0.034, 0.18, 0.034], '#7A4B2A', undefined, 8);
      arc(b, 0.045, 0.1, 0, 0.045, 0, Math.PI, 0.034, '#7A4B2A', 'xy', 6);
      b.cyl([0, -0.2, 0], [0.018, 0.24, 0.018], '#3A3F49', undefined, 8);
      // furled cloth (cone)
      b.lathe([[0.001, -0.8], [0.012, -0.78], [0.038, -0.6], [0.05, -0.38], [0.04, -0.26], [0.012, -0.24]], '#E5484D', [0, 0, 0], undefined, 10);
      b.cyl([0, -0.34, 0], [0.1, 0.03, 0.1], '#2B3A55', undefined, 10); // strap
      b.sphere([0, -0.81, 0], [0.03, 0.04, 0.03], '#3A3F49', undefined, true);
    }),
  );
}

/* ------------------------------------------------------------------ bottles, cans */

export const waterBottleGeo = () =>
  cached('waterBottle', () =>
    mk((b) => {
      b.lathe(
        [[0.001, 0], [0.03, 0], [0.034, 0.012], [0.034, 0.1], [0.03, 0.125], [0.016, 0.16], [0.014, 0.175], [0.001, 0.175]],
        '#8CCBF5',
        [0, 0, 0],
        undefined,
        16,
      );
      b.cyl([0, 0.188, 0], [0.034, 0.03, 0.034], WHITE, undefined, 14); // cap
      b.cyl([0, 0.06, 0], [0.069, 0.05, 0.069], '#2D8CFF', undefined, 14); // label band
      b.cyl([0, 0.09, 0], [0.069, 0.006, 0.069], WHITE, undefined, 14);
    }),
  );

export const sodaCanGeo = () =>
  cached('sodaCan', () =>
    mk((b) => {
      b.lathe([[0.001, 0], [0.026, 0], [0.033, 0.008], [0.033, 0.112], [0.026, 0.12], [0.001, 0.12]], '#E23B3B', [0, 0, 0], undefined, 16);
      b.cyl([0, 0.121, 0], [0.052, 0.004, 0.052], '#C9D1DA', undefined, 14);
      b.cyl([0, 0.06, 0], [0.067, 0.03, 0.067], WHITE, undefined, 14);
      b.cyl([0, 0.006, 0], [0.053, 0.012, 0.053], '#C9D1DA', undefined, 14);
      b.box([0.0, 0.124, 0.01], [0.024, 0.004, 0.012], '#9AA3AE');
    }),
  );

/* ------------------------------------------------------------------ stationery */

/** A pencil lying along +Z with its centre at the origin (length 0.18). */
export function pencilGeo(color = '#F5C518') {
  return cached(`pencil:${color}`, () =>
    mk((b) => {
      const R = [Math.PI / 2, 0, 0] as V3;
      b.cyl([0, 0, -0.01], [0.0085, 0.145, 0.0085], color, R, 8);
      // wood cone + lead
      b.add(new THREE.ConeGeometry(0.0045, 0.03, 8), '#E9C79B', trs([0, 0, 0.0825], [Math.PI / 2, 0, 0]));
      b.add(new THREE.ConeGeometry(0.0016, 0.011, 6), '#2B2F36', trs([0, 0, 0.1002], [Math.PI / 2, 0, 0]));
      b.cyl([0, 0, -0.088], [0.0092, 0.012, 0.0092], '#C9D1DA', R, 8); // ferrule
      b.cyl([0, 0, -0.1], [0.0088, 0.014, 0.0088], '#F472B6', R, 8); // eraser
    }),
  );
}

export const brushGeo = () =>
  cached('brush', () =>
    mk((b) => {
      const R = [Math.PI / 2, 0, 0] as V3;
      b.add(new THREE.CylinderGeometry(0.0045, 0.0075, 0.16, 8), '#2D8CFF', trs([0, 0, -0.03], R)); // long tapered handle
      b.cyl([0, 0, 0.056], [0.01, 0.026, 0.01], '#C9D1DA', R, 8); // ferrule
      b.add(new THREE.ConeGeometry(0.0085, 0.036, 8), '#E5484D', trs([0, 0, 0.087], [Math.PI / 2, 0, 0])); // paint-loaded bristles
      b.sphere([0, 0, -0.112], [0.012, 0.012, 0.012], '#1E6FD6', undefined, true);
    }),
  );

/** Round-tip kids' scissors built in a plane (X right, Z forward, Y thickness). Blades +Z, handle rings -Z. */
export function scissorsFlatGeo(c1 = '#FF8A3D', c2 = '#2D8CFF') {
  return cached(`scissorsFlat:${c1}:${c2}`, () =>
    mk((b) => {
      for (const [s, y, col] of [[1, 0.002, STEEL], [-1, -0.002, '#D5DBE2']] as [number, number, string][]) {
        b.beam([-s * 0.012, y, -0.01], [s * 0.003, y, 0.08], [0.014, 0.0035], col, false);
        b.sphere([s * 0.0035, y, 0.083], [0.014, 0.0035, 0.014], col, undefined, true);
      }
      for (const [s, col] of [[1, c1], [-1, c2]] as [number, string][]) {
        b.beam([s * 0.012, 0, -0.01], [-s * 0.016, 0, -0.05], 0.007, col, false);
        const ring = new THREE.TorusGeometry(0.022, 0.0065, 6, 14);
        b.add(ring, col, trs([-s * 0.022, 0, -0.07], [Math.PI / 2, 0, 0], [1, 1.15, 1]));
      }
      b.cyl([0, 0, -0.006], [0.01, 0.01, 0.01], '#6E7782', undefined, 8);
    }),
  );
}

export const paperStarGeo = () =>
  cached('paperStar', () =>
    mk((b) => {
      b.shape(starPts(5, 0.1, 0.045), 0.012, '#F59E0B', trs([0, 0.006, 0], [-Math.PI / 2, 0, 0]), 0.003);
      b.shape(starPts(5, 0.085, 0.038), 0.014, '#FFD23F', trs([0, 0.006, 0], [-Math.PI / 2, 0, 0]), 0.002);
      b.shape(starPts(5, 0.04, 0.018), 0.016, '#FFE98A', trs([0, 0.006, 0], [-Math.PI / 2, 0, 0]), 0.001);
    }),
  );

/* ------------------------------------------------------------------ lab / kitchen */

export function beakerGeo(liquid: string) {
  return cached(`beaker:${liquid}`, () => {
    const glass = mk((b) => {
      b.lathe([[0.001, 0], [0.036, 0], [0.038, 0.004], [0.038, 0.118], [0.042, 0.124], [0.038, 0.126], [0.036, 0.12], [0.034, 0.008], [0.001, 0.008]], '#FFFFFF', [0, 0, 0], undefined, 18);
      b.box([0.04, 0.12, 0], [0.01, 0.01, 0.02], '#FFFFFF');
    });
    const liq = mk((b) => {
      b.lathe([[0.001, 0.008], [0.034, 0.008], [0.034, 0.072], [0.001, 0.072]], liquid, [0, 0, 0], undefined, 16);
      b.cyl([0, 0.0725, 0], [0.069, 0.004, 0.069], '#FFFFFF', undefined, 16);
    });
    const marks = mk((b) => {
      for (const y of [0.03, 0.05, 0.07, 0.09, 0.11]) b.box([0, y, 0.0385], [y === 0.05 || y === 0.09 ? 0.02 : 0.012, 0.0012, 0.002], '#1E2A3B');
    });
    return { glass, liq, marks };
  });
}

export const sandwichGeo = () =>
  cached('sandwich', () =>
    mk((b) => {
      // two slices of bread with lettuce, tomato, cheese (a flat square sandwich)
      b.rbox([0, 0.012, 0], [0.12, 0.02, 0.12], '#E9C58B', undefined, true);
      b.rbox([0, 0.026, 0], [0.126, 0.012, 0.126], '#6CC24A', undefined, true);
      b.rbox([0.0, 0.035, 0], [0.12, 0.01, 0.12], '#FFD45E', [0, 0.4, 0], true);
      b.cyl([-0.02, 0.043, 0.02], [0.05, 0.008, 0.05], '#E5484D', undefined, 10);
      b.rbox([0, 0.056, 0], [0.12, 0.022, 0.12], '#E9C58B', undefined, true);
      b.rbox([0, 0.067, 0], [0.112, 0.004, 0.112], '#F4DDB0', undefined, true);
    }),
  );

export const lunchboxGeo = () =>
  cached('lunchbox', () =>
    mk((b) => {
      b.rbox([0, 0.045, 0], [0.22, 0.09, 0.14], '#2BB6A8', undefined, true);
      b.rbox([0, 0.105, 0], [0.225, 0.03, 0.145], '#FF8A3D', undefined, true);
      b.rbox([0, 0.09, 0.073], [0.035, 0.03, 0.01], '#FFFFFF', undefined, true);
      arc(b, 0, 0.115, 0, 0.055, 0, Math.PI, 0.012, '#1E2A3B', 'xy', 8);
      b.sphere([0.06, 0.06, 0.071], [0.045, 0.045, 0.01], '#FFD23F', undefined, true);
    }),
  );

export const trayGeo = () =>
  cached('tray', () =>
    mk((b) => {
      b.rbox([0, 0.014, 0], [0.42, 0.028, 0.3], '#5C86B0', undefined, true);
      b.rbox([0, 0.03, 0], [0.4, 0.004, 0.28], '#EAF1F7', undefined, true);
      for (const [x, z, w, d] of [[-0.12, -0.05, 0.14, 0.17], [0.05, -0.07, 0.11, 0.13], [0.12, 0.08, 0.14, 0.1], [-0.12, 0.09, 0.12, 0.07]] as [number, number, number, number][]) {
        b.rbox([x, 0.033, z], [w, 0.004, d], '#C9DAEA', undefined, true);
      }
      // food: rice mound, a roll, an apple, a juice box
      b.lathe([[0.001, 0.0], [0.05, 0.0], [0.045, 0.016], [0.02, 0.03], [0.001, 0.034]], '#FFF6DC', [-0.12, 0.034, -0.05], undefined, 12);
      b.sphere([0.04, 0.052, -0.07], [0.08, 0.04, 0.06], '#D9A05B', undefined, true);
      b.sphere([0.12, 0.052, 0.08], [0.06, 0.06, 0.06], '#E5484D', undefined, true);
      b.cyl([0.12, 0.085, 0.08], [0.004, 0.02, 0.004], '#6B4A2A', undefined, 6);
      b.rbox([-0.12, 0.062, 0.09], [0.05, 0.056, 0.035], '#F5C518', undefined, true);
    }),
  );

/* ------------------------------------------------------------------ gym / classroom */

export const matGeo = () =>
  cached('mat', () =>
    mk((b) => {
      b.rbox([0, 0.02, 0], [1.8, 0.04, 0.9], '#2D78C8', undefined, true);
      b.rbox([0, 0.042, 0], [1.7, 0.006, 0.8], '#3B8CE0', undefined, true);
      b.box([0, 0.046, 0], [0.01, 0.002, 0.8], '#1E5FA8');
      b.rbox([-0.9, 0.02, 0.0], [0.03, 0.03, 0.9], '#1E5FA8', undefined, true);
      for (const z of [-0.2, 0.2]) b.rbox([0.905, 0.022, z], [0.02, 0.012, 0.1], '#F5C518', undefined, true); // carry straps
    }),
  );

export const chairGeo = () =>
  cached('chair', () =>
    mk((b) => {
      const steel = '#6E7782';
      b.rbox([0, 0.44, 0], [0.4, 0.04, 0.4], '#2D8CFF', undefined, true);
      b.rbox([0, 0.7, -0.19], [0.38, 0.22, 0.03], '#2D8CFF', undefined, true);
      for (const x of [-0.17, 0.17]) {
        b.beam([x, 0.43, -0.17], [x, 0.0, -0.2], 0.025, steel, true);
        b.beam([x, 0.43, 0.17], [x, 0.0, 0.2], 0.025, steel, true);
        b.beam([x, 0.62, -0.18], [x, 0.43, -0.17], 0.022, steel, true);
      }
      b.beam([-0.17, 0.18, 0.18], [0.17, 0.18, 0.18], 0.018, steel, true);
      b.beam([-0.17, 0.18, -0.18], [0.17, 0.18, -0.18], 0.018, steel, true);
    }),
  );

export const stoolGeo = () =>
  cached('stool', () =>
    mk((b) => {
      b.cyl([0, 0.44, 0], [0.34, 0.05, 0.34], '#FFAA1F', undefined, 22);
      b.cyl([0, 0.46, 0], [0.3, 0.012, 0.3], '#FFC24D', undefined, 22);
      for (const a of [0, 1, 2, 3]) {
        const an = a * (Math.PI / 2) + Math.PI / 4;
        b.beam([Math.cos(an) * 0.1, 0.42, Math.sin(an) * 0.1], [Math.cos(an) * 0.19, 0.0, Math.sin(an) * 0.19], 0.026, '#6E7782', true);
      }
      b.add(new THREE.TorusGeometry(0.15, 0.008, 5, 18), '#6E7782', trs([0, 0.2, 0], [Math.PI / 2, 0, 0], [1, 1, 1]));
    }),
  );

export const firstAidKitGeo = () =>
  cached('firstAid', () =>
    mk((b) => {
      b.rbox([0, 0.07, 0], [0.3, 0.14, 0.18], '#1FAE5B', undefined, true);
      b.rbox([0, 0.145, 0], [0.3, 0.02, 0.18], '#1B9A50', undefined, true);
      b.box([0, 0.157, 0.0], [0.05, 0.004, 0.11], WHITE);
      b.box([0, 0.157, 0.0], [0.11, 0.004, 0.05], WHITE);
      arc(b, 0, 0.155, 0, 0.05, 0, Math.PI, 0.012, '#E6EBF0', 'xy', 8);
      b.box([0.14, 0.125, 0.092], [0.03, 0.04, 0.012], '#E6EBF0');
      b.box([-0.14, 0.125, 0.092], [0.03, 0.04, 0.012], '#E6EBF0');
      b.box([0, 0.07, 0.0935], [0.285, 0.004, 0.003], '#106B37');
    }),
  );

/* ------------------------------------------------------------------ street / site */

export const coneGeo = () =>
  cached('cone', () =>
    mk((b) => {
      b.rbox([0, 0.015, 0], [0.38, 0.03, 0.38], '#2B2E33', undefined, true);
      b.lathe([[0.001, 0.03], [0.15, 0.03], [0.1, 0.30], [0.075, 0.45], [0.045, 0.64], [0.03, 0.66], [0.001, 0.66]], '#FF7A1A', [0, 0, 0], undefined, 18);
      b.lathe([[0.1, 0.28], [0.085, 0.4], [0.077, 0.42], [0.1, 0.3]], WHITE, [0, 0, 0], undefined, 18);
      b.lathe([[0.1, 0.285], [0.104, 0.285], [0.0795, 0.425], [0.0755, 0.425]], WHITE, [0, 0, 0], undefined, 18);
    }),
  );

export function bucketGeo(color: string) {
  return cached(`bucket:${color}`, () =>
    mk((b) => {
      b.lathe([[0.001, 0.0], [0.115, 0.0], [0.15, 0.28], [0.1, 0.28], [0.001, 0.02]], color, [0, 0, 0], undefined, 20);
      b.lathe([[0.15, 0.28], [0.16, 0.285], [0.16, 0.295], [0.15, 0.295], [0.14, 0.28]], '#E6EBF0', [0, 0, 0], undefined, 20);
      b.lathe([[0.001, 0.26], [0.143, 0.26], [0.145, 0.28]], '#14203A', [0, 0, 0], undefined, 20);
      arc(b, 0, 0.29, 0, 0.158, 0, Math.PI, 0.012, '#C9D1DA', 'xy', 12);
    }),
  );
}

export const gogglesGeo = () => {
  return cached('goggles', () => {
    const solid = mk((b) => {
      b.add(new THREE.TorusGeometry(0.045, 0.006, 6, 18), '#1E6FD6', trs([-0.045, 0.03, 0], [0, 0, 0], [1, 0.9, 1.2]));
      b.add(new THREE.TorusGeometry(0.045, 0.006, 6, 18), '#1E6FD6', trs([0.045, 0.03, 0], [0, 0, 0], [1, 0.9, 1.2]));
      b.box([0, 0.03, 0], [0.04, 0.014, 0.01], '#1E6FD6');
      arc(b, 0, 0.03, -0.045, 0.1, Math.PI * 0.05, Math.PI * 0.95, 0.012, '#2D8CFF', 'xz', 12);
      b.beam([-0.09, 0.03, 0.0], [-0.095, 0.03, -0.045], 0.014, '#2D8CFF');
      b.beam([0.09, 0.03, 0.0], [0.095, 0.03, -0.045], 0.014, '#2D8CFF');
    });
    return solid;
  });
};

export const goggleLensGeo = () =>
  cached('goggleLens', () =>
    mk((b) => {
      b.cyl([-0.045, 0.03, 0], [0.086, 0.004, 0.092], WHITE, [Math.PI / 2, 0, 0], 14);
      b.cyl([0.045, 0.03, 0], [0.086, 0.004, 0.092], WHITE, [Math.PI / 2, 0, 0], 14);
    }),
  );

export function glovesGeo() {
  return cached('gloves', () =>
    mk((b) => {
      const col = '#3AA8F5';
      const glove = (x: number, z: number, rot: number, mirror: number) => {
        const m = (p: V3): V3 => {
          const c = Math.cos(rot);
          const s = Math.sin(rot);
          return [x + p[0] * c * mirror + p[2] * s, p[1], z - p[0] * s * mirror + p[2] * c];
        };
        b.rbox(m([0, 0.012, 0]), [0.085, 0.022, 0.095], col, [0, rot, 0], true);
        b.rbox(m([0, 0.012, -0.075]), [0.075, 0.024, 0.06], '#7CC4FA', [0, rot, 0], true);
        for (let i = 0; i < 4; i++) {
          const fx = -0.03 + i * 0.02;
          const L = i === 1 || i === 2 ? 0.075 : 0.06;
          b.beam(m([fx, 0.012, 0.045]), m([fx, 0.012, 0.045 + L]), [0.017, 0.018], col, false);
        }
        b.beam(m([0.04 * mirror * 0 + 0.045, 0.012, 0.0]), m([0.09, 0.012, 0.05]), [0.018, 0.018], col, false);
      };
      glove(-0.06, 0, 0.1, 1);
      glove(0.06, 0.015, -0.12, -1);
    }),
  );
}

export function leafGeo() {
  return cached('leaf', () =>
    mk((b) => {
      const g = '#3E9B4F';
      const g2 = '#58B968';
      b.beam([0, 0.012, -0.13], [0, 0.012, 0.13], 0.008, '#6B8A3A', true);
      for (let i = 0; i < 6; i++) {
        const z = -0.1 + i * 0.045;
        for (const s of [-1, 1]) {
          const len = 0.11 - Math.abs(i - 2.5) * 0.012;
          b.shape([[0, 0], [len * 0.5, 0.018], [len, 0.003], [len * 0.5, -0.012]], 0.004, i % 2 ? g : g2, trs([0, 0.012, z], [-Math.PI / 2, 0, s < 0 ? Math.PI : 0], [1, 1, 1]));
          void s;
        }
      }
      b.shape([[0, -0.02], [0.02, 0], [0, 0.07], [-0.02, 0]], 0.004, g2, trs([0, 0.012, 0.13], [-Math.PI / 2, 0, 0]));
    }),
  );
}

export function plasticBagGeo() {
  return cached('plasticBag', () => {
    const r = rng(7);
    const g = new THREE.SphereGeometry(0.5, 14, 10);
    const p = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = 1 + (Math.sin(v.x * 9 + 1) * Math.cos(v.z * 8) * 0.22 + (r() - 0.5) * 0.03);
      v.multiplyScalar(n);
      v.y *= 0.75;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return mk((b) => {
      b.add(g, '#EDF5FA', trs([0, 0.14, 0], [0, 0, 0], [0.34, 0.36, 0.26]));
      arc(b, -0.06, 0.28, 0, 0.06, 0, Math.PI, 0.012, '#E3EEF5', 'xy', 8);
      arc(b, 0.08, 0.28, 0, 0.05, 0, Math.PI, 0.012, '#E3EEF5', 'xy', 8);
    });
  });
}

/* ------------------------------------------------------------------ electricity */

export const powerStripGeo = () =>
  cached('powerStrip', () =>
    mk((b) => {
      b.rbox([0, 0.025, 0], [0.4, 0.05, 0.08], '#F4F4F0', undefined, true);
      b.rbox([-0.17, 0.052, 0], [0.04, 0.012, 0.05], '#E5484D', undefined, true); // switch
      for (let i = 0; i < 4; i++) {
        const x = -0.07 + i * 0.075;
        b.rbox([x, 0.052, 0], [0.056, 0.008, 0.05], '#D8DEE5', undefined, true);
        // child-safety covers sit in the sockets (coloured caps) except the first
        if (i > 0) b.rbox([x, 0.06, 0], [0.04, 0.014, 0.034], i % 2 ? '#2D8CFF' : '#FFAA1F', undefined, true);
        else {
          b.box([x - 0.01, 0.058, 0], [0.006, 0.004, 0.016], '#1E2A3B');
          b.box([x + 0.01, 0.058, 0], [0.006, 0.004, 0.016], '#1E2A3B');
        }
      }
      b.tube([[0.2, 0.025, 0], [0.3, 0.02, 0.06], [0.44, 0.012, 0.03], [0.55, 0.012, 0.08]], 0.007, '#F4F4F0', 18, 6);
      b.rbox([0.58, 0.015, 0.08], [0.05, 0.03, 0.04], '#F4F4F0', undefined, true);
    }),
  );

export const socketCoverGeo = () =>
  cached('socketCover', () =>
    mk((b) => {
      b.rbox([0, 0.012, 0], [0.04, 0.022, 0.032], '#FFFFFF', undefined, true);
      b.rbox([0, 0.024, 0], [0.034, 0.006, 0.026], '#7CC4FA', undefined, true);
      b.box([-0.007, 0.0, 0], [0.004, 0.02, 0.003], '#C9D1DA');
      b.box([0.007, 0.0, 0], [0.004, 0.02, 0.003], '#C9D1DA');
      b.sphere([0, 0.029, 0], [0.012, 0.006, 0.012], WHITE, undefined, true);
    }),
  );

export function cableGeo(color = '#2E3138') {
  return cached(`cable:${color}`, () =>
    mk((b) => {
      b.tube(
        [[-0.55, 0.008, 0.05], [-0.35, 0.008, -0.08], [-0.12, 0.008, 0.05], [0.12, 0.008, -0.06], [0.3, 0.008, 0.08], [0.5, 0.008, -0.02]],
        0.008,
        color,
        40,
        6,
      );
      // plug on the left end and a white connector on the right
      b.rbox([-0.58, 0.014, 0.05], [0.05, 0.028, 0.036], '#F4F4F0', undefined, true);
      b.box([-0.615, 0.014, 0.04], [0.02, 0.005, 0.005], '#C9D1DA');
      b.box([-0.615, 0.014, 0.06], [0.02, 0.005, 0.005], '#C9D1DA');
      b.rbox([0.52, 0.014, -0.025], [0.04, 0.022, 0.028], '#2E3138', undefined, true);
    }),
  );
}

/* ------------------------------------------------------------------ misc */

export const brokenGlassGeo = () =>
  cached('brokenGlass', () =>
    mk((b) => {
      const r = rng(11);
      const cols = ['#CDEFFB', '#E9FAFF', '#A8DDF2', '#FFFFFF'];
      for (let i = 0; i < 22; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 0.3;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const s = 0.025 + r() * 0.045;
        const rot = r() * Math.PI * 2;
        const pts: V3[] = [];
        for (let k = 0; k < 3; k++) {
          const aa = rot + k * 2.1 + r() * 0.5;
          const rr = s * (0.6 + r() * 0.7);
          pts.push([x + Math.cos(aa) * rr, 0.003 + r() * 0.004, z + Math.sin(aa) * rr]);
        }
        b.poly(pts, cols[i % cols.length], 0.003);
      }
    }),
  );

export const stopSignGeo = () =>
  cached('stopSign', () =>
    mk((b) => {
      b.cyl([0, 0.7, 0], [0.028, 1.4, 0.028], '#6E7782', undefined, 8);
      b.sphere([0, 1.4, 0], [0.04, 0.04, 0.04], '#6E7782', undefined, true);
      b.cyl([0, 0.0, 0], [0.12, 0.02, 0.12], '#2B2F36', undefined, 14);
    }),
  );

/* ------------------------------------------------------------------ hold items */

export const extinguisherGeo = () =>
  cached('extinguisher', () =>
    mk((b) => {
      // carried by the top handle: the bottle hangs below the grip, the nozzle points forward (+Z)
      b.lathe([[0.001, -0.5], [0.05, -0.5], [0.065, -0.48], [0.068, -0.2], [0.06, -0.14], [0.03, -0.1], [0.03, -0.08], [0.001, -0.08]], '#D92D2D', [0, 0, 0], undefined, 18);
      b.cyl([0, -0.37, 0], [0.138, 0.09, 0.138], '#F5C518', undefined, 18); // label band
      b.cyl([0, -0.37, 0], [0.141, 0.03, 0.141], WHITE, undefined, 18);
      b.cyl([0, -0.07, 0], [0.07, 0.04, 0.07], '#2B2F36', undefined, 12); // valve
      b.rbox([0, -0.01, 0], [0.04, 0.03, 0.17], '#2B2F36', undefined, true); // carry handle (grip)
      b.rbox([0, -0.04, -0.07], [0.03, 0.05, 0.03], '#2B2F36', undefined, true);
      b.box([0.0, -0.045, 0.085], [0.03, 0.03, 0.02], '#2B2F36');
      b.sphere([0.035, -0.06, 0.02], [0.03, 0.03, 0.03], '#C9D1DA', undefined, true); // pin ring
      b.tube([[0.0, -0.07, 0.03], [0.07, -0.1, 0.1], [0.09, -0.18, 0.2], [0.03, -0.12, 0.3], [0, -0.07, 0.34]], 0.012, '#1E2A3B', 24, 6);
      b.add(new THREE.ConeGeometry(0.03, 0.09, 12), '#1E2A3B', trs([0, -0.07, 0.38], [Math.PI / 2, 0, 0]));
    }),
  );

/** The same extinguisher standing on the floor (origin at the base centre): hose clipped down the side, nozzle down. */
export const extinguisherStandGeo = () =>
  cached('extinguisherStand', () =>
    mk((b) => {
      const y = 0.5;
      b.lathe([[0.001, -0.5 + y], [0.05, -0.5 + y], [0.065, -0.48 + y], [0.068, -0.2 + y], [0.06, -0.14 + y], [0.03, -0.1 + y], [0.03, -0.08 + y], [0.001, -0.08 + y]], '#D92D2D', [0, 0, 0], undefined, 18);
      b.cyl([0, -0.37 + y, 0], [0.138, 0.09, 0.138], '#F5C518', undefined, 18);
      b.cyl([0, -0.37 + y, 0], [0.141, 0.03, 0.141], WHITE, undefined, 18);
      b.cyl([0, 0.006, 0], [0.104, 0.012, 0.104], '#2B2F36', undefined, 18); // foot ring
      b.cyl([0, -0.07 + y, 0], [0.07, 0.04, 0.07], '#2B2F36', undefined, 12); // valve
      b.rbox([0, -0.01 + y, 0], [0.04, 0.03, 0.17], '#2B2F36', undefined, true); // carry handle
      b.rbox([0, -0.04 + y, -0.07], [0.03, 0.05, 0.03], '#2B2F36', undefined, true);
      b.box([0.0, -0.045 + y, 0.085], [0.03, 0.03, 0.02], '#2B2F36');
      b.sphere([0.035, -0.06 + y, 0.02], [0.03, 0.03, 0.03], '#C9D1DA', undefined, true); // pin ring
      // hose from the valve down the side of the bottle into its clip, nozzle pointing down
      b.tube([[0.0, -0.07 + y, 0.03], [0.05, -0.1 + y, 0.07], [0.068, -0.2 + y, 0.062], [0.066, 0.2, 0.06], [0.064, 0.13, 0.058]], 0.012, '#1E2A3B', 24, 6);
      b.box([0.06, 0.24, 0.055], [0.035, 0.025, 0.035], '#2B2F36'); // hose clip
      b.add(new THREE.ConeGeometry(0.026, 0.08, 12), '#1E2A3B', trs([0.064, 0.09, 0.058], [Math.PI, 0, 0]));
    }),
  );

export const bandageGeo = () =>
  cached('bandage', () =>
    mk((b) => {
      // a roll of gauze bandage in the fist, with a loose tail and a tape strip
      b.cyl([0, 0, 0], [0.075, 0.06, 0.075], '#F6F2EA', [0, 0, 0], 20);
      b.cyl([0, 0, 0], [0.078, 0.012, 0.078], '#EDE5D4', [0, 0, 0], 20);
      b.cyl([0, 0.031, 0], [0.03, 0.004, 0.03], '#D8CDB8', [0, 0, 0], 12);
      b.box([0.05, -0.02, 0.02], [0.07, 0.04, 0.003], '#F6F2EA', [0, 0, 0.1]);
      b.rbox([0, 0.0, 0.039], [0.05, 0.02, 0.003], '#E6BE82', undefined, true);
    }),
  );

export const gauzeGeo = () =>
  cached('gauze', () =>
    mk((b) => {
      b.rbox([0, 0, 0], [0.1, 0.02, 0.1], '#F8F4EC', [0, 0.1, 0], true);
      b.rbox([0, 0.011, 0], [0.09, 0.004, 0.09], '#EFE9DC', [0, 0.1, 0], true);
      for (const o of [-0.03, 0, 0.03]) b.box([o, 0.0135, 0], [0.002, 0.001, 0.09], '#DDD5C2', [0, 0.1, 0]);
    }),
  );

export const clipboardGeo = () =>
  cached('clipboard', () =>
    mk((b) => {
      // hangs from the grip (clip at the top): board faces +-X
      b.rbox([0, -0.16, 0], [0.012, 0.31, 0.225], '#C98F5A', undefined, true);
      b.rbox([0.008, -0.17, 0], [0.004, 0.27, 0.19], '#FFFFFF', undefined, true);
      b.rbox([0.012, -0.02, 0], [0.02, 0.03, 0.07], '#6E7782', undefined, true);
      b.rbox([0.012, -0.04, 0], [0.012, 0.014, 0.03], '#C9D1DA', undefined, true);
      for (let i = 0; i < 7; i++) b.box([0.0105, -0.08 - i * 0.03, 0], [0.002, 0.003, i % 3 === 2 ? 0.1 : 0.14], '#9AA3AE');
      b.sphere([0.0105, -0.18, -0.05], [0.004, 0.04, 0.04], '#E5484D', undefined, true);
    }),
  );

export const maskGeo = () =>
  cached('mask', () =>
    mk((b) => {
      b.rbox([0, 0, 0.0], [0.17, 0.095, 0.006], '#8DD2F5', undefined, true);
      for (const y of [-0.025, 0, 0.025]) b.box([0, y, 0.004], [0.165, 0.004, 0.002], '#6FBDE8');
      b.rbox([0, 0.046, 0.0], [0.17, 0.004, 0.008], '#F5F8FA', undefined, true);
      for (const s of [-1, 1]) arc(b, s * 0.095, 0, -0.01, 0.045, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : (Math.PI * 3) / 2, 0.004, '#F5F8FA', 'xy', 8);
    }),
  );

export function backpackGeo(color = '#E5484D') {
  return cached(`backpack:${color}`, () =>
    mk((b) => {
      // hangs from the top handle, back faces -Z? (straps toward +Z when worn); held at the side
      b.rbox([0, -0.24, 0], [0.3, 0.4, 0.15], color, undefined, false);
      b.rbox([0, -0.31, 0.09], [0.24, 0.2, 0.05], '#C23A3E', undefined, true);
      b.rbox([0, -0.31, 0.12], [0.18, 0.02, 0.02], '#FFD23F', undefined, true);
      b.rbox([0, -0.12, 0.081], [0.2, 0.1, 0.012], '#FFD23F', undefined, true);
      for (const s of [-1, 1]) b.rbox([s * 0.16, -0.29, 0.0], [0.03, 0.2, 0.1], '#C23A3E', undefined, true);
      arc(b, 0, -0.03, 0, 0.06, 0, Math.PI, 0.022, '#7A1F23', 'xy', 8);
      b.rbox([0, -0.03, 0], [0.12, 0.03, 0.025], '#7A1F23', undefined, true);
    }),
  );
}

export const mopGeo = () =>
  cached('mop', () =>
    mk((b) => {
      b.cyl([0, -0.2, 0], [0.026, 1.3, 0.026], '#C98F5A', undefined, 8);
      b.cyl([0, 0.0, 0], [0.034, 0.16, 0.034], '#2D8CFF', undefined, 8); // rubber grip
      b.rbox([0, -0.86, 0], [0.3, 0.035, 0.09], '#6E7782', undefined, true);
      b.lathe([[0.001, 0], [0.14, 0], [0.11, 0.1], [0.001, 0.1]], '#E8EDF2', [0, -0.95, 0], [0, 0, Math.PI / 2], 6, [0.9, 1.9, 0.9]);
      for (let i = 0; i < 14; i++) {
        const x = -0.14 + i * 0.0215;
        b.beam([x, -0.87, 0.0], [x * 1.3, -0.945, ((i % 3) - 1) * 0.03], 0.016, i % 2 ? '#DCE3EA' : '#EEF2F6', true);
      }
    }),
  );

export { LGEO, INK, DARK };
