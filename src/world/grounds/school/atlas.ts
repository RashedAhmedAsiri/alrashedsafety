/**
 * One canvas atlas with every sign, pictogram and painted panel of the school grounds, so all signs
 * render as a single merged mesh (one draw call; a second one for the glowing exit signs).
 * Everything a student can read is Arabic; most signs are pictures only.
 */
import * as THREE from 'three';
import { FONT_FAMILY } from '../../../core/fonts';
import { PAL, canvasTexture } from '../../kit';

type Ctx = CanvasRenderingContext2D;
type Draw = (ctx: Ctx, w: number, h: number) => void;

export const ATLAS_W = 2048;
export const ATLAS_H = 1024;

export const C = {
  teal: '#14B8A6',
  tealDark: '#0E8C7E',
  cream: '#F3E7D3',
  sand: '#DCC39A',
  ink: '#1E2A3B',
  green: '#1FAE5B',
  red: '#E23B3B',
  blue: '#2D8CFF',
  yellow: '#F7C531',
  white: '#FFFFFF',
};

/* ------------------------------------------------------------ helpers */

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}
function strokeRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, stroke: string, lw: number) {
  rr(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}
export function text(ctx: Ctx, t: string, x: number, y: number, px: number, color: string, weight = 700) {
  ctx.font = `${weight} ${px}px ${FONT_FAMILY}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(t, x, y);
}
/** Text squeezed to fit a max width. */
function textFit(ctx: Ctx, t: string, x: number, y: number, px: number, color: string, maxW: number, weight = 700) {
  ctx.font = `${weight} ${px}px ${FONT_FAMILY}`;
  const w = ctx.measureText(t).width;
  if (w > maxW) px = Math.floor((px * maxW) / w);
  text(ctx, t, x, y, px, color, weight);
}
function line(ctx: Ctx, pts: [number, number][], color: string, lw: number) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function dot(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Standing person pictogram, feet at (x, y), height s. */
export function person(ctx: Ctx, x: number, y: number, s: number, color: string) {
  const lw = s * 0.14;
  dot(ctx, x, y - s * 0.88, s * 0.12, color);
  line(ctx, [[x, y - s * 0.72], [x, y - s * 0.38]], color, lw * 1.3);
  line(ctx, [[x - s * 0.2, y - s * 0.45], [x, y - s * 0.68], [x + s * 0.2, y - s * 0.45]], color, lw);
  line(ctx, [[x - s * 0.12, y], [x, y - s * 0.38], [x + s * 0.12, y]], color, lw);
}

/** The «الراشد» logo: rounded bold teal lettering (no light bulb). */
export function drawLogo(ctx: Ctx, cx: number, cy: number, px: number, color = C.teal, light = C.yellow) {
  text(ctx, 'الراشد', cx, cy, px, color, 700);
}

/** Small robot face badge (app icon look). */
function robotBadge(ctx: Ctx, cx: number, cy: number, r: number) {
  dot(ctx, cx, cy, r, C.white);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = C.tealDark;
  ctx.lineWidth = r * 0.08;
  ctx.stroke();
  fillRR(ctx, cx - r * 0.62, cy - r * 0.42, r * 1.24, r * 0.9, r * 0.3, '#1C2430');
  dot(ctx, cx - r * 0.28, cy - r * 0.05, r * 0.13, '#5EEAD4');
  dot(ctx, cx + r * 0.28, cy - r * 0.05, r * 0.13, '#5EEAD4');
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.1, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.strokeStyle = '#5EEAD4';
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** 8-point star (Islamic geometric) centred at (cx, cy). */
export function star8(ctx: Ctx, cx: number, cy: number, r: number, fill: string, stroke?: string, lw = 0) {
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rr2 = i % 2 === 0 ? r : r * 0.76;
    const x = cx + Math.cos(a) * rr2;
    const y = cy + Math.sin(a) * rr2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/* ------------------------------------------------------------ drawings */

const drawNameSign: Draw = (ctx, w, h) => {
  ctx.fillStyle = C.tealDark;
  ctx.fillRect(0, 0, w, h);
  fillRR(ctx, 8, 8, w - 16, h - 16, 26, C.teal);
  strokeRR(ctx, 20, 20, w - 40, h - 40, 18, 'rgba(255,255,255,0.85)', 5);
  // little stars along the edges
  for (let i = 0; i < 2; i++) star8(ctx, i ? w - 70 : 70, h / 2, 34, C.yellow);
  robotBadge(ctx, w - 190, h / 2 + 6, 62);
  textFit(ctx, 'مدرسة الراشد', (w - 260) / 2 + 40, h / 2 + 8, 128, C.white, w - 420);
};

const drawLogoPanel: Draw = (ctx, w, h) => {
  ctx.fillStyle = C.tealDark;
  ctx.fillRect(0, 0, w, h);
  fillRR(ctx, 8, 8, w - 16, h - 16, 26, C.white);
  drawLogo(ctx, w / 2, h / 2 + 18, 110);
};

const drawStage: Draw = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#16C2AE');
  g.addColorStop(1, '#0E8C7E');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // geometric border
  ctx.fillStyle = '#FFF8EC';
  ctx.fillRect(0, 0, w, 26);
  ctx.fillRect(0, h - 26, w, 26);
  for (let x = 13; x < w; x += 40) {
    star8(ctx, x, 13, 10, C.teal);
    star8(ctx, x, h - 13, 10, C.teal);
  }
  // soft rays
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.46);
    ctx.lineTo(w / 2 + Math.cos(a) * w, h * 0.46 + Math.sin(a) * w);
    ctx.lineTo(w / 2 + Math.cos(a + 0.18) * w, h * 0.46 + Math.sin(a + 0.18) * w);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  ctx.restore();
  fillRR(ctx, w / 2 - 250, h * 0.18, 500, 210, 40, '#FFFFFF');
  drawLogo(ctx, w / 2, h * 0.18 + 120, 150);
  text(ctx, 'مدرسة الراشد', w / 2, h * 0.8, 70, '#FFFFFF');
  for (const [x, y, r] of [[90, 120, 34], [w - 90, 120, 34], [150, h - 110, 22], [w - 150, h - 110, 22]] as const) star8(ctx, x, y, r, C.yellow);
};

const drawExit: Draw = (ctx, w, h) => {
  ctx.fillStyle = C.green;
  ctx.fillRect(0, 0, w, h);
  strokeRR(ctx, 6, 6, w - 12, h - 12, 10, '#FFFFFF', 5);
  // running man to the door
  const s = h * 0.62;
  const x = w * 0.3;
  const y = h * 0.82;
  dot(ctx, x + s * 0.12, y - s * 0.95, s * 0.11, '#FFFFFF');
  line(ctx, [[x + s * 0.08, y - s * 0.78], [x - s * 0.06, y - s * 0.42]], '#FFFFFF', s * 0.16);
  line(ctx, [[x - s * 0.06, y - s * 0.42], [x + s * 0.18, y - s * 0.2], [x + s * 0.12, y]], '#FFFFFF', s * 0.12);
  line(ctx, [[x - s * 0.06, y - s * 0.42], [x - s * 0.22, y - s * 0.12], [x - s * 0.4, y - s * 0.08]], '#FFFFFF', s * 0.12);
  line(ctx, [[x + s * 0.05, y - s * 0.72], [x + s * 0.3, y - s * 0.55], [x + s * 0.42, y - s * 0.7]], '#FFFFFF', s * 0.1);
  line(ctx, [[x + s * 0.05, y - s * 0.72], [x - s * 0.22, y - s * 0.66], [x - s * 0.34, y - s * 0.46]], '#FFFFFF', s * 0.1);
  // door
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.strokeRect(w * 0.08, h * 0.2, w * 0.13, h * 0.62);
  text(ctx, 'مخرج', w * 0.7, h * 0.52, h * 0.42, '#FFFFFF');
};

const drawAssembly: Draw = (ctx, w, h) => {
  ctx.fillStyle = C.green;
  ctx.fillRect(0, 0, w, h);
  strokeRR(ctx, 10, 10, w - 20, h - 20, 18, '#FFFFFF', 8);
  // pictogram: four arrows pointing at a group of people
  const cx = w / 2;
  const cy = h * 0.4;
  const R = w * 0.36;
  fillRR(ctx, cx - R, cy - R, R * 2, R * 2, 18, '#FFFFFF');
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const ox = cx + dx * R * 0.86;
    const oy = cy + dy * R * 0.86;
    const ix = cx + dx * R * 0.62;
    const iy = cy + dy * R * 0.62;
    line(ctx, [[ox, oy], [ix, iy]], C.green, 11);
    // arrow head pointing at the group
    const hx = cx + dx * R * 0.5;
    const hy = cy + dy * R * 0.5;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + dx * 30, hy);
    ctx.lineTo(hx, hy + dy * 30);
    ctx.closePath();
    ctx.fillStyle = C.green;
    ctx.fill();
  }
  person(ctx, cx - 26, cy + 36, 66, C.green);
  person(ctx, cx + 26, cy + 36, 66, C.green);
  person(ctx, cx, cy + 30, 80, C.green);
  textFit(ctx, 'نقطة التجمع', cx, h * 0.86, 62, '#FFFFFF', w - 50);
};

const drawTextSign = (t: string, bg: string, fg = '#FFFFFF'): Draw => (ctx, w, h) => {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  strokeRR(ctx, 8, 8, w - 16, h - 16, 14, 'rgba(255,255,255,0.8)', 5);
  textFit(ctx, t, w / 2, h / 2 + 4, h * 0.5, fg, w - 60);
};

const drawNoHang: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const R = w * 0.42;
  // goal frame
  line(ctx, [[cx - R * 0.62, cy + R * 0.62], [cx - R * 0.62, cy - R * 0.42], [cx + R * 0.62, cy - R * 0.42], [cx + R * 0.62, cy + R * 0.62]], '#4A5563', 9);
  // boy hanging from the crossbar
  const s = R * 0.95;
  const x = cx;
  dot(ctx, x, cy - R * 0.12, s * 0.1, C.ink);
  line(ctx, [[x - s * 0.14, cy - R * 0.42], [x - s * 0.04, cy - R * 0.2]], C.ink, 8);
  line(ctx, [[x + s * 0.14, cy - R * 0.42], [x + s * 0.04, cy - R * 0.2]], C.ink, 8);
  line(ctx, [[x, cy - R * 0.02], [x, cy + R * 0.32]], C.ink, 11);
  line(ctx, [[x, cy + R * 0.32], [x - s * 0.1, cy + R * 0.62]], C.ink, 8);
  line(ctx, [[x, cy + R * 0.32], [x + s * 0.12, cy + R * 0.58]], C.ink, 8);
  // red ring and slash
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = C.red;
  ctx.lineWidth = w * 0.08;
  ctx.stroke();
  line(ctx, [[cx - R * 0.7, cy - R * 0.7], [cx + R * 0.7, cy + R * 0.7]], C.red, w * 0.075);
};

const drawDrop: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  dot(ctx, w / 2, h / 2, w * 0.44, C.blue);
  ctx.beginPath();
  const cx = w / 2;
  const cy = h * 0.58;
  const r = w * 0.2;
  ctx.moveTo(cx, cy - r * 2.1);
  ctx.bezierCurveTo(cx + r * 0.3, cy - r * 1.3, cx + r, cy - r * 0.6, cx + r, cy);
  ctx.arc(cx, cy, r, 0, Math.PI);
  ctx.bezierCurveTo(cx - r, cy - r * 0.6, cx - r * 0.3, cy - r * 1.3, cx, cy - r * 2.1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
};

const drawBike: Draw = (ctx, w, h) => {
  ctx.fillStyle = C.blue;
  ctx.fillRect(0, 0, w, h);
  strokeRR(ctx, 5, 5, w - 10, h - 10, 10, '#FFFFFF', 4);
  const y = h * 0.66;
  for (const x of [w * 0.28, w * 0.72]) {
    ctx.beginPath();
    ctx.arc(x, y, w * 0.17, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  line(ctx, [[w * 0.28, y], [w * 0.45, y - h * 0.24], [w * 0.64, y - h * 0.24], [w * 0.72, y]], '#FFFFFF', 6);
  line(ctx, [[w * 0.45, y - h * 0.24], [w * 0.5, y], [w * 0.64, y - h * 0.24]], '#FFFFFF', 6);
  line(ctx, [[w * 0.42, y - h * 0.32], [w * 0.5, y - h * 0.32]], '#FFFFFF', 6);
  line(ctx, [[w * 0.64, y - h * 0.24], [w * 0.62, y - h * 0.36], [w * 0.7, y - h * 0.38]], '#FFFFFF', 6);
};

const drawStar: Draw = (ctx, w, h) => {
  ctx.fillStyle = C.sand;
  ctx.fillRect(0, 0, w, h);
  star8(ctx, w / 2, h / 2, w * 0.48, C.teal);
  star8(ctx, w / 2, h / 2, w * 0.38, '#FFFFFF');
  star8(ctx, w / 2, h / 2, w * 0.28, C.blue);
  dot(ctx, w / 2, h / 2, w * 0.12, C.yellow);
};

const drawClock: Draw = (ctx, w, h) => {
  ctx.fillStyle = C.sand;
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  dot(ctx, cx, cy, w * 0.48, C.teal);
  dot(ctx, cx, cy, w * 0.42, '#FFFFFF');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r0 = w * (i % 3 === 0 ? 0.31 : 0.35);
    line(ctx, [[cx + Math.sin(a) * r0, cy - Math.cos(a) * r0], [cx + Math.sin(a) * w * 0.39, cy - Math.cos(a) * w * 0.39]], C.ink, i % 3 === 0 ? 6 : 3);
  }
  const nums: [string, number][] = [['١٢', 0], ['٣', 3], ['٦', 6], ['٩', 9]];
  for (const [t, i] of nums) {
    const a = (i / 12) * Math.PI * 2;
    text(ctx, t, cx + Math.sin(a) * w * 0.22, cy - Math.cos(a) * w * 0.22 + 4, w * 0.11, C.ink);
  }
  // hands at 7:30 (school morning)
  const ha = ((7.5 / 12) * Math.PI * 2);
  const ma = (30 / 60) * Math.PI * 2;
  line(ctx, [[cx, cy], [cx + Math.sin(ha) * w * 0.2, cy - Math.cos(ha) * w * 0.2]], C.ink, 10);
  line(ctx, [[cx, cy], [cx + Math.sin(ma) * w * 0.32, cy - Math.cos(ma) * w * 0.32]], C.ink, 6);
  dot(ctx, cx, cy, 9, C.red);
};

/** The far wall of the classroom, seen through the fly-in window (painted backdrop of the recess). */
const drawInterior: Draw = (ctx, w, h) => {
  const H = 3.4; // metres the painting covers vertically
  const W = 10; // metres horizontally
  const px = (m: number) => (m / W) * w;
  const py = (m: number) => h - (m / H) * h; // m above floor -> canvas y
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAL.wallLow;
  ctx.fillRect(0, py(1.1), w, h - py(1.1));
  ctx.fillStyle = '#C9B59A';
  ctx.fillRect(0, py(1.12), w, 4);
  // chalkboard
  fillRR(ctx, px(2.6), py(2.3), px(3.4), py(0.95) - py(2.3), 6, '#8E5B34');
  ctx.fillStyle = PAL.board;
  ctx.fillRect(px(2.68), py(2.24), px(3.24), py(1.01) - py(2.24));
  // chalk doodles: a sun and a few lines of writing
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px(3.2), py(1.85), 9, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 3; i++) line(ctx, [[px(3.7), py(1.95 - i * 0.25)], [px(5.6 - i * 0.4), py(1.95 - i * 0.25)]], 'rgba(255,255,255,0.7)', 2);
  // smartboard with the logo
  fillRR(ctx, px(6.3), py(2.25), px(1.9), py(1.05) - py(2.25), 6, '#1C2430');
  fillRR(ctx, px(6.38), py(2.18), px(1.74), py(1.12) - py(2.18), 4, '#F4FBFA');
  drawLogo(ctx, px(7.25), py(1.6), 30);
  // alphabet frieze
  const letters = 'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي'.split(' ');
  const cols = ['#F0476B', '#F7C531', '#22B573', '#2D8CFF', '#FF8A3D', '#14B8A6'];
  const fw = w / letters.length;
  letters.forEach((l, i) => {
    fillRR(ctx, i * fw + 2, py(3.05), fw - 4, py(2.7) - py(3.05), 4, cols[i % cols.length]);
    text(ctx, l, i * fw + fw / 2, (py(3.05) + py(2.7)) / 2 + 2, 20, '#FFFFFF');
  });
  // clock
  dot(ctx, px(5.0), py(2.55) - 2, 15, '#FFFFFF');
  ctx.beginPath();
  ctx.arc(px(5.0), py(2.55) - 2, 15, 0, Math.PI * 2);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  line(ctx, [[px(5.0), py(2.55) - 2], [px(5.0), py(2.55) - 12]], C.ink, 2);
  line(ctx, [[px(5.0), py(2.55) - 2], [px(5.0) + 8, py(2.55) + 2]], C.ink, 2);
  // student artwork
  const art = ['#FFD166', '#7CC4FA', '#FF9AA2', '#B5E48C'];
  art.forEach((c, i) => {
    fillRR(ctx, px(0.4 + i * 0.5), py(2.2), px(0.4), py(1.75) - py(2.2), 3, c);
    dot(ctx, px(0.6 + i * 0.5), py(2.0), 6, '#FFFFFF');
  });
  // lockers / door on the right
  fillRR(ctx, px(8.8), py(2.15), px(0.95), py(0) - py(2.15), 4, PAL.door);
  dot(ctx, px(8.92), py(1.05), 4, '#DDE3EA');
  // safety poster with pictures only
  fillRR(ctx, px(1.0), py(1.05) - 2, px(0.9), 6, 2, '#C9B59A');
};

/* ------------------------------------------------------------ layout */

export type RegionKey =
  | 'nameSign'
  | 'logo'
  | 'stage'
  | 'assembly'
  | 'star'
  | 'clock'
  | 'drop'
  | 'bike'
  | 'noHang'
  | 'exit'
  | 'interior'
  | 'guard'
  | 'waiting'
  | 'field';

const REGIONS: Record<RegionKey, { r: [number, number, number, number]; draw: Draw }> = {
  nameSign: { r: [0, 0, 1536, 192], draw: drawNameSign },
  logo: { r: [1536, 0, 512, 192], draw: drawLogoPanel },
  stage: { r: [0, 192, 1024, 448], draw: drawStage },
  assembly: { r: [1024, 192, 320, 448], draw: drawAssembly },
  star: { r: [1344, 192, 256, 256], draw: drawStar },
  clock: { r: [1600, 192, 256, 256], draw: drawClock },
  drop: { r: [1856, 192, 128, 128], draw: drawDrop },
  bike: { r: [1856, 320, 128, 128], draw: drawBike },
  noHang: { r: [1344, 448, 192, 192], draw: drawNoHang },
  exit: { r: [1536, 448, 256, 128], draw: drawExit },
  interior: { r: [0, 640, 1024, 384], draw: drawInterior },
  guard: { r: [1024, 640, 512, 128], draw: drawTextSign('حارس المدرسة', '#2B5D8A') },
  waiting: { r: [1536, 640, 512, 128], draw: drawTextSign('منطقة الانتظار', C.teal) },
  field: { r: [1024, 768, 512, 128], draw: drawTextSign('ملعب كرة القدم', '#2E8B3E') },
};

let atlasTex: THREE.CanvasTexture | null = null;

export function atlasTexture() {
  if (atlasTex) return atlasTex;
  atlasTex = canvasTexture('school:atlas:v1', ATLAS_W, ATLAS_H, (ctx) => {
    ctx.clearRect(0, 0, ATLAS_W, ATLAS_H);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, ATLAS_W, ATLAS_H);
    for (const { r, draw } of Object.values(REGIONS)) {
      ctx.save();
      ctx.translate(r[0], r[1]);
      ctx.beginPath();
      ctx.rect(0, 0, r[2], r[3]);
      ctx.clip();
      draw(ctx, r[2], r[3]);
      ctx.restore();
    }
  });
  atlasTex.anisotropy = 8;
  return atlasTex;
}

/** UV rectangle [u0, v0, u1, v1] of a region (inset by 1.5 px against bleeding). */
export function uvOf(key: RegionKey): [number, number, number, number] {
  const [x, y, w, h] = REGIONS[key].r;
  const i = 1.5;
  return [(x + i) / ATLAS_W, 1 - (y + h - i) / ATLAS_H, (x + w - i) / ATLAS_W, 1 - (y + i) / ATLAS_H];
}
