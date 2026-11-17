/**
 * clinic (العيادة) — 8 x 8 m, height 3.4. Local frame: x -4..4, z -4..4.
 * North wall (z = -4): corridor side, door with a green cross. South wall: two windows to the yard.
 * See docs/sets/ground.md for landmarks and flags.
 */
import { useMemo } from 'react';
import { PAL, mat, tileTexture } from '../../kit';
import { StaticPerson } from '../../../characters/Human';
import { Batch, BatchMeshes, once } from './batch';
import { buildShell, CeilingPanels, Door, ExitSign, AlarmStrobe, TapStream, WindowViews, onWall, pushWall, useRoomFlags } from './shell';
import { makeAtlas, text, fillRR, circle, cross, hand, drop, arDigits, drawClock, person, rr, strokeRR, type Draw } from './paint';
import { CHROME, METAL, bin, frame, officeChair, plant, poster, schoolChair, shadowRect, wallClock, acUnit } from './furniture';
import { CLINIC } from './landmarks';

const SIZE: [number, number] = [8, 8];
const H = 3.4;
const GREEN = '#1FA65A';
const MINT = '#CFEDE3';

/* ------------------------------------------------------------------ paintings */

export const drawWash: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 18, '#FFFFFF');
  fillRR(ctx, 0, 0, w, 86, 18, '#2D8CFF');
  ctx.fillStyle = '#2D8CFF';
  ctx.fillRect(0, 50, w, 36);
  text(ctx, 'غسل اليدين', w / 2, 46, 52, '#FFFFFF', w - 40);
  const cells = [
    { bg: '#E3F3FF', kind: 'water' },
    { bg: '#FFF4D6', kind: 'soap' },
    { bg: '#E7F8EC', kind: 'rub' },
    { bg: '#FDE8EF', kind: 'dry' },
  ];
  const cw = (w - 60) / 2;
  const ch = (h - 120) / 2;
  cells.forEach((c, i) => {
    // RTL reading order: first cell top-right
    const col = i % 2 === 0 ? 1 : 0;
    const row = Math.floor(i / 2);
    const x = 20 + col * (cw + 20);
    const y = 100 + row * (ch + 10);
    fillRR(ctx, x, y, cw, ch - 6, 16, c.bg);
    circle(ctx, x + cw - 26, y + 24, 16, '#2D8CFF');
    text(ctx, arDigits(i + 1), x + cw - 26, y + 25, 22, '#FFFFFF');
    const cx = x + cw / 2;
    const cy = y + ch / 2 + 6;
    hand(ctx, cx - 28, cy, 70, '#F2C29B');
    hand(ctx, cx + 28, cy, 70, '#E8B088', true);
    if (c.kind === 'water') for (let k = 0; k < 5; k++) drop(ctx, cx - 50 + k * 25, cy - 52 + (k % 2) * 10, 10, '#4DA9F5');
    if (c.kind === 'soap') {
      for (let k = 0; k < 7; k++) {
        ctx.strokeStyle = '#9CC9F0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx - 55 + ((k * 37) % 110), cy - 40 + ((k * 23) % 60), 7 + (k % 3) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (c.kind === 'rub') {
      ctx.strokeStyle = '#22B573';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 58, -2.6, -0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 50, cy - 40);
      ctx.lineTo(cx + 54, cy - 22);
      ctx.lineTo(cx + 36, cy - 26);
      ctx.fillStyle = '#22B573';
      ctx.fill();
    }
    if (c.kind === 'dry') {
      fillRR(ctx, cx - 60, cy + 20, 120, 26, 8, '#F0476B');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 60, cy + 30, 120, 4);
    }
  });
};

/** Lea-style eye chart: shapes in rows getting smaller. */
const drawEye: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 10, '#FFFFFF');
  strokeRR(ctx, 6, 6, w - 12, h - 12, 8, '#2D8CFF', 5);
  // eye icon on top
  ctx.save();
  ctx.translate(w / 2, 40);
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#E3F3FF';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#1E2A3B';
  ctx.stroke();
  circle(ctx, 0, 0, 13, '#2D8CFF');
  circle(ctx, 0, 0, 6, '#1E2A3B');
  ctx.restore();
  const shapes = ['circle', 'square', 'house', 'heart'];
  const rows = [1, 2, 3, 4, 5, 5, 6];
  let y = 104;
  rows.forEach((n, ri) => {
    const s = Math.max(9, 58 - ri * 8);
    for (let i = 0; i < n; i++) {
      const x = w / 2 + (i - (n - 1) / 2) * (s * 1.5);
      shape(ctx, shapes[(ri * 3 + i) % 4], x, y, s);
    }
    y += s * 1.45 + 6;
  });
};

