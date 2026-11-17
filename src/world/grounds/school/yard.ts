/**
 * The assembly yard and the rest of the compound dressing: shade canopy, stage with microphone stand,
 * benches, water coolers, palms in planters, trees, the fire assembly point sign, bike rack, lamps.
 */
import type { Batch, V3 } from './batch';
import { T } from './batch';
import { uvOf } from './atlas';
import type { Batches } from './building';
import { COL } from './building';
import { ASSEMBLY, CANOPY, SCHOOL_LANDMARKS, STAGE } from './layout';
import { PC, Frame, bench, bike, cooler, palm, shrub, tree } from './parts';

function post(dry: Batch, x: number, z: number, h: number, d = 0.28, c = COL.white) {
  dry.cyl([x, h / 2, z], d, h, c, { seg: 8 });
  dry.box([x, 0.08, z], [d + 0.2, 0.16, d + 0.2], COL.sand);
}

/* ------------------------------------------------------------ canopy */

function buildCanopy(B: Batches) {
  const dry = B.dry;
  const c = CANOPY;
  const cols = [-21.8, -13, -4.2];
  const rows = [-33.1, -23.5, -13.9];
  for (const x of cols) for (const z of rows) post(dry, x, z, c.eave, 0.3);
  const ang = Math.atan2(c.rise, 4.4);
  const sl = Math.hypot(4.4, c.rise);
  // two bays: ridge lines at x = -17.4 and -8.6; slabs sloping to the eaves, striped teal / white
  const zLen = c.z1 - c.z0;
  const stripes = 5;
  for (const ridge of [-17.4, -8.6]) {
    for (const s of [-1, 1]) {
      for (let i = 0; i < stripes; i++) {
        const sw = zLen / stripes;
        const z = c.z0 + sw * (i + 0.5);
        const col = (i + (ridge < -10 ? 0 : 1)) % 2 ? COL.white : COL.teal;
        dry.box([ridge + s * 2.2, c.eave + c.rise / 2 + 0.05, z], [sl, 0.08, sw - 0.02], col, { r: [0, 0, -s * ang] });
      }
    }
    dry.box([ridge, c.eave + c.rise + 0.1, (c.z0 + c.z1) / 2], [0.3, 0.14, zLen + 0.1], COL.tealDark);
    // ridge beam under the fabric and eave beams
  }
  for (const x of [-21.8, -13, -4.2]) dry.box([x, c.eave + 0.02, (c.z0 + c.z1) / 2], [0.22, 0.28, zLen + 0.4], COL.darkMetal);
  for (const z of rows) dry.box([(c.x0 + c.x1) / 2 - 0.05, c.eave + 0.02, z], [c.x1 - c.x0 + 0.35, 0.22, 0.2], COL.darkMetal);
  // king posts and braces under the ridges
  for (const ridge of [-17.4, -8.6])
    for (const z of rows) {
      dry.box([ridge, c.eave + c.rise / 2, z], [0.12, c.rise, 0.12], COL.darkMetal);
    }
  // diagonal corner braces
  for (const x of cols)
    for (const z of rows)
      for (const sx of [-1, 1]) {
        if ((x === cols[0] && sx < 0) || (x === cols[2] && sx > 0)) continue;
        dry.rod([x, c.eave - 0.9, z], [x + sx * 0.8, c.eave, z], 0.07, COL.darkMetal, 6);
      }
}

/* ------------------------------------------------------------ stage */

