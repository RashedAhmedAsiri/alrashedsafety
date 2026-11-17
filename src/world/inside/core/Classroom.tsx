/**
 * Classroom 1/أ: Alrashed's home and the first room everyone sees.
 * Local coordinates: x -6..6, z -5..5, floor y 0, ceiling 3.6. Board wall = north (z = -5),
 * windows = south (z = +5), door to the corridor on the north wall (east end).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GEO, PAL, canvasTexture, mat } from '../../kit';
import type { Batch } from './batch';
import {
  AlarmBeacon,
  BatchMesh,
  CeilingFan,
  ClockHands,
  StaticRoom,
  TileFloor,
  WindowView,
  behindDoor,
  blob,
  ceiling,
  doorParts,
  lightPanel,
  useRoomFlags,
  walls,
  windowFrame,
  type Kit4,
} from './common';
import {
  ALPHABET,
  BOARD_IMAGES,
  drawAlarmSign,
  drawArtBoard,
  drawBoardImage,
  drawChalkboard,
  drawClockFace,
  drawEmblem,
  drawEvacMap,
  drawExitSign,
  drawFrieze,
  drawGlobe,
  drawPoster,
  drawSafetyRules,
  type BoardImage,
} from './pictos';
import { CHAIR_DZ, CLASSROOM, DESK_COLS, DESK_ROWS } from './landmarks';

const W = 12;
const D = 10;
const H = 3.6;

const PLASTIC = ['#2D8CFF', '#FF8A3D', '#22B573', '#F0476B', '#F5C518', '#14B8A6'];
const BAGS = ['#E5484D', '#2D8CFF', '#F5C518', '#22B573', '#9B6BF2', '#FF8A3D', '#14B8A6', '#FF6FA8', '#1E2A3B'];
const LOCKER = ['#F0476B', '#FFAA1F', '#22B573', '#2D8CFF', '#8B5CF6', '#14B8A6', '#F5C518', '#FF6FA8'];
const WOOD_TOP = '#E9CDA2';
const METAL = '#8E99A8';

/* ------------------------------------------------------------------ furniture */

function studentDesk(b: Batch, front: string) {
  // desk centre at origin, top at 0.64, faces -Z (the board)
  b.rbox([0, 0.625, 0], [0.6, 0.035, 0.48], WOOD_TOP, 0.012);
  b.box([0, 0.512, 0.02], [0.54, 0.018, 0.4], '#B7C0CB'); // book shelf
  b.box([0, 0.56, -0.19], [0.54, 0.09, 0.012], '#B7C0CB');
  b.rbox([0, 0.44, -0.215], [0.56, 0.24, 0.02], front, 0.008); // front panel
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      b.cyl([sx * 0.27, 0.31, sz * 0.2], [0.03, 0.62, 0.03], METAL, undefined, true);
      b.cyl([sx * 0.27, 0.012, sz * 0.2], [0.045, 0.024, 0.045], '#3A3F47', undefined, true);
    }
  b.box([0, 0.12, 0.2], [0.54, 0.02, 0.02], METAL);
}

function studentChair(b: Batch, color: string, bag: string | null) {
  // seat centre at origin, child faces -Z
  b.rbox([0, 0.37, 0], [0.38, 0.035, 0.36], color, 0.014);
  b.rbox([0, 0.64, 0.175], [0.36, 0.22, 0.03], color, 0.012, [-0.08, 0, 0]);
  for (const sx of [-1, 1]) {
    b.cyl([sx * 0.16, 0.18, -0.15], [0.024, 0.36, 0.024], METAL, undefined, true);
    b.cyl([sx * 0.16, 0.37, 0.155], [0.024, 0.74, 0.024], METAL, undefined, true);
  }
  if (bag) {
    // backpack hanging on the chair back (on the +Z side)
    b.rbox([0, 0.52, 0.27], [0.27, 0.3, 0.12], bag, 0.045);
    b.rbox([0, 0.45, 0.34], [0.2, 0.14, 0.04], bag, 0.03);
    b.box([0, 0.45, 0.362], [0.16, 0.012, 0.004], '#FFFFFF');
    for (const sx of [-1, 1]) b.box([sx * 0.08, 0.66, 0.205], [0.035, 0.12, 0.02], '#2B2F36');
  }
}

