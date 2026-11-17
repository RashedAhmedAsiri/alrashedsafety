/**
 * Art room (غرفة الفنون). Local coordinates: x -6..6, z -5..5, floor y 0, ceiling 3.4.
 * Door on the north wall (east end), windows south. Big shared table in the middle (sharp_tools),
 * side tables, easels and a drying rack along the north wall, sink on the east wall.
 * Flag `stars: true` hangs the paper stars on a string above the hero table.
 */
import { Batch } from './batch';
import { AlarmBeacon, BatchMesh, CeilingFan, ClockHands, StaticRoom, TileFloor, blob, useRoomFlags, type Kit4 } from './common';
import { FirstDoor, ShellWindows, buildShell, type ShellCfg } from './shell';
import { ART_ROOM as L, ART_TABLE_H as TH, ROOM_H } from './landmarks';
import { acUnit, pottedPlant, roundScissors, starGeo, stool, wallClock } from './furn';
import { drawColorWheel, drawPainting, drawScissorsRule, drawSplat } from './draw';

const W = 12;
const D = 10;
const H = ROOM_H;
const N = -D / 2;
const PAINT = ['#E5484D', '#FF8A3D', '#F5C518', '#22B573', '#2D8CFF', '#8B5CF6', '#FF6FA8', '#14B8A6'];
const TOP = '#F2DDB4';

export const ART_ROOM_CFG: ShellCfg = {
  id: 'art',
  W,
  D,
  H,
  door: { wall: 'n', x: L.door[0] },
  plaque: { name: 'غرفة الفنون', num: '١٠٣', color: '#FF8A3D' },
  windows: L.windows.map((w) => ({ wall: 's' as const, at: w.centre[0], y: w.centre[1], w: w.w, h: w.h })),
  style: { low: '#FDE9D6', rail: '#FF8A3D', lowH: 1.0 },
  lights: [-3, 0, 3].flatMap((x) => [-3, 1, 3.8].map((z) => [x, z] as [number, number])),
};

/* ------------------------------------------------------------------ pieces */

function table(b: Batch, w: number, d: number) {
  b.rbox([0, TH - 0.02, 0], [w, 0.04, d], TOP, 0.015);
  b.box([0, TH - 0.045, 0], [w - 0.04, 0.012, d - 0.04], '#14B8A6');
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      b.rbox([sx * (w / 2 - 0.1), TH / 2 - 0.02, sz * (d / 2 - 0.1)], [0.06, TH - 0.04, 0.06], '#8E99A8', 0.01);
      b.cyl([sx * (w / 2 - 0.1), 0.01, sz * (d / 2 - 0.1)], [0.08, 0.02, 0.08], '#3A3F47', undefined, true);
    }
  b.box([0, 0.2, 0], [w - 0.2, 0.03, 0.04], '#8E99A8');
}

function paintPot(b: Batch, color: string) {
  b.cyl([0, 0.025, 0], [0.065, 0.05, 0.065], '#FFFFFF');
  b.cyl([0, 0.052, 0], [0.056, 0.008, 0.056], color);
  b.cyl([0, 0.028, 0], [0.067, 0.012, 0.067], color);
}

function brushJar(b: Batch, color: string) {
  b.cyl([0, 0.06, 0], [0.09, 0.12, 0.09], color);
  b.cyl([0, 0.121, 0], [0.075, 0.004, 0.075], '#4A3320');
  const cols = ['#E5484D', '#2D8CFF', '#F5C518', '#22B573', '#8B5CF6', '#FF8A3D'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tilt = 0.18;
    const px = Math.sin(a) * 0.02;
    const pz = Math.cos(a) * 0.02;
    b.cyl([px + Math.sin(a) * 0.03, 0.2, pz + Math.cos(a) * 0.03], [0.011, 0.22, 0.011], cols[i], [Math.cos(a) * tilt, 0, -Math.sin(a) * tilt], true);
    b.cyl([px + Math.sin(a) * 0.06, 0.33, pz + Math.cos(a) * 0.06], [0.015, 0.045, 0.015], '#2B2F36', [Math.cos(a) * tilt, 0, -Math.sin(a) * tilt], true);
  }
}

