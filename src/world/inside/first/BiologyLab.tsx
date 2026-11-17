/**
 * Biology lab (معمل الأحياء). Local coordinates: x -7..7, z -5..5, floor y 0, ceiling 3.4.
 * Door on the north wall (east end), windows south. Four benches with sinks, glass cabinet of coloured
 * liquids behind Alrashed, goggles/gloves hooks, eyewash, glass bin, skeleton, fish tank and grow-light shelf.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GEO, PAL, mat } from '../../kit';
import { Batch, vcMat } from './batch';
import { AlarmBeacon, BatchMesh, ClockHands, StaticRoom, TileFloor, blob, useRoomFlags, type Kit4 } from './common';
import { FirstDoor, ShellWindows, buildShell, type ShellCfg } from './shell';
import { BIOLOGY_LAB as L, BIO_BENCH, BIO_BENCHES, ROOM_H, bioSink } from './landmarks';
import { acUnit, beaker, pottedPlant, stool, testTube, wallClock, METAL } from './furn';
import { drawBottleLabel, drawCellPoster, drawEyeSign, drawGlassBinSign, drawHookBoardLabel, drawPlantPoster, drawWashHandsPoster } from './draw';

const W = 14;
const D = 10;
const H = ROOM_H;
const BT = BIO_BENCH.h; // bench top height

export const BIOLOGY_LAB_CFG: ShellCfg = {
  id: 'bio',
  W,
  D,
  H,
  door: { wall: 'n', x: L.door[0] },
  plaque: { name: 'معمل الأحياء', num: '١٠٢', color: '#22B573' },
  windows: L.windows.map((w) => ({ wall: 's' as const, at: w.centre[0], y: w.centre[1], w: w.w, h: w.h })),
  style: { low: '#DDEFE3', rail: '#22B573', lowH: 1.0 },
  lights: [-3, 0.5, 3.8].flatMap((z) => [-4.5, 0, 4.5].map((x) => [x, z] as [number, number])),
};

const LIQUIDS = ['#E5484D', '#FF8A3D', '#F5C518', '#22B573', '#2D8CFF', '#8B5CF6', '#FF6FA8'];
const LABELS = ['محلول أ', 'محلول ب', 'محلول ج', 'ماء', 'صبغة', 'محلول د', 'محلول هـ'];

/* ------------------------------------------------------------------ pieces */

function bench(b: Batch, sinkSide: 1 | -1) {
  const { w, d } = BIO_BENCH;
  b.rbox([0, 0.4, 0], [w - 0.1, 0.74, d - 0.1], '#E3C99C', 0.02); // cabinet body
  b.rbox([0, BT - 0.025, 0], [w, 0.05, d], '#33444D', 0.012); // epoxy top
  b.box([0, BT + 0.003, d / 2 - 0.01], [w, 0.012, 0.02], '#22303A'); // front lip
  // door fronts both sides
  for (const side of [1, -1]) {
    for (let i = 0; i < 4; i++) {
      const x = -1.2 + i * 0.8;
      b.rbox([x, 0.4, side * (d / 2 - 0.045)], [0.74, 0.62, 0.016], i % 2 ? '#7CC4FA' : '#9FE3C9', 0.01);
      b.box([x + 0.25, 0.55, side * (d / 2 - 0.032)], [0.03, 0.12, 0.012], '#F8FAFC');
    }
  }
  b.box([0, 0.03, 0], [w - 0.1, 0.06, d - 0.1], '#4A5563'); // plinth
  // sink at the aisle end
  const sx = sinkSide * (w / 2 - 0.45);
  b.rbox([sx, BT + 0.008, 0], [0.62, 0.018, 0.5], '#C9D2DC', 0.008);
  b.rbox([sx, BT + 0.017, 0], [0.5, 0.012, 0.38], '#5E6B78', 0.006);
  b.cyl([sx, BT + 0.024, 0], [0.06, 0.006, 0.06], '#2B2F36');
  // tap: stem at the back, goose-neck over the basin
  b.cyl([sx, BT + 0.17, -0.27], [0.032, 0.34, 0.032], '#B8C1CC');
  b.cyl([sx, BT + 0.33, -0.17], [0.03, 0.2, 0.03], '#B8C1CC', [Math.PI / 2, 0, 0]);
  b.ball([sx, BT + 0.33, -0.27], [0.05, 0.05, 0.05], '#B8C1CC', undefined, true);
  b.cyl([sx - 0.07, BT + 0.07, -0.27], [0.03, 0.04, 0.03], '#2D8CFF', [0, 0, Math.PI / 2], true);
  b.cyl([sx + 0.07, BT + 0.07, -0.27], [0.03, 0.04, 0.03], '#E5484D', [0, 0, Math.PI / 2], true);
}

