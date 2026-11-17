/**
 * Canvas drawings for the core rooms: pictograms, posters, signs and the smartboard pictures.
 * Everything a student can read is Arabic; most signs are pictures only.
 * Each `draw*` function paints into the rectangle (0, 0, w, h) of the given context.
 */
import { FONT_FAMILY } from '../../../core/fonts';
import { PAL } from '../../kit';

export type Ctx = CanvasRenderingContext2D;

/* ------------------------------------------------------------------ basics */

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, lw = 0) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && lw > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, stroke?: string, lw = 0) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && lw > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** Arabic text, centred. Shrinks to fit maxW when given. */
export function text(ctx: Ctx, s: string, x: number, y: number, px: number, color: string, weight = 700, maxW?: number) {
  ctx.font = `${weight} ${px}px ${FONT_FAMILY}`;
  if (maxW) {
    const m = ctx.measureText(s).width;
    if (m > maxW) {
      px = Math.floor((px * maxW) / m);
      ctx.font = `${weight} ${px}px ${FONT_FAMILY}`;
    }
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(s, x, y);
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

/** Seeded random for stable drawings. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------ pictograms */

export type Pose = 'stand' | 'walk' | 'run' | 'slip' | 'wash' | 'hold' | 'climb' | 'sit';

/**
 * Pictogram person (round head, thick rounded limbs). (x, y) = feet centre, s = total height.
 * dir = 1 faces right, -1 faces left.
 */
export function person(ctx: Ctx, x: number, y: number, s: number, color: string, pose: Pose = 'stand', dir = 1) {
  const u = s / 10;
  const lw = u * 1.25;
  const hx = x + (pose === 'run' ? dir * u * 1.2 : pose === 'slip' ? -dir * u * 1.4 : 0);
  const hy = y - s + u * 1.1;
  const L = (pts: [number, number][]) => line(ctx, pts.map(([a, b]) => [x + a * u * dir, y - b * u] as [number, number]), color, lw);
  if (pose === 'stand' || pose === 'hold' || pose === 'wash') {
    circle(ctx, x, hy, u * 1.1, color);
    L([[0, 7.4], [0, 3.6]]); // body
    L([[0, 3.6], [-0.8, 0.2]]);
    L([[0, 3.6], [0.8, 0.2]]);
    if (pose === 'wash') {
      L([[0, 6.8], [1.6, 5.2], [2.6, 5.6]]);
      L([[0, 6.8], [1.4, 4.6], [2.6, 5.0]]);
    } else if (pose === 'hold') {
      L([[0, 6.8], [1.8, 5.6], [2.4, 6.6]]);
      L([[0, 6.8], [-1.2, 4.6]]);
    } else {
      L([[0, 6.8], [-1.0, 4.4]]);
      L([[0, 6.8], [1.0, 4.4]]);
    }
  } else if (pose === 'walk') {
    circle(ctx, x + u * 0.2 * dir, hy, u * 1.1, color);
    L([[0.2, 7.4], [0, 3.6]]);
    L([[0, 3.6], [-1.4, 0.2]]);
    L([[0, 3.6], [0.6, 2.0], [1.4, 0.2]]);
    L([[0.2, 6.8], [-1.2, 5.0], [-1.6, 4.0]]);
    L([[0.2, 6.8], [1.0, 5.0], [1.8, 4.6]]);
  } else if (pose === 'run') {
    circle(ctx, hx, hy + u * 0.3, u * 1.1, color);
    L([[1.0, 7.0], [-0.2, 3.8]]);
    L([[-0.2, 3.8], [-1.6, 2.4], [-2.8, 1.0]]);
    L([[-0.2, 3.8], [1.4, 2.4], [1.2, 0.2]]);
    L([[0.9, 6.5], [-0.8, 5.6], [-1.8, 6.6]]);
    L([[0.9, 6.5], [2.2, 5.4], [3.0, 6.2]]);
  } else if (pose === 'slip') {
    circle(ctx, hx, hy + u * 0.8, u * 1.1, color);
    L([[-1.2, 6.6], [0.4, 3.2]]);
    L([[0.4, 3.2], [2.6, 2.2], [3.6, 2.8]]);
    L([[0.4, 3.2], [-0.4, 0.4]]);
    L([[-0.9, 6.0], [-2.6, 7.2]]);
    L([[-0.9, 6.0], [0.8, 7.6]]);
  } else if (pose === 'climb') {
    circle(ctx, x + u * 0.6 * dir, hy, u * 1.1, color);
    L([[0.4, 7.4], [0, 3.6]]);
    L([[0, 3.6], [1.2, 2.6], [1.4, 1.2]]);
    L([[0, 3.6], [-0.6, 0.2]]);
    L([[0.3, 6.8], [1.6, 5.4], [2.2, 5.8]]);
    L([[0.3, 6.8], [-0.8, 4.6]]);
  } else if (pose === 'sit') {
    circle(ctx, x, hy + u * 2, u * 1.1, color);
    L([[0, 5.4], [0, 2.6]]);
    L([[0, 2.6], [1.8, 2.6], [1.8, 0.2]]);
    L([[0, 5.0], [1.4, 3.6]]);
  }
}

export function flame(ctx: Ctx, x: number, y: number, s: number, outer = '#FF6B2C', inner = '#FFC93C') {
  const f = (k: number, c: string) => {
    const w = s * 0.55 * k;
    const h = s * k;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - w, y, x - w * 1.05, y - h * 0.55, x - w * 0.25, y - h * 0.75);
    ctx.bezierCurveTo(x - w * 0.35, y - h * 0.45, x - w * 0.05, y - h * 0.5, x + w * 0.05, y - h);
    ctx.bezierCurveTo(x + w * 0.55, y - h * 0.7, x + w * 0.35, y - h * 0.5, x + w * 0.6, y - h * 0.45);
    ctx.bezierCurveTo(x + w * 1.1, y - h * 0.25, x + w, y, x, y);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  };
  f(1, outer);
  f(0.62, inner);
  f(0.3, '#FFF3C2');
}

export function extinguisher(ctx: Ctx, x: number, y: number, s: number, body = '#E23B3B', detail = '#222') {
  // (x, y) bottom centre, s = height
  const w = s * 0.34;
  fillRR(ctx, x - w / 2, y - s * 0.78, w, s * 0.78, w * 0.45, body);
  fillRR(ctx, x - w * 0.36, y - s * 0.6, w * 0.72, s * 0.28, w * 0.1, '#FFFFFF');
  fillRR(ctx, x - w * 0.18, y - s * 0.9, w * 0.36, s * 0.14, w * 0.08, detail);
  // handle
  line(ctx, [[x - w * 0.05, y - s * 0.93], [x + w * 0.65, y - s * 0.98]], detail, s * 0.04);
  line(ctx, [[x - w * 0.05, y - s * 0.88], [x + w * 0.6, y - s * 0.86]], detail, s * 0.035);
  // hose
  ctx.beginPath();
  ctx.moveTo(x + w * 0.12, y - s * 0.9);
  ctx.bezierCurveTo(x + w * 1.2, y - s * 0.85, x + w * 1.1, y - s * 0.4, x + w * 0.9, y - s * 0.25);
  ctx.strokeStyle = detail;
  ctx.lineWidth = s * 0.045;
  ctx.lineCap = 'round';
  ctx.stroke();
  fillRR(ctx, x + w * 0.75, y - s * 0.3, w * 0.3, s * 0.12, w * 0.08, detail);
  // pin ring
  ctx.beginPath();
  ctx.arc(x - w * 0.35, y - s * 0.9, s * 0.05, 0, Math.PI * 2);
  ctx.strokeStyle = '#F7C531';
  ctx.lineWidth = s * 0.025;
  ctx.stroke();
}

export function firstAidBag(ctx: Ctx, x: number, y: number, s: number, color = '#1FAE5B') {
  // (x, y) centre, s = width
  const w = s;
  const h = s * 0.72;
  ctx.beginPath();
  ctx.arc(x, y - h / 2, s * 0.17, Math.PI, 0);
  ctx.strokeStyle = '#2B2F36';
  ctx.lineWidth = s * 0.07;
  ctx.stroke();
  fillRR(ctx, x - w / 2, y - h / 2, w, h, s * 0.12, color);
  const c = s * 0.13;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x - c * 0.5, y - c * 1.5, c, c * 3);
  ctx.fillRect(x - c * 1.5, y - c * 0.5, c * 3, c);
}

