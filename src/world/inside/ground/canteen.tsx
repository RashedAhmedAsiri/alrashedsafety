/**
 * canteen (المقصف) — 14 x 12 m, height 3.6. Local frame: x -7..7, z -6..6.
 * North wall (z = -6): corridor side with the wide entrance (double doors, open) and the hand-wash
 * sinks beside it. East: serving counter with the kitchen and the menu board behind it.
 * Middle/south: round tables with stools. South wall: three windows to the yard.
 * See docs/sets/ground.md for landmarks and flags.
 */
import { useMemo } from 'react';
import { PAL, mat, tileTexture } from '../../kit';
import { StaticPerson } from '../../../characters/Human';
import { Batch, BatchMeshes, XGEO, once, rand } from './batch';
import { buildShell, CeilingPanels, Door, ExitSign, AlarmStrobe, TapStream, WindowViews, onWall, pushWall, useRoomFlags } from './shell';
import { makeAtlas, text, fillRR, circle, cross, hand, drop, drawClock, strokeRR, star, person, type Draw } from './paint';
import { CHROME, METAL, acUnit, bin, plant, poster, shadowRect, shadowRound, wallClock, waterCooler, fanMount } from './furniture';
import { drawWash } from './clinic';
import { CANTEEN } from './landmarks';

const SIZE: [number, number] = [14, 12];
const H = 3.6;
const TEAL = '#14B8A6';
const ORANGE = '#FF8A3D';

/* ------------------------------------------------------------------ paintings */

type Food = 'sandwich' | 'juice' | 'fruit' | 'water' | 'milk' | 'pie' | 'banana' | 'salad';

function foodIcon(ctx: CanvasRenderingContext2D, kind: Food, x: number, y: number, s: number) {
  if (kind === 'sandwich') {
    ctx.fillStyle = '#E9B96E';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y + s * 0.3);
    ctx.lineTo(x + s * 0.5, y + s * 0.3);
    ctx.lineTo(x, y - s * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFF3D6';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.36, y + s * 0.2);
    ctx.lineTo(x + s * 0.36, y + s * 0.2);
    ctx.lineTo(x, y - s * 0.3);
    ctx.closePath();
    ctx.fill();
    fillRR(ctx, x - s * 0.48, y + s * 0.16, s * 0.96, s * 0.1, s * 0.05, '#7CC46A');
    fillRR(ctx, x - s * 0.45, y + s * 0.07, s * 0.9, s * 0.08, s * 0.04, '#F7C531');
  } else if (kind === 'juice') {
    fillRR(ctx, x - s * 0.24, y - s * 0.36, s * 0.48, s * 0.76, s * 0.06, ORANGE);
    fillRR(ctx, x - s * 0.24, y - s * 0.36, s * 0.48, s * 0.16, s * 0.06, '#FFFFFF');
    circle(ctx, x, y + s * 0.08, s * 0.14, '#FFD27A');
    ctx.strokeStyle = '#F0476B';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1, y - s * 0.36);
    ctx.lineTo(x + s * 0.2, y - s * 0.56);
    ctx.stroke();
  } else if (kind === 'fruit') {
    circle(ctx, x - s * 0.14, y + s * 0.06, s * 0.28, '#E5484D');
    circle(ctx, x + s * 0.2, y + s * 0.12, s * 0.22, '#FF9F1C');
    fillRR(ctx, x - s * 0.16, y - s * 0.34, s * 0.05, s * 0.14, 2, '#6B4A2E');
    ctx.fillStyle = '#3DBE6E';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.04, y - s * 0.3, s * 0.1, s * 0.05, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'water') {
    fillRR(ctx, x - s * 0.16, y - s * 0.3, s * 0.32, s * 0.72, s * 0.1, '#9ED8FA');
    fillRR(ctx, x - s * 0.08, y - s * 0.44, s * 0.16, s * 0.16, s * 0.03, '#2D8CFF');
    fillRR(ctx, x - s * 0.16, y - s * 0.02, s * 0.32, s * 0.16, 0, '#2D8CFF');
    drop(ctx, x, y + s * 0.26, s * 0.08, '#FFFFFF');
  } else if (kind === 'milk') {
    fillRR(ctx, x - s * 0.22, y - s * 0.2, s * 0.44, s * 0.6, s * 0.04, '#FFFFFF');
    ctx.fillStyle = '#7CC4FA';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.22, y - s * 0.2);
    ctx.lineTo(x, y - s * 0.46);
    ctx.lineTo(x + s * 0.22, y - s * 0.2);
    ctx.closePath();
    ctx.fill();
    fillRR(ctx, x - s * 0.22, y + s * 0.02, s * 0.44, s * 0.14, 0, '#2D8CFF');
  } else if (kind === 'pie') {
    ctx.fillStyle = '#E2A85A';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.05, s * 0.44, s * 0.28, 0, Math.PI, 0);
    ctx.lineTo(x + s * 0.44, y + s * 0.12);
    ctx.lineTo(x - s * 0.44, y + s * 0.12);
    ctx.fill();
    ctx.strokeStyle = '#B8782E';
    ctx.lineWidth = s * 0.04;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * s * 0.12, y - s * 0.12);
      ctx.lineTo(x + i * s * 0.12 + s * 0.04, y + s * 0.06);
      ctx.stroke();
    }
  } else if (kind === 'banana') {
    ctx.strokeStyle = '#F7C531';
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.2;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.3, s * 0.42, 0.5, Math.PI - 0.5);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.1, s * 0.46, s * 0.22, 0, 0, Math.PI);
    ctx.fill();
    circle(ctx, x - s * 0.18, y + s * 0.02, s * 0.14, '#62C46B');
    circle(ctx, x + s * 0.04, y - s * 0.04, s * 0.15, '#4FB35E');
    circle(ctx, x + s * 0.22, y + s * 0.04, s * 0.1, '#E5484D');
    circle(ctx, x - s * 0.02, y + s * 0.08, s * 0.08, '#FF9F1C');
  }
}