function buildStage(B: Batches) {
  const dry = B.dry;
  const s = STAGE;
  const w = s.x1 - s.x0;
  const d = s.z1 - s.z0;
  const cx = (s.x0 + s.x1) / 2;
  const cz = (s.z0 + s.z1) / 2;
  B.wet.box([cx, s.h - 0.04, cz], [w, 0.1, d], '#D8B98A');
  dry.box([cx, s.h / 2 - 0.05, cz], [w - 0.05, s.h - 0.1, d - 0.05], COL.teal);
  dry.box([cx, 0.1, s.z1 - 0.01], [w + 0.1, 0.2, 0.06], COL.sand);
  dry.box([cx, s.h - 0.09, s.z1 + 0.01], [w + 0.14, 0.12, 0.1], COL.white);
  // geometric trim on the front: row of small diamonds
  for (let i = 0; i < 14; i++) {
    const x = s.x0 + 0.25 + i * ((w - 0.5) / 13);
    dry.box([x, 0.33, s.z1 + 0.005], [0.2, 0.2, 0.04], i % 2 ? COL.blue : COL.white, { r: [0, 0, Math.PI / 4] });
  }
  // steps (3) at the front centre
  for (let i = 0; i < 3; i++) {
    const h = 0.2 * (i + 1);
    dry.box([cx, h / 2, s.z1 + 0.7 - i * 0.28], [2.0, h, 0.28], i % 2 ? COL.sand : COL.white);
  }
  for (const sx of [-1.05, 1.05]) dry.box([cx + sx, 0.3, s.z1 + 0.42], [0.06, 0.6, 0.84], COL.teal);
  // backdrop panel with the painted stage sign, side wings, little roof lip
  const bz = s.z0 + 0.15;
  dry.box([cx, 1.9, bz - 0.08], [w - 0.4, 3.0, 0.16], COL.tealDark);
  B.sign.quad([cx, 1.95, bz + 0.005], w - 0.7, (w - 0.7) * (448 / 1024), 0, uvOf('stage'));
  dry.box([cx, 3.5, bz - 0.04], [w - 0.2, 0.2, 0.3], COL.teal);
  for (const sx of [-1, 1]) dry.box([cx + sx * (w / 2 - 0.15), 1.9, bz + 1.0], [0.12, 3.0, 0.12], COL.white);
  // microphone stand: base, pole, boom, mic head
  const m = SCHOOL_LANDMARKS.microphone;
  dry.cyl([m[0], m[1] + 0.025, m[2]], 0.36, 0.05, COL.darkMetal, { seg: 12 });
  dry.cyl([m[0], m[1] + 0.75, m[2]], 0.035, 1.45, COL.metal, { seg: 6 });
  dry.rod([m[0], m[1] + 1.45, m[2]], [m[0], m[1] + 1.55, m[2] + 0.2], 0.03, COL.metal, 6);
  dry.sphere([m[0], m[1] + 1.57, m[2] + 0.24], [0.1, 0.13, 0.1], COL.darkMetal);
  // lectern + two speakers
  dry.box([cx - 2.3, s.h + 0.55, s.z0 + 0.9], [0.8, 1.1, 0.55], COL.wood);
  dry.box([cx - 2.3, s.h + 1.08, s.z0 + 0.8], [0.84, 0.06, 0.6], '#8E5B34');
  for (const sx of [s.x0 + 0.5, s.x1 - 0.5]) {
    dry.rod([sx, s.h, s.z0 + 1.2], [sx, s.h + 1.5, s.z0 + 1.2], 0.04, COL.darkMetal, 6);
    dry.cbox([sx, s.h + 1.8, s.z0 + 1.2], [0.4, 0.6, 0.35], '#2B3440');
    dry.disc([sx, s.h + 1.7, s.z0 + 1.38], 0.22, '#5B6470');
    dry.disc([sx, s.h + 1.95, s.z0 + 1.38], 0.1, '#5B6470');
  }
  // flag pole beside the stage (school flag = logo panel)
  const fx = 2.2;
  const fz = -34.4;
  dry.cyl([fx, 3.5, fz], 0.08, 7.0, COL.metal, { seg: 8 });
  dry.sphere([fx, 7.05, fz], [0.2, 0.2, 0.2], '#F7C531');
  dry.cyl([fx, 0.1, fz], 0.7, 0.2, COL.sand, { seg: 12 });
  B.sign.quad([fx + 0.95, 6.2, fz], 1.8, 0.675, 0, uvOf('logo'));
  B.sign.quad([fx + 0.95, 6.2, fz], 1.8, 0.675, Math.PI, uvOf('logo'));
}

/* ------------------------------------------------------------ furniture / planting */