export function bulb(ctx: Ctx, x: number, y: number, s: number, on: boolean) {
  // (x, y) centre of the glass, s = glass diameter
  if (on) {
    ctx.strokeStyle = '#FFD84D';
    ctx.lineWidth = s * 0.06;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * s * 0.66, y + Math.sin(a) * s * 0.66);
      ctx.lineTo(x + Math.cos(a) * s * 0.85, y + Math.sin(a) * s * 0.85);
      ctx.stroke();
    }
  }
  circle(ctx, x, y, s / 2, on ? '#FFE680' : '#6B7280');
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y + s * 0.38);
  ctx.lineTo(x + s * 0.3, y + s * 0.38);
  ctx.lineTo(x + s * 0.2, y + s * 0.62);
  ctx.lineTo(x - s * 0.2, y + s * 0.62);
  ctx.closePath();
  ctx.fillStyle = on ? '#FFE680' : '#6B7280';
  ctx.fill();
  fillRR(ctx, x - s * 0.2, y + s * 0.6, s * 0.4, s * 0.26, s * 0.06, '#9AA3AF');
  ctx.strokeStyle = '#7B8490';
  ctx.lineWidth = s * 0.035;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.2, y + s * 0.6 + i * s * 0.08);
    ctx.lineTo(x + s * 0.2, y + s * 0.6 + i * s * 0.08);
    ctx.stroke();
  }
  // filament
  line(ctx, [[x - s * 0.12, y + s * 0.3], [x - s * 0.08, y], [x, y + s * 0.08], [x + s * 0.08, y], [x + s * 0.12, y + s * 0.3]], on ? '#FF9F1C' : '#4B5563', s * 0.04);
  // shine
  ctx.beginPath();
  ctx.arc(x - s * 0.18, y - s * 0.16, s * 0.12, Math.PI * 1.1, Math.PI * 1.7);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = s * 0.05;
  ctx.stroke();
}

export function cloud(ctx: Ctx, x: number, y: number, s: number, color = '#9AA6B2') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - s * 0.28, y, s * 0.22, 0, Math.PI * 2);
  ctx.arc(x, y - s * 0.12, s * 0.3, 0, Math.PI * 2);
  ctx.arc(x + s * 0.3, y, s * 0.22, 0, Math.PI * 2);
  ctx.fill();
  fillRR(ctx, x - s * 0.5, y - s * 0.02, s, s * 0.24, s * 0.12, color);
}

export function drop(ctx: Ctx, x: number, y: number, s: number, color = '#3B9BEA') {
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.6);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 0.05, x + s * 0.4, y + s * 0.4, x, y + s * 0.4);
  ctx.bezierCurveTo(x - s * 0.4, y + s * 0.4, x - s * 0.45, y - s * 0.05, x, y - s * 0.6);
  ctx.fillStyle = color;
  ctx.fill();
}

export function arrow(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string, thick = 0.22) {
  // arrow centred on (x, y), pointing to `angle` radians (0 = right, -PI/2 = up)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const t = len * thick;
  ctx.beginPath();
  ctx.moveTo(-len / 2, -t / 2);
  ctx.lineTo(len * 0.12, -t / 2);
  ctx.lineTo(len * 0.12, -t * 1.35);
  ctx.lineTo(len / 2, 0);
  ctx.lineTo(len * 0.12, t * 1.35);
  ctx.lineTo(len * 0.12, t / 2);
  ctx.lineTo(-len / 2, t / 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function star(ctx: Ctx, x: number, y: number, r: number, fill: string, points = 5, inner = 0.48, stroke?: string, lw = 0) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && lw) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function checkBadge(ctx: Ctx, x: number, y: number, r: number) {
  circle(ctx, x, y, r, PAL.exitGreen, '#FFFFFF', r * 0.16);
  line(ctx, [[x - r * 0.45, y + r * 0.02], [x - r * 0.1, y + r * 0.38], [x + r * 0.5, y - r * 0.35]], '#FFFFFF', r * 0.26);
}

export function crossBadge(ctx: Ctx, x: number, y: number, r: number) {
  circle(ctx, x, y, r, PAL.safetyRed, '#FFFFFF', r * 0.16);
  line(ctx, [[x - r * 0.38, y - r * 0.38], [x + r * 0.38, y + r * 0.38]], '#FFFFFF', r * 0.26);
  line(ctx, [[x + r * 0.38, y - r * 0.38], [x - r * 0.38, y + r * 0.38]], '#FFFFFF', r * 0.26);
}

/** Red circle with a slash over whatever was drawn before. */
export function noSign(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = PAL.safetyRed;
  ctx.lineWidth = r * 0.16;
  ctx.stroke();
  line(ctx, [[x - r * 0.7, y - r * 0.7], [x + r * 0.7, y + r * 0.7]], PAL.safetyRed, r * 0.16);
}

export function elevatorIcon(ctx: Ctx, x: number, y: number, s: number, color = '#2B2F36') {
  // car with two people and up/down triangles, (x, y) centre, s = height
  const w = s * 0.62;
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.06;
  rr(ctx, x - w / 2, y - s / 2, w, s, s * 0.05);
  ctx.stroke();
  person(ctx, x - w * 0.18, y + s * 0.42, s * 0.55, color, 'stand');
  person(ctx, x + w * 0.18, y + s * 0.42, s * 0.55, color, 'stand');
  const tx = x + w / 2 + s * 0.16;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tx - s * 0.1, y - s * 0.06);
  ctx.lineTo(tx + s * 0.1, y - s * 0.06);
  ctx.lineTo(tx, y - s * 0.22);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx - s * 0.1, y + s * 0.06);
  ctx.lineTo(tx + s * 0.1, y + s * 0.06);
  ctx.lineTo(tx, y + s * 0.22);
  ctx.fill();
}