const MENU: { name: string; food: Food; bg: string }[] = [
  { name: 'ساندويتش', food: 'sandwich', bg: '#FFF1D6' },
  { name: 'عصير', food: 'juice', bg: '#FFE6D2' },
  { name: 'فاكهة', food: 'fruit', bg: '#FDE3E6' },
  { name: 'ماء', food: 'water', bg: '#DDF0FF' },
  { name: 'حليب', food: 'milk', bg: '#E6F2FF' },
  { name: 'فطيرة', food: 'pie', bg: '#FFF4D6' },
  { name: 'موز', food: 'banana', bg: '#FFF8D0' },
  { name: 'سلطة', food: 'salad', bg: '#E4F7E8' },
];

/** Menu board: wood frame, dark green board, food pictures with names. */
const drawMenu: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 22, '#8E5B34');
  fillRR(ctx, 14, 14, w - 28, h - 28, 14, '#24563F');
  fillRR(ctx, w / 2 - 230, 26, 460, 84, 40, '#F7C531');
  text(ctx, 'قائمة المقصف', w / 2, 70, 56, '#24563F', 420);
  const cols = 4;
  const cw = (w - 80) / cols;
  const ch = (h - 160) / 2;
  MENU.forEach((m, i) => {
    const col = cols - 1 - (i % cols); // RTL: first item on the right
    const row = Math.floor(i / cols);
    const x = 40 + col * cw;
    const y = 130 + row * ch;
    fillRR(ctx, x + 10, y + 8, cw - 20, ch - 16, 18, m.bg);
    foodIcon(ctx, m.food, x + cw / 2, y + ch * 0.42, ch * 0.52);
    text(ctx, m.name, x + cw / 2, y + ch - 42, 36, PAL.ink, cw - 40);
  });
};

/** «كل بأمان»: boy sitting at a table, chewing; clock face for "slowly". */
const drawEatSafe: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 18, '#FFF8EC');
  fillRR(ctx, 14, 14, w - 28, 76, 14, '#22B573');
  text(ctx, 'كُل بأمان', w / 2, 54, 48, '#FFFFFF', w - 60);
  // table and seated person
  fillRR(ctx, w * 0.14, h * 0.62, w * 0.72, 18, 8, '#C98F5A');
  ctx.fillStyle = '#C98F5A';
  ctx.fillRect(w * 0.48, h * 0.62, 14, h * 0.24);
  // seated pictogram
  const px = w * 0.34;
  const py = h * 0.6;
  circle(ctx, px, py - 120, 28, '#2D8CFF');
  ctx.strokeStyle = '#2D8CFF';
  ctx.lineCap = 'round';
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.moveTo(px, py - 84);
  ctx.lineTo(px, py - 10);
  ctx.lineTo(px + 46, py - 10);
  ctx.lineTo(px + 46, py + 70);
  ctx.moveTo(px, py - 70);
  ctx.lineTo(px + 50, py - 30);
  ctx.stroke();
  fillRR(ctx, px - 40, py + 6, 70, 14, 6, '#8E5B34');
  // plate with food
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(w * 0.66, h * 0.6, 60, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  foodIcon(ctx, 'sandwich', w * 0.66, h * 0.52, 70);
  // small clock (slowly)
  circle(ctx, w * 0.78, h * 0.3, 42, '#FFFFFF');
  ctx.strokeStyle = '#1E2A3B';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.3, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.78, h * 0.3);
  ctx.lineTo(w * 0.78, h * 0.3 - 28);
  ctx.moveTo(w * 0.78, h * 0.3);
  ctx.lineTo(w * 0.78 + 20, h * 0.3 + 6);
  ctx.stroke();
  // green check
  ctx.strokeStyle = '#22B573';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.86);
  ctx.lineTo(w * 0.2, h * 0.93);
  ctx.lineTo(w * 0.34, h * 0.78);
  ctx.stroke();
};

/** Allergy reminder: peanut in a red circle, an allergy sticker. */
const drawAllergy: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 18, '#FFFFFF');
  fillRR(ctx, 14, 14, w - 28, 76, 14, '#F0476B');
  text(ctx, 'انتبه للحساسية', w / 2, 54, 44, '#FFFFFF', w - 60);
  const cx = w / 2;
  const cy = h * 0.55;
  // peanut
  ctx.fillStyle = '#D9A55B';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 44, 48, 56, 0, 0, Math.PI * 2);
  ctx.ellipse(cx, cy + 44, 52, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#B98236';
  for (let i = 0; i < 6; i++) circle(ctx, cx - 22 + (i % 2) * 40, cy - 60 + Math.floor(i / 2) * 50, 6, '#B98236');
  // red ring and slash
  ctx.strokeStyle = '#E23B3B';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, 128, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 90, cy - 90);
  ctx.lineTo(cx + 90, cy + 90);
  ctx.stroke();
  // label sticker
  fillRR(ctx, 40, h - 110, w - 80, 70, 30, '#FFE1E8');
  circle(ctx, w - 80, h - 75, 22, '#F0476B');
  text(ctx, '!', w - 80, h - 73, 34, '#FFFFFF');
  text(ctx, 'اقرأ الملصق', w / 2 - 20, h - 73, 34, '#C2185B', w - 200);
};