function teacherDesk(b: Batch) {
  // centre at origin, top at 0.74, teacher sits on the -Z side (north) facing +Z
  b.rbox([0, 0.72, 0], [1.5, 0.045, 0.74], '#C98F5A', 0.015);
  b.rbox([-0.55, 0.36, 0], [0.38, 0.68, 0.68], '#B57B48', 0.02); // drawers block
  for (let i = 0; i < 3; i++) {
    b.box([-0.55, 0.16 + i * 0.2, 0.345], [0.32, 0.16, 0.012], '#D9A46B');
    b.box([-0.55, 0.2 + i * 0.2, 0.355], [0.1, 0.02, 0.012], '#6B4A2B');
  }
  b.rbox([0.68, 0.36, 0], [0.06, 0.68, 0.68], '#B57B48', 0.015);
  b.rbox([0.1, 0.38, 0.32], [1.1, 0.6, 0.03], '#B57B48', 0.01); // modesty panel facing the class
  b.box([0.1, 0.55, 0.338], [0.9, 0.05, 0.008], PAL.teal);
  // books
  const books = ['#E5484D', '#2D8CFF', '#22B573', '#F5C518', '#8B5CF6'];
  books.forEach((c, i) => b.box([0.5, 0.76 + i * 0.035, 0.1 + (i % 2) * 0.02], [0.24 - i * 0.015, 0.032, 0.17], c));
  b.box([0.18, 0.765, 0.18], [0.22, 0.02, 0.3], '#FFFFFF'); // papers
  b.box([0.18, 0.777, 0.18], [0.2, 0.005, 0.28], '#F3F0E8');
  // pencil cup
  b.cyl([0.05, 0.8, -0.12], [0.08, 0.12, 0.08], PAL.teal);
  b.cyl([0.04, 0.88, -0.12], [0.012, 0.14, 0.012], '#F5C518', [0, 0, 0.15], true);
  b.cyl([0.07, 0.88, -0.11], [0.012, 0.14, 0.012], '#E5484D', [0.1, 0, -0.1], true);
  // apple
  b.ball([0.32, 0.79, -0.15], [0.08, 0.075, 0.08], '#E5484D');
  b.cyl([0.32, 0.835, -0.15], [0.008, 0.03, 0.008], '#6B4A2B');
}

function teacherChair(b: Batch) {
  b.rbox([0, 0.48, 0], [0.48, 0.07, 0.46], '#2B3A4A', 0.03);
  b.rbox([0, 0.82, -0.22], [0.46, 0.5, 0.06], '#2B3A4A', 0.04);
  b.cyl([0, 0.26, 0], [0.05, 0.42, 0.05], METAL);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.box([Math.sin(a) * 0.16, 0.05, Math.cos(a) * 0.16], [0.04, 0.03, 0.32], '#3A3F47', a);
    b.ball([Math.sin(a) * 0.3, 0.03, Math.cos(a) * 0.3], [0.05, 0.05, 0.05], '#1E2228', undefined, true);
  }
}

function robotDesk(b: Batch) {
  // Alrashed's station: white desk with teal panels and a small charging dock. Top at 0.8.
  b.rbox([0, 0.78, 0], [0.95, 0.05, 0.55], '#FFFFFF', 0.02);
  b.rbox([0, 0.4, 0.2], [0.85, 0.72, 0.04], PAL.teal, 0.02);
  b.rbox([-0.42, 0.39, 0], [0.06, 0.78, 0.5], '#F1F5F9', 0.02);
  b.rbox([0.42, 0.39, 0], [0.06, 0.78, 0.5], '#F1F5F9', 0.02);
  b.box([0, 0.66, 0.225], [0.7, 0.04, 0.01], '#7CC4FA');
  // tablet on a stand + dock
  b.rbox([0.18, 0.92, -0.08], [0.32, 0.22, 0.02], '#1C2430', 0.01, [-0.35, 0, 0]);
  b.box([0.18, 0.93, -0.068], [0.28, 0.18, 0.004], '#3BC9B5', [-0.35, 0, 0]);
  b.rbox([-0.22, 0.82, -0.05], [0.24, 0.035, 0.18], '#E2E8F0', 0.012);
  b.cyl([-0.22, 0.842, -0.05], [0.14, 0.01, 0.14], '#5EF2DF');
  // little plant
  b.cyl([-0.32, 0.86, 0.15], [0.09, 0.1, 0.09], '#F0476B');
  b.ball([-0.32, 0.95, 0.15], [0.13, 0.11, 0.13], '#3DBE6E');
}