function shape(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, s: number) {
  ctx.fillStyle = '#1E2A3B';
  ctx.beginPath();
  if (kind === 'circle') ctx.arc(x, y, s / 2, 0, Math.PI * 2);
  else if (kind === 'square') ctx.rect(x - s / 2, y - s / 2, s, s);
  else if (kind === 'house') {
    ctx.moveTo(x, y - s / 2);
    ctx.lineTo(x + s / 2, y - s * 0.05);
    ctx.lineTo(x + s * 0.36, y - s * 0.05);
    ctx.lineTo(x + s * 0.36, y + s / 2);
    ctx.lineTo(x - s * 0.36, y + s / 2);
    ctx.lineTo(x - s * 0.36, y - s * 0.05);
    ctx.lineTo(x - s / 2, y - s * 0.05);
  } else {
    ctx.moveTo(x, y + s * 0.45);
    ctx.bezierCurveTo(x - s * 0.7, y - s * 0.05, x - s * 0.35, y - s * 0.6, x, y - s * 0.2);
    ctx.bezierCurveTo(x + s * 0.35, y - s * 0.6, x + s * 0.7, y - s * 0.05, x, y + s * 0.45);
  }
  ctx.closePath();
  ctx.fill();
}

/** Giraffe height chart covering 0.6 m .. 1.7 m on the wall. */
const CHART_LO = 60;
const CHART_HI = 170;
const drawHeight: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#FFF8EC';
  ctx.fillRect(0, 0, w, h);
  const bands = ['#F0476B', '#FF8A3D', '#F7C531', '#22B573', '#2D8CFF', '#8B5CF6'];
  const stripX = w * 0.56;
  const stripW = w * 0.4;
  bands.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(stripX, (i * h) / bands.length, stripW, h / bands.length + 1);
  });
  const yOf = (cm: number) => h - ((cm - CHART_LO) / (CHART_HI - CHART_LO)) * h;
  for (let cm = CHART_LO; cm <= CHART_HI; cm += 5) {
    const y = yOf(cm);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(stripX, y - 1.5, cm % 10 === 0 ? stripW * 0.55 : stripW * 0.3, 3);
    if (cm % 10 === 0 && cm > CHART_LO && cm < CHART_HI) text(ctx, arDigits(cm), stripX + stripW * 0.72, y, 17, '#FFFFFF');
  }
  // giraffe: long neck along the left
  const gx = w * 0.27;
  ctx.fillStyle = '#F5C04A';
  fillRR(ctx, gx - 13, h * 0.1, 26, h * 0.8, 12, '#F5C04A');
  fillRR(ctx, gx - 30, h * 0.04, 56, 40, 18, '#F5C04A');
  fillRR(ctx, gx - 40, h * 0.86, 80, 50, 20, '#F5C04A');
  for (let i = 0; i < 9; i++) circle(ctx, gx + ((i % 2) * 2 - 1) * 5, h * 0.16 + i * h * 0.08, 6, '#C98A2E');
  circle(ctx, gx - 12, h * 0.065, 4, '#1E2A3B');
  fillRR(ctx, gx - 8, h * 0.015, 4, 14, 2, '#C98A2E');
  fillRR(ctx, gx + 4, h * 0.015, 4, 14, 2, '#C98A2E');
  ctx.fillStyle = '#E8A23A';
  ctx.fillRect(gx - 34, h * 0.93, 8, h * 0.07);
  ctx.fillRect(gx + 22, h * 0.93, 8, h * 0.07);
};

const drawPlaque: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 20, '#FFFFFF');
  strokeRR(ctx, 6, 6, w - 12, h - 12, 16, GREEN, 6);
  circle(ctx, w - h / 2, h / 2, h * 0.34, GREEN);
  cross(ctx, w - h / 2, h / 2, h * 0.38, '#FFFFFF');
  text(ctx, 'العيادة المدرسية', (w - h) / 2 + 10, h / 2 + 4, 58, PAL.ink, w - h - 30);
};

const drawNameplate: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 8, '#14B8A6');
  text(ctx, 'المرشد الصحي', w / 2, h / 2 + 3, 44, '#FFFFFF', w - 20);
};