function glueBottle(b: Batch, cap: string) {
  b.rbox([0, 0.055, 0], [0.05, 0.11, 0.035], '#FFFFFF', 0.012);
  b.cyl([0, 0.12, 0], [0.02, 0.03, 0.02], cap, undefined, true);
  b.box([0, 0.06, 0.0185], [0.04, 0.04, 0.002], cap);
}

function paperStack(b: Batch, cols: string[], w = 0.3, d = 0.22) {
  cols.forEach((c, i) => b.box([((i * 7) % 5) * 0.004 - 0.008, 0.006 + i * 0.012, (i % 2) * 0.004], [w - (i % 3) * 0.01, 0.01, d], c, ((i * 3) % 5) * 0.03 - 0.06));
}

function toolTray(b: Batch) {
  b.rbox([0, 0.015, 0], [0.4, 0.03, 0.26], '#E5484D', 0.01);
  b.box([0, 0.034, 0], [0.36, 0.008, 0.22], '#C73A3A');
  b.box([0, 0.06, -0.125], [0.4, 0.06, 0.012], '#E5484D');
  b.box([0, 0.06, 0.125], [0.4, 0.06, 0.012], '#E5484D');
  b.box([-0.195, 0.06, 0], [0.012, 0.06, 0.26], '#E5484D');
  b.box([0.195, 0.06, 0], [0.012, 0.06, 0.26], '#E5484D');
  b.at([-0.1, 0.04, 0.0], 0.2, () => roundScissors(b, '#2D8CFF'));
  b.at([0.0, 0.04, 0.03], -0.15, () => roundScissors(b, '#22B573'));
  b.at([0.1, 0.04, -0.02], 0.05, () => roundScissors(b, '#F5C518'));
  b.cyl([-0.14, 0.05, 0.09], [0.012, 0.14, 0.012], '#F5C518', [0, 1.2, Math.PI / 2], true);
  b.cyl([0.14, 0.05, 0.09], [0.026, 0.1, 0.026], '#8B5CF6', [0, 0.5, Math.PI / 2], true);
  b.box([0.12, 0.04, 0.09], [0.2, 0.006, 0.03], '#FFFFFF', 0.3);
}

function easel(b: Batch, kind: number) {
  b.box([-0.3, 0.8, 0.03], [0.035, 1.6, 0.035], '#C98F5A');
  b.box([0.3, 0.8, 0.03], [0.035, 1.6, 0.035], '#C98F5A');
  b.box([0, 1.58, 0.02], [0.68, 0.04, 0.05], '#B57B48');
  b.box([0, 0.68, 0.07], [0.7, 0.03, 0.12], '#B57B48');
  b.cyl([0, 0.8, -0.27], [0.035, 1.72, 0.035], '#B57B48', [0.28, 0, 0]);
  b.box([0, 0.4, -0.02], [0.6, 0.025, 0.03], '#B57B48');
  b.rbox([0, 1.1, 0.06], [0.64, 0.84, 0.025], '#FFFFFF', 0.006);
  b.sticker(`art-painting-${kind}`, [0, 1.1, 0.0735], 0.58, 0.78, (ctx, w, h) => drawPainting(ctx, w, h, kind), 0, 260);
  // paint tubes on the ledge
  ['#E5484D', '#2D8CFF', '#F5C518'].forEach((c, i) => b.cyl([-0.2 + i * 0.07, 0.7, 0.1], [0.022, 0.1, 0.022], c, [0, 0, Math.PI / 2], true));
}