function microscope(b: Batch) {
  b.rbox([0, 0.016, 0.0], [0.17, 0.032, 0.21], '#F1F4F8', 0.012);
  b.rbox([0, 0.15, -0.075], [0.045, 0.27, 0.05], '#F1F4F8', 0.016);
  b.box([0, 0.1, -0.02], [0.11, 0.014, 0.12], '#2B2F36'); // stage
  b.box([0, 0.108, -0.01], [0.05, 0.004, 0.025], '#BFE3F5'); // slide
  b.cyl([0, 0.27, -0.03], [0.05, 0.16, 0.05], '#2B2F36', [0.45, 0, 0]); // body tube
  b.cyl([0, 0.34, 0.0], [0.03, 0.06, 0.03], '#14B8A6', [0.45, 0, 0]); // eyepiece
  b.cyl([0, 0.2, -0.0], [0.03, 0.05, 0.03], '#8E99A8'); // objective
  b.cyl([0.05, 0.1, -0.08], [0.025, 0.03, 0.025], '#14B8A6', [0, 0, Math.PI / 2], true); // focus knob
  b.cyl([-0.05, 0.1, -0.08], [0.025, 0.03, 0.025], '#14B8A6', [0, 0, Math.PI / 2], true);
}

function rack(b: Batch, cols: string[]) {
  b.rbox([0, 0.012, 0], [0.32, 0.024, 0.1], '#C98F5A', 0.006);
  b.rbox([0, 0.09, 0], [0.32, 0.016, 0.1], '#C98F5A', 0.006);
  b.box([-0.15, 0.05, 0], [0.016, 0.1, 0.09], '#B57B48');
  b.box([0.15, 0.05, 0], [0.016, 0.1, 0.09], '#B57B48');
  cols.forEach((c, i) => b.at([-0.125 + i * 0.05, 0.02, 0], 0, () => testTube(b, c, 0.65, 0.17)));
}

function bottle(b: Batch, color: string, kind: number) {
  if (kind % 2) {
    b.cyl([0, 0.08, 0], [0.07, 0.16, 0.07], color, undefined, true);
    b.cyl([0, 0.18, 0], [0.03, 0.05, 0.03], '#EAF6FB', undefined, true);
    b.cyl([0, 0.215, 0], [0.04, 0.03, 0.04], '#E5484D', undefined, true);
  } else {
    b.ball([0, 0.06, 0], [0.12, 0.12, 0.12], color, undefined, true);
    b.cyl([0, 0.15, 0], [0.04, 0.09, 0.04], '#EAF6FB', undefined, true);
    b.cyl([0, 0.2, 0], [0.045, 0.03, 0.045], '#8E5B34', undefined, true);
  }
}

function skeleton(b: Batch) {
  const I = '#F3EBD8';
  const S = '#E2D7BC';
  // stand: five-star base + pole behind the spine
  for (let i = 0; i < 5; i++) b.box([Math.sin((i / 5) * Math.PI * 2) * 0.22, 0.03, Math.cos((i / 5) * Math.PI * 2) * 0.22 - 0.06], [0.04, 0.03, 0.46], '#4A5563', (i / 5) * Math.PI * 2);
  b.cyl([0, 0.8, -0.07], [0.03, 1.6, 0.03], '#8E99A8');
  // skull + jaw
  b.ball([0, 1.6, 0.0], [0.17, 0.2, 0.19], I);
  b.rbox([0, 1.5, 0.03], [0.11, 0.055, 0.1], I, 0.02);
  b.ball([-0.04, 1.6, 0.082], [0.05, 0.055, 0.03], '#2B2F36', undefined, true);
  b.ball([0.04, 1.6, 0.082], [0.05, 0.055, 0.03], '#2B2F36', undefined, true);
  b.box([0, 1.55, 0.092], [0.015, 0.03, 0.01], '#2B2F36');
  b.box([0, 1.51, 0.083], [0.09, 0.012, 0.01], '#FFFFFF');
  // spine + ribs
  b.cyl([0, 1.2, -0.03], [0.04, 0.55, 0.04], S);
  for (let i = 0; i < 6; i++) b.add('torus', [0, 1.38 - i * 0.055, 0.0], [0.3 - i * 0.012, 0.21 - i * 0.008, 0.045], I, [Math.PI / 2, 0, 0]);
  b.box([0, 1.31, 0.12], [0.035, 0.2, 0.02], S);
  // shoulders, arms (right arm raised in a wave)
  b.box([0, 1.43, 0], [0.4, 0.03, 0.04], I);
  for (const sx of [-1, 1]) {
    b.ball([sx * 0.2, 1.43, 0], [0.06, 0.06, 0.06], I, undefined, true);
    const raise = sx > 0;
    b.at([sx * 0.2, 1.43, 0], 0, () => {
      b.cyl([sx * 0.02, raise ? -0.1 : -0.13, 0.0], [0.03, 0.27, 0.03], I, [0, 0, sx * (raise ? -0.5 : 0.1)], true);
      b.at([sx * (raise ? 0.14 : 0.05), raise ? -0.24 : -0.27, 0], 0, () => {
        b.ball([0, 0, 0], [0.04, 0.04, 0.04], I, undefined, true);
        b.cyl([sx * (raise ? 0.06 : 0.01), raise ? 0.1 : -0.12, 0.02], [0.028, 0.24, 0.028], I, [0, 0, sx * (raise ? 0.3 : 0.05)], true);
        b.box([sx * (raise ? 0.1 : 0.02), raise ? 0.24 : -0.27, 0.02], [0.05, 0.07, 0.02], I);
      });
    });
  }
  // pelvis + legs
  b.rbox([0, 0.92, 0], [0.3, 0.13, 0.15], I, 0.04);
  for (const sx of [-1, 1]) {
    b.cyl([sx * 0.08, 0.66, 0], [0.04, 0.5, 0.04], I, undefined, true);
    b.ball([sx * 0.08, 0.4, 0.01], [0.06, 0.06, 0.06], I, undefined, true);
    b.cyl([sx * 0.08, 0.2, 0], [0.035, 0.4, 0.035], I, undefined, true);
    b.rbox([sx * 0.08, 0.04, 0.04], [0.07, 0.04, 0.16], I, 0.012);
  }
}