/** Cartoon face of Alrashed (the logo). (x, y) centre of the head, s = head width. */
export function robotHead(ctx: Ctx, x: number, y: number, s: number) {
  const h = s * 0.82;
  // ears
  fillRR(ctx, x - s * 0.58, y - s * 0.12, s * 0.12, s * 0.26, s * 0.05, '#7CC4FA');
  fillRR(ctx, x + s * 0.46, y - s * 0.12, s * 0.12, s * 0.26, s * 0.05, '#7CC4FA');
  // head
  fillRR(ctx, x - s / 2, y - h / 2, s, h, s * 0.36, '#FFFFFF', '#C9D2DC', s * 0.03);
  // screen
  fillRR(ctx, x - s * 0.38, y - h * 0.32, s * 0.76, h * 0.62, s * 0.22, '#141B26');
  // eyes
  ctx.fillStyle = '#5EF2DF';
  ctx.shadowColor = '#5EF2DF';
  ctx.shadowBlur = s * 0.06;
  fillRR(ctx, x - s * 0.22, y - h * 0.16, s * 0.12, h * 0.2, s * 0.06, '#5EF2DF');
  fillRR(ctx, x + s * 0.1, y - h * 0.16, s * 0.12, h * 0.2, s * 0.06, '#5EF2DF');
  ctx.beginPath();
  ctx.arc(x, y + h * 0.06, s * 0.13, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.strokeStyle = '#5EF2DF';
  ctx.lineWidth = s * 0.045;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/* ------------------------------------------------------------------ signs */

/** Green exit sign: running man + door + arrow + «مَخْرَج». arrowDir: 1 right, -1 left, 0 none. */
export function drawExitSign(ctx: Ctx, w: number, h: number, arrowDir: -1 | 0 | 1 = 0) {
  fillRR(ctx, 0, 0, w, h, h * 0.12, '#14A452');
  fillRR(ctx, h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12, h * 0.09, '#1FBE63');
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  // door
  const dx = w * 0.5 + w * 0.29;
  fillRR(ctx, dx - h * 0.2, h * 0.18, h * 0.4, h * 0.66, h * 0.04, '#FFFFFF');
  fillRR(ctx, dx - h * 0.13, h * 0.25, h * 0.26, h * 0.59, h * 0.02, '#1FBE63');
  person(ctx, dx - h * 0.42, h * 0.86, h * 0.66, '#FFFFFF', 'run', 1);
  text(ctx, 'مَخْرَج', w * 0.42, h * 0.54, h * 0.46, '#FFFFFF', 700, w * 0.38);
  if (arrowDir) arrow(ctx, arrowDir > 0 ? w * 0.12 : w * 0.12, h * 0.5, h * 0.55, arrowDir > 0 ? 0 : Math.PI, '#FFFFFF');
}

/** Door plaque: room name and number. */
export function drawDoorSign(ctx: Ctx, w: number, h: number, name: string, num: string, color: string = PAL.teal, icon?: (ctx: Ctx, x: number, y: number, s: number) => void) {
  fillRR(ctx, 0, 0, w, h, h * 0.18, '#FFFFFF');
  fillRR(ctx, h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12, h * 0.14, color);
  // number bubble on the right (start side for Arabic)
  circle(ctx, w - h * 0.5, h * 0.5, h * 0.32, '#FFFFFF');
  text(ctx, num, w - h * 0.5, h * 0.54, h * 0.36, color, 700, h * 0.55);
  const textRight = w - h * 0.95;
  const textLeft = icon ? h * 0.95 : h * 0.2;
  text(ctx, name, (textRight + textLeft) / 2, h * 0.53, h * 0.42, '#FFFFFF', 700, textRight - textLeft);
  if (icon) icon(ctx, h * 0.52, h * 0.5, h * 0.62);
}

/** «لا تستخدم عند الحريق»: elevator with a flame, crossed out. */
export function drawElevatorSign(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.06, '#FFFFFF', PAL.safetyRed, w * 0.04);
  const cy = h * 0.4;
  const r = Math.min(w, h) * 0.27;
  elevatorIcon(ctx, w * 0.47, cy, r * 1.25, '#2B2F36');
  flame(ctx, w * 0.73, cy + r * 0.6, r * 0.55);
  noSign(ctx, w * 0.5, cy, r * 1.08);
  text(ctx, 'لا تستخدم عند الحريق', w / 2, h * 0.84, h * 0.12, PAL.safetyRed, 700, w * 0.88);
}

/** Red cross icon that appears on the elevator door during the power outage scenario. */
export function drawRedCross(ctx: Ctx, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  circle(ctx, w / 2, h / 2, Math.min(w, h) * 0.46, 'rgba(255,255,255,0.92)', PAL.safetyRed, Math.min(w, h) * 0.07);
  line(ctx, [[w * 0.3, h * 0.3], [w * 0.7, h * 0.7]], PAL.safetyRed, Math.min(w, h) * 0.12);
  line(ctx, [[w * 0.7, h * 0.3], [w * 0.3, h * 0.7]], PAL.safetyRed, Math.min(w, h) * 0.12);
}

/** Fire equipment sign: white extinguisher on red + «طَفَّايَةُ الْحَرِيقِ». */
export function drawExtinguisherSign(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.08, PAL.safetyRed);
  fillRR(ctx, w * 0.04, w * 0.04, w * 0.92, h - w * 0.08, w * 0.06, '#EF4B4B');
  extinguisher(ctx, w * 0.42, h * 0.66, h * 0.52, '#FFFFFF', '#FFFFFF');
  flame(ctx, w * 0.75, h * 0.66, h * 0.22, '#FFFFFF', '#EF4B4B');
  text(ctx, 'طَفَّايَةُ الْحَرِيقِ', w / 2, h * 0.84, h * 0.12, '#FFFFFF', 700, w * 0.9);
}

/** Fire alarm call point sign: hand pressing + bell. */
export function drawAlarmSign(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.08, PAL.safetyRed);
  // bell
  const bx = w * 0.62;
  const by = h * 0.42;
  const s = h * 0.36;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(bx - s * 0.5, by + s * 0.3);
  ctx.quadraticCurveTo(bx - s * 0.42, by - s * 0.55, bx, by - s * 0.55);
  ctx.quadraticCurveTo(bx + s * 0.42, by - s * 0.55, bx + s * 0.5, by + s * 0.3);
  ctx.closePath();
  ctx.fill();
  circle(ctx, bx, by + s * 0.42, s * 0.12, '#FFFFFF');
  // waves
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = s * 0.08;
  for (const k of [1, -1]) {
    ctx.beginPath();
    ctx.arc(bx, by - s * 0.05, s * 0.75, k > 0 ? -0.5 : Math.PI - 0.5 + 1, k > 0 ? 0.5 : Math.PI + 0.5);
    ctx.stroke();
  }
  // hand / finger
  const hx = w * 0.28;
  const hy = h * 0.6;
  fillRR(ctx, hx - s * 0.32, hy - s * 0.1, s * 0.62, s * 0.5, s * 0.16, '#FFFFFF');
  fillRR(ctx, hx - s * 0.08, hy - s * 0.62, s * 0.18, s * 0.6, s * 0.09, '#FFFFFF');
  flame(ctx, w * 0.5, h * 0.93, h * 0.16, '#FFFFFF', PAL.safetyRed);
}

/** Wet floor A-frame face: yellow triangle with a slipping person. */
export function drawWetFloor(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.08, '#F7C531');
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.1);
  ctx.lineTo(w * 0.9, h * 0.72);
  ctx.lineTo(w * 0.1, h * 0.72);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1E1E1E';
  ctx.lineWidth = w * 0.06;
  ctx.stroke();
  person(ctx, w * 0.5, h * 0.66, h * 0.4, '#1E1E1E', 'slip', 1);
  ctx.fillStyle = '#1E1E1E';
  ctx.fillRect(w * 0.26, h * 0.67, w * 0.5, h * 0.02);
  for (let i = 0; i < 3; i++) drop(ctx, w * (0.3 + i * 0.2), h * 0.86, h * 0.09, '#1E1E1E');
}

/* ------------------------------------------------------------------ posters */

function posterFrame(ctx: Ctx, w: number, h: number, bg: string, border: string) {
  fillRR(ctx, 0, 0, w, h, Math.min(w, h) * 0.04, border);
  fillRR(ctx, w * 0.03, w * 0.03, w - w * 0.06, h - w * 0.06, Math.min(w, h) * 0.03, bg);
}