function dryingRack(b: Batch) {
  // width 1.4 along x, depth 0.5 along z, back at -z, front toward +Z
  const w = 1.4;
  const d = 0.5;
  for (const sx of [-1, 1]) {
    b.box([sx * (w / 2 - 0.02), 0.78, 0], [0.04, 1.56, d], '#8E99A8');
    b.cyl([sx * (w / 2 - 0.02), 0.03, 0.0], [0.08, 0.06, 0.08], '#3A3F47', undefined, true);
  }
  b.box([0, 0.78, -d / 2 + 0.01], [w, 1.56, 0.02], '#E9D7B8');
  [0.35, 0.65, 0.95, 1.25, 1.55].forEach((y, i) => {
    b.box([0, y, 0], [w - 0.04, 0.02, d - 0.02], '#C9D2DC');
    // wet painting lying on the shelf, drawn as a coloured sheet with a painted look
    b.box([-0.2, y + 0.012, 0.02], [0.5, 0.004, 0.36], ['#FFE680', '#BFE9FF', '#FDE8F3', '#E7F8EC', '#FFF1D6'][i % 5], 0.06 * (i - 2));
    b.box([0.3, y + 0.012, 0.0], [0.5, 0.004, 0.36], ['#DFF3FF', '#FFF2C7', '#E6F7F3', '#FDE8E8', '#F3E8FF'][i % 5], -0.05 * (i - 2));
    b.ball([-0.25 + i * 0.07, y + 0.016, 0.0], [0.12, 0.004, 0.09], PAINT[i % 8], undefined, true);
    b.ball([0.3, y + 0.016, 0.0], [0.1, 0.004, 0.14], PAINT[(i + 3) % 8], undefined, true);
  });
  b.box([0, 1.6, 0.0], [w + 0.04, 0.03, d + 0.02], '#14B8A6');
}

function apron(b: Batch, color: string) {
  b.rbox([0, -0.3, 0.04], [0.34, 0.6, 0.03], color, 0.03);
  b.rbox([0, -0.04, 0.035], [0.18, 0.1, 0.03], color, 0.02);
  b.rbox([0, -0.4, 0.062], [0.2, 0.14, 0.015], '#FFFFFF', 0.012);
  b.box([-0.1, 0.0, 0.03], [0.02, 0.14, 0.012], color);
  b.box([0.1, 0.0, 0.03], [0.02, 0.14, 0.012], color);
}

function sinkCounter(b: Batch) {
  // east wall counter, local: back toward +x wall; faces -x. Size 0.8 deep x 1.6 long, top 0.86
  b.rbox([0, 0.42, 0], [0.8, 0.84, 1.6], '#E9EDF2', 0.02);
  b.rbox([0, 0.855, 0], [0.84, 0.04, 1.64], '#33444D', 0.012);
  for (let i = 0; i < 3; i++) b.rbox([-0.405, 0.42, -0.5 + i * 0.5], [0.012, 0.7, 0.46], i % 2 ? '#7CC4FA' : '#9FE3C9', 0.01);
  b.rbox([0, 0.88, 0], [0.55, 0.016, 0.6], '#C9D2DC', 0.01);
  b.rbox([0, 0.886, 0], [0.45, 0.014, 0.5], '#5E6B78', 0.008);
  b.cyl([0, 0.892, 0], [0.06, 0.006, 0.06], '#2B2F36');
  // tap at the wall side
  b.cyl([0.3, 1.05, 0], [0.035, 0.38, 0.035], '#B8C1CC');
  b.cyl([0.18, 1.22, 0], [0.032, 0.26, 0.032], '#B8C1CC', [0, 0, Math.PI / 2]);
  b.cyl([0.3, 0.97, 0.1], [0.03, 0.04, 0.03], '#2D8CFF', [Math.PI / 2, 0, 0], true);
  b.cyl([0.3, 0.97, -0.1], [0.03, 0.04, 0.03], '#E5484D', [Math.PI / 2, 0, 0], true);
  // soap + sponge + brush-washing jar
  b.rbox([0.33, 0.93, 0.5], [0.07, 0.14, 0.07], '#22B573', 0.02);
  b.box([0.33, 1.02, 0.5], [0.03, 0.02, 0.04], '#FFFFFF');
  b.rbox([0.2, 0.89, -0.55], [0.1, 0.04, 0.07], '#F5C518', 0.012);
  b.cyl([0.0, 0.93, 0.62], [0.1, 0.1, 0.1], '#DFF3FF');
  b.cyl([0.0, 0.915, 0.62], [0.09, 0.07, 0.09], '#7FD0F0');
  // splash-back tiles
  b.box([0.39, 1.25, 0], [0.02, 0.8, 1.64], '#DFF3FF');
  for (let i = 0; i < 8; i++) b.box([0.38, 1.25, -0.72 + i * 0.205], [0.004, 0.78, 0.01], '#C3E3F7');
}