function labCoat(b: Batch) {
  b.rbox([0, 0.55, 0.1], [0.34, 0.9, 0.08], '#FFFFFF', 0.04);
  for (const sx of [-1, 1]) b.rbox([sx * 0.21, 0.5, 0.1], [0.08, 0.6, 0.08], '#F1F5F9', 0.03, [0, 0, sx * 0.05]);
  b.box([0, 0.82, 0.145], [0.08, 0.2, 0.01], '#E2E8F0');
  b.box([0, 0.14, 0.145], [0.012, 0.6, 0.006], '#CBD5E1');
  b.rbox([0.1, 0.4, 0.15], [0.09, 0.09, 0.012], '#E2E8F0', 0.01);
  b.box([0, 0.98, 0.04], [0.14, 0.04, 0.03], '#8E99A8');
}

function goggles(b: Batch, strap: string) {
  b.torus([0, 0, 0], 0.17, strap, undefined, 0.55);
  b.rbox([-0.04, -0.05, 0.03], [0.065, 0.05, 0.03], '#2B2F36', 0.012);
  b.rbox([0.04, -0.05, 0.03], [0.065, 0.05, 0.03], '#2B2F36', 0.012);
  b.rbox([-0.04, -0.05, 0.047], [0.05, 0.036, 0.008], '#9DD3EE', 0.008);
  b.rbox([0.04, -0.05, 0.047], [0.05, 0.036, 0.008], '#9DD3EE', 0.008);
}

function glove(b: Batch, color: string) {
  b.rbox([0, -0.05, 0], [0.09, 0.1, 0.02], color, 0.012);
  for (let i = 0; i < 4; i++) b.rbox([-0.033 + i * 0.022, -0.13 - (i === 1 || i === 2 ? 0.01 : 0), 0], [0.018, 0.08, 0.016], color, 0.006);
  b.rbox([0.058, -0.08, 0], [0.018, 0.06, 0.016], color, 0.006, [0, 0, 0.7]);
  b.box([0, 0.02, 0.0], [0.095, 0.03, 0.022], '#FFFFFF');
}

/* ------------------------------------------------------------------ static build */