function buildFurniture(B: Batches) {
  const dry = B.dry;
  const L = SCHOOL_LANDMARKS;
  // shaded benches face each other across the canopy
  L.shadedBenches.forEach(([x, , z]) => bench(B.wet, dry, [x, 0, z], z < -23.5 ? 0 : Math.PI, PC.benchSeat, 1.7));
  // arcade benches along the building (backs to the wall), clear of the entrance and the classroom window
  // (the east one sits centred between the arcade columns at x 16 and 20, so no column stands in front of it)
  for (const x of [-30.5, -22, -14, 18]) bench(B.wet, dry, [x, 0, -39.2], 0, '#F7C531', 1.7);
  // yard coolers (taps face east at the canopy edge) and a sunny-side cooler facing west
  for (const [x, , z] of L.yardCoolers) cooler(dry, B.glass, [x, 0, z], Math.PI / 2);
  cooler(dry, B.glass, [21.0, 0, -29.5], -Math.PI / 2);
  // a roof-less drinking shelter sign pole next to the east cooler
  // palms in planters (walkway sides, yard edges)
  const palms: [number, number][] = [
    [4.4, -12.5],
    [4.4, -17.5],
    [4.4, -27.5],
    [-3.9, -15.2],
    [-3.9, -30.0],
    [-23.2, -12],
    [-23.2, -20],
    [-23.2, -31],
    [21.8, -20],
    [21.8, -26.5],
    [21.8, -33],
    [-30, -36.5],
    [-5.0, -36.3],
  ];
  palms.forEach(([x, z], i) => palm(dry, B.wet, [x, 0, z], i + 1, i < 11));
  // trees around the compound
  const trees: [number, number, number][] = [
    [-52, -14, 1],
    [-52, -30, 2],
    [-52, -46, 3],
    [-52, -62, 4],
    [-44, -76, 5],
    [-30, -77, 6],
    [-12, -77, 7],
    [8, -77, 8],
    [28, -77, 9],
    [44, -77, 10],
    [53, -60, 11],
    [53, -48, 12],
    [-28, -12, 13],
    [-40, -20, 14],
    [30, -49, 15],
    [38, -57, 16],
    [47, -66, 17],
    [-42, -48, 18],
    [-47, -68, 19],
    [26.5, -75, 20],
  ];
  trees.forEach(([x, z, s]) => tree(dry, [x, 0, z], s, 0.9 + (s % 3) * 0.1));
  // shrubs along the inside of the front fence and the building plinth
  for (let x = -54; x < 54; x += 5.2) {
    if (Math.abs(x) < 6 || (x > -17 && x < -8) || (x > -50 && x < -16 && false)) continue;
    shrub(dry, [x, 0, -8.7], 0.95, x % 2 ? '#4FA650' : '#5DB85A');
  }
  // trash bins
  for (const [x, z] of [
    [-19, -34.5],
    [9.5, -37.2],
    [20.5, -37.0],
    [6.2, -14.5],
    [22.4, -14.5],
  ] as [number, number][]) {
    dry.cyl([x, 0.4, z], 0.5, 0.8, '#3E7D6E', { seg: 12 });
    dry.cyl([x, 0.82, z], 0.54, 0.06, COL.teal, { seg: 12 });
  }
  // lamp posts
  for (const [x, z] of [
    [-24, -30],
    [24, -8.8],
    [-18, -9.2],
    [22.6, -34],
    [-1, -36.5],
  ] as [number, number][]) {
    dry.cyl([x, 2.2, z], 0.12, 4.4, COL.darkMetal, { seg: 8 });
    dry.box([x, 0.12, z], [0.4, 0.24, 0.4], COL.sand);
    dry.rod([x, 4.4, z], [x + 0.5, 4.55, z], 0.08, COL.darkMetal, 6);
    B.glow.box([x + 0.6, 4.5, z], [0.6, 0.1, 0.3], '#FFF3D0');
  }
}

/* ------------------------------------------------------------ assembly point and bikes */