function globeStand(b: Batch) {
  b.cyl([0, 0.02, 0], [0.16, 0.04, 0.16], '#8E5B34');
  b.cyl([0, 0.11, 0], [0.025, 0.16, 0.025], '#C9A227');
  b.torus([0, 0.32, 0], 0.32, '#C9A227', [0, Math.PI / 2, 0.41], 0.5);
}

function plant(b: Batch, h = 1.4) {
  b.rbox([0, 0.22, 0], [0.5, 0.44, 0.5], '#E07A3F', 0.06);
  b.box([0, 0.44, 0], [0.42, 0.02, 0.42], '#6B4A2B');
  b.cyl([0, 0.44 + h * 0.3, 0], [0.05, h * 0.6, 0.05], '#7A5A3A');
  const leaves = [
    [0, 1, 0, 0.62],
    [0.2, 0.82, 0.1, 0.5],
    [-0.18, 0.78, -0.08, 0.48],
    [0.05, 0.62, -0.2, 0.42],
    [-0.12, 0.58, 0.18, 0.4],
  ];
  leaves.forEach(([x, y, z, s], i) => b.ball([x, 0.44 + h * (y as number) * 0.85, z], [s, s * 0.8, s], i % 2 ? '#3E9B4F' : '#4CB25E'));
}

function acUnit(b: Batch) {
  // split AC, local: on the wall, +Z out of the wall
  b.rbox([0, 0, 0.13], [1.0, 0.3, 0.24], '#FFFFFF', 0.06, undefined, 2);
  b.box([0, -0.1, 0.25], [0.86, 0.04, 0.012], '#C9D2DC');
  b.box([0, -0.13, 0.22], [0.86, 0.012, 0.05], '#9AA6B2');
  b.box([0.38, 0.06, 0.252], [0.04, 0.015, 0.004], '#22B573');
}

function bookshelf(b: Batch) {
  // low open shelf against a wall, local: back at z = 0, front toward +Z, width 2 m
  const w = 2.0;
  b.rbox([0, 0.45, 0.18], [w, 0.9, 0.36], '#F4EBDD', 0.02);
  b.box([0, 0.45, 0.33], [w - 0.08, 0.82, 0.08], '#E9DFCB');
  const cols = ['#E5484D', '#2D8CFF', '#22B573', '#F5C518', '#8B5CF6', '#FF8A3D', '#14B8A6', '#FF6FA8'];
  for (let shelf = 0; shelf < 2; shelf++) {
    const y0 = 0.08 + shelf * 0.42;
    b.box([0, y0 + 0.37, 0.2], [w - 0.06, 0.03, 0.34], '#E0D3BD');
    let x = -w / 2 + 0.08;
    let i = shelf * 3;
    while (x < w / 2 - 0.12) {
      const bw = 0.04 + ((i * 7) % 4) * 0.012;
      const bh = 0.24 + ((i * 5) % 4) * 0.025;
      const lean = i % 9 === 4 ? 0.25 : 0;
      b.box([x + bw / 2, y0 + bh / 2 + 0.02, 0.2], [bw, bh, 0.2], cols[i % cols.length], [0, 0, lean]);
      x += bw + 0.008 + (lean ? 0.06 : 0);
      i++;
    }
  }
  // toys on top: a ball and a small robot figure
  b.ball([0.6, 0.98, 0.18], [0.16, 0.16, 0.16], '#F5C518');
  b.rbox([-0.5, 0.98, 0.18], [0.14, 0.16, 0.12], '#FFFFFF', 0.04);
  b.rbox([-0.5, 1.1, 0.18], [0.12, 0.1, 0.1], '#FFFFFF', 0.04);
  b.box([-0.5, 1.1, 0.232], [0.08, 0.05, 0.004], '#1C2430');
}

/* ------------------------------------------------------------------ static build */