const drawHealth: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 16, '#FFF8EC');
  fillRR(ctx, 14, 14, w - 28, 74, 14, '#22B573');
  text(ctx, 'صحتك تهمنا', w / 2, 52, 46, '#FFFFFF', w - 60);
  // heart
  ctx.save();
  ctx.translate(w / 2, h * 0.47);
  ctx.fillStyle = '#F0476B';
  ctx.beginPath();
  ctx.moveTo(0, 70);
  ctx.bezierCurveTo(-110, 0, -60, -90, 0, -36);
  ctx.bezierCurveTo(60, -90, 110, 0, 0, 70);
  ctx.fill();
  ctx.restore();
  // apple, water glass, sleeping moon
  circle(ctx, w * 0.22, h * 0.8, 34, '#E5484D');
  fillRR(ctx, w * 0.22 - 3, h * 0.8 - 46, 6, 16, 3, '#6B4A2E');
  ctx.fillStyle = '#3DBE6E';
  ctx.beginPath();
  ctx.ellipse(w * 0.22 + 14, h * 0.8 - 40, 14, 7, -0.5, 0, Math.PI * 2);
  ctx.fill();
  fillRR(ctx, w * 0.5 - 24, h * 0.8 - 40, 48, 76, 8, '#BFE3F5');
  fillRR(ctx, w * 0.5 - 24, h * 0.8 - 10, 48, 46, 8, '#4DA9F5');
  ctx.fillStyle = '#F7C531';
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.8, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF8EC';
  ctx.beginPath();
  ctx.arc(w * 0.78 + 16, h * 0.8 - 12, 30, 0, Math.PI * 2);
  ctx.fill();
};

const drawMonitor: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#EAF6F4';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#14B8A6';
  ctx.fillRect(0, 0, w, h * 0.18);
  for (let i = 0; i < 4; i++) {
    fillRR(ctx, w * 0.08, h * (0.28 + i * 0.16), w * 0.5, h * 0.08, 4, '#B9D9D4');
    fillRR(ctx, w * 0.66, h * (0.28 + i * 0.16), w * 0.26, h * 0.08, 4, i === 1 ? '#22B573' : '#CFE7E3');
  }
};

const drawStickers: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  const cols = ['#F7C531', '#F0476B', '#22B573', '#2D8CFF'];
  for (let i = 0; i < 6; i++) {
    const x = (i % 3) * (w / 3) + w / 6;
    const y = Math.floor(i / 3) * (h / 2) + h / 4;
    if (i % 2) circle(ctx, x, y, w / 8, cols[i % 4]);
    else {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const r = k % 2 ? w / 18 : w / 8;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.fillStyle = cols[i % 4];
      ctx.fill();
    }
  }
};

const drawBox: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2D8CFF';
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  hand(ctx, w * 0.3, h * 0.38, h * 0.5, '#7CC4FA');
  hand(ctx, w * 0.6, h * 0.38, h * 0.5, '#7CC4FA', true);
};

const drawCrossPoster: Draw = (ctx, w, h) => {
  ctx.fillStyle = GREEN;
  rr(ctx, 0, 0, w, h, 12);
  ctx.fill();
  cross(ctx, w / 2, h / 2, h * 0.62, '#FFFFFF');
};

const drawCalendar: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  // picture: sun over dunes and a palm
  ctx.fillStyle = '#8FD0F5';
  ctx.fillRect(0, 0, w, h * 0.38);
  circle(ctx, w * 0.75, h * 0.12, h * 0.07, '#F7C531');
  ctx.fillStyle = '#E4CB9B';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.38);
  ctx.quadraticCurveTo(w * 0.3, h * 0.22, w * 0.6, h * 0.33);
  ctx.quadraticCurveTo(w * 0.8, h * 0.28, w, h * 0.3);
  ctx.lineTo(w, h * 0.38);
  ctx.fill();
  ctx.fillStyle = '#E5484D';
  ctx.fillRect(0, h * 0.38, w, h * 0.1);
  text(ctx, arDigits(1447), w / 2, h * 0.435, h * 0.07, '#FFFFFF');
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 7; c++) {
      const n = r * 7 + c + 1;
      if (n > 30) continue;
      const x = w - (c + 0.5) * (w / 7);
      const y = h * 0.53 + r * h * 0.09;
      text(ctx, arDigits(n), x, y + h * 0.03, h * 0.05, c === 5 || c === 6 ? '#E5484D' : PAL.ink, undefined, 500);
    }
  strokeRR(ctx, 22, h * 0.53 + 2 * h * 0.09 - 4, 32, h * 0.07, 6, '#22B573', 3);
};

const atlas = once(() =>
  makeAtlas('clinic', 1024, [
    { name: 'wash', w: 420, h: 520, bg: '#FFFFFF', draw: drawWash },
    { name: 'eye', w: 260, h: 470, bg: '#FFFFFF', draw: drawEye },
    { name: 'height', w: 140, h: 560, bg: '#FFF8EC', draw: drawHeight },
    { name: 'plaque', w: 560, h: 150, bg: '#FFFFFF', draw: drawPlaque },
    { name: 'health', w: 340, h: 460, bg: '#FFF8EC', draw: drawHealth },
    { name: 'clock', w: 200, h: 200, bg: PAL.ink, draw: drawClock },
    { name: 'name', w: 300, h: 80, bg: '#14B8A6', draw: drawNameplate },
    { name: 'monitor', w: 200, h: 120, bg: '#EAF6F4', draw: drawMonitor },
    { name: 'stickers', w: 150, h: 100, bg: '#FFFFFF', draw: drawStickers },
    { name: 'gloves', w: 140, h: 90, bg: '#FFFFFF', draw: drawBox },
    { name: 'cross', w: 90, h: 90, bg: GREEN, draw: drawCrossPoster },
    { name: 'calendar', w: 180, h: 250, bg: '#FFFFFF', draw: drawCalendar },
  ]),
);