function buildAssembly(B: Batches) {
  const dry = B.dry;
  const a = ASSEMBLY;
  const [sx, , sz] = ASSEMBLY.sign;
  // two posts, panel facing north into the area
  for (const dx of [-0.6, 0.6]) {
    dry.cyl([sx + dx, 1.4, sz], 0.1, 2.8, COL.darkMetal, { seg: 8 });
  }
  dry.box([sx, 2.5, sz + 0.07], [1.52, 2.0, 0.1], COL.white);
  B.sign.quad([sx, 2.5, sz - 0.01], 1.4, 1.96, Math.PI, uvOf('assembly'));
  B.sign.quad([sx, 2.5, sz + 0.13], 1.4, 1.96, 0, uvOf('assembly'));
  // four low green bollards marking the corners of the area
  for (const [x, z] of [
    [a.x0 + 0.05, a.z0 + 0.05],
    [a.x1 - 0.05, a.z0 + 0.05],
    [a.x0 + 0.05, a.z1 - 0.05],
    [a.x1 - 0.05, a.z1 - 0.05],
  ])
    dry.cyl([x, 0.35, z], 0.16, 0.7, '#1FAE5B', { seg: 8 });
}

function buildBikes(B: Batches) {
  const dry = B.dry;
  const [rx, , rz] = SCHOOL_LANDMARKS.bikeRack;
  // rack: a low bar on feet, with a bike sign
  dry.box([rx + 0.5, 0.2, rz], [0.08, 0.06, 5.6], COL.darkMetal);
  for (let i = 0; i <= 5; i++) {
    const z = rz - 2.6 + i * 1.04;
    dry.box([rx + 0.5, 0.1, z], [0.08, 0.2, 0.08], COL.darkMetal);
    dry.box([rx + 0.5, 0.45, z], [0.06, 0.5, 0.05], COL.darkMetal);
  }
  const cols = ['#E23B3B', '#2D8CFF', '#F7C531', '#22B573', '#FF8A3D'];
  cols.forEach((c, i) => bike(dry, [rx + 0.0, 0, rz - 2.1 + i * 1.04], i % 2 ? 0.08 : -0.06, c));
  dry.cyl([rx + 1.5, 0.8, rz - 2.9], 0.07, 1.6, COL.darkMetal, { seg: 6 });
  dry.box([rx + 1.5, 1.6, rz - 2.9], [0.62, 0.62, 0.04], COL.white);
  B.sign.quad([rx + 1.5, 1.6, rz - 2.9 + 0.025], 0.56, 0.56, 0, uvOf('bike'));
  B.sign.quad([rx + 1.5, 1.6, rz - 2.9 - 0.025], 0.56, 0.56, Math.PI, uvOf('bike'));
  // small roof over the rack
  const r = new Frame(dry, [rx + 0.6, 0, rz], 0);
  for (const dz of [-2.8, 2.8]) r.box([0.9, 1.1, dz], [0.1, 2.2, 0.1], COL.darkMetal);
  r.box([0.3, 2.28, 0], [1.8, 0.07, 5.9], COL.teal, { r: [0, 0, 0.05] });
}

/** Solar panel array on the building roof (visible from the sky and the fly-in). */
function buildRoofSolar(B: Batches) {
  const dry = B.dry;
  for (let r = 0; r < 5; r++) {
    const z = -62.5 + r * 2.6;
    for (let i = 0; i < 4; i++) {
      const x = -14.2 + i * 2.6;
      dry.box([x, 8.05 + 0.75, z], [2.4, 0.05, 1.9], '#2A4A78', { r: [-0.5, 0, 0] });
      dry.box([x, 8.05 + 0.73, z], [2.46, 0.04, 1.96], '#CBD2DA', { r: [-0.5, 0, 0] });
      for (const dx of [-0.9, 0.9]) dry.box([x + dx, 8.05 + 0.4, z - 0.1], [0.05, 0.8, 0.05], COL.darkMetal);
    }
  }
}

export function buildYard(B: Batches) {
  buildRoofSolar(B);
  buildCanopy(B);
  buildStage(B);
  buildFurniture(B);
  buildAssembly(B);
  buildBikes(B);
  void T;
}