function buildClassroom(k: Kit4) {
  const { s, g, e } = k;
  const doorX = CLASSROOM.door[0];
  walls(
    s,
    W,
    D,
    H,
    [
      { wall: 'n', at: doorX, width: 1.2, height: 2.3 },
      { wall: 's', at: -1.85, width: 3.4, height: 1.7, sill: 1.05 },
      { wall: 's', at: 1.85, width: 3.4, height: 1.7, sill: 1.05 },
    ],
    { low: '#DCEFE9', rail: PAL.teal, lowH: 1.0 },
  );
  ceiling(k, W, D, H);
  // cornice
  for (const [p, sz] of [
    [[0, H - 0.04, -D / 2 + 0.03], [W, 0.08, 0.06]],
    [[0, H - 0.04, D / 2 - 0.03], [W, 0.08, 0.06]],
    [[-W / 2 + 0.03, H - 0.04, 0], [0.06, 0.08, D]],
    [[W / 2 - 0.03, H - 0.04, 0], [0.06, 0.08, D]],
  ] as [[number, number, number], [number, number, number]][])
    s.box(p, sz, '#EFE6D6');

  // ---- door (north wall, east end) + the corridor seen behind it
  s.at([doorX, 0, -D / 2], 0, () => {
    doorParts(s, 1.0, 2.2, PAL.door, { leaf: false });
    behindDoor(s, 1.0, 2.2, 2.6);
  });
  // door number plaque beside the door
  s.sticker('cls-door-plaque', [doorX - 0.72, 1.62, -D / 2 + 0.012], 0.26, 0.2, (ctx, w, h) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PAL.teal;
    ctx.fillRect(w * 0.06, h * 0.08, w * 0.88, h * 0.84);
    ctx.font = `700 ${h * 0.5}px "IBM Plex Sans Arabic"`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('١/أ', w / 2, h * 0.53);
  }, 0, 500);
  // exit sign over the door (glows)
  e.at([doorX, 2.56, -D / 2 + 0.06], 0, () => {
    e.box([0, 0, -0.03], [0.62, 0.24, 0.05], '#1A9E52');
    e.sticker('exit-sign', [0, 0, 0.0], 0.58, 0.2, (ctx, w, h) => drawExitSign(ctx, w, h, 0), 0, 600);
  });
  // light switch + fire alarm button + sign
  s.box([doorX - 0.85, 1.2, -D / 2 + 0.01], [0.09, 0.13, 0.02], '#FFFFFF');
  s.box([doorX - 0.85, 1.22, -D / 2 + 0.024], [0.03, 0.05, 0.01], '#D6DBE1');
  const ab = CLASSROOM.fireAlarmButton;
  s.rbox([ab[0], ab[1], ab[2] + 0.03], [0.14, 0.14, 0.06], PAL.safetyRed, 0.015);
  s.box([ab[0], ab[1], ab[2] + 0.062], [0.09, 0.09, 0.004], '#FFFFFF');
  s.cyl([ab[0], ab[1], ab[2] + 0.068], [0.04, 0.01, 0.04], '#C62828', [Math.PI / 2, 0, 0]);
  s.sticker('alarm-sign', [ab[0], ab[1] + 0.25, ab[2] + 0.004], 0.16, 0.2, drawAlarmSign, 0, 600);

  // ---- boards on the north wall
  const cb = CLASSROOM.chalkboard;
  s.rbox([cb.centre[0], cb.centre[1], -D / 2 + 0.02], [cb.w + 0.14, cb.h + 0.14, 0.04], '#C98F5A', 0.02);
  s.sticker('chalkboard', [cb.centre[0], cb.centre[1], -D / 2 + 0.044], cb.w, cb.h, drawChalkboard, 0, 300);
  s.rbox([cb.centre[0], cb.centre[1] - cb.h / 2 - 0.07, -D / 2 + 0.07], [cb.w + 0.1, 0.035, 0.1], '#B57B48', 0.01);
  ['#FFFFFF', '#FFE14D', '#7CC4FA', '#FF9EB5'].forEach((c, i) => s.cyl([cb.centre[0] + 0.6 + i * 0.12, cb.centre[1] - cb.h / 2 - 0.035, -D / 2 + 0.08], [0.018, 0.09, 0.018], c, [0, 0, Math.PI / 2], true));
  s.rbox([cb.centre[0] - 0.9, cb.centre[1] - cb.h / 2 - 0.025, -D / 2 + 0.08], [0.16, 0.05, 0.06], '#2B3A4A', 0.01);
  // smartboard frame (screen is a separate mesh)
  const sb = CLASSROOM.smartboard;
  g.rbox([sb.centre[0], sb.centre[1], -D / 2 + 0.035], [sb.w + 0.16, sb.h + 0.16, 0.06], '#2B2F36', 0.03, undefined, 2);
  g.rbox([sb.centre[0], sb.centre[1] - sb.h / 2 - 0.12, -D / 2 + 0.06], [sb.w * 0.6, 0.06, 0.09], '#3A3F47', 0.02);
  e.box([sb.centre[0] + sb.w / 2 - 0.04, sb.centre[1] - sb.h / 2 - 0.045, -D / 2 + 0.068], [0.03, 0.015, 0.004], '#3BC9B5');
  // clock between the boards
  const ck = CLASSROOM.clock;
  s.cyl([ck[0], ck[1], ck[2] + 0.02], [0.46, 0.04, 0.46], '#2B8CBE', [Math.PI / 2, 0, 0]);
  s.sticker('clock-face', [ck[0], ck[1], ck[2] + 0.042], 0.42, 0.42, drawClockFace, 0, 620);
  // alphabet frieze across the top of the board wall
  const half = ALPHABET.length / 2;
  s.sticker('frieze-a', [W / 4 - 0.05, 3.12, -D / 2 + 0.01], W / 2 - 0.2, 0.38, (ctx, w, h) => drawFrieze(ctx, w, h, ALPHABET.slice(0, half)), 0, 220);
  s.sticker('frieze-b', [-W / 4 + 0.05, 3.12, -D / 2 + 0.01], W / 2 - 0.2, 0.38, (ctx, w, h) => drawFrieze(ctx, w, h, ALPHABET.slice(half)), 0, 220);

  // ---- teacher's area (north-west)
  const td = CLASSROOM.teacherDesk;
  s.at([td[0], 0, td[2]], 0, () => teacherDesk(s));
  blob(k, td[0], td[2], 1.9, 1.1);
  s.at([td[0] - 0.55, 0.745, td[2] - 0.05], 0, () => globeStand(s));
  s.at(CLASSROOM.teacherChair, 0, () => teacherChair(s));
  blob(k, CLASSROOM.teacherChair[0], CLASSROOM.teacherChair[2], 0.7, 0.7);
  // Alrashed's desk
  const rd = CLASSROOM.robotDesk;
  s.at([rd[0], 0, rd[2]], 0, () => robotDesk(s));
  blob(k, rd[0], rd[2], 1.2, 0.8);
  s.sticker('robot-badge', [rd[0], 0.42, rd[2] + 0.225], 0.26, 0.26, drawEmblem, 0, 500);
  // plant in the corner
  s.at(CLASSROOM.plant, 0, () => plant(s, 1.5));
  blob(k, CLASSROOM.plant[0], CLASSROOM.plant[2], 0.8, 0.8);

  // ---- student desks: 4 columns of pairs x 3 rows = 24 desks
  let n = 0;
  DESK_ROWS.forEach((z, r) =>
    DESK_COLS.forEach((cx, c) => {
      for (const dx of [-0.3, 0.3]) {
        const i = n++;
        s.at([cx + dx, 0, z], 0, () => studentDesk(s, ['#7CC4FA', '#9FE3C9'][(r + c) % 2]));
        const bag = (i * 7) % 5 < 3 ? BAGS[(i * 5) % BAGS.length] : null;
        s.at([cx + dx, 0, z + CHAIR_DZ], (((i * 13) % 7) - 3) * 0.02, () => studentChair(s, PLASTIC[(r * 4 + c) % PLASTIC.length], bag));
        // a few pencil cases / books on desks
        if (i % 3 === 0) s.box([cx + dx + 0.08, 0.66, z + 0.05], [0.2, 0.025, 0.26], ['#FFFFFF', '#F5C518', '#2D8CFF'][i % 3]);
        if (i % 4 === 1) s.rbox([cx + dx - 0.1, 0.665, z - 0.08], [0.18, 0.04, 0.06], ['#F0476B', '#8B5CF6', '#22B573'][i % 3], 0.015);
      }
      blob(k, cx, z + 0.2, 1.5, 1.25);
    }),
  );

  // ---- back wall: colored lockers under the windows
  const lk = CLASSROOM.lockers;
  const lw = lk.x1 - lk.x0;
  s.box([0, 0.47, D / 2 - 0.21], [lw, 0.94, 0.42], '#F4EBDD');
  s.rbox([0, 0.96, D / 2 - 0.22], [lw + 0.06, 0.04, 0.46], '#C98F5A', 0.012);
  const cols = 24;
  const cw = lw / cols;
  for (let i = 0; i < cols; i++)
    for (let r = 0; r < 2; r++) {
      const x = lk.x0 + cw * (i + 0.5);
      const y = 0.27 + r * 0.42;
      const c = LOCKER[(i + r * 3) % LOCKER.length];
      s.rbox([x, y, lk.z - 0.005], [cw - 0.04, 0.38, 0.02], c, 0.02);
      s.box([x + cw * 0.28, y, lk.z - 0.02], [0.03, 0.08, 0.02], '#FFFFFF');
      s.box([x, y + 0.13, lk.z - 0.017], [0.12, 0.05, 0.004], '#FFFFFF');
    }
  // stuff on top of the lockers
  [[-4.9, '#2D8CFF'], [-4.6, '#F5C518'], [3.9, '#22B573']].forEach(([x, c]) => s.box([x as number, 1.08, D / 2 - 0.25], [0.24, 0.2, 0.3], c as string, 0.1));
  s.ball([4.6, 1.07, D / 2 - 0.25], [0.2, 0.2, 0.2], '#FF8A3D');
  s.at([-0.02, 0.98, D / 2 - 0.25], 0, () => plant(s, 0.3), [0.5, 0.5, 0.5]);
  // windows
  for (const wdef of CLASSROOM.windows) s.at([wdef.centre[0], wdef.centre[1], D / 2], Math.PI, () => windowFrame(s, wdef.w, wdef.h, 2));

  // ---- west wall: safety poster, bookshelf, AC
  s.sticker('safety-rules', [-W / 2 + 0.012, 1.7, -2.4], 0.86, 1.16, drawSafetyRules, Math.PI / 2, 360);
  s.at([-W / 2, 0, CLASSROOM.bookshelf[2]], Math.PI / 2, () => bookshelf(s));
  blob(k, -W / 2 + 0.25, CLASSROOM.bookshelf[2], 0.8, 2.3);
  s.at([-W / 2, 2.95, 1.6], Math.PI / 2, () => acUnit(s));
  s.sticker('cls-poster-a', [-W / 2 + 0.012, 1.65, 3.6], 0.62, 0.8, (ctx, w, h) => drawPoster(ctx, w, h, 1), Math.PI / 2, 300);
  // ---- east wall: artwork, evacuation map, AC, emergency light
  s.sticker('artboard', [W / 2 - 0.012, 1.72, 1.4], 3.0, 1.1, drawArtBoard, -Math.PI / 2, 260);
  const em = CLASSROOM.evacMap;
  s.box([W / 2 - 0.01, em[1], em[2]], [0.02, 0.44, 0.56], '#1FAE5B');
  s.sticker('evac-map', [W / 2 - 0.022, em[1], em[2]], 0.52, 0.4, (ctx, w, h) => drawEvacMap(ctx, w, h, 3), -Math.PI / 2, 620);
  s.at([W / 2, 2.95, -1.0], -Math.PI / 2, () => acUnit(s));
  s.at([W / 2, 2.4, -3.75], -Math.PI / 2, () => {
    s.rbox([0, 0, 0.05], [0.42, 0.12, 0.1], '#FFFFFF', 0.02);
    e.box([-0.12, -0.03, 0.105], [0.1, 0.05, 0.01], '#FFF6D0');
    e.box([0.12, -0.03, 0.105], [0.1, 0.05, 0.01], '#FFF6D0');
    e.box([0, 0.03, 0.102], [0.03, 0.015, 0.004], '#3BE37A');
  });
  s.sticker('cls-poster-b', [W / 2 - 0.012, 1.65, 3.85], 0.62, 0.8, (ctx, w, h) => drawPoster(ctx, w, h, 7), -Math.PI / 2, 300);

  // ---- green emergency strips along the floor edges
  const strip = (x0: number, x1: number, z: number, rot: number) => e.at([(x0 + x1) / 2, 0.135, z], rot, () => e.box([0, 0, 0.034], [x1 - x0, 0.022, 0.01], '#2BE07A'));
  strip(-W / 2 + 0.1, doorX - 0.65, -D / 2, 0);
  strip(doorX + 0.65, W / 2 - 0.1, -D / 2, 0);
  e.at([-W / 2, 0.135, 0], Math.PI / 2, () => e.box([0, 0, 0.034], [D - 0.2, 0.022, 0.01], '#2BE07A'));
  e.at([W / 2, 0.135, 0], -Math.PI / 2, () => e.box([0, 0, 0.034], [D - 0.2, 0.022, 0.01], '#2BE07A'));

  // ---- ceiling lights
  for (const x of [-4, 0, 4]) for (const z of [-2.6, 2.6]) lightPanel(k, x, H, z);
  // floor shadow along the lockers
  blob(k, 0, D / 2 - 0.3, 11.8, 0.9);
}