function suppliesShelf(b: Batch) {
  // back at x=0 facing +Z locally (rotated onto the west wall): width 2.0, depth 0.5, height 1.6
  const w = 2.0;
  b.rbox([0, 0.8, 0.25], [w, 1.6, 0.5], '#F4EBDD', 0.02);
  b.box([0, 0.8, 0.45], [w - 0.08, 1.5, 0.1], '#E9DFCB');
  [0.06, 0.5, 0.92, 1.34].forEach((y, t) => {
    b.box([0, y, 0.27], [w - 0.06, 0.03, 0.44], '#D9C9AB');
    if (t === 0) {
      // paper rolls
      PAINT.slice(0, 6).forEach((c, i) => b.cyl([-0.75 + i * 0.3, y + 0.11, 0.26], [0.16, 0.2, 0.16], c));
    } else if (t === 1) {
      // reams of coloured paper
      ['#FFE680', '#FFB3D1', '#BFE9FF', '#C8F2D2', '#FFC27A'].forEach((c, i) => b.box([-0.72 + i * 0.36, y + 0.07, 0.26], [0.3, 0.12, 0.38], c));
      b.box([0.0, y + 0.015, 0.26], [0.01, 0.01, 0.01], '#FFFFFF');
    } else if (t === 2) {
      // paint bottles
      PAINT.forEach((c, i) => {
        b.rbox([-0.84 + i * 0.24, y + 0.09, 0.28], [0.1, 0.17, 0.08], c, 0.03);
        b.cyl([-0.84 + i * 0.24, y + 0.2, 0.28], [0.04, 0.05, 0.04], '#FFFFFF');
      });
    } else {
      // baskets + jars
      for (let i = 0; i < 4; i++) {
        b.rbox([-0.7 + i * 0.45, y + 0.08, 0.27], [0.34, 0.14, 0.34], ['#C98F5A', '#E07A3F'][i % 2], 0.03);
      }
      b.at([0.2, y + 0.18, 0.27], 0, () => brushJar(b, '#14B8A6'));
    }
  });
}

/* ------------------------------------------------------------------ static build */