function buildLab(k: Kit4) {
  const { s, scr } = k;
  buildShell(k, BIOLOGY_LAB_CFG);
  const N = -D / 2;

  // ---- benches with everything on them
  BIO_BENCHES.forEach((p, i) => {
    const sx = Math.sign(p[0]); // +1 east benches, -1 west benches
    s.at([p[0], 0, p[2]], 0, () => bench(s, (-sx) as 1 | -1)); // sink at the aisle end
    blob(k, p[0], p[2], 3.8, 1.8);
    const at = (dx: number, dz: number, y = BT) => [p[0] + sx * dx, y, p[2] + dz] as [number, number, number];
    // microscope (faces the south edge of the bench)
    s.at(at(0.25, -0.25), 0, () => microscope(s));
    if (i === 1) {
      // a leaf next to the hero microscope
      s.ball([p[0] + 0.55, BT + 0.004, p[2] - 0.38], [0.16, 0.012, 0.1], '#3DBE6E', 0.5, true);
      s.box([p[0] + 0.5, BT + 0.003, p[2] - 0.36], [0.1, 0.004, 0.012], '#2E9E56', 0.5);
    }
    // test tube rack
    s.at(at(0.95, -0.15), 0, () => rack(s, ['#E5484D', '#F5C518', '#22B573', '#2D8CFF', '#FF6FA8', '#8B5CF6'].slice(i % 2, (i % 2) + 6)));
    // beakers
    s.at(at(-0.25, 0.25), 0, () => beaker(s, i === 1 ? '#3DDC84' : LIQUIDS[(i * 2) % 7], 0.055, 0.12));
    s.at(at(-0.05, 0.3), 0, () => beaker(s, LIQUIDS[(i * 2 + 3) % 7], 0.04, 0.09, 0.5));
    s.at(at(0.6, 0.3), 0, () => beaker(s, '#EAF6FB', 0.045, 0.1, 0.01));
    // petri dishes + notebook
    s.cyl(at(0.5, 0.0, BT + 0.008), [0.1, 0.014, 0.1], '#DFF3FF');
    s.cyl(at(0.5, 0.0, BT + 0.018), [0.09, 0.006, 0.09], '#F5C518');
    s.rbox(at(-0.75, -0.2, BT + 0.012), [0.2, 0.024, 0.28], i % 2 ? '#2D8CFF' : '#E5484D', 0.01);
    s.box(at(-0.75, -0.2, BT + 0.026), [0.17, 0.004, 0.25], '#FFFFFF');
    // magnifier
    s.torus(at(1.2, 0.3, BT + 0.01), 0.1, '#2B2F36', [Math.PI / 2, 0, 0], 0.5);
    s.box(at(1.2 + 0.12, 0.3 + 0.0, BT + 0.012), [0.12, 0.012, 0.02], '#8E5B34');
    // stools (north side of each bench)
    const sz = p[2] - 0.95;
    [-0.8, 0, 0.8].forEach((dx, j) => {
      s.at([p[0] + dx, 0, sz], 0, () => stool(s, ['#F5C518', '#FF8A3D', '#22B573', '#2D8CFF'][(i + j) % 4], 0.5));
      blob(k, p[0] + dx, sz, 0.55, 0.55);
    });
  });

  // ---- north wall: glass cabinet (bottles + labels), hooks, eyewash, bin, clock, AC
  const cx = L.cabinet[0];
  const cz = N + 0.25;
  s.rbox([cx, 0.36, cz], [3.0, 0.72, 0.5], '#E3C99C', 0.02);
  for (let i = 0; i < 4; i++) {
    s.rbox([cx - 1.125 + i * 0.75, 0.36, N + 0.505], [0.7, 0.62, 0.016], i % 2 ? '#7CC4FA' : '#9FE3C9', 0.01);
    s.box([cx - 1.125 + i * 0.75 + 0.22, 0.46, N + 0.516], [0.03, 0.12, 0.012], '#F8FAFC');
  }
  s.rbox([cx, 0.74, cz], [3.06, 0.05, 0.54], '#33444D', 0.012);
  s.box([cx, 1.46, N + 0.02], [3.0, 1.45, 0.03], '#F4EBDD'); // back panel
  for (const x of [-1.5, 1.5]) s.box([cx + x, 1.46, cz], [0.05, 1.45, 0.5], '#E3C99C');
  s.box([cx, 2.19, cz], [3.05, 0.06, 0.5], '#E3C99C');
  for (const x of [-0.5, 0.5]) s.box([cx + x, 1.46, N + 0.49], [0.03, 1.4, 0.03], '#E3C99C');
  [1.0, 1.4, 1.8].forEach((y, r) => {
    s.box([cx, y, cz], [2.96, 0.025, 0.46], '#CBD5E1');
    for (let c = 0; c < 6; c++) {
      const x = cx - 1.2 + c * 0.48 + (r % 2) * 0.05;
      const idx = (c + r * 2) % 7;
      s.at([x, y + 0.0125, N + 0.27], 0, () => bottle(s, LIQUIDS[idx], c + r));
      const bodyW = (c + r) % 2 ? 0.07 : 0.12;
      s.sticker(`bio-label-${idx}`, [x, y + ((c + r) % 2 ? 0.08 : 0.07), N + 0.27 + bodyW / 2 + 0.003], 0.075, 0.05, (ctx, w, h) => drawBottleLabel(ctx, w, h, LABELS[idx], LIQUIDS[idx]), 0, 900);
    }
  });
  s.rbox([cx, 2.22, cz + 0.0], [3.1, 0.04, 0.54], '#33444D', 0.012);
  blob(k, cx, N + 0.4, 3.4, 0.9);

  // goggles + gloves hook board
  const hb = L.hookBoard;
  s.box([hb[0], hb[1], N + 0.015], [2.4, 1.05, 0.03], '#E9D7B8');
  s.box([hb[0], hb[1], N + 0.032], [2.3, 0.95, 0.006], '#F6E9D0');
  for (let ix = 0; ix < 11; ix++) for (let iy = 0; iy < 4; iy++) s.box([hb[0] - 1.0 + ix * 0.2, hb[1] - 0.35 + iy * 0.22, N + 0.037], [0.014, 0.014, 0.004], '#B79B6F');
  s.sticker('bio-hook-label', [hb[0], 2.15, N + 0.012], 1.3, 0.26, drawHookBoardLabel, 0, 340);
  const straps = ['#E5484D', '#2D8CFF', '#22B573', '#F5C518', '#8B5CF6', '#FF8A3D'];
  L.goggleHooks.forEach((p, i) => {
    s.cyl([p[0], p[1], N + 0.06], [0.014, 0.1, 0.014], '#B8C1CC', [Math.PI / 2, 0, 0], true);
    s.at([p[0], p[1] - 0.09, N + 0.11], 0, () => goggles(s, straps[i]));
  });
  L.gloveHooks.forEach((p, i) => {
    s.cyl([p[0], p[1] + 0.02, N + 0.06], [0.014, 0.1, 0.014], '#B8C1CC', [Math.PI / 2, 0, 0], true);
    s.at([p[0] - 0.05, p[1] - 0.02, N + 0.1], 0, () => glove(s, '#4DA6FF'));
    s.at([p[0] + 0.07, p[1] - 0.02, N + 0.1], 0.0, () => glove(s, i % 2 ? '#4DD6A4' : '#4DA6FF'));
  });
  // lab coats near the skeleton
  for (const x of [-5.3, -4.95]) {
    s.cyl([x, 1.45, N + 0.06], [0.014, 0.1, 0.014], '#B8C1CC', [Math.PI / 2, 0, 0], true);
    s.at([x, 0.7, N + 0.05], 0, () => labCoat(s));
  }

  // eyewash station
  const ew = L.eyewash;
  s.cyl([ew[0], 1.45, N + 0.05], [0.05, 0.9, 0.05], '#1FBE63');
  s.box([ew[0], ew[1] - 0.04, N + 0.06], [0.12, 0.1, 0.1], '#1FBE63');
  s.cyl([ew[0], ew[1], N + 0.19], [0.36, 0.1, 0.36], '#F7C531');
  s.cyl([ew[0], ew[1] + 0.052, N + 0.19], [0.3, 0.012, 0.3], '#5E6B78');
  for (const dx of [-0.08, 0.08]) {
    s.cyl([ew[0] + dx, ew[1] + 0.1, N + 0.27], [0.03, 0.08, 0.03], '#FFFFFF');
    s.cyl([ew[0] + dx, ew[1] + 0.045, N + 0.27], [0.012, 0.04, 0.012], '#B8C1CC');
  }
  s.cyl([ew[0], ew[1] - 0.08, N + 0.31], [0.1, 0.014, 0.1], '#22B573', [Math.PI / 2, 0, 0]);
  s.box([ew[0], ew[1] - 0.08, N + 0.25], [0.02, 0.02, 0.1], '#8E99A8');
  s.sticker('bio-eye', [ew[0], 1.78, N + 0.012], 0.4, 0.4, drawEyeSign, 0, 320);

  // broken-glass bin + brush & dustpan
  const gb = L.glassBin;
  s.rbox([gb[0], 0.28, gb[2]], [0.42, 0.56, 0.36], '#F7C531', 0.04);
  s.rbox([gb[0], 0.58, gb[2]], [0.45, 0.04, 0.39], '#E0A800', 0.015);
  s.box([gb[0], 0.605, gb[2] + 0.05], [0.28, 0.012, 0.05], '#2B2F36');
  s.sticker('bio-glassbin', [gb[0], 0.28, gb[2] + 0.186], 0.3, 0.3, drawGlassBinSign, 0, 340);
  blob(k, gb[0], gb[2], 0.7, 0.6);
  const bp = L.brushAndPan;
  s.box([bp[0] - 0.12, bp[1] + 0.56, N + 0.04], [0.016, 0.016, 0.05], '#8E99A8');
  s.cyl([bp[0] - 0.12, bp[1] + 0.2, N + 0.06], [0.022, 0.7, 0.022], '#C98F5A');
  s.rbox([bp[0] - 0.12, bp[1] - 0.2, N + 0.07], [0.11, 0.1, 0.05], '#F5C518', 0.01);
  for (let i = 0; i < 6; i++) s.box([bp[0] - 0.15 + i * 0.012, bp[1] - 0.28, N + 0.07], [0.008, 0.06, 0.04], '#2B2F36');
  s.box([bp[0] + 0.1, bp[1] + 0.56, N + 0.04], [0.016, 0.016, 0.05], '#8E99A8');
  s.rbox([bp[0] + 0.1, bp[1] - 0.05, N + 0.07], [0.22, 0.34, 0.02], '#E5484D', 0.01);
  s.box([bp[0] + 0.1, bp[1] + 0.2, N + 0.065], [0.03, 0.4, 0.015], '#E5484D');
  s.rbox([bp[0] + 0.1, bp[1] - 0.22, N + 0.09], [0.22, 0.03, 0.06], '#E5484D', 0.01);

  s.at([L.clock[0], L.clock[1], N], 0, () => wallClock(s, 0.46));
  // first-aid box by the door
  s.at([4.7, 1.45, N], 0, () => {
    s.rbox([0, 0, 0.05], [0.3, 0.24, 0.1], '#FFFFFF', 0.02);
    s.box([0, 0, 0.102], [0.18, 0.05, 0.004], '#1FAE5B');
    s.box([0, 0, 0.103], [0.05, 0.18, 0.004], '#1FAE5B');
  });

  // ---- skeleton in the north-west corner
  s.at([L.skeleton[0], 0, L.skeleton[2]], 0.15, () => skeleton(s));
  blob(k, L.skeleton[0], L.skeleton[2], 0.9, 0.9);

  // ---- west wall: fish tank stand, posters
  const ft = L.fishTank;
  s.rbox([ft[0], 0.4, ft[2]], [0.62, 0.8, 1.2], '#E9EDF2', 0.03);
  for (let i = 0; i < 2; i++) s.rbox([ft[0] + 0.316, 0.4, ft[2] - 0.3 + i * 0.6], [0.012, 0.64, 0.5], '#7CC4FA', 0.01);
  s.rbox([ft[0], 0.805, ft[2]], [0.66, 0.025, 1.24], '#33444D', 0.01);
  // tank frame (corner posts + rims), gravel, plants and rocks
  const tx0 = ft[0] - 0.27;
  const tx1 = ft[0] + 0.27;
  const tz0 = ft[2] - 0.54;
  const tz1 = ft[2] + 0.54;
  for (const x of [tx0, tx1])
    for (const z of [tz0, tz1]) s.box([x, 1.03, z], [0.03, 0.45, 0.03], '#1E2228');
  for (const y of [0.83, 1.26]) {
    s.box([ft[0], y, tz0], [0.57, 0.025, 0.03], '#1E2228');
    s.box([ft[0], y, tz1], [0.57, 0.025, 0.03], '#1E2228');
    s.box([tx0, y, ft[2]], [0.03, 0.025, 1.09], '#1E2228');
    s.box([tx1, y, ft[2]], [0.03, 0.025, 1.09], '#1E2228');
  }
  s.box([ft[0], 0.86, ft[2]], [0.5, 0.05, 1.03], '#E4CB9B');
  for (let i = 0; i < 14; i++) s.ball([ft[0] - 0.2 + ((i * 37) % 40) / 100, 0.89, ft[2] - 0.45 + (i * 0.07)], [0.04, 0.025, 0.04], ['#E5484D', '#2D8CFF', '#F5C518', '#FFFFFF'][i % 4], undefined, true);
  s.ball([ft[0] - 0.05, 0.93, ft[2] - 0.1], [0.22, 0.14, 0.2], '#8E99A8', undefined, true);
  s.ball([ft[0] + 0.1, 0.92, ft[2] + 0.28], [0.16, 0.1, 0.14], '#A4ADB8', undefined, true);
  for (let i = 0; i < 5; i++) {
    const z = ft[2] - 0.4 + i * 0.2;
    const h = 0.18 + (i % 3) * 0.07;
    s.cone([ft[0] + 0.19, 0.88 + h / 2, z], [0.05, h, 0.05], i % 2 ? '#3DBE6E' : '#22A35A');
    s.cone([ft[0] + 0.21, 0.88 + h / 3, z + 0.04], [0.05, h * 0.7, 0.05], '#4CB25E');
  }
  s.rbox([ft[0] + 0.16, 0.93, ft[2] + 0.1], [0.12, 0.07, 0.1], '#8E5B34', 0.01); // treasure chest
  s.box([ft[0] + 0.16, 0.975, ft[2] + 0.1], [0.12, 0.02, 0.1], '#C9A227');
  // lid + light bar (self-lit)
  s.rbox([ft[0], 1.285, ft[2]], [0.58, 0.03, 1.1], '#2B2F36', 0.01);
  scr.box([ft[0], 1.265, ft[2]], [0.4, 0.012, 0.9], '#E8F6FF');
  blob(k, ft[0], ft[2], 0.9, 1.5);
  s.sticker('bio-plant-poster', [-W / 2 + 0.012, 1.75, -3.0], 0.62, 0.78, drawPlantPoster, Math.PI / 2, 300);
  s.sticker('bio-cell-poster', [-W / 2 + 0.012, 1.75, -0.5], 0.62, 0.78, drawCellPoster, Math.PI / 2, 300);
  s.at([-W / 2, L.acUnit[1], L.acUnit[2]], Math.PI / 2, () => acUnit(s));

  // ---- east wall: plant shelf with grow light, posters
  const pl = L.plants;
  s.rbox([W / 2 - 0.25, 0.4, pl[2]], [0.5, 0.8, 1.8], '#E3C99C', 0.02);
  for (let i = 0; i < 3; i++) s.rbox([W / 2 - 0.5 + 0.0, 0.4, pl[2] - 0.6 + i * 0.6], [0.012, 0.62, 0.52], i % 2 ? '#7CC4FA' : '#9FE3C9', 0.01);
  s.rbox([W / 2 - 0.27, 0.805, pl[2]], [0.54, 0.03, 1.84], '#C98F5A', 0.012);
  s.box([W / 2 - 0.02, 1.3, pl[2]], [0.03, 1.0, 1.8], '#F4EBDD');
  for (const z of [-0.88, 0.88]) s.box([W / 2 - 0.27, 1.3, pl[2] + z], [0.5, 1.0, 0.04], '#C98F5A');
  s.rbox([W / 2 - 0.27, 1.3, pl[2]], [0.5, 0.03, 1.8], '#C98F5A', 0.01);
  const pots = ['#E07A3F', '#F0476B', '#2D8CFF', '#F5C518', '#8B5CF6'];
  for (let tier = 0; tier < 2; tier++) {
    const y = tier ? 1.315 : 0.82;
    for (let i = 0; i < 5; i++) {
      const z = pl[2] - 0.7 + i * 0.35;
      const x = W / 2 - 0.28;
      s.cyl([x, y + 0.06, z], [0.14, 0.12, 0.14], pots[(i + tier) % 5]);
      s.cyl([x, y + 0.115, z], [0.12, 0.01, 0.12], '#4A3320');
      const kind = (i + tier) % 3;
      if (kind === 0) {
        s.cyl([x, y + 0.2, z], [0.012, 0.16, 0.012], '#3DBE6E');
        s.ball([x - 0.03, y + 0.27, z], [0.08, 0.04, 0.05], '#4CB25E', 0.3, true);
        s.ball([x + 0.03, y + 0.29, z], [0.08, 0.04, 0.05], '#4CB25E', -0.3, true);
      } else if (kind === 1) {
        s.ball([x, y + 0.2, z], [0.16, 0.16, 0.16], '#3E9B4F', undefined, true);
        s.ball([x, y + 0.29, z], [0.06, 0.06, 0.06], '#F0476B', undefined, true);
      } else {
        s.cyl([x, y + 0.2, z], [0.07, 0.17, 0.07], '#4CB25E', undefined, true);
        s.cyl([x + 0.05, y + 0.22, z], [0.03, 0.09, 0.03], '#4CB25E', [0, 0, -0.9], true);
      }
    }
  }
  // grow light bar (magenta, self-lit) hung from the shelf
  for (const z of [-0.7, 0.7]) s.cyl([W / 2 - 0.27, 1.72, pl[2] + z], [0.008, 0.16, 0.008], '#8E99A8');
  s.rbox([W / 2 - 0.27, 1.62, pl[2]], [0.16, 0.05, 1.5], '#F1F4F8', 0.02);
  scr.box([W / 2 - 0.27, 1.59, pl[2]], [0.12, 0.012, 1.4], '#FF5CD6');
  blob(k, W / 2 - 0.3, pl[2], 0.8, 2.0);
  s.sticker('bio-plant-poster', [W / 2 - 0.012, 1.75, -2.2], 0.62, 0.78, drawPlantPoster, -Math.PI / 2, 300);
  s.sticker('bio-wash-poster', [W / 2 - 0.012, 1.75, -3.5], 0.55, 0.69, drawWashHandsPoster, -Math.PI / 2, 300);
  s.sticker('bio-cell-poster', [W / 2 - 0.012, 1.75, -0.85], 0.62, 0.78, drawCellPoster, -Math.PI / 2, 300);

  // ---- south wall: storage cupboard + plant in the corner
  s.at([-6.3, 0, 4.55], 0, () => pottedPlant(s, 1.3, '#22B573'));
  blob(k, -6.3, 4.55, 0.8, 0.8);
  s.rbox([0, 0.45, D / 2 - 0.25], [2.2, 0.9, 0.45], '#E3C99C', 0.02);
  s.rbox([0, 0.92, D / 2 - 0.25], [2.28, 0.04, 0.5], '#33444D', 0.012);
  for (let i = 0; i < 4; i++) s.rbox([-0.825 + i * 0.55, 0.45, D / 2 - 0.47], [0.5, 0.8, 0.016], i % 2 ? '#7CC4FA' : '#9FE3C9', 0.01);
  blob(k, 0, D / 2 - 0.3, 2.6, 0.8);
}