/* ------------------------------------------------------------------ smartboard */

const boardTex = (img: BoardImage) => canvasTexture(`core:board:${img}`, 1024, 594, (ctx, w, h) => drawBoardImage(ctx, w, h, img));

/** The smartboard screen, showing the `board` flag picture (default «الراشد» logo) with a short power-on fade. */
function SmartScreen() {
  const { flags } = useRoomFlags();
  const raw = flags.board;
  const img: BoardImage = BOARD_IMAGES.includes(raw as BoardImage) ? (raw as BoardImage) : 'logo';
  const m = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, color: '#FFFFFF' }), []);
  const t0 = useRef(-1e9);
  const prev = useRef<BoardImage>(img);
  useEffect(() => () => m.dispose(), [m]);
  useEffect(() => {
    m.map = boardTex(img);
    m.needsUpdate = true;
    if (prev.current !== img) t0.current = performance.now();
    prev.current = img;
  }, [img, m]);
  useFrame(() => {
    const k = Math.min(1, (performance.now() - t0.current) / 450);
    const v = img === 'blank' ? 1 : 0.25 + 0.75 * (1 - Math.pow(1 - k, 3));
    m.color.setScalar(v * 0.92);
  });
  const sb = CLASSROOM.smartboard;
  return <mesh position={[sb.centre[0], sb.centre[1], -D / 2 + 0.068]} scale={[sb.w, sb.h, 1]} geometry={GEO.plane} material={m} />;
}