function buildArt(k: Kit4) {
  const { s } = k;
  buildShell(k, ART_ROOM_CFG);

  // ---- hero table with everything on it
  const ht = L.heroTable;
  s.at([ht.centre[0], 0, ht.centre[2]], 0, () => table(s, ht.w, ht.d));
  blob(k, ht.centre[0], ht.centre[2], 3.6, 2.3);
  // table stains
  const stain = (id: string, x: number, z: number, c: string, sd: number, sz = 0.22) => s.sticker(id, [x, TH + 0.001, z], sz, sz, (ctx, w, h) => drawSplat(ctx, w, h, c, sd), [-Math.PI / 2, 0, 0], 300);
  stain('art-stain-a', -1.0, 0.0, '#E5484D', 3);
  stain('art-stain-b', 1.05, -0.8, '#2D8CFF', 5, 0.26);
  stain('art-stain-c', 0.1, 0.02, '#F5C518', 9, 0.2);
  stain('art-stain-d', -1.15, -0.7, '#22B573', 13, 0.2);
  // paper in front of S1
  const sp = L.s1Paper;
  s.box([sp[0], TH + 0.003, sp[2]], [0.3, 0.005, 0.22], '#FFFFFF', 0.1);
  s.box([sp[0] + 0.04, TH + 0.007, sp[2] + 0.02], [0.2, 0.004, 0.14], '#F5C518', 0.1);
  s.cyl([sp[0] - 0.22, TH + 0.01, sp[2] - 0.02], [0.012, 0.15, 0.012], '#F5C518', [0, 0.4, Math.PI / 2], true);
  // tool box of round-tip scissors
  const tb = L.toolBox;
  s.at([tb[0], TH, tb[2]], 0.1, () => toolTray(s));
  // paint pots on a tray, brush jars, glue, coloured paper
  s.rbox([-0.45, TH + 0.01, -0.1], [0.8, 0.02, 0.22], '#FFFFFF', 0.01);
  PAINT.forEach((c, i) => s.at([-0.78 + i * 0.1, TH + 0.02, -0.1], 0, () => paintPot(s, c)));
  s.at([0.95, TH, -0.15], 0, () => brushJar(s, '#2D8CFF'));
  s.at([-1.15, TH, -0.75], 0, () => brushJar(s, '#F0476B'));
  s.at([1.1, TH, -0.35], 0.2, () => glueBottle(s, '#FF8A3D'));
  s.at([1.2, TH, -0.45], -0.3, () => glueBottle(s, '#22B573'));
  s.at([0.55, TH, -0.15], 0.1, () => paperStack(s, ['#FFE680', '#FFB3D1', '#BFE9FF', '#C8F2D2', '#FFC27A', '#E6D5FF'], 0.26, 0.2));
  s.at([-0.25, TH, -0.95], 0, () => paperStack(s, ['#FFFFFF', '#FFFFFF', '#F8FAFC'], 0.24, 0.18));
  // stools
  for (const key of ['s1', 's2', 's3', 's4', 's5'] as const) {
    const st = L.seats[key];
    s.at([st.seat[0], 0, st.seat[2]], 0, () => stool(s, PAINT[(key.charCodeAt(1) * 3) % 8], 0.4));
    blob(k, st.seat[0], st.seat[2], 0.55, 0.55);
  }

  // ---- side tables with supplies
  L.sideTables.forEach((t, i) => {
    s.at([t.centre[0], 0, t.centre[2]], 0, () => table(s, t.w, t.d));
    blob(k, t.centre[0], t.centre[2], t.w + 0.8, t.d + 0.8);
    const sx = Math.sign(t.centre[0]);
    for (const z of [-0.7, 0.0, 0.7]) {
      s.at([t.centre[0] + sx * 0.2, TH, t.centre[2] + z], 0, () => paintPot(s, PAINT[(i * 3 + Math.round(z * 3) + 8) % 8]));
      s.at([t.centre[0] - sx * 0.2, TH, t.centre[2] + z], 0, () => paintPot(s, PAINT[(i * 3 + Math.round(z * 3) + 11) % 8]));
    }
    s.at([t.centre[0], TH, t.centre[2] - 0.9], 0, () => brushJar(s, i ? '#22B573' : '#F5C518'));
    s.at([t.centre[0], TH, t.centre[2] + 0.95], 0.3, () => paperStack(s, ['#FFE680', '#FFB3D1', '#BFE9FF', '#C8F2D2'], 0.28, 0.2));
    s.at([t.centre[0] + 0.1, TH, t.centre[2] - 0.35], 0.2, () => glueBottle(s, i ? '#F5C518' : '#E5484D'));
    stain(`art-stain-s${i}`, t.centre[0] - 0.2, t.centre[2] + 0.4, PAINT[(i * 2 + 1) % 8], 21 + i, 0.3);
    for (const z of [-0.8, 0, 0.8]) {
      const x = t.centre[0] + sx * 1.0;
      s.at([x, 0, t.centre[2] + z], 0, () => stool(s, PAINT[(i + Math.round(z * 4) + 8) % 8], 0.4));
      blob(k, x, t.centre[2] + z, 0.55, 0.55);
      const x2 = t.centre[0] - sx * 1.0;
      s.at([x2, 0, t.centre[2] + z], 0, () => stool(s, PAINT[(i * 2 + Math.round(z * 4) + 9) % 8], 0.4));
      blob(k, x2, t.centre[2] + z, 0.55, 0.55);
    }
  });

  // ---- easels + drying rack along the north wall
  L.easels.forEach((p, i) => {
    s.at([p[0], 0, p[2]], (i - 1) * 0.12, () => easel(s, i === 0 ? 0 : i === 1 ? 4 : 3));
    blob(k, p[0], p[2] - 0.1, 0.9, 1.0);
  });
  const dr = L.dryingRack;
  s.at([dr[0], 0, dr[2]], 0, () => dryingRack(s));
  blob(k, dr[0], dr[2], 1.7, 0.8);
  // clothesline with paintings above the rack
  s.box([dr[0], 2.2, N + 0.05], [2.0, 0.008, 0.008], '#6B4A2B');
  for (const x of [-0.8, -0.27, 0.27, 0.8]) s.box([dr[0] + x * 0.9, 2.2, N + 0.06], [0.03, 0.04, 0.02], '#F5C518');
  [0, 1, 2, 5].forEach((kind, i) => {
    const x = dr[0] + [-0.72, -0.24, 0.24, 0.72][i];
    s.sticker(`art-hang-${kind}`, [x, 1.93, N + 0.012], 0.4, 0.5, (ctx, w, h) => drawPainting(ctx, w, h, kind), 0, 220);
  });
  // colour wheel + scissors rules
  s.sticker('art-wheel', [-3.7, 2.0, N + 0.012], 0.62, 0.62, drawColorWheel, 0, 260);
  s.sticker('art-rule-a', [W / 2 - 0.012, 1.7, 0.2], 0.55, 0.69, (ctx, w, h) => drawScissorsRule(ctx, w, h, 0), -Math.PI / 2, 300);
  s.sticker('art-rule-b', [W / 2 - 0.012, 1.7, 1.0], 0.55, 0.69, (ctx, w, h) => drawScissorsRule(ctx, w, h, 1), -Math.PI / 2, 300);
  s.at([-3.9, 0, N + 0.5], 0, () => pottedPlant(s, 1.0, '#FF8A3D'));

  // ---- sink on the east wall
  s.at([W / 2 - 0.4, 0, L.sink[2]], 0, () => sinkCounter(s));
  blob(k, W / 2 - 0.5, L.sink[2], 1.4, 2.0);
  s.rbox([W / 2 - 0.06, 1.55, L.sink[2] - 0.55], [0.12, 0.3, 0.26], '#F1F4F8', 0.03); // paper towels
  s.box([W / 2 - 0.13, 1.45, L.sink[2] - 0.55], [0.01, 0.1, 0.22], '#FFFFFF');
  s.rbox([W / 2 - 0.2, 0.2, -1.4], [0.3, 0.4, 0.3], '#22B573', 0.04); // bin
  s.cyl([W / 2 - 0.2, 0.41, -1.4], [0.31, 0.02, 0.31], '#1B9B5F');

  // ---- west wall: supplies shelf, AC, kids' paintings board
  const ss = L.suppliesShelf;
  s.at([-W / 2, 0, ss[2] + 0.0], Math.PI / 2, () => suppliesShelf(s));
  blob(k, -W / 2 + 0.3, ss[2], 0.8, 2.2);
  s.at([-W / 2, L.acUnit[1], L.acUnit[2]], Math.PI / 2, () => acUnit(s));
  s.box([-W / 2 + 0.015, 1.7, 3.0], [0.03, 1.0, 2.6], '#C98F5A');
  s.box([-W / 2 + 0.032, 1.7, 3.0], [0.006, 0.9, 2.5], '#E9C896');
  [0, 1, 3, 5, 6, 2].forEach((kind, i) => {
    const z = 2.1 + (i % 3) * 0.8;
    const y = 1.95 - Math.floor(i / 3) * 0.55;
    s.sticker(`art-pin-${kind}`, [-W / 2 + 0.04, y, z], 0.5, 0.44, (ctx, w, h) => drawPainting(ctx, w, h, kind), Math.PI / 2, 220);
  });
  // aprons on hooks (east wall, south of the sink)
  for (let i = 0; i < 5; i++) {
    const z = 1.8 + i * 0.5;
    s.cyl([W / 2 - 0.05, 1.5, z], [0.016, 0.1, 0.016], '#B8C1CC', [0, 0, Math.PI / 2], true);
    s.at([W / 2 - 0.1, 1.45, z], -Math.PI / 2, () => apron(s, PAINT[(i * 3) % 8]));
  }
  s.box([W / 2 - 0.015, 1.5, 3.0], [0.03, 0.08, 2.5], '#C98F5A');

  // ---- clock, south: clay shelf, plant
  s.at([L.clock[0], L.clock[1], N], 0, () => wallClock(s, 0.46));
  s.rbox([0.0, 0.4, D / 2 - 0.25], [2.6, 0.8, 0.4], '#F4EBDD', 0.02);
  s.rbox([0.0, 0.82, D / 2 - 0.25], [2.7, 0.04, 0.44], '#C98F5A', 0.012);
  PAINT.forEach((c, i) => {
    s.ball([-1.1 + i * 0.3, 0.9, D / 2 - 0.25], [0.14 + (i % 3) * 0.03, 0.12 + (i % 2) * 0.05, 0.14], c);
    if (i % 2) s.cone([-1.1 + i * 0.3, 1.03, D / 2 - 0.25], [0.08, 0.1, 0.08], c);
  });
  for (let i = 0; i < 4; i++) s.rbox([-0.9 + i * 0.6, 0.4, D / 2 - 0.46], [0.5, 0.7, 0.016], i % 2 ? '#FFD84D' : '#FFB3D1', 0.01);
  blob(k, 0, D / 2 - 0.3, 3.0, 0.8);
  s.at([W / 2 - 0.5, 0, 4.4], 0, () => pottedPlant(s, 1.3, '#FF8A3D'));
  blob(k, W / 2 - 0.5, 4.4, 0.8, 0.8);

  // ---- floor paint splats around the easels
  const sp2 = (id: string, x: number, z: number, c: string, sd: number, sz: number) => s.sticker(id, [x, 0.006, z], sz, sz, (ctx, w, h) => drawSplat(ctx, w, h, c, sd), [-Math.PI / 2, 0, 0], 220);
  sp2('art-fl-a', -2.4, -3.3, '#E5484D', 31, 0.6);
  sp2('art-fl-b', -0.7, -3.4, '#2D8CFF', 37, 0.5);
  sp2('art-fl-c', 2.2, -3.3, '#F5C518', 41, 0.55);
  sp2('art-fl-d', 3.1, -2.0, '#22B573', 43, 0.4);
}