/** Healthy plate (MyPlate style, no English). */
const drawPlate: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 18, '#FFF8EC');
  fillRR(ctx, 14, 14, w - 28, 76, 14, '#2D8CFF');
  text(ctx, 'طبقي الصحي', w / 2, 54, 46, '#FFFFFF', w - 60);
  const cx = w / 2;
  const cy = h * 0.58;
  const r = Math.min(w, h) * 0.32;
  circle(ctx, cx, cy, r + 14, '#FFFFFF');
  const parts = ['#62C46B', '#E5484D', '#F7C531', '#8B5CF6'];
  parts.forEach((c, i) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, (i * Math.PI) / 2 - Math.PI / 2, ((i + 1) * Math.PI) / 2 - Math.PI / 2);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  });
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
  circle(ctx, cx + r * 0.45, cy - r * 0.45, r * 0.16, '#3B9B4A');
  circle(ctx, cx + r * 0.45, cy + r * 0.45, r * 0.18, '#C22F3A');
  circle(ctx, cx - r * 0.45, cy + r * 0.45, r * 0.14, '#E2A85A');
  circle(ctx, cx - r * 0.45, cy - r * 0.45, r * 0.14, '#6D44C9');
  // glass of milk
  fillRR(ctx, cx + r + 30, cy - 50, 50, 90, 10, '#E6F2FF');
  fillRR(ctx, cx + r + 30, cy - 20, 50, 60, 10, '#FFFFFF');
};

/** Bin labels: general (green), paper (blue), plastic (yellow). */
const binLabel =
  (bg: string, kind: 'food' | 'paper' | 'bottle', word: string): Draw =>
  (ctx, w, h) => {
    fillRR(ctx, 0, 0, w, h, 14, bg);
    circle(ctx, w / 2, h * 0.4, h * 0.27, '#FFFFFF');
    if (kind === 'food') {
      circle(ctx, w / 2 - 6, h * 0.42, h * 0.13, '#E5484D');
      fillRR(ctx, w / 2 - 8, h * 0.22, 5, 14, 2, '#6B4A2E');
    } else if (kind === 'paper') {
      fillRR(ctx, w / 2 - h * 0.12, h * 0.24, h * 0.24, h * 0.32, 4, '#7CC4FA');
      for (let i = 0; i < 3; i++) fillRR(ctx, w / 2 - h * 0.08, h * 0.3 + i * h * 0.07, h * 0.16, 3, 1, '#2D8CFF');
    } else {
      fillRR(ctx, w / 2 - h * 0.07, h * 0.24, h * 0.14, h * 0.33, h * 0.04, '#F2B200');
      fillRR(ctx, w / 2 - h * 0.035, h * 0.18, h * 0.07, h * 0.08, 2, '#2D8CFF');
    }
    text(ctx, word, w / 2, h * 0.84, h * 0.2, '#FFFFFF', w - 12);
  };

/** Sign over the sink row. */
const drawSinkSign: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, h * 0.3, '#2D8CFF');
  hand(ctx, h * 0.6, h * 0.55, h * 0.6, '#FFFFFF');
  drop(ctx, h * 1.05, h * 0.5, h * 0.2, '#FFFFFF');
  text(ctx, 'اغسل يديك قبل الأكل', (w + h * 1.2) / 2, h * 0.54, h * 0.46, '#FFFFFF', w - h * 1.6);
};

const drawSlogan: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, h * 0.4, '#FFFFFF');
  strokeRR(ctx, 6, 6, w - 12, h - 12, h * 0.35, TEAL, 6);
  star(ctx, h * 0.55, h / 2, h * 0.26, '#F7C531');
  star(ctx, w - h * 0.55, h / 2, h * 0.26, '#F7C531');
  text(ctx, 'المقصف المدرسي', w / 2, h * 0.54, h * 0.5, TEAL, w - h * 1.6);
};

/** Food packaging stickers (sandwich wrap label, juice box faces, chip bag). */
const drawPack: Draw = (ctx, w, h) => {
  const cw = w / 4;
  const cols = [ORANGE, '#22B573', '#F0476B', '#7CC4FA'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = cols[i];
    ctx.fillRect(i * cw, 0, cw, h);
    circle(ctx, i * cw + cw / 2, h * 0.55, cw * 0.28, '#FFFFFF');
    circle(ctx, i * cw + cw / 2, h * 0.55, cw * 0.18, i === 0 ? '#FFB347' : i === 1 ? '#8BD17C' : i === 2 ? '#FF7A8A' : '#BFE3F5');
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(i * cw, 0, cw, h * 0.18);
  }
};

const drawCrossSmall: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 10, '#1FA65A');
  cross(ctx, w / 2, h / 2, h * 0.6, '#FFFFFF');
};

/** Queue arrows painted on the floor in front of the counter. */
const drawQueue: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#F7C531';
  fillRR(ctx, 0, 0, w, h, h * 0.2, '#F7C531');
  ctx.fillStyle = '#FFFFFF';
  // footprints
  for (const dx of [-0.16, 0.16]) {
    ctx.beginPath();
    ctx.ellipse(w / 2 + dx * w, h * 0.55, w * 0.09, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, w / 2 + dx * w, h * 0.22, w * 0.07, '#FFFFFF');
  }
};