/* ------------------------------------------------------------------ dynamic bits */

const glassMat = new THREE.MeshStandardMaterial({ color: '#CFEFFF', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false });
const waterMat = new THREE.MeshStandardMaterial({ color: '#7FD0F0', transparent: true, opacity: 0.32, roughness: 0.1, depthWrite: false });

/** Fish geometry (body + tail + eye), coloured per kind, nose toward +Z. */
const fishCache = new Map<string, THREE.BufferGeometry>();
function fishGeo(c: string, c2: string) {
  const key = c + c2;
  let g = fishCache.get(key);
  if (!g) {
    const b = new Batch();
    b.ball([0, 0, 0], [0.07, 0.1, 0.16], c);
    b.cone([0, 0, -0.11], [0.07, 0.08, 0.05], c2, [Math.PI / 2, 0, 0]);
    b.box([0, 0.06, -0.01], [0.012, 0.06, 0.08], c2);
    b.ball([0.032, 0.015, 0.05], [0.025, 0.025, 0.025], '#FFFFFF', undefined, true);
    b.ball([0.04, 0.015, 0.055], [0.012, 0.012, 0.012], '#1E2A3B', undefined, true);
    b.ball([-0.032, 0.015, 0.05], [0.025, 0.025, 0.025], '#FFFFFF', undefined, true);
    b.ball([-0.04, 0.015, 0.055], [0.012, 0.012, 0.012], '#1E2A3B', undefined, true);
    g = b.build();
    fishCache.set(key, g);
  }
  return g;
}