/* ------------------------------------------------------------------ static build */

const build = once(() => {
  const A = atlas();
  const b = new Batch();
  const floor = mat('#FFFFFF', { map: tileTexture('#E8F0F1', '#CCDADD', [13, 13]), rough: 0.55 });
  const shell = buildShell(b, {
    size: SIZE,
    height: H,
    wall: '#F8F6F1',
    low: MINT,
    lowHeight: 1.2,
    floor,
    skirting: '#9CCFBE',
    openings: [
      { wall: 'n', at: CLINIC.doorX, width: 1.0, height: 2.2, kind: 'door' },
      { wall: 's', at: -1.7, width: 1.8, height: 1.4, sill: 0.95, kind: 'window', view: 'yard' },
      { wall: 's', at: 1.7, width: 1.8, height: 1.4, sill: 0.95, kind: 'window', view: 'yard' },
    ],
    panels: [
      [-1.6, -1.6],
      [1.6, -1.6],
      [-1.6, 1.6],
      [1.6, 1.6],
    ],
  });

  /* --- north wall: supply cabinet, sink, gloves, first aid kit, fridge --- */
  // supply cabinet (white, glass upper doors)
  b.push([-3.0, 0, -4 + 0.24], 0);
  b.rbox([0, 0.5, 0], [1.3, 1.0, 0.46], '#FBFBFA');
  b.box([-0.63, 1.5, 0], [0.04, 1.0, 0.46], '#FBFBFA');
  b.box([0.63, 1.5, 0], [0.04, 1.0, 0.46], '#FBFBFA');
  b.rbox([0, 1.98, 0], [1.32, 0.06, 0.48], '#FBFBFA');
  b.box([0, 0.5, 0.232], [1.2, 0.86, 0.01], '#F1F3F3');
  b.box([0, 0.5, 0.236], [0.01, 0.84, 0.01], '#D5DBDE');
  b.box([-0.08, 0.55, 0.245], [0.03, 0.12, 0.02], CHROME());
  b.box([0.08, 0.55, 0.245], [0.03, 0.12, 0.02], CHROME());
  b.box([0, 1.5, -0.2], [1.22, 1.0, 0.04], '#E4F2F1'); // inner back of glass part
  for (const y of [1.08, 1.38, 1.68]) b.box([0, y, 0.08], [1.18, 0.025, 0.3], '#E2E6E8');
  // supplies: boxes and bottles
  const supply = ['#2D8CFF', '#F0476B', '#22B573', '#F7C531', '#FFFFFF', '#7CC4FA', '#FF8A3D'];
  for (let r = 0; r < 3; r++) {
    let x = -0.52;
    let i = 0;
    while (x < 0.5) {
      const kind = (r * 5 + i) % 4;
      if (kind === 0) {
        b.cyl8([x + 0.04, 1.1 + r * 0.3 + 0.08, 0.08], [0.08, 0.16, 0.08], supply[(r + i) % 7]);
        b.cyl8([x + 0.04, 1.1 + r * 0.3 + 0.175, 0.08], [0.045, 0.03, 0.045], '#FFFFFF');
        x += 0.1;
      } else {
        const bw = 0.12 + ((r + i) % 3) * 0.04;
        const bh = 0.1 + ((r * 2 + i) % 3) * 0.04;
        b.box([x + bw / 2, 1.1 + r * 0.3 + bh / 2, 0.08], [bw, bh, 0.2], supply[(r * 2 + i) % 7]);
        b.box([x + bw / 2, 1.1 + r * 0.3 + bh * 0.6, 0.181], [bw * 0.7, bh * 0.3, 0.005], '#FFFFFF');
        x += bw + 0.02;
      }
      i++;
    }
  }
  b.plane([0, 1.45, 0.235], [1.2, 0.86], mat(PAL.glass, { opacity: 0.22, rough: 0.05 }));
  b.box([0, 1.45, 0.236], [0.02, 0.86, 0.012], '#E6EAEC');
  b.box([0, 1.88, 0.236], [1.22, 0.025, 0.012], '#E6EAEC');
  b.box([0, 1.02, 0.236], [1.22, 0.025, 0.012], '#E6EAEC');
  // green cross on top
  b.plane([0, 2.13, 0.05], [0.24, 0.24], A.mat, 0, A.rect('cross'));
  b.box([0, 2.13, 0.04], [0.26, 0.26, 0.015], '#FFFFFF');
  shadowRect(b, 0, 0, 1.3, 0.46);
  b.pop();

  // sink vanity with mirror, soap, towels
  const sx = CLINIC.sink[0];
  b.push([sx, 0, -4 + 0.28], 0);
  b.rbox([0, 0.42, 0], [1.1, 0.84, 0.55], '#FFFFFF');
  b.box([-0.275, 0.42, 0.277], [0.53, 0.76, 0.01], '#EAF5F2');
  b.box([0.275, 0.42, 0.277], [0.53, 0.76, 0.01], '#EAF5F2');
  b.box([-0.05, 0.6, 0.29], [0.02, 0.1, 0.02], CHROME());
  b.box([0.05, 0.6, 0.29], [0.02, 0.1, 0.02], CHROME());
  b.rbox([0, 0.865, 0.01], [1.14, 0.05, 0.58], '#D9E2E4');
  b.rbox([0.05, 0.9, 0.04], [0.5, 0.04, 0.36], '#FFFFFF');
  b.box([0.05, 0.917, 0.04], [0.42, 0.012, 0.28], '#E3EEF2');
  // faucet
  b.cyl([0.05, 0.96, -0.17], [0.05, 0.12, 0.05], CHROME());
  b.cyl([0.05, 1.02, -0.11], [0.035, 0.035, 0.14], CHROME(), [Math.PI / 2, 0, 0]);
  b.cyl([0.05, 1.0, -0.045], [0.03, 0.04, 0.03], CHROME());
  b.box([0.05, 1.04, -0.2], [0.03, 0.025, 0.12], CHROME());
  // soap bottle on counter + box of gloves
  b.cyl8([0.42, 0.95, -0.12], [0.08, 0.13, 0.08], '#3DBE6E');
  b.cyl8([0.42, 1.03, -0.12], [0.025, 0.04, 0.025], '#FFFFFF');
  b.box([0.42, 1.05, -0.09], [0.012, 0.012, 0.05], '#FFFFFF');
  b.push([-0.36, 0.89, -0.05], 0.2);
  b.box([0, 0.065, 0], [0.26, 0.13, 0.14], '#FFFFFF');
  b.plane([0, 0.065, 0.071], [0.26, 0.13], A.mat, 0, A.rect('gloves'));
  b.ballLow([0.02, 0.14, 0], [0.09, 0.05, 0.06], '#7CC4FA');
  b.ballLow([-0.04, 0.145, 0.01], [0.07, 0.05, 0.05], '#5FB0F0');
  b.pop();
  // mirror
  b.rbox([0.05, 1.62, -0.27], [0.66, 0.78, 0.03], '#FFFFFF');
  b.box([0.05, 1.62, -0.252], [0.58, 0.7, 0.01], mat('#D3E7F0', { rough: 0.15, emissive: '#BFD9E6', emissiveIntensity: 0.25 }));
  b.box([-0.1, 1.74, -0.246], [0.07, 0.34, 0.002], mat('#F4FAFC', { emissive: '#F4FAFC', emissiveIntensity: 0.4 }), [0, 0, 0.55]);
  b.box([0.0, 1.66, -0.246], [0.03, 0.2, 0.002], mat('#F4FAFC', { emissive: '#F4FAFC', emissiveIntensity: 0.4 }), [0, 0, 0.55]);
  // paper towel dispenser (left)
  b.rbox([-0.86, 1.32, -0.21], [0.3, 0.36, 0.13], '#FFFFFF');
  b.box([-0.86, 1.16, -0.15], [0.2, 0.02, 0.02], '#9AA4AE');
  b.box([-0.86, 1.08, -0.14], [0.16, 0.14, 0.004], '#F6F2EA');
  // wall soap dispenser (right)
  b.rbox([0.56, 1.28, -0.215], [0.13, 0.2, 0.1], '#FFFFFF');
  b.box([0.56, 1.26, -0.164], [0.08, 0.08, 0.004], '#3DBE6E');
  b.box([0.56, 1.17, -0.18], [0.05, 0.02, 0.05], '#BFC7CE');
  shadowRect(b, 0, 0, 1.1, 0.55);
  b.pop();
  // pedal bin beside the sink (yellow lid for medical waste, white body)
  bin(b, [sx + 0.82, 0, -3.66], '#FFFFFF', '#F7C531', 0.48, 0.32);
  b.box([sx + 0.82, 0.02, -3.47], [0.12, 0.02, 0.06], '#BFC7CE');

  // first aid kit on the wall
  b.push([CLINIC.kit[0], CLINIC.kit[1], -4], 0);
  b.rbox([0, 0, 0.09], [0.52, 0.42, 0.17], GREEN);
  b.box([0, 0, 0.177], [0.08, 0.26, 0.012], '#FFFFFF');
  b.box([0, 0, 0.177], [0.26, 0.08, 0.012], '#FFFFFF');
  b.rbox([0, 0.23, 0.09], [0.2, 0.04, 0.06], '#14864A');
  b.box([-0.26, 0, 0.09], [0.012, 0.3, 0.14], '#14864A');
  b.box([0.26, 0, 0.09], [0.012, 0.3, 0.14], '#14864A');
  b.pop();
  // sticker sheet + note under the kit
  poster(b, [CLINIC.kit[0], 1.05, -4 + 0.012], 0, 0.27, 0.18, A.mat, A.rect('stickers'));

  // small fridge
  b.push([1.35, 0, -4 + 0.3], 0);
  b.rbox([0, 0.43, 0], [0.52, 0.86, 0.56], '#FBFBFA');
  b.box([0, 0.43, 0.283], [0.48, 0.8, 0.01], '#F0F2F2');
  b.box([0.19, 0.55, 0.3], [0.03, 0.3, 0.03], '#BFC7CE');
  b.box([0, 0.8, 0.29], [0.44, 0.012, 0.01], '#D5DBDE');
  b.box([-0.08, 0.6, 0.29], [0.12, 0.12, 0.003], '#7CC4FA');
  // tissue box on top
  b.box([-0.05, 0.92, 0.0], [0.24, 0.1, 0.13], '#F7C531');
  b.ballLow([-0.05, 0.98, 0.0], [0.08, 0.06, 0.05], '#FFFFFF');
  b.cyl8([0.16, 0.95, 0.05], [0.08, 0.16, 0.08], '#FFFFFF');
  shadowRect(b, 0, 0, 0.52, 0.56);
  b.pop();

  /* --- west wall: examination bed with paper roll, curtain, poster, height chart + scale --- */
  const [bx, , bz] = CLINIC.bedCentre;
  b.push([bx, 0, bz], 0);
  // frame and legs
  for (const [x, z] of [[-0.3, -0.85], [0.3, -0.85], [-0.3, 0.85], [0.3, 0.85]] as [number, number][]) {
    b.cyl8([x, 0.3, z], [0.05, 0.6, 0.05], CHROME());
    b.cyl8([x, 0.02, z], [0.08, 0.04, 0.08], '#4A5563');
  }
  b.box([0, 0.2, 0], [0.56, 0.03, 1.66], CHROME());
  b.rbox([0, 0.58, 0], [0.7, 0.1, 1.86], '#E3E8EA');
  b.rbox([0, 0.68, 0.12], [0.7, 0.1, 1.62], '#7FD3C3');
  // raised backrest at the head (north end)
  b.push([0, 0.67, -0.7], 0);
  b.rbox([0, 0.13, -0.08], [0.7, 0.09, 0.5], '#7FD3C3', [0.42, 0, 0]);
  b.pop();
  // paper sheet over the bed and roll at the head
  b.box([0, 0.733, 0.15], [0.52, 0.004, 1.5], '#FFFDF6');
  b.box([0, 0.78, -0.69], [0.52, 0.004, 0.46], '#FFFDF6', [0.42, 0, 0]);
  b.cyl([0, 0.96, -1.03], [0.13, 0.56, 0.13], '#FFFDF6', [0, 0, Math.PI / 2]);
  b.cyl8([0, 0.96, -1.03], [0.035, 0.62, 0.035], CHROME(), [0, 0, Math.PI / 2]);
  b.box([-0.31, 0.86, -1.0], [0.02, 0.22, 0.04], CHROME());
  b.box([0.31, 0.86, -1.0], [0.02, 0.22, 0.04], CHROME());
  // pillow
  b.rbox([0, 0.98, -0.82], [0.46, 0.09, 0.26], '#FFFFFF', [0.42, 0, 0]);
  shadowRect(b, 0, 0, 0.75, 1.9);
  b.pop();
  // step stool by the bed
  b.push([bx + 0.65, 0, bz + 0.45], 0);
  b.rbox([0, 0.11, 0.08], [0.42, 0.05, 0.2], '#FFFFFF');
  b.rbox([0, 0.22, -0.06], [0.42, 0.05, 0.2], '#FFFFFF');
  b.box([-0.19, 0.11, 0], [0.025, 0.22, 0.36], '#D9DEE4');
  b.box([0.19, 0.11, 0], [0.025, 0.22, 0.36], '#D9DEE4');
  b.box([0, 0.248, -0.06], [0.36, 0.006, 0.16], '#7FD3C3');
  b.box([0, 0.138, 0.08], [0.36, 0.006, 0.16], '#7FD3C3');
  shadowRect(b, 0, 0, 0.42, 0.36);
  b.pop();
  // privacy curtain on a ceiling rail at the bed's foot, drawn back to the wall
  const rz = bz + 1.15;
  b.box([-4 + 0.8, 2.42, rz], [1.6, 0.035, 0.035], '#E3E7EA');
  b.box([-4 + 1.58, 2.92, rz], [0.015, 0.96, 0.015], '#E3E7EA');
  b.box([-4 + 0.4, 2.92, rz], [0.015, 0.96, 0.015], '#E3E7EA');
  for (let i = 0; i < 7; i++) b.rbox([-4 + 0.14 + i * 0.075, 1.35, rz + (i % 2 ? 0.04 : -0.04)], [0.1, 2.08, 0.06], i % 2 ? '#9FD8CF' : '#8CCFC3');
  // poster over the bed + wall plaque
  {
    const f = onWall('w', bz + 0.05, 1.72, 0.01, SIZE);
    poster(b, f.p, f.rotY, 0.62, 0.77, A.mat, A.rect('wash'));
  }
  // height chart and scale (south part of the west wall)
  {
    const z = CLINIC.scale[1];
    const f = onWall('w', z, 0.6 + 0.55, 0.012, SIZE);
    b.push(f.p, f.rotY);
    b.box([0, 0, -0.004], [0.4, 1.14, 0.012], '#FFFFFF');
    b.plane([0, 0, 0.004], [0.37, 1.1], A.mat, 0, A.rect('height'));
    b.pop();
    // sliding head piece of the height chart
    b.box([-4 + 0.1, 1.42, z], [0.16, 0.025, 0.3], '#2D8CFF');
    b.push([-4 + 0.38, 0, z], Math.PI / 2);
    b.rbox([0, 0.035, 0], [0.4, 0.07, 0.42], '#FFFFFF');
    b.box([0, 0.072, 0.04], [0.34, 0.006, 0.28], '#CFEDE3');
    b.rbox([0, 0.074, -0.15], [0.16, 0.012, 0.07], '#1C2430');
    b.box([0, 0.081, -0.15], [0.12, 0.003, 0.045], mat('#7CF0C8', { emissive: '#7CF0C8', emissiveIntensity: 0.8 }));
    for (const fx of [-0.07, 0.07]) b.box([fx, 0.077, 0.06], [0.09, 0.003, 0.17], '#A9D9CB');
    b.pop();
  }
  plant(b, [-3.45, 0, 3.4], 1.05, '#F2E6D6', 3);

  /* --- east wall: counselor desk, chairs, plaque, eye chart, clock --- */
  const [dx, , dz] = CLINIC.deskCentre;
  b.push([dx, 0, dz], -Math.PI / 2); // desk faces west (local +Z = room -X)
  b.rbox([0, 0.735, 0], [1.4, 0.04, 0.7], '#E9DCC7');
  b.box([-0.67, 0.36, 0], [0.04, 0.72, 0.64], '#D9C6A8');
  b.box([0.67, 0.36, 0], [0.04, 0.72, 0.64], '#D9C6A8');
  b.box([0, 0.42, 0.3], [1.3, 0.56, 0.02], '#D9C6A8');
  // drawer unit
  b.box([0.45, 0.36, -0.05], [0.4, 0.68, 0.56], '#E9DCC7');
  for (const y of [0.18, 0.4, 0.6]) b.box([0.45, y, -0.33], [0.12, 0.02, 0.02], CHROME());
  // monitor faces the counselor (local -Z)
  b.push([-0.25, 0.755, 0.05], Math.PI);
  b.box([0, 0.01, 0], [0.2, 0.02, 0.15], '#5A626C');
  b.box([0, 0.12, -0.02], [0.04, 0.2, 0.03], '#5A626C');
  b.rbox([0, 0.3, 0], [0.5, 0.31, 0.04], '#5A626C');
  b.plane([0, 0.3, 0.021], [0.46, 0.27], A.glow(1), 0, A.rect('monitor'));
  b.pop();
  b.box([-0.25, 0.765, -0.17], [0.4, 0.02, 0.14], '#E6E8EA');
  b.box([0.08, 0.765, -0.17], [0.07, 0.02, 0.1], '#E6E8EA');
  // files, pen cup, nameplate (faces the student, local +Z)
  b.box([0.42, 0.775, 0.06], [0.26, 0.04, 0.32], '#2D8CFF', 0.1);
  b.box([0.42, 0.81, 0.05], [0.26, 0.03, 0.32], '#F7C531', -0.05);
  b.cyl8([0.12, 0.81, 0.18], [0.08, 0.12, 0.08], '#14B8A6');
  b.cyl8([0.11, 0.89, 0.18], [0.008, 0.12, 0.008], '#F0476B', [0.2, 0, 0.1]);
  b.cyl8([0.13, 0.89, 0.17], [0.008, 0.12, 0.008], '#2D8CFF', [-0.15, 0, -0.1]);
  b.push([0.05, 0.8, 0.27], 0);
  b.box([0, 0, -0.01], [0.32, 0.08, 0.04], '#0E8F82', [-0.35, 0, 0]);
  b.plane([0, 0.005, 0.012], [0.3, 0.075], A.mat, [-0.35, 0, 0], A.rect('name'));
  b.pop();
  // little plant
  b.cyl8([-0.58, 0.8, 0.2], [0.11, 0.1, 0.11], '#F7C531');
  b.ballLow([-0.58, 0.9, 0.2], [0.16, 0.14, 0.16], '#4CAF5A');
  shadowRect(b, 0, 0, 1.4, 0.7);
  b.pop();
  officeChair(b, [CLINIC.counselorSeat[0], 0, CLINIC.counselorSeat[1]], -Math.PI / 2, '#2F6FB0');
  schoolChair(b, [CLINIC.studentSeat[0], 0, CLINIC.studentSeat[1]], Math.PI / 2, '#FF8A3D');
  // second waiting chair under the east window side
  schoolChair(b, [3.45, 0, 2.2], -Math.PI / 2 - 0.25, '#7CC4FA');
  {
    const f = onWall('e', dz, 2.2, 0.012, SIZE);
    frame(b, f.p, f.rotY, 1.0, 0.27, A.mat, A.rect('plaque'), '#FFFFFF', 0.02);
  }
  {
    const f = onWall('e', 1.15, 1.45, 0.01, SIZE);
    poster(b, f.p, f.rotY, 0.56, 1.01, A.mat, A.rect('eye'));
  }
  {
    const f = onWall('e', -2.75, 1.75, 0.01, SIZE);
    poster(b, f.p, f.rotY, 0.56, 0.76, A.mat, A.rect('health'));
  }
  // low filing cabinet with binders under the poster
  pushWall(b, 'e', -2.75, 0, 0.26, SIZE);
  b.rbox([0, 0.4, 0], [0.9, 0.8, 0.48], '#E9DCC7');
  for (const y of [0.22, 0.58]) {
    b.box([0, y, 0.242], [0.84, 0.32, 0.01], '#F3E9D8');
    b.box([0, y + 0.08, 0.255], [0.16, 0.025, 0.02], CHROME());
  }
  ['#2D8CFF', '#22B573', '#F0476B', '#F7C531', '#14B8A6'].forEach((c, i) => b.box([-0.34 + i * 0.075, 0.95, -0.05], [0.06, 0.3, 0.26], c));
  b.box([0.22, 0.83, 0.02], [0.3, 0.06, 0.22], '#FFFFFF');
  b.box([0.22, 0.87, 0.02], [0.28, 0.02, 0.2], '#7CC4FA');
  shadowRect(b, 0, 0, 0.9, 0.48);
  b.pop();
  // wall calendar between the desk plaque and the eye chart
  {
    const f = onWall('e', 0.42, 1.5, 0.008, SIZE);
    poster(b, f.p, f.rotY, 0.36, 0.5, A.mat, A.rect('calendar'));
  }
  {
    const f = onWall('n', 0.15, 2.55, 0.0, SIZE);
    wallClock(b, f.p, f.rotY, A.mat, A.rect('clock'), 0.34);
  }
  {
    const f = onWall('s', 0, 2.72, 0.0, SIZE);
    acUnit(b, f.p, f.rotY);
  }
  // window blinds tops (rolled) over the south windows
  for (const x of [-1.7, 1.7]) b.cyl([x, 2.45, 4 - 0.08], [0.09, 1.9, 0.09], '#EAF2F2', [0, 0, Math.PI / 2]);

  return { parts: b.build(), shell };
});