const atlas = once(() =>
  makeAtlas('canteen', 2048, [
    { name: 'menu', w: 1200, h: 520, bg: '#8E5B34', draw: drawMenu },
    { name: 'wash', w: 420, h: 520, bg: '#FFFFFF', draw: drawWash },
    { name: 'eat', w: 380, h: 470, bg: '#FFF8EC', draw: drawEatSafe },
    { name: 'allergy', w: 380, h: 470, bg: '#FFFFFF', draw: drawAllergy },
    { name: 'plate', w: 380, h: 470, bg: '#FFF8EC', draw: drawPlate },
    { name: 'binG', w: 150, h: 170, bg: '#22B573', draw: binLabel('#22B573', 'food', 'بقايا الطعام') },
    { name: 'binB', w: 150, h: 170, bg: '#2D8CFF', draw: binLabel('#2D8CFF', 'paper', 'ورق') },
    { name: 'binY', w: 150, h: 170, bg: '#F2B200', draw: binLabel('#F2B200', 'bottle', 'بلاستيك') },
    { name: 'sink', w: 900, h: 130, bg: '#2D8CFF', draw: drawSinkSign },
    { name: 'slogan', w: 900, h: 150, bg: '#FFFFFF', draw: drawSlogan },
    { name: 'clock', w: 200, h: 200, bg: PAL.ink, draw: drawClock },
    { name: 'pack', w: 256, h: 64, bg: '#FFFFFF', draw: drawPack },
    { name: 'cross', w: 80, h: 80, bg: '#1FA65A', draw: drawCrossSmall },
    { name: 'queue', w: 128, h: 128, bg: '#F7C531', draw: drawQueue },
  ]),
);

/* ------------------------------------------------------------------ builders */

const STOOL_COLORS = ['#FF8A3D', '#2D8CFF', '#22B573', '#F7C531', '#F0476B', '#14B8A6'];

/** Round canteen table (top 0.64) with four stools around it. */
function tableSet(b: Batch, x: number, z: number, seed: number, top: string) {
  b.push([x, 0, z], (seed % 2) * 0.4);
  b.cyl([0, 0.62, 0], [1.15, 0.045, 1.15], top);
  b.cyl([0, 0.595, 0], [1.08, 0.02, 1.08], '#D9DEE4');
  b.cyl([0, 0.31, 0], [0.09, 0.6, 0.09], METAL());
  b.cyl([0, 0.02, 0], [0.6, 0.04, 0.6], PAL.darkMetal);
  shadowRound(b, 0, 0, 0.62);
  // napkin holder
  b.box([0, 0.69, 0], [0.12, 0.09, 0.06], CHROME());
  b.box([0, 0.71, 0], [0.1, 0.08, 0.04], '#FFFFFF');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const sx = Math.sin(a) * 0.8;
    const sz = Math.cos(a) * 0.8;
    const c = STOOL_COLORS[(seed + i) % STOOL_COLORS.length];
    b.cyl([sx, 0.41, sz], [0.36, 0.06, 0.36], c);
    b.cyl8([sx, 0.2, sz], [0.05, 0.38, 0.05], METAL());
    b.cyl([sx, 0.015, sz], [0.3, 0.03, 0.3], PAL.darkMetal);
    shadowRound(b, sx, sz, 0.2);
  }
  b.pop();
}

/** A paper-wrapped sandwich wedge lying flat. */
function sandwich(b: Batch, p: [number, number, number], rotY: number, filling: string) {
  b.push(p, rotY);
  b.add(XGEO.prism, '#F1D29A', [0, 0.015, 0], [0.15, 0.03, 0.15]);
  b.add(XGEO.prism, filling, [0, 0.035, 0], [0.155, 0.012, 0.155]);
  b.add(XGEO.prism, '#F1D29A', [0, 0.055, 0], [0.15, 0.03, 0.15]);
  b.pop();
}

/* ------------------------------------------------------------------ static build */