/** Fish swimming and bubbles rising, glass + water panes. */
function FishTank() {
  const ft = L.fishTank;
  const fish = useRef<(THREE.Mesh | null)[]>([]);
  const bub = useRef<(THREE.Mesh | null)[]>([]);
  const FISH = useMemo(
    () => [
      { g: fishGeo('#FF8A3D', '#FFC27A'), y: 1.0, ph: 0, sp: 0.5, ex: 0.4 },
      { g: fishGeo('#F5C518', '#FFE680'), y: 1.1, ph: 2, sp: 0.35, ex: 0.4 },
      { g: fishGeo('#2D8CFF', '#7CC4FA'), y: 0.96, ph: 4, sp: 0.6, ex: 0.4 },
      { g: fishGeo('#FF6FA8', '#FFB3D1'), y: 1.15, ph: 1, sp: 0.42, ex: 0.4 },
    ],
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    FISH.forEach((f, i) => {
      const m = fish.current[i];
      if (!m) return;
      const a = t * f.sp + f.ph;
      m.position.set(ft[0] + Math.sin(a * 1.3) * 0.12, f.y + Math.sin(a * 2.1) * 0.03, ft[2] + Math.sin(a) * 0.42);
      m.rotation.y = Math.cos(a) > 0 ? 0 : Math.PI;
      m.rotation.y += Math.cos(a * 1.3) * 0.15;
    });
    bub.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * 0.25 + i * 0.17) % 1;
      m.position.set(ft[0] - 0.12 + Math.sin(p * 12 + i) * 0.01, 0.9 + p * 0.32, ft[2] - 0.3 + (i % 2) * 0.02);
      const sc = 0.012 + (i % 3) * 0.004;
      m.scale.set(sc, sc, sc);
    });
  });
  return (
    <group>
      {FISH.map((f, i) => (
        <mesh key={i} ref={(m) => {
            fish.current[i] = m;
          }} geometry={f.g} material={vcMat(0.4)} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} ref={(m) => {
            bub.current[i] = m;
          }} geometry={GEO.sphere} material={waterMat} />
      ))}
      <mesh position={[ft[0], 1.04, ft[2]]} scale={[0.52, 0.42, 1.04]} geometry={GEO.box} material={waterMat} renderOrder={2} />
      <mesh position={[ft[0] + 0.275, 1.04, ft[2]]} rotation={[0, Math.PI / 2, 0]} scale={[1.08, 0.46, 1]} geometry={GEO.plane} material={glassMat} renderOrder={3} />
      <mesh position={[ft[0] - 0.275, 1.04, ft[2]]} rotation={[0, -Math.PI / 2, 0]} scale={[1.08, 0.46, 1]} geometry={GEO.plane} material={glassMat} renderOrder={3} />
      <mesh position={[ft[0], 1.04, ft[2] + 0.545]} scale={[0.55, 0.46, 1]} geometry={GEO.plane} material={glassMat} renderOrder={3} />
      <mesh position={[ft[0], 1.04, ft[2] - 0.545]} rotation={[0, Math.PI, 0]} scale={[0.55, 0.46, 1]} geometry={GEO.plane} material={glassMat} renderOrder={3} />
    </group>
  );
}