/** «قواعد السلامة» classroom poster: six picture rules (pictures only besides the title). */
export function drawSafetyRules(ctx: Ctx, w: number, h: number) {
  posterFrame(ctx, w, h, '#FFF8EC', PAL.teal);
  fillRR(ctx, w * 0.08, h * 0.04, w * 0.84, h * 0.12, h * 0.03, PAL.teal);
  text(ctx, 'قواعد السلامة', w / 2, h * 0.103, h * 0.065, '#FFFFFF', 700, w * 0.78);
  const cells: ((x: number, y: number, s: number) => void)[] = [
    (x, y, s) => {
      person(ctx, x, y + s * 0.38, s * 0.72, '#2B6CB0', 'walk');
      checkBadge(ctx, x + s * 0.33, y - s * 0.3, s * 0.13);
    },
    (x, y, s) => {
      person(ctx, x - s * 0.04, y + s * 0.38, s * 0.72, '#C53030', 'run');
      crossBadge(ctx, x + s * 0.33, y - s * 0.3, s * 0.13);
    },
    (x, y, s) => {
      // washing hands under a tap
      fillRR(ctx, x - s * 0.1, y - s * 0.4, s * 0.36, s * 0.08, s * 0.03, '#94A3B8');
      fillRR(ctx, x + s * 0.18, y - s * 0.4, s * 0.06, s * 0.16, s * 0.02, '#94A3B8');
      for (let i = 0; i < 3; i++) drop(ctx, x + s * 0.21, y - s * 0.12 + i * s * 0.1, s * 0.08);
      fillRR(ctx, x - s * 0.2, y + s * 0.12, s * 0.5, s * 0.14, s * 0.07, '#F2B48A');
      fillRR(ctx, x - s * 0.16, y + s * 0.22, s * 0.46, s * 0.12, s * 0.06, '#E59E72');
      checkBadge(ctx, x + s * 0.33, y - s * 0.3, s * 0.13);
    },
    (x, y, s) => {
      // follow the exit
      fillRR(ctx, x - s * 0.36, y - s * 0.22, s * 0.72, s * 0.36, s * 0.05, '#1FBE63');
      person(ctx, x - s * 0.12, y + s * 0.1, s * 0.28, '#FFFFFF', 'run');
      arrow(ctx, x + s * 0.16, y - s * 0.04, s * 0.24, 0, '#FFFFFF');
      checkBadge(ctx, x + s * 0.33, y - s * 0.3, s * 0.13);
    },
    (x, y, s) => {
      // don't touch sockets
      fillRR(ctx, x - s * 0.18, y - s * 0.24, s * 0.36, s * 0.46, s * 0.06, '#E2E8F0', '#94A3B8', s * 0.02);
      circle(ctx, x - s * 0.06, y - s * 0.02, s * 0.03, '#334155');
      circle(ctx, x + s * 0.06, y - s * 0.02, s * 0.03, '#334155');
      line(ctx, [[x + s * 0.24, y - s * 0.26], [x + s * 0.14, y - s * 0.08], [x + s * 0.22, y - s * 0.08], [x + s * 0.1, y + s * 0.12]], '#F59E0B', s * 0.04);
      crossBadge(ctx, x + s * 0.33, y - s * 0.3, s * 0.13);
    },
    (x, y, s) => {
      // hold the handrail on stairs
      for (let i = 0; i < 4; i++) ctx.fillStyle = '#CBD5E1', ctx.fillRect(x - s * 0.36 + i * s * 0.18, y + s * 0.3 - i * s * 0.14, s * 0.18 * (4 - i), s * 0.14);
      for (let i = 0; i < 4; i++) ctx.fillStyle = '#F7C531', ctx.fillRect(x - s * 0.36 + i * s * 0.18, y + s * 0.3 - i * s * 0.14, s * 0.06, s * 0.03);
      line(ctx, [[x - s * 0.4, y - s * 0.02], [x + s * 0.34, y - s * 0.4]], '#8E5B34', s * 0.035);
      person(ctx, x - s * 0.02, y + s * 0.08, s * 0.5, '#2B6CB0', 'hold');
      checkBadge(ctx, x + s * 0.33, y - s * 0.3, s * 0.13);
    },
  ];
  const cols = 2;
  const rows = 3;
  const gx = w * 0.07;
  const top = h * 0.19;
  const cw = (w - gx * 2) / cols;
  const ch = (h * 0.97 - top) / rows;
  cells.forEach((draw, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = w - gx - cw * (c + 0.5); // right to left
    const y = top + ch * (r + 0.5);
    fillRR(ctx, x - cw * 0.46, y - ch * 0.45, cw * 0.92, ch * 0.9, cw * 0.08, '#FFFFFF', '#E2E8F0', w * 0.006);
    draw(x, y, Math.min(cw, ch) * 0.86);
  });
}

/** Wall clock face (Arabic-Indic numerals). */
export function drawClockFace(ctx: Ctx, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const r = Math.min(w, h) / 2;
  circle(ctx, w / 2, h / 2, r * 0.98, '#2B8CBE');
  circle(ctx, w / 2, h / 2, r * 0.86, '#FFFFFF');
  const nums = ['١٢', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١'];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    text(ctx, nums[i], w / 2 + Math.cos(a) * r * 0.66, h / 2 + Math.sin(a) * r * 0.66 + r * 0.03, r * (i % 3 === 0 ? 0.24 : 0.17), '#1E2A3B');
    for (let k = 0; k < 5; k++) {
      const b = a + (k / 5) * (Math.PI / 6);
      const r0 = k === 0 ? 0.76 : 0.8;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(b) * r * r0, h / 2 + Math.sin(b) * r * r0);
      ctx.lineTo(w / 2 + Math.cos(b) * r * 0.84, h / 2 + Math.sin(b) * r * 0.84);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = k === 0 ? r * 0.03 : r * 0.012;
      ctx.stroke();
    }
  }
}

/** Arabic alphabet frieze: `letters` cards from right to left. */
export function drawFrieze(ctx: Ctx, w: number, h: number, letters: string[]) {
  const colors = ['#F0476B', '#FFAA1F', '#22B573', '#2D8CFF', '#8B5CF6', '#14B8A6', '#FF6FA8'];
  const n = letters.length;
  const cw = w / n;
  ctx.clearRect(0, 0, w, h);
  letters.forEach((l, i) => {
    const x = w - cw * (i + 1);
    fillRR(ctx, x + cw * 0.06, h * 0.06, cw * 0.88, h * 0.88, cw * 0.14, colors[i % colors.length]);
    fillRR(ctx, x + cw * 0.14, h * 0.14, cw * 0.72, h * 0.72, cw * 0.1, '#FFFFFF');
    text(ctx, l, x + cw / 2, h * 0.47, h * 0.5, colors[i % colors.length]);
  });
}

export const ALPHABET = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];

/** Green chalkboard with a little lesson in chalk. */
export function drawChalkboard(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = PAL.board;
  ctx.fillRect(0, 0, w, h);
  const R = rng(7);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + R() * 0.03})`;
    ctx.beginPath();
    ctx.ellipse(R() * w, R() * h, 20 + R() * 90, 8 + R() * 30, R() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const chalk = 'rgba(255,255,255,0.88)';
  // letters lesson (right side)
  text(ctx, 'أ  ب  ت  ث', w * 0.74, h * 0.24, h * 0.17, chalk, 500);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.55, h * 0.36);
  ctx.lineTo(w * 0.94, h * 0.36);
  ctx.stroke();
  text(ctx, '١ + ٢ = ٣', w * 0.74, h * 0.55, h * 0.15, '#FFE89A', 500);
  text(ctx, '٢ + ٢ = ٤', w * 0.74, h * 0.77, h * 0.15, '#BDE7FF', 500);
  // sun and a little house (left side)
  ctx.strokeStyle = '#FFE89A';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(w * 0.12, h * 0.25, h * 0.09, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.12 + Math.cos(a) * h * 0.13, h * 0.25 + Math.sin(a) * h * 0.13);
    ctx.lineTo(w * 0.12 + Math.cos(a) * h * 0.18, h * 0.25 + Math.sin(a) * h * 0.18);
    ctx.stroke();
  }
  ctx.strokeStyle = chalk;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeRect(w * 0.22, h * 0.52, w * 0.14, h * 0.3);
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.53);
  ctx.lineTo(w * 0.29, h * 0.36);
  ctx.lineTo(w * 0.38, h * 0.53);
  ctx.stroke();
  ctx.strokeRect(w * 0.27, h * 0.66, w * 0.04, h * 0.16);
  // palm
  ctx.strokeStyle = '#B9F0C5';
  ctx.beginPath();
  ctx.moveTo(w * 0.46, h * 0.82);
  ctx.quadraticCurveTo(w * 0.47, h * 0.6, w * 0.45, h * 0.45);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(w * 0.45, h * 0.45);
    ctx.quadraticCurveTo(w * 0.45 + Math.cos(a) * w * 0.03, h * 0.45 + Math.sin(a) * h * 0.12, w * 0.45 + Math.cos(a) * w * 0.06, h * 0.45 + Math.sin(a) * h * 0.04 + h * 0.06);
    ctx.stroke();
  }
}

/** Children's drawings pinned on a cork board. */
export function drawArtBoard(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, h * 0.04, '#B07A47');
  fillRR(ctx, h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08, h * 0.03, '#D9A066');
  const R = rng(11);
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(120,70,30,${0.1 + R() * 0.15})`;
    ctx.fillRect(R() * w, R() * h, 3, 3);
  }
  const papers = ['#FFFFFF', '#FFF6D6', '#E8F6FF', '#FFFFFF', '#F1FFE8', '#FFF0F5'];
  const n = 6;
  const pw = (w - h * 0.2) / n;
  for (let i = 0; i < n; i++) {
    const x = h * 0.1 + pw * i + pw * 0.08;
    const y = h * (0.12 + (i % 2) * 0.06);
    const ww = pw * 0.84;
    const hh = h * 0.72;
    ctx.save();
    ctx.translate(x + ww / 2, y + hh / 2);
    ctx.rotate((R() - 0.5) * 0.12);
    ctx.translate(-ww / 2, -hh / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(4, 5, ww, hh);
    ctx.fillStyle = papers[i];
    ctx.fillRect(0, 0, ww, hh);
    kidDrawing(ctx, i, ww, hh);
    circle(ctx, ww / 2, hh * 0.04, hh * 0.035, ['#F0476B', '#2D8CFF', '#22B573'][i % 3]);
    ctx.restore();
  }
}