const build = once(() => {
  const A = atlas();
  const b = new Batch();
  const floor = mat('#FFFFFF', { map: tileTexture('#EFE6D6', '#D8CBB4', [23, 20]), rough: 0.6 });
  const [W, D] = SIZE;
  const shell = buildShell(b, {
    size: SIZE,
    height: H,
    wall: '#FBF4E8',
    low: '#FFE1B8',
    lowHeight: 1.2,
    floor,
    skirting: '#E0A866',
    openings: [
      { wall: 'n', at: CANTEEN.doorX, width: 1.9, height: 2.3, kind: 'door' },
      { wall: 's', at: -4.2, width: 2.2, height: 1.6, sill: 0.95, kind: 'window', view: 'yard' },
      { wall: 's', at: 0, width: 2.2, height: 1.6, sill: 0.95, kind: 'window', view: 'yard' },
      { wall: 's', at: 4.2, width: 2.2, height: 1.6, sill: 0.95, kind: 'window', view: 'yard' },
    ],
    panels: [
      [-4.5, -3],
      [0, -3],
      [4.5, -3],
      [-4.5, 1.2],
      [0, 1.2],
      [4.5, 1.2],
      [-4.5, 4.4],
      [0, 4.4],
    ],
  });

  /* --- north wall: hand-wash sinks beside the entrance --- */
  const sinkCx = (CANTEEN.basins[0] + CANTEEN.basins[CANTEEN.basins.length - 1]) / 2;
  const sinkW = CANTEEN.basins[CANTEEN.basins.length - 1] - CANTEEN.basins[0] + 1.0;
  b.push([sinkCx, 0, -D / 2 + 0.3], 0);
  // tiled splash-back
  b.box([0, 1.15, -0.29], [sinkW + 0.3, 0.9, 0.012], mat('#FFFFFF', { map: tileTexture('#E2F1FA', '#BCD9EA', [Math.round((sinkW + 0.3) / 0.15), 6]), rough: 0.4 }));
  b.rbox([0, 0.36, 0.02], [sinkW, 0.72, 0.55], '#FFFFFF');
  b.box([0, 0.36, 0.296], [sinkW - 0.06, 0.64, 0.01], '#DCEEF7');
  b.rbox([0, 0.735, 0.02], [sinkW + 0.04, 0.05, 0.6], '#C9D6DD');
  for (const bx of CANTEEN.basins) {
    const x = bx - sinkCx;
    b.rbox([x, 0.76, 0.06], [0.5, 0.04, 0.38], '#FFFFFF');
    b.box([x, 0.775, 0.06], [0.42, 0.012, 0.3], '#D7ECF5');
    // faucet (sensor style, child height)
    b.cyl([x, 0.83, -0.16], [0.05, 0.14, 0.05], CHROME());
    b.cyl([x, 0.89, -0.1], [0.035, 0.035, 0.13], CHROME(), [Math.PI / 2, 0, 0]);
    b.cyl([x, 0.875, -0.04], [0.03, 0.03, 0.03], CHROME());
    // mirror tile above each basin
    b.rbox([x, 1.38, -0.27], [0.44, 0.5, 0.02], '#FFFFFF');
    b.box([x, 1.38, -0.258], [0.38, 0.44, 0.006], mat('#D3E7F0', { rough: 0.15, emissive: '#BFD9E6', emissiveIntensity: 0.25 }));
    b.box([x - 0.08, 1.45, -0.254], [0.05, 0.22, 0.002], mat('#F4FAFC', { emissive: '#F4FAFC', emissiveIntensity: 0.4 }), [0, 0, 0.55]);
  }
  // soap dispensers between basins
  for (let i = 0; i < CANTEEN.basins.length - 1; i++) {
    const x = (CANTEEN.basins[i] + CANTEEN.basins[i + 1]) / 2 - sinkCx;
    b.rbox([x, 1.06, -0.24], [0.12, 0.2, 0.09], '#FFFFFF');
    b.box([x, 1.04, -0.194], [0.07, 0.08, 0.004], '#3DBE6E');
    b.box([x, 0.95, -0.21], [0.05, 0.02, 0.05], '#BFC7CE');
  }
  // paper towel dispensers at both ends
  for (const s of [-1, 1]) {
    const x = s * (sinkW / 2 + 0.3);
    b.rbox([x, 1.25, -0.22], [0.3, 0.38, 0.13], '#FFFFFF');
    b.box([x, 1.08, -0.16], [0.2, 0.02, 0.02], '#9AA4AE');
    b.box([x, 1.0, -0.15], [0.16, 0.14, 0.004], '#F6F2EA');
    bin(b, [x, 0, 0.0], '#FFFFFF', '#9AA4AE', 0.5, 0.3);
  }
  shadowRect(b, 0, 0.02, sinkW, 0.55);
  b.pop();
  {
    const f = onWall('n', sinkCx, 2.2, 0.01, SIZE);
    poster(b, f.p, f.rotY, 2.6, 0.38, A.mat, A.rect('sink'));
    const g = onWall('n', sinkCx + sinkW / 2 + 1.05, 1.55, 0.01, SIZE);
    poster(b, g.p, g.rotY, 0.62, 0.77, A.mat, A.rect('wash'));
  }
  // floor drain mat in front of the sinks
  b.rbox([sinkCx, 0.006, -D / 2 + 0.95], [sinkW, 0.012, 0.7], '#5E8FA8');
  for (let i = 0; i < 12; i++) b.box([sinkCx - sinkW / 2 + 0.15 + i * ((sinkW - 0.3) / 11), 0.0135, -D / 2 + 0.95], [0.03, 0.002, 0.6], '#4B7A91');

  /* --- entrance details: exit sign over the doors set at runtime; slogan over the counter --- */

  /* --- east: serving counter, kitchen, menu board --- */
  b.push([CANTEEN.counterX, 0, CANTEEN.counterZ], -Math.PI / 2); // local +Z faces west (room), local +X = room +Z
  const CL = CANTEEN.counterLen;
  // counter body
  b.rbox([0, 0.45, 0], [CL, 0.9, 0.72], '#FFFFFF');
  b.box([0, 0.42, 0.362], [CL - 0.06, 0.62, 0.01], TEAL);
  for (let i = 0; i < 6; i++) b.box([-CL / 2 + 0.35 + i * ((CL - 0.7) / 5), 0.42, 0.37], [0.04, 0.62, 0.006], '#0E9C8C');
  b.box([0, 0.08, 0.35], [CL - 0.04, 0.12, 0.03], '#0E8F82');
  b.rbox([0, 0.915, 0.02], [CL + 0.06, 0.05, 0.8], '#E9DCC7');
  // tray slide rail in front
  b.box([0, 0.86, 0.5], [CL, 0.03, 0.2], CHROME());
  for (const x of [-CL / 2 + 0.2, 0, CL / 2 - 0.2]) b.box([x, 0.86, 0.44], [0.04, 0.03, 0.12], CHROME());
  // sneeze guard
  for (const x of [-CL / 2 + 0.1, -0.2, CL / 2 - 0.1]) b.cyl8([x, 1.15, 0.08], [0.03, 0.46, 0.03], CHROME());
  b.box([0, 1.4, 0.12], [CL - 0.1, 0.02, 0.36], mat(PAL.glass, { opacity: 0.3, rough: 0.05 }), [0.12, 0, 0]);
  b.box([0, 1.4, 0.12], [CL - 0.1, 0.03, 0.03], CHROME());
  // --- food on the counter (from the student's left (room south) to right) ---
  // sandwiches: two trays
  const top = 0.94;
  for (const [tx, fill] of [[-1.5, '#F7C531'], [-0.9, '#7CC46A']] as [number, string][]) {
    b.rbox([tx, top + 0.015, 0.05], [0.5, 0.03, 0.42], '#F4F6F6');
    for (let i = 0; i < 6; i++) sandwich(b, [tx - 0.14 + (i % 3) * 0.14, top + 0.03, -0.07 + Math.floor(i / 3) * 0.18], (i % 2) * Math.PI + 0.2, fill);
  }
  // fruit basket
  b.push([-0.25, top, 0.06], 0);
  b.cyl([0, 0.06, 0], [0.48, 0.12, 0.4], '#C98F5A');
  b.cyl([0, 0.125, 0], [0.5, 0.02, 0.42], '#A8723F');
  const fruitCols = ['#E5484D', '#7FC24A', '#FF9F1C', '#E5484D', '#FF9F1C', '#E5484D', '#7FC24A'];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = i === 8 ? 0 : 0.12;
    b.ballLow([Math.cos(a) * r, 0.16 + (i === 8 ? 0.05 : 0), Math.sin(a) * r * 0.8], [0.09, 0.09, 0.09], fruitCols[i % fruitCols.length]);
  }
  for (let i = 0; i < 3; i++) b.add(XGEO.arc, '#F7C531', [0.04 + i * 0.03, 0.23, -0.02], [0.18, 0.18, 0.5], [Math.PI / 2, 0, -2.2 + i * 0.2]);
  b.pop();
  // juice boxes rack
  b.push([0.45, top, 0.05], 0);
  b.rbox([0, 0.02, 0], [0.56, 0.04, 0.4], '#E9EEF0');
  const jc = ['#FF8A3D', '#22B573', '#F0476B', '#F7C531'];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      const x = -0.2 + c * 0.13;
      const z = -0.12 + r * 0.12;
      b.box([x, 0.11, z], [0.09, 0.14, 0.06], jc[(c + r) % 4]);
      b.plane([x, 0.11, z + 0.031], [0.08, 0.1], A.mat, 0, A.rect('pack'));
      b.box([x, 0.185, z], [0.09, 0.012, 0.06], '#FFFFFF');
      b.cyl8([x + 0.025, 0.22, z], [0.008, 0.07, 0.008], '#F0476B', [0, 0, 0.25]);
    }
  b.pop();
  // water bottles
  b.push([1.15, top, 0.05], 0);
  b.rbox([0, 0.02, 0], [0.5, 0.04, 0.4], '#E9EEF0');
  const bottle = mat('#9ED8FA', { opacity: 0.75, rough: 0.1 });
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      const x = -0.18 + c * 0.12;
      const z = -0.12 + r * 0.12;
      b.cyl8([x, 0.13, z], [0.07, 0.2, 0.07], bottle);
      b.cyl8([x, 0.12, z], [0.072, 0.06, 0.072], '#2D8CFF');
      b.cyl8([x, 0.245, z], [0.035, 0.03, 0.035], '#2D8CFF');
    }
  b.pop();
  // tray stack at the start of the counter
  for (let i = 0; i < 6; i++) b.rbox([1.75, top + 0.015 + i * 0.022, 0.12], [0.42, 0.018, 0.32], i % 2 ? '#FF8A3D' : '#F48024');
  // cash box / card reader near the end
  b.rbox([-1.95, top + 0.08, -0.05], [0.26, 0.16, 0.2], '#4A5563');
  b.box([-1.95, top + 0.13, 0.055], [0.2, 0.08, 0.004], mat('#7CF0C8', { emissive: '#7CF0C8', emissiveIntensity: 0.6 }));
  shadowRect(b, 0, 0, CL, 0.72);

  // kitchen back counter along the east wall (local z negative = east)
  const backZ = -(SIZE[0] / 2 - CANTEEN.counterX) + 0.32;
  b.push([0, 0, backZ], 0);
  b.rbox([0, 0.45, 0], [CL + 0.8, 0.9, 0.62], '#F4F6F6');
  b.rbox([0, 0.915, 0], [CL + 0.84, 0.05, 0.66], '#C9D6DD');
  for (let i = 0; i < 5; i++) b.box([-CL / 2 + 0.1 + i * ((CL + 0.6) / 5) + 0.3, 0.45, 0.312], [0.02, 0.8, 0.01], '#D5DBDE');
  // drinks fridge with glass door (tall, at the north end)
  b.push([CL / 2 - 0.1, 0, 0.0], 0);
  b.rbox([0, 0.95, 0], [0.75, 1.9, 0.62], '#E9EEF0');
  b.box([0, 1.0, 0.311], [0.64, 1.6, 0.01], mat('#CFEAF7', { opacity: 0.5, rough: 0.05 }));
  b.box([0, 1.0, 0.0], [0.64, 1.6, 0.5], mat('#EAF6FC', { emissive: '#EAF6FC', emissiveIntensity: 0.35 }));
  for (let r = 0; r < 4; r++) {
    b.box([0, 0.32 + r * 0.38, 0.05], [0.62, 0.02, 0.44], '#C9D6DD');
    for (let c = 0; c < 5; c++) {
      const x = -0.24 + c * 0.12;
      if (r % 2) b.box([x, 0.42 + r * 0.38, 0.1], [0.09, 0.18, 0.07], jc[(r + c) % 4]);
      else {
        b.cyl8([x, 0.44 + r * 0.38, 0.1], [0.07, 0.22, 0.07], bottle);
        b.cyl8([x, 0.57 + r * 0.38, 0.1], [0.035, 0.03, 0.035], '#2D8CFF');
      }
    }
  }
  b.box([0.28, 1.0, 0.33], [0.03, 0.4, 0.04], CHROME());
  b.rbox([0, 1.86, 0.32], [0.7, 0.12, 0.02], TEAL);
  b.pop();
  // sandwich warmer / microwave and bread on the back counter
  b.rbox([-0.3, 1.1, 0], [0.5, 0.32, 0.4], '#EDEFF1');
  b.box([-0.36, 1.1, 0.201], [0.3, 0.22, 0.004], '#3B4049');
  b.box([-0.1, 1.1, 0.205], [0.06, 0.2, 0.004], '#9AA4AE');
  for (let i = 0; i < 3; i++) b.rbox([-1.2 + i * 0.22, 0.99, 0.05], [0.18, 0.1, 0.32], '#E9B96E');
  b.cyl8([0.5, 1.02, 0.05], [0.24, 0.16, 0.24], '#FFFFFF');
  b.cyl8([0.5, 1.12, 0.05], [0.26, 0.03, 0.26], '#2D8CFF');
  // upper shelf with jars and boxes
  b.box([-0.5, 1.75, -0.1], [2.2, 0.04, 0.32], '#E9DCC7');
  for (let i = 0; i < 9; i++) {
    const x = -1.45 + i * 0.24;
    if (i % 3 === 0) b.cyl8([x, 1.86, -0.1], [0.14, 0.18, 0.14], mat('#FFE9B8', { opacity: 0.85 }));
    else b.box([x, 1.88, -0.1], [0.18, 0.22, 0.14], jc[i % 4]);
  }
  b.pop();
  b.pop(); // counter frame

  // menu board on the east wall
  {
    const f = onWall('e', CANTEEN.counterZ, 2.55, 0.015, SIZE);
    poster(b, f.p, f.rotY, 3.2, 1.39, A.mat, A.rect('menu'));
  }
  // slogan sign hanging over the counter
  b.push([CANTEEN.counterX - 0.1, 2.75, CANTEEN.counterZ], -Math.PI / 2);
  b.box([-1.2, 0.35, 0], [0.015, 0.5, 0.015], '#9AA4AE');
  b.box([1.2, 0.35, 0], [0.015, 0.5, 0.015], '#9AA4AE');
  b.box([0, 0, -0.02], [2.9, 0.48, 0.03], '#FFFFFF');
  b.plane([0, 0, 0.0], [2.86, 0.46], A.mat, 0, A.rect('slogan'));
  b.plane([0, 0, -0.036], [2.86, 0.46], A.mat, Math.PI, A.rect('slogan'));
  b.pop();
  // queue footprints on the floor in front of the counter
  for (let i = 0; i < 4; i++) b.floorPlane([CANTEEN.counterX - 0.9, 0.003, CANTEEN.queue[1] - i * 0.85 + 0.85], [0.42, 0.42], A.mat, Math.PI / 2, A.rect('queue'));

  /* --- tables --- */
  CANTEEN.tables.forEach(([x, z], i) => tableSet(b, x, z, i * 2 + 1, i % 2 ? '#FFFFFF' : '#FFF4E0'));
  // a few lunch items on the background tables
  const t2 = CANTEEN.tables[5];
  b.rbox([t2[0] + 0.2, 0.66, t2[1] - 0.1], [0.36, 0.03, 0.26], '#FF8A3D');
  sandwich(b, [t2[0] + 0.15, 0.675, t2[1] - 0.1], 0.6, '#F7C531');
  b.box([t2[0] + 0.3, 0.73, t2[1] - 0.05], [0.07, 0.11, 0.05], '#22B573');
  b.cyl8([t2[0] - 0.3, 0.73, t2[1] + 0.2], [0.07, 0.18, 0.07], bottle);
  b.cyl8([t2[0] - 0.3, 0.83, t2[1] + 0.2], [0.035, 0.03, 0.035], '#2D8CFF');
  const t4 = CANTEEN.tables[3];
  b.rbox([t4[0] - 0.15, 0.66, t4[1] + 0.12], [0.36, 0.03, 0.26], '#2D8CFF');
  b.ballLow([t4[0] - 0.2, 0.71, t4[1] + 0.1], [0.08, 0.08, 0.08], '#E5484D');
  b.box([t4[0] - 0.05, 0.72, t4[1] + 0.15], [0.07, 0.11, 0.05], '#FF8A3D');

  /* --- west wall: bins, water cooler, posters --- */
  const binsLbl = ['binG', 'binB', 'binY'];
  const binCols = ['#22B573', '#2D8CFF', '#F2B200'];
  CANTEEN.bins.forEach((z, i) => {
    const x = -W / 2 + 0.36;
    b.push([x, 0, z], Math.PI / 2);
    b.rbox([0, 0.42, 0], [0.46, 0.84, 0.46], binCols[i]);
    b.rbox([0, 0.87, -0.02], [0.5, 0.08, 0.5], '#FFFFFF');
    b.box([0, 0.9, 0.08], [0.24, 0.02, 0.08], '#3B4049');
    b.plane([0, 0.5, 0.236], [0.32, 0.36], A.mat, 0, A.rect(binsLbl[i]));
    shadowRect(b, 0, 0, 0.46, 0.46);
    b.pop();
  });
  waterCooler(b, [-W / 2 + 0.35, 0, CANTEEN.cooler], Math.PI / 2);
  b.push([-W / 2 + 0.35, 0, CANTEEN.cooler + 0.4], Math.PI / 2);
  b.box([0, 0.85, 0], [0.12, 0.3, 0.08], '#FFFFFF');
  for (let i = 0; i < 4; i++) b.cyl8([0, 0.75 + i * 0.05, 0.02], [0.07, 0.05, 0.07], '#FFFFFF');
  b.pop();
  {
    const f = onWall('w', -0.4, 1.75, 0.01, SIZE);
    poster(b, f.p, f.rotY, 0.7, 0.87, A.mat, A.rect('eat'));
    const g = onWall('w', 1.2, 1.75, 0.01, SIZE);
    poster(b, g.p, g.rotY, 0.7, 0.87, A.mat, A.rect('plate'));
    const h2 = onWall('w', 2.8, 1.75, 0.01, SIZE);
    poster(b, h2.p, h2.rotY, 0.7, 0.87, A.mat, A.rect('allergy'));
  }
  plant(b, [-W / 2 + 0.5, 0, D / 2 - 0.55], 1.1, '#F2E6D6', 5);
  plant(b, [W / 2 - 0.5, 0, D / 2 - 0.55], 1.0, '#F2E6D6', 8);
  // first aid kit near the counter end (south) on the east wall
  {
    const f = onWall('e', 3.6, 1.55, 0, SIZE);
    b.push(f.p, f.rotY);
    b.rbox([0, 0, 0.08], [0.44, 0.36, 0.15], '#1FA65A');
    b.plane([0, 0, 0.158], [0.2, 0.2], A.mat, 0, A.rect('cross'));
    b.pop();
  }
  // clock and AC
  {
    const f = onWall('w', -3.3, 2.5, 0, SIZE);
    wallClock(b, f.p, f.rotY, A.mat, A.rect('clock'), 0.42);
    for (const x of [-2.1, 2.1]) {
      const g = onWall('s', x, 2.85, 0, SIZE);
      acUnit(b, g.p, g.rotY);
    }
  }
  // ceiling fans (static hubs; blades merged too, they stay still in the canteen)
  for (const [fx, fz] of CANTEEN.fans) {
    fanMount(b, [fx, H, fz], 0.5);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      b.rbox([fx + Math.cos(a) * 0.42, H - 0.53, fz + Math.sin(a) * 0.42], [0.62, 0.02, 0.13], '#F2F2F2', -a);
    }
  }
  // a little bench by the entrance for waiting
  pushWall(b, 'n', CANTEEN.doorX - 1.9, 0, 0.25, SIZE);
  b.rbox([0, 0.4, 0], [1.2, 0.06, 0.36], PAL.wood);
  for (const x of [-0.5, 0.5]) b.box([x, 0.2, 0], [0.06, 0.4, 0.3], PAL.darkMetal);
  shadowRect(b, 0, 0, 1.2, 0.36);
  b.pop();

  return { parts: b.build(), shell };
});