/** Glass doors of the liquid cabinet. */
function CabinetGlass() {
  return (
    <group>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[L.cabinet[0] + x, 1.46, -D / 2 + 0.515]} scale={[1.44, 1.4, 1]} geometry={GEO.plane} material={glassMat} renderOrder={3} />
      ))}
    </group>
  );
}

/** Flag glass: 'broken' shows shards + a green puddle at L.breakSpot; 'swept' / unset hides them. */
function BrokenGlass() {
  const { flags } = useRoomFlags();
  if (flags.glass !== 'broken') return null;
  const p = L.breakSpot;
  return (
    <group position={[p[0], 0, p[2]]}>
      <BatchMesh
        deps={[]}
        build={(b) => {
          b.cyl([0, 0.003, 0], [0.34, 0.004, 0.3], '#3DDC84');
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2;
            const r = 0.08 + (i % 3) * 0.05;
            b.box([Math.cos(a) * r, 0.012, Math.sin(a) * r], [0.06 - (i % 3) * 0.01, 0.006, 0.025], i % 2 ? '#CFEFFF' : '#9DD3EE', [0, a * 2, 0.1]);
          }
          b.cyl([0.18, 0.012, 0.06], [0.026, 0.14, 0.026], '#CFEFFF', [0, 0, Math.PI / 2 - 0.1], true);
        }}
      />
    </group>
  );
}