export function kidDrawing(ctx: Ctx, kind: number, w: number, h: number) {
  const g = h * 0.78;
  ctx.lineWidth = Math.max(2, w * 0.025);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind % 6 === 0) {
    // house and sun
    ctx.fillStyle = '#7CC36A';
    ctx.fillRect(0, g, w, h - g);
    circle(ctx, w * 0.8, h * 0.18, w * 0.11, '#FFC93C');
    ctx.fillStyle = '#F4A259';
    ctx.fillRect(w * 0.2, h * 0.45, w * 0.45, g - h * 0.45);
    ctx.fillStyle = '#E5484D';
    ctx.beginPath();
    ctx.moveTo(w * 0.14, h * 0.46);
    ctx.lineTo(w * 0.425, h * 0.26);
    ctx.lineTo(w * 0.71, h * 0.46);
    ctx.fill();
    ctx.fillStyle = '#7A4B2A';
    ctx.fillRect(w * 0.38, h * 0.6, w * 0.1, g - h * 0.6);
    ctx.fillStyle = '#9ED8FF';
    ctx.fillRect(w * 0.24, h * 0.52, w * 0.1, w * 0.1);
  } else if (kind % 6 === 1) {
    // palm tree and camel-colored dunes
    ctx.fillStyle = '#9ED8FF';
    ctx.fillRect(0, 0, w, g);
    ctx.fillStyle = '#E8C27C';
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.quadraticCurveTo(w * 0.3, g - h * 0.12, w * 0.6, g);
    ctx.quadraticCurveTo(w * 0.85, g - h * 0.08, w, g);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
    line(ctx, [[w * 0.5, g], [w * 0.52, h * 0.5], [w * 0.48, h * 0.3]], '#8E5B34', w * 0.05);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillStyle = '#3E9B4F';
      ctx.beginPath();
      ctx.ellipse(w * 0.48 + Math.cos(a) * w * 0.14, h * 0.3 + Math.sin(a) * h * 0.05, w * 0.16, w * 0.04, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind % 6 === 2) {
    // Alrashed robot
    robotHead(ctx, w * 0.5, h * 0.32, w * 0.5);
    fillRR(ctx, w * 0.3, h * 0.52, w * 0.4, h * 0.3, w * 0.08, '#FFFFFF', '#14B8A6', w * 0.03);
    circle(ctx, w * 0.5, h * 0.64, w * 0.06, '#14B8A6');
    line(ctx, [[w * 0.3, h * 0.58], [w * 0.16, h * 0.46]], '#14B8A6', w * 0.04);
    line(ctx, [[w * 0.7, h * 0.58], [w * 0.84, h * 0.7]], '#14B8A6', w * 0.04);
    star(ctx, w * 0.16, h * 0.14, w * 0.06, '#FFC93C');
    star(ctx, w * 0.84, h * 0.2, w * 0.05, '#FF6FA8');
  } else if (kind % 6 === 3) {
    // flowers
    ctx.fillStyle = '#7CC36A';
    ctx.fillRect(0, g, w, h - g);
    for (let i = 0; i < 3; i++) {
      const x = w * (0.22 + i * 0.28);
      const y = h * (0.42 + (i % 2) * 0.1);
      line(ctx, [[x, y], [x, g]], '#3E9B4F', w * 0.03);
      const c = ['#F0476B', '#8B5CF6', '#FFAA1F'][i];
      for (let k = 0; k < 6; k++) circle(ctx, x + Math.cos((k / 6) * 6.28) * w * 0.06, y + Math.sin((k / 6) * 6.28) * w * 0.06, w * 0.05, c);
      circle(ctx, x, y, w * 0.045, '#FFE14D');
    }
    circle(ctx, w * 0.15, h * 0.14, w * 0.08, '#FFC93C');
  } else if (kind % 6 === 4) {
    // school bus
    ctx.fillStyle = '#3B4049';
    ctx.fillRect(0, g + h * 0.02, w, h * 0.06);
    fillRR(ctx, w * 0.08, h * 0.4, w * 0.84, h * 0.32, w * 0.06, '#F7C531');
    for (let i = 0; i < 4; i++) ctx.fillStyle = '#9ED8FF', ctx.fillRect(w * (0.14 + i * 0.18), h * 0.46, w * 0.13, h * 0.1);
    circle(ctx, w * 0.26, h * 0.74, w * 0.07, '#2B2F36');
    circle(ctx, w * 0.72, h * 0.74, w * 0.07, '#2B2F36');
    circle(ctx, w * 0.82, h * 0.15, w * 0.08, '#FFC93C');
  } else {
    // family under a rainbow
    const cols = ['#F0476B', '#FFAA1F', '#F7E04B', '#22B573', '#2D8CFF'];
    cols.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.62, w * (0.44 - i * 0.05), Math.PI, 0);
      ctx.strokeStyle = c;
      ctx.lineWidth = w * 0.045;
      ctx.stroke();
    });
    person(ctx, w * 0.3, g, h * 0.36, '#2B6CB0', 'stand');
    person(ctx, w * 0.5, g, h * 0.26, '#E5484D', 'stand');
    person(ctx, w * 0.7, g, h * 0.34, '#22B573', 'stand');
  }
}

/** Evacuation map: a little floor plan with green arrows and a red "you are here" dot. */
export function drawEvacMap(ctx: Ctx, w: number, h: number, seed = 1) {
  fillRR(ctx, 0, 0, w, h, w * 0.03, '#FFFFFF', '#1FAE5B', w * 0.03);
  fillRR(ctx, w * 0.06, h * 0.05, w * 0.88, h * 0.16, h * 0.03, '#1FAE5B');
  text(ctx, 'خريطة الإخلاء', w / 2, h * 0.135, h * 0.09, '#FFFFFF', 700, w * 0.8);
  const x0 = w * 0.08;
  const y0 = h * 0.27;
  const W = w * 0.84;
  const H = h * 0.6;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.strokeRect(x0, y0, W, H);
  // corridor band
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(x0, y0 + H * 0.42, W, H * 0.18);
  const R = rng(seed);
  // rooms
  for (let i = 0; i < 5; i++) {
    ctx.strokeRect(x0 + (W / 5) * i, y0, W / 5, H * 0.42);
    ctx.strokeRect(x0 + (W / 5) * i, y0 + H * 0.6, W / 5, H * 0.4);
    ctx.fillStyle = ['#FDE68A', '#BFDBFE', '#BBF7D0', '#FBCFE8', '#DDD6FE'][Math.floor(R() * 5)];
    ctx.fillRect(x0 + (W / 5) * i + 3, y0 + 3, W / 5 - 6, H * 0.42 - 6);
  }
  // arrows to both exits
  arrow(ctx, x0 + W * 0.3, y0 + H * 0.51, W * 0.22, Math.PI, '#16A34A');
  arrow(ctx, x0 + W * 0.72, y0 + H * 0.51, W * 0.22, 0, '#16A34A');
  // exits
  fillRR(ctx, x0 - w * 0.05, y0 + H * 0.43, w * 0.06, H * 0.16, 3, '#16A34A');
  fillRR(ctx, x0 + W - w * 0.01, y0 + H * 0.43, w * 0.06, H * 0.16, 3, '#16A34A');
  // you are here
  const hx = x0 + W * (0.3 + R() * 0.4);
  circle(ctx, hx, y0 + H * 0.2, w * 0.035, '#E23B3B', '#FFFFFF', w * 0.01);
  // assembly point icon
  fillRR(ctx, w * 0.06, h * 0.89, w * 0.2, h * 0.08, h * 0.02, '#16A34A');
  for (let i = 0; i < 3; i++) person(ctx, w * (0.1 + i * 0.06), h * 0.96, h * 0.06, '#FFFFFF', 'stand');
}