/* ------------------------------------------------------------------ globe + door */

function Globe() {
  const td = CLASSROOM.teacherDesk;
  const tex = useMemo(() => canvasTexture('core:globe', 512, 256, drawGlobe), []);
  const m = useMemo(() => mat('#FFFFFF', { map: tex, rough: 0.45 }), [tex]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.15;
  });
  return (
    <group position={[td[0] - 0.55, 0.745 + 0.32, td[2] - 0.05]} rotation={[0, 0, 0.41]}>
      <mesh ref={ref} scale={[0.28, 0.28, 0.28]} geometry={GEO.sphere} material={m} />
    </group>
  );
}

/** Classroom door leaf: closed by default, swings open (into the room, hinge on the east side) with flag `door: 'open'`. */
function ClassDoor() {
  const { flags } = useRoomFlags();
  const open = flags.door === 'open' || flags.door === true;
  const ref = useRef<THREE.Group>(null);
  const ang = useRef(open ? -1.7 : 0);
  useFrame((_, dt) => {
    const target = open ? -1.7 : 0;
    ang.current += (target - ang.current) * Math.min(1, dt * 4);
    if (ref.current) ref.current.rotation.y = ang.current;
  });
  const w = 1.0;
  const h = 2.2;
  return (
    <group position={[CLASSROOM.door[0] + w / 2, 0, -D / 2 + 0.02]}>
      <group ref={ref}>
        <BatchMesh
          deps={[]}
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

/* ------------------------------------------------------------------ room */

export function Classroom() {
  const sw = CLASSROOM.windows;
  return (
    <group>
      <TileFloor w={W + 0.4} d={D + 0.4} tile={0.5} base="#EEE6D6" lineColor="#DCD1BD" />
      <StaticRoom id="classroom" build={buildClassroom} />
      <SmartScreen />
      <ClassDoor />
      <Globe />
      <ClockHands p={[CLASSROOM.clock[0], CLASSROOM.clock[1], CLASSROOM.clock[2] + 0.045]} d={0.42} />
      <AlarmBeacon p={[CLASSROOM.alarmLight[0], CLASSROOM.alarmLight[1], -D / 2]} />
      <CeilingFan p={[-2.0, 0.6]} ceilingY={H} />
      <CeilingFan p={[2.0, 0.6]} ceilingY={H} />
      {sw.map((w, i) => (
        <WindowView key={i} p={[w.centre[0], w.centre[1], D / 2]} rotY={Math.PI} w={w.w} h={w.h} view={w.view as 'yard' | 'street'} />
      ))}
    </group>
  );
}