/** Tap water stream at the hero sink while flag `water` is on. */
function WaterStream() {
  const { flags } = useRoomFlags();
  const on = flags.water === true || flags.water === 'on' || flags.water === 'true';
  const ref = useRef<THREE.Mesh>(null);
  const s = bioSink(1);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.x = ref.current.scale.z = 0.016 + Math.sin(clock.elapsedTime * 30) * 0.003;
  });
  if (!on) return null;
  return <mesh ref={ref} position={[s[0], s[1] + 0.2, s[2] - 0.17]} scale={[0.016, 0.22, 0.016]} geometry={GEO.cyl} material={waterMat} />;
}

export function BiologyLab() {
  return (
    <group>
      <TileFloor w={W + 0.4} d={D + 0.4} tile={0.6} base="#E6ECE4" lineColor="#D0D9CE" />
      <StaticRoom id="biology_lab" build={buildLab} />
      <FirstDoor cfg={BIOLOGY_LAB_CFG} />
      <ShellWindows cfg={BIOLOGY_LAB_CFG} />
      <ClockHands p={[L.clock[0], L.clock[1], L.clock[2] + 0.045]} d={0.42} />
      <AlarmBeacon p={[4.3, 2.4, -D / 2]} />
      <FishTank />
      <CabinetGlass />
      <BrokenGlass />
      <WaterStream />
    </group>
  );
}

void PAL;
void mat;
void METAL;