/** Keep-right sign for the stairs: two lanes, up arrow on the right, down arrow on the left. */
export function drawKeepRight(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.08, '#FFFFFF');
  fillRR(ctx, w * 0.04, w * 0.04, w * 0.92, h - w * 0.08, w * 0.06, '#1D6FD8');
  // dividing line
  ctx.setLineDash([h * 0.06, h * 0.05]);
  line(ctx, [[w / 2, h * 0.12], [w / 2, h * 0.88]], '#FFFFFF', w * 0.025);
  ctx.setLineDash([]);
  // right lane: big arrow up + walking person (this is "my" side)
  arrow(ctx, w * 0.74, h * 0.38, h * 0.42, -Math.PI / 2, '#FFFFFF', 0.24);
  person(ctx, w * 0.74, h * 0.9, h * 0.3, '#FFFFFF', 'walk');
  // left lane: arrow down, dimmer
  arrow(ctx, w * 0.26, h * 0.62, h * 0.42, Math.PI / 2, 'rgba(255,255,255,0.55)', 0.24);
  person(ctx, w * 0.26, h * 0.36, h * 0.24, 'rgba(255,255,255,0.55)', 'walk', -1);
  checkBadge(ctx, w * 0.88, h * 0.14, w * 0.08);
}

/** Floor arrow decal (white/yellow on transparent), pointing up the canvas. */
export function drawFloorArrow(ctx: Ctx, w: number, h: number, color = '#F7C531') {
  ctx.clearRect(0, 0, w, h);
  arrow(ctx, w / 2, h / 2, h * 0.92, -Math.PI / 2, color, 0.22);
}

/** Soft round contact shadow. */
export function drawBlob(ctx: Ctx, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(40,30,20,0.42)');
  g.addColorStop(0.55, 'rgba(40,30,20,0.22)');
  g.addColorStop(1, 'rgba(40,30,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/* ------------------------------------------------------------------ wall posters */

/** Picture-only posters for corridors. */
export function drawPoster(ctx: Ctx, w: number, h: number, kind: number) {
  const bgs = ['#E8F6FF', '#FFF6D6', '#EFFFF3', '#FFF0F5', '#F3EEFF', '#FFF8EC'];
  const borders = [PAL.blue, PAL.amber, PAL.green, PAL.red, PAL.purple, PAL.teal];
  const k = kind % 8;
  posterFrame(ctx, w, h, bgs[k % 6], borders[k % 6]);
  const cx = w / 2;
  const cy = h * 0.52;
  const s = Math.min(w, h);
  if (k === 0) {
    // walk, don't run
    person(ctx, cx - s * 0.2, cy + s * 0.32, s * 0.5, '#2B6CB0', 'walk');
    checkBadge(ctx, cx - s * 0.2, cy - s * 0.32, s * 0.08);
    person(ctx, cx + s * 0.2, cy + s * 0.32, s * 0.5, '#C53030', 'run');
    crossBadge(ctx, cx + s * 0.2, cy - s * 0.32, s * 0.08);
  } else if (k === 1) {
    // wash your hands
    for (let i = 0; i < 5; i++) drop(ctx, cx + (i - 2) * s * 0.12, cy - s * 0.28 + (i % 2) * s * 0.06, s * 0.1);
    fillRR(ctx, cx - s * 0.3, cy, s * 0.6, s * 0.16, s * 0.08, '#F2B48A');
    fillRR(ctx, cx - s * 0.26, cy + s * 0.12, s * 0.56, s * 0.14, s * 0.07, '#E59E72');
    for (let i = 0; i < 6; i++) circle(ctx, cx + (i - 2.5) * s * 0.09, cy - s * 0.05 + (i % 2) * s * 0.03, s * 0.035, 'rgba(255,255,255,0.95)', '#93C5FD', 2);
    checkBadge(ctx, cx + s * 0.32, cy + s * 0.34, s * 0.08);
  } else if (k === 2) {
    // reading (books)
    const cols = ['#F0476B', '#2D8CFF', '#22B573', '#FFAA1F'];
    cols.forEach((c, i) => fillRR(ctx, cx - s * 0.32 + i * s * 0.16, cy - s * 0.1 - (i % 2) * s * 0.06, s * 0.13, s * 0.42 + (i % 2) * s * 0.06, s * 0.02, c));
    star(ctx, cx + s * 0.3, cy - s * 0.32, s * 0.08, '#FFC93C');
    star(ctx, cx - s * 0.32, cy - s * 0.3, s * 0.05, '#FFC93C');
  } else if (k === 3) {
    // healthy food: apple, water
    circle(ctx, cx - s * 0.14, cy + s * 0.04, s * 0.17, '#E5484D');
    line(ctx, [[cx - s * 0.14, cy - s * 0.12], [cx - s * 0.12, cy - s * 0.22]], '#7A4B2A', s * 0.03);
    ctx.fillStyle = '#3DBE6E';
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.06, cy - s * 0.2, s * 0.07, s * 0.03, -0.5, 0, Math.PI * 2);
    ctx.fill();
    fillRR(ctx, cx + s * 0.12, cy - s * 0.2, s * 0.16, s * 0.42, s * 0.05, '#9ED8FF', '#2D8CFF', s * 0.015);
    fillRR(ctx, cx + s * 0.15, cy - s * 0.27, s * 0.1, s * 0.07, s * 0.02, '#2D8CFF');
    checkBadge(ctx, cx + s * 0.32, cy + s * 0.32, s * 0.08);
  } else if (k === 4) {
    // keep right (corridor)
    fillRR(ctx, cx - s * 0.36, cy - s * 0.3, s * 0.72, s * 0.62, s * 0.04, '#E2E8F0');
    ctx.setLineDash([s * 0.05, s * 0.04]);
    line(ctx, [[cx, cy - s * 0.3], [cx, cy + s * 0.32]], '#F7C531', s * 0.025);
    ctx.setLineDash([]);
    arrow(ctx, cx + s * 0.18, cy, s * 0.36, -Math.PI / 2, '#22B573');
    arrow(ctx, cx - s * 0.18, cy, s * 0.36, Math.PI / 2, '#22B573');
    checkBadge(ctx, cx + s * 0.32, cy - s * 0.3, s * 0.07);
  } else if (k === 5) {
    // drink water
    person(ctx, cx - s * 0.08, cy + s * 0.34, s * 0.56, '#2B6CB0', 'hold');
    fillRR(ctx, cx + s * 0.1, cy - s * 0.2, s * 0.08, s * 0.2, s * 0.02, '#9ED8FF', '#2D8CFF', 2);
    circle(ctx, cx + s * 0.27, cy - s * 0.3, s * 0.1, '#FFC93C');
    checkBadge(ctx, cx + s * 0.3, cy + s * 0.3, s * 0.08);
  } else if (k === 6) {
    // Saudi landscape: palm, sun and the school
    ctx.fillStyle = '#E8C27C';
    ctx.fillRect(w * 0.06, cy + s * 0.18, w * 0.88, h * 0.16);
    fillRR(ctx, cx - s * 0.08, cy - s * 0.1, s * 0.4, s * 0.28, s * 0.02, '#F4EBDD', '#14B8A6', s * 0.015);
    for (let i = 0; i < 3; i++) ctx.fillStyle = '#9ED8FF', ctx.fillRect(cx - s * 0.03 + i * s * 0.11, cy - s * 0.04, s * 0.07, s * 0.07);
    line(ctx, [[cx - s * 0.24, cy + s * 0.2], [cx - s * 0.22, cy - s * 0.16]], '#8E5B34', s * 0.03);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillStyle = '#3E9B4F';
      ctx.beginPath();
      ctx.ellipse(cx - s * 0.22 + Math.cos(a) * s * 0.07, cy - s * 0.17 + Math.sin(a) * s * 0.025, s * 0.09, s * 0.025, a, 0, Math.PI * 2);
      ctx.fill();
    }
    circle(ctx, cx + s * 0.28, cy - s * 0.3, s * 0.07, '#FFC93C');
  } else {
    // stars / good behaviour chart
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) star(ctx, cx - s * 0.3 + c * s * 0.2, cy - s * 0.22 + r * s * 0.2, s * 0.07, ['#FFC93C', '#F0476B', '#22B573'][(r + c) % 3]);
  }
}