/* ------------------------------------------------------------------ component */

export function Clinic() {
  const { parts, shell } = useMemo(build, []);
  const flags = useRoomFlags();
  const door = onWall('n', CLINIC.doorX, 0, 0, SIZE);
  const exit = onWall('n', CLINIC.doorX, 2.55, 0.0, SIZE);
  const strobe = onWall('n', 3.55, 2.3, 0, SIZE);
  return (
    <group>
      <BatchMeshes parts={parts} />
      <WindowViews views={shell.views} />
      <CeilingPanels shell={shell} />
      <Door p={door.p} rotY={door.rotY} width={1.0} height={2.2} color="#F4F6F6" cross={GREEN} open={flags.door === 'open'} hinge="right" />
      <ExitSign p={[exit.p[0], exit.p[1], exit.p[2] + 0.06]} rotY={0} scale={0.9} />
      <AlarmStrobe p={strobe.p} rotY={strobe.rotY} />
      <TapStream p={[CLINIC.sink[0] + 0.05, 0.995, -4 + 0.28 - 0.045]} len={0.07} on={flags.tap === true || flags.tap === 0} />
      {flags.people !== false && flags.counselor === true && <StaticPerson kind="counselor" seed={7} position={[CLINIC.counselorSeat[0], 0, CLINIC.counselorSeat[1]]} rotY={-Math.PI / 2} clip="idle" />}
    </group>
  );
}

export { METAL };