/* ------------------------------------------------------------------ dynamic bits */

/** Paper stars on a string above the hero table (flag stars: true). */
function Stars() {
  const { flags } = useRoomFlags();
  const on = flags.stars === true || flags.stars === 'true' || flags.stars === 'on';
  if (!on) return null;
  const { from, to } = L.starString;
  return (
    <BatchMesh
      deps={[]}
      build={(b) => {
        const n = 14;
        for (let i = 0; i < n; i++) {
          const t0 = i / n;
          const t1 = (i + 1) / n;
          const p0 = [from[0] + (to[0] - from[0]) * t0, from[1] - Math.sin(t0 * Math.PI) * 0.12, from[2]] as const;
          const p1 = [from[0] + (to[0] - from[0]) * t1, from[1] - Math.sin(t1 * Math.PI) * 0.12, from[2]] as const;
          const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
          b.box([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, from[2]], [len, 0.008, 0.008], '#F1F5F9', [0, 0, Math.atan2(p1[1] - p0[1], p1[0] - p0[0])]);
        }
        const cols = ['#F5C518', '#FF8A3D', '#FF6FA8', '#2D8CFF', '#22B573', '#8B5CF6', '#F5C518'];
        const geo = starGeo();
        for (let i = 0; i < 7; i++) {
          const t = (i + 0.5) / 7;
          const x = from[0] + (to[0] - from[0]) * t;
          const yTop = from[1] - Math.sin(t * Math.PI) * 0.12;
          const drop = 0.18 + (i % 3) * 0.1;
          const sz = 0.2 + (i % 2) * 0.05;
          b.box([x, yTop - drop / 2, from[2]], [0.006, drop, 0.006], '#F1F5F9');
          for (const flip of [0, Math.PI]) b.add(geo, [x, yTop - drop - sz * 0.4, from[2]], [sz, sz, sz], cols[i], [0, flip + (i - 3) * 0.08, 0]);
        }
      }}
    />
  );
}

export function ArtRoom() {
  return (
    <group>
      <TileFloor w={W + 0.4} d={D + 0.4} tile={0.6} base="#F0E4CC" lineColor="#DDCEB0" />
      <StaticRoom id="art_room" build={buildArt} />
      <FirstDoor cfg={ART_ROOM_CFG} />
      <ShellWindows cfg={ART_ROOM_CFG} />
      <ClockHands p={[L.clock[0], L.clock[1], L.clock[2] + 0.045]} d={0.42} />
      <AlarmBeacon p={[3.0, 2.4, N]} />
      <CeilingFan p={[-2.2, 1.2]} ceilingY={H} />
      <CeilingFan p={[2.2, 1.2]} ceilingY={H} />
      <Stars />
    </group>
  );
}