/* ------------------------------------------------------------------ component */

/** Background diners at the far table (hidden with flags people:false). */
const DINERS: { pos: [number, number, number]; rotY: number; seed: number }[] = (() => {
  const [tx, tz] = CANTEEN.tables[5];
  return [0, 1, 2].map((i) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4 + 0.4;
    return { pos: [tx + Math.sin(a) * 0.8, 0, tz + Math.cos(a) * 0.8] as [number, number, number], rotY: a + Math.PI, seed: 40 + i };
  });
})();

export function Canteen() {
  const { parts, shell } = useMemo(build, []);
  const flags = useRoomFlags();
  const door = onWall('n', CANTEEN.doorX, 0, 0, SIZE);
  const exit = onWall('n', CANTEEN.doorX, 2.7, 0.06, SIZE);
  const strobe = onWall('e', -4.8, 2.4, 0, SIZE);
  const tap = flags.tap;
  return (
    <group>
      <BatchMeshes parts={parts} />
      <WindowViews views={shell.views} />
      <CeilingPanels shell={shell} warm />
      <Door p={door.p} rotY={door.rotY} width={1.9} height={2.3} color="#F7C531" double open={flags.door !== 'closed'} />
      <ExitSign p={exit.p} rotY={exit.rotY} scale={0.95} />
      <AlarmStrobe p={strobe.p} rotY={strobe.rotY} />
      {CANTEEN.basins.map((x, i) => (
        <TapStream key={i} p={[x, 0.865, -SIZE[1] / 2 + 0.3 - 0.04]} len={0.08} on={tap === true || tap === i} />
      ))}
      {flags.people !== false &&
        DINERS.map((d, i) => <StaticPerson key={i} kind="boy" seed={d.seed} position={d.pos} rotY={d.rotY} clip="eat" flags={{ seated: true, backpack: false, seatH: 0.44 }} />)}
      {/* unused helpers kept referenced for tree-shaking clarity */}
      {false && <primitive object={{ person, rand }} />}
    </group>
  );
}
