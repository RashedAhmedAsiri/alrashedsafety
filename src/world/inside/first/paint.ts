/**
 * Canvas drawings for the first-floor rooms (computer lab, biology lab, art room, library).
 * Everything a student can read is Arabic; most signs are pictures only.
 * Each draw* function paints into the rectangle (0, 0, w, h) of the given context.
 * Basic shapes and pictogram people follow the set-core style so the whole school matches.
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

export function line(ctx: Ctx, pts: [number, number][], color: string, lw: number) {
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
export function drawBlob(ctx: Ctx, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(40,30,20,0.42)');
  g.addColorStop(0.55, 'rgba(40,30,20,0.22)');
  g.addColorStop(1, 'rgba(40,30,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