/** Honor board «لوحة الشرف» with star frames around little portraits. */
export function drawHonorBoard(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, h * 0.05, '#8E5B34');
  fillRR(ctx, h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08, h * 0.04, '#1F5E8C');
  fillRR(ctx, w * 0.3, h * 0.06, w * 0.4, h * 0.15, h * 0.05, '#F7C531');
  text(ctx, 'لوحة الشرف', w / 2, h * 0.14, h * 0.09, '#1E2A3B', 700, w * 0.36);
  const R = rng(5);
  const skins = ['#F1C7A5', '#E2A97E', '#C68A5E', '#A86F48', '#8A5534'];
  const shirts = ['#E5484D', '#F5C518', '#7CC4FA', '#3DBE6E', '#FF8A3D', '#FFFFFF', '#9B6BF2', '#FF6FA8'];
  const cols = 4;
  for (let i = 0; i < 8; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = w - w * 0.12 - c * ((w * 0.76) / (cols - 1));
    const y = h * 0.42 + r * h * 0.32;
    const rad = h * 0.15;
    star(ctx, x, y, rad, '#FFD24D', 5, 0.62, '#E0A800', h * 0.012);
    circle(ctx, x, y + rad * 0.08, rad * 0.5, '#FFF8EC');
    // little portrait
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y + rad * 0.08, rad * 0.48, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = shirts[i % shirts.length];
    ctx.beginPath();
    ctx.ellipse(x, y + rad * 0.55, rad * 0.4, rad * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, x, y + rad * 0.02, rad * 0.24, skins[Math.floor(R() * skins.length)]);
    ctx.fillStyle = '#2B1D14';
    ctx.beginPath();
    ctx.arc(x, y - rad * 0.06, rad * 0.24, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.restore();
    fillRR(ctx, x - rad * 0.6, y + rad * 0.95, rad * 1.2, rad * 0.22, rad * 0.08, '#FFFFFF');
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(x - rad * 0.4, y + rad * 1.04, rad * 0.8, rad * 0.04);
  }
}

/** Notice board «لوحة الإعلانات»: cork with pinned papers. */
export function drawNoticeBoard(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, h * 0.04, '#9A6A3A');
  fillRR(ctx, h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08, h * 0.03, '#D9A066');
  const R = rng(3);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(120,70,30,${0.1 + R() * 0.15})`;
    ctx.fillRect(R() * w, R() * h, 3, 3);
  }
  fillRR(ctx, w * 0.25, h * 0.06, w * 0.5, h * 0.14, h * 0.04, PAL.teal);
  text(ctx, 'لوحة الإعلانات', w / 2, h * 0.135, h * 0.085, '#FFFFFF', 700, w * 0.46);
  const notes: [number, number, number, number, string, number][] = [
    [0.06, 0.26, 0.26, 0.34, '#FFFFFF', 0],
    [0.36, 0.25, 0.28, 0.3, '#FFF59D', 1],
    [0.68, 0.27, 0.26, 0.36, '#C8E6FF', 2],
    [0.08, 0.64, 0.3, 0.3, '#FFD6E0', 3],
    [0.42, 0.6, 0.24, 0.34, '#FFFFFF', 4],
    [0.7, 0.68, 0.24, 0.26, '#D6F5D6', 5],
  ];
  for (const [x, y, ww, hh, c, k] of notes) {
    ctx.save();
    ctx.translate((x + ww / 2) * w, (y + hh / 2) * h);
    ctx.rotate((R() - 0.5) * 0.1);
    const W = ww * w;
    const H = hh * h;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(-W / 2 + 4, -H / 2 + 5, W, H);
    ctx.fillStyle = c;
    ctx.fillRect(-W / 2, -H / 2, W, H);
    if (k === 0) {
      // calendar grid
      ctx.fillStyle = PAL.red;
      ctx.fillRect(-W / 2, -H / 2, W, H * 0.2);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) ctx.strokeRect(-W / 2 + W * 0.08 + j * W * 0.17, -H / 2 + H * 0.28 + i * H * 0.17, W * 0.15, H * 0.14);
      circle(ctx, -W / 2 + W * 0.42, -H / 2 + H * 0.52, W * 0.07, 'rgba(240,71,107,0.5)');
    } else if (k === 1) {
      cloud(ctx, 0, -H * 0.05, W * 0.6, '#FFFFFF');
      circle(ctx, W * 0.2, -H * 0.2, W * 0.12, '#FFC93C');
    } else if (k === 2) {
      person(ctx, -W * 0.15, H * 0.35, H * 0.6, '#2D8CFF', 'run');
      circle(ctx, W * 0.22, H * 0.25, W * 0.1, '#FFFFFF', '#1E2A3B', 2);
    } else if (k === 3) {
      star(ctx, 0, 0, W * 0.25, '#FFC93C');
    } else if (k === 4) {
      // lines of "text"
      ctx.fillStyle = '#94A3B8';
      for (let i = 0; i < 6; i++) ctx.fillRect(-W * 0.38 + (i === 0 ? W * 0.2 : 0), -H * 0.38 + i * H * 0.13, W * (i === 0 ? 0.56 : 0.76), H * 0.04);
    } else {
      fillRR(ctx, -W * 0.35, -H * 0.15, W * 0.7, H * 0.32, W * 0.06, '#F7C531');
      circle(ctx, -W * 0.18, H * 0.2, W * 0.08, '#2B2F36');
      circle(ctx, W * 0.18, H * 0.2, W * 0.08, '#2B2F36');
    }
    circle(ctx, 0, -H / 2 + H * 0.06, Math.max(4, W * 0.04), ['#E23B3B', '#2D8CFF', '#22B573'][k % 3]);
    ctx.restore();
  }
}

/** Big round school emblem with Alrashed's face. */
export function drawEmblem(ctx: Ctx, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const r = Math.min(w, h) / 2;
  circle(ctx, w / 2, h / 2, r * 0.98, PAL.teal);
  circle(ctx, w / 2, h / 2, r * 0.86, '#FFFFFF');
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    star(ctx, w / 2 + Math.cos(a) * r * 0.92, h / 2 + Math.sin(a) * r * 0.92, r * 0.04, '#FFFFFF');
  }
  robotHead(ctx, w / 2, h * 0.5, r * 0.95);
}

/** Islamic 8-point star medallion for the lobby floor. */
export function drawFloorMedallion(ctx: Ctx, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  circle(ctx, cx, cy, r * 0.98, '#1F8F86');
  circle(ctx, cx, cy, r * 0.9, '#EFE6D3');
  const sq = (rad: number, rot: number, fill: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = fill;
    ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
    ctx.restore();
  };
  sq(r * 0.6, 0, '#14B8A6');
  sq(r * 0.6, Math.PI / 4, '#14B8A6');
  sq(r * 0.48, 0, '#F7C531');
  sq(r * 0.48, Math.PI / 4, '#F7C531');
  star(ctx, cx, cy, r * 0.44, '#FFFFFF', 8, 0.72);
  circle(ctx, cx, cy, r * 0.22, '#1F8F86');
  star(ctx, cx, cy, r * 0.16, '#F7C531', 8, 0.6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    circle(ctx, cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, r * 0.06, '#14B8A6');
  }
}

/** A band of interlaced geometric pattern (Saudi decorative frieze). */
export function drawGeoBand(ctx: Ctx, w: number, h: number, bg = '#14B8A6', fg = '#FFFFFF') {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const n = Math.max(1, Math.round(w / h));
  const s = w / n;
  for (let i = 0; i < n; i++) {
    const cx = s * (i + 0.5);
    star(ctx, cx, h / 2, h * 0.38, fg, 8, 0.7);
    star(ctx, cx, h / 2, h * 0.18, bg, 8, 0.6);
    ctx.fillStyle = fg;
    ctx.fillRect(s * i, h * 0.06, s, h * 0.05);
    ctx.fillRect(s * i, h * 0.89, s, h * 0.05);
  }
}

/** Painted view of the sports hall through the interior window (first floor corridor). */
export function drawHallView(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = '#EDE4D3';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#C98F5A';
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.8, w * 0.18, h * 0.08, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  ctx.lineTo(w, h * 0.72);
  ctx.stroke();
  // high windows
  for (let i = 0; i < 5; i++) fillRR(ctx, w * (0.06 + i * 0.19), h * 0.08, w * 0.12, h * 0.16, 4, '#BFE3F5');
  // hoop
  fillRR(ctx, w * 0.42, h * 0.3, w * 0.16, h * 0.12, 4, '#FFFFFF', '#E23B3B', 3);
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.44, w * 0.04, h * 0.012, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#FF8A3D';
  ctx.lineWidth = 4;
  ctx.stroke();
  // wall bars and mats
  ctx.fillStyle = '#C98F5A';
  for (let i = 0; i < 6; i++) ctx.fillRect(w * 0.06 + i * 10, h * 0.3, 5, h * 0.32);
  fillRR(ctx, w * 0.72, h * 0.58, w * 0.2, h * 0.07, 4, '#2D7FD3');
}

/* ------------------------------------------------------------------ smartboard pictures */

export type BoardImage = 'logo' | 'flame' | 'bulbOff' | 'rain' | 'extinguisher' | 'firstAid' | 'blank';
export const BOARD_IMAGES: BoardImage[] = ['logo', 'flame', 'bulbOff', 'rain', 'extinguisher', 'firstAid', 'blank'];

function softBg(ctx: Ctx, w: number, h: number, a: string, b: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawBoardImage(ctx: Ctx, w: number, h: number, img: BoardImage) {
  const s = Math.min(w, h);
  if (img === 'blank') {
    softBg(ctx, w, h, '#1B2533', '#0E141C');
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(w * 0.05, 0);
    ctx.lineTo(w * 0.35, 0);
    ctx.lineTo(w * 0.15, h);
    ctx.lineTo(-w * 0.15, h);
    ctx.fill();
    return;
  }
  if (img === 'logo') {
    softBg(ctx, w, h, '#E9FBF7', '#C9F1EA');
    const R = rng(21);
    for (let i = 0; i < 14; i++) star(ctx, R() * w, R() * h, s * (0.015 + R() * 0.025), ['#FFC93C', '#7CC4FA', '#FF6FA8'][i % 3]);
    circle(ctx, w / 2, h * 0.4, s * 0.3, 'rgba(20,184,166,0.15)');
    robotHead(ctx, w / 2, h * 0.4, s * 0.42);
    text(ctx, 'الراشد', w / 2, h * 0.8, s * 0.2, '#0F8F82', 700);
    return;
  }
  if (img === 'flame') {
    softBg(ctx, w, h, '#FFF1E0', '#FFD9B0');
    circle(ctx, w / 2, h * 0.55, s * 0.36, 'rgba(255,140,40,0.18)');
    flame(ctx, w / 2, h * 0.86, s * 0.7);
    return;
  }
  if (img === 'bulbOff') {
    softBg(ctx, w, h, '#2A3446', '#151B26');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      line(ctx, [[w / 2 + Math.cos(a) * s * 0.3, h * 0.42 + Math.sin(a) * s * 0.3], [w / 2 + Math.cos(a) * s * 0.38, h * 0.42 + Math.sin(a) * s * 0.38]], 'rgba(255,216,77,0.22)', s * 0.025);
    }
    bulb(ctx, w / 2, h * 0.42, s * 0.36, false);
    // little "off" switch
    fillRR(ctx, w * 0.78, h * 0.62, s * 0.14, s * 0.22, s * 0.03, '#E2E8F0');
    fillRR(ctx, w * 0.78 + s * 0.03, h * 0.62 + s * 0.11, s * 0.08, s * 0.08, s * 0.02, '#64748B');
    return;
  }
  if (img === 'rain') {
    softBg(ctx, w, h, '#DCE6F0', '#B8C8D8');
    for (let i = 0; i < 14; i++) drop(ctx, w * (0.32 + (i % 7) * 0.06), h * (0.62 + Math.floor(i / 7) * 0.16) + (i % 2) * s * 0.04, s * 0.07);
    cloud(ctx, w / 2, h * 0.36, s * 0.62, '#8A97A6');
    cloud(ctx, w / 2 - s * 0.05, h * 0.33, s * 0.5, '#A3AFBD');
    return;
  }
  if (img === 'extinguisher') {
    softBg(ctx, w, h, '#FFF5F5', '#FFE0E0');
    circle(ctx, w / 2, h * 0.52, s * 0.36, 'rgba(226,59,59,0.1)');
    extinguisher(ctx, w / 2 - s * 0.06, h * 0.9, s * 0.78);
    return;
  }
  if (img === 'firstAid') {
    softBg(ctx, w, h, '#EFFFF5', '#CFF5DC');
    circle(ctx, w / 2, h * 0.52, s * 0.36, 'rgba(31,174,91,0.12)');
    firstAidBag(ctx, w / 2, h * 0.56, s * 0.62);
    return;
  }
}

/* ------------------------------------------------------------------ globe */

/** Equirectangular cartoon earth for the teacher's globe. */
export function drawGlobe(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = '#3B9BEA';
  ctx.fillRect(0, 0, w, h);
  const land = '#5DBB63';
  const blob = (pts: [number, number][]) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [px, py] = pts[i - 1];
      ctx.quadraticCurveTo(px * w, py * h, ((x + px) / 2) * w, ((y + py) / 2) * h);
    }
    ctx.closePath();
    ctx.fillStyle = land;
    ctx.fill();
  };
  // Africa + Arabia
  blob([[0.5, 0.35], [0.56, 0.33], [0.6, 0.4], [0.62, 0.5], [0.58, 0.62], [0.55, 0.75], [0.52, 0.72], [0.49, 0.55], [0.46, 0.45]]);
  ctx.fillStyle = '#E8C27C';
  ctx.beginPath();
  ctx.ellipse(0.625 * w, 0.42 * h, 0.03 * w, 0.06 * h, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Eurasia
  blob([[0.47, 0.25], [0.6, 0.18], [0.75, 0.15], [0.88, 0.22], [0.85, 0.32], [0.75, 0.38], [0.68, 0.35], [0.6, 0.3], [0.5, 0.3]]);
  // Americas
  blob([[0.12, 0.18], [0.25, 0.15], [0.3, 0.25], [0.25, 0.35], [0.22, 0.42], [0.28, 0.5], [0.32, 0.6], [0.28, 0.78], [0.24, 0.7], [0.2, 0.5], [0.15, 0.32]]);
  // Australia
  blob([[0.82, 0.62], [0.9, 0.6], [0.92, 0.68], [0.85, 0.7]]);
  // ice
  ctx.fillStyle = '#F4FBFF';
  ctx.fillRect(0, h * 0.94, w, h * 0.06);
  ctx.fillRect(0, 0, w, h * 0.04);
}
