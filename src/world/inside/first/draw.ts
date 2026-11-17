/**
 * More canvas drawings for the first-floor rooms: screens, posters, signs, paintings, carpet, globe.
 * All text a student can read is Arabic; most pictures carry no text at all.
 */
import { PAL } from '../../kit';
import { circle, checkBadge, crossBadge, drop, fillRR, line, noSign, person, rng, robotHead, rr, star, text, bulb, type Ctx } from './paint';

/* ------------------------------------------------------------------ clock */

export function drawClockFace(ctx: Ctx, w: number, h: number) {
  const r = Math.min(w, h) / 2;
  circle(ctx, w / 2, h / 2, r, '#FFFFFF');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const big = i % 3 === 0;
    line(ctx, [[w / 2 + Math.sin(a) * r * (big ? 0.78 : 0.84), h / 2 - Math.cos(a) * r * (big ? 0.78 : 0.84)], [w / 2 + Math.sin(a) * r * 0.92, h / 2 - Math.cos(a) * r * 0.92]], '#1E2A3B', r * (big ? 0.07 : 0.04));
  }
}

/* ------------------------------------------------------------------ signs */

/** «ممنوع الأكل والشرب» picture sign: an apple and a cup under a red slash. */
export function drawNoFood(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.08, '#FFFFFF', '#D8DEE6', w * 0.02);
  const cx = w / 2;
  const cy = h * 0.4;
  const r = w * 0.34;
  // apple
  circle(ctx, cx - r * 0.34, cy + r * 0.1, r * 0.42, '#E5484D');
  circle(ctx, cx - r * 0.12, cy + r * 0.1, r * 0.38, '#E5484D');
  line(ctx, [[cx - r * 0.22, cy - r * 0.3], [cx - r * 0.16, cy - r * 0.6]], '#6B4A2B', r * 0.07);
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.02, cy - r * 0.5, r * 0.18, r * 0.09, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#3DBE6E';
  ctx.fill();
  // cup with straw
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.2, cy - r * 0.3);
  ctx.lineTo(cx + r * 0.78, cy - r * 0.3);
  ctx.lineTo(cx + r * 0.7, cy + r * 0.55);
  ctx.lineTo(cx + r * 0.28, cy + r * 0.55);
  ctx.closePath();
  ctx.fillStyle = '#2D8CFF';
  ctx.fill();
  fillRR(ctx, cx + r * 0.16, cy - r * 0.38, r * 0.66, r * 0.1, r * 0.04, '#FFFFFF');
  line(ctx, [[cx + r * 0.55, cy - r * 0.34], [cx + r * 0.7, cy - r * 0.8]], '#F5C518', r * 0.07);
  noSign(ctx, cx, cy, r);
  fillRR(ctx, w * 0.06, h * 0.76, w * 0.88, h * 0.19, h * 0.04, PAL.safetyRed);
  text(ctx, 'ممنوع الأكل والشرب', w / 2, h * 0.855, h * 0.115, '#FFFFFF', 700, w * 0.82);
}

export function drawEyeSign(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.08, '#14A452');
  fillRR(ctx, w * 0.05, h * 0.05, w * 0.9, h * 0.9, w * 0.05, '#1FBE63');
  // eye
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.4);
  ctx.quadraticCurveTo(w * 0.5, h * 0.08, w * 0.85, h * 0.4);
  ctx.quadraticCurveTo(w * 0.5, h * 0.72, w * 0.15, h * 0.4);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  circle(ctx, w / 2, h * 0.4, w * 0.13, '#2D8CFF');
  circle(ctx, w / 2, h * 0.4, w * 0.06, '#1E2A3B');
  drop(ctx, w * 0.3, h * 0.78, w * 0.14, '#BFE9FF');
  drop(ctx, w * 0.5, h * 0.82, w * 0.16, '#BFE9FF');
  drop(ctx, w * 0.7, h * 0.78, w * 0.14, '#BFE9FF');
}

export function drawGlassBinSign(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.1, '#FFFFFF', '#E0A800', w * 0.04);
  // cracked glass
  const cx = w / 2;
  const cy = h * 0.46;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.2, cy - h * 0.3);
  ctx.lineTo(cx + w * 0.2, cy - h * 0.3);
  ctx.lineTo(cx + w * 0.14, cy + h * 0.2);
  ctx.lineTo(cx - w * 0.14, cy + h * 0.2);
  ctx.closePath();
  ctx.fillStyle = '#BFE3F5';
  ctx.fill();
  line(ctx, [[cx - w * 0.18, cy - h * 0.1], [cx, cy], [cx - w * 0.04, cy + h * 0.2]], '#1E2A3B', w * 0.025);
  line(ctx, [[cx, cy], [cx + w * 0.16, cy - h * 0.2]], '#1E2A3B', w * 0.025);
  // sharp shards
  ctx.fillStyle = '#9DD3EE';
  for (const [dx, dy, s] of [[-0.3, 0.3, 0.1], [0.3, 0.32, 0.09], [0.0, 0.34, 0.08]]) {
    ctx.beginPath();
    ctx.moveTo(cx + w * dx, cy + h * dy - w * s);
    ctx.lineTo(cx + w * dx + w * s * 0.7, cy + h * dy + w * s * 0.5);
    ctx.lineTo(cx + w * dx - w * s * 0.7, cy + h * dy + w * s * 0.5);
    ctx.fill();
  }
  crossBadge(ctx, w * 0.82, h * 0.2, w * 0.13);
  text(ctx, 'زجاج مكسور', w / 2, h * 0.9, h * 0.1, '#7A5A00', 700, w * 0.86);
}

export function drawGogglesIcon(ctx: Ctx, x: number, y: number, s: number) {
  line(ctx, [[x - s * 0.5, y], [x - s * 0.4, y]], '#1E2A3B', s * 0.07);
  line(ctx, [[x + s * 0.4, y], [x + s * 0.5, y]], '#1E2A3B', s * 0.07);
  fillRR(ctx, x - s * 0.42, y - s * 0.2, s * 0.4, s * 0.38, s * 0.14, '#9DD3EE', '#1E2A3B', s * 0.06);
  fillRR(ctx, x + s * 0.02, y - s * 0.2, s * 0.4, s * 0.38, s * 0.14, '#9DD3EE', '#1E2A3B', s * 0.06);
  line(ctx, [[x - s * 0.02, y - s * 0.02], [x + s * 0.02, y - s * 0.02]], '#1E2A3B', s * 0.06);
}

export function drawGloveIcon(ctx: Ctx, x: number, y: number, s: number) {
  fillRR(ctx, x - s * 0.22, y - s * 0.05, s * 0.44, s * 0.4, s * 0.1, '#2D8CFF');
  for (let i = 0; i < 4; i++) fillRR(ctx, x - s * 0.22 + i * s * 0.115, y - s * (0.34 + (i === 1 || i === 2 ? 0.08 : 0)), s * 0.1, s * 0.38, s * 0.05, '#2D8CFF');
  fillRR(ctx, x - s * 0.36, y + s * 0.0, s * 0.14, s * 0.26, s * 0.06, '#2D8CFF');
  fillRR(ctx, x - s * 0.2, y + s * 0.34, s * 0.4, s * 0.1, s * 0.03, '#FFFFFF');
}

/** Label board over the goggles/gloves hooks: pictures plus words. */
export function drawHookBoardLabel(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, h * 0.2, '#FFFFFF', '#CBD5E1', h * 0.04);
  drawGogglesIcon(ctx, w * 0.2, h * 0.5, h * 0.7);
  text(ctx, 'النظارة الواقية', w * 0.58, h * 0.52, h * 0.34, '#1E2A3B', 700, w * 0.46);
  drawGloveIcon(ctx, w * 0.9, h * 0.52, h * 0.7);
}

export function drawBottleLabel(ctx: Ctx, w: number, h: number, name: string, color: string) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h * 0.22);
  text(ctx, name, w / 2, h * 0.62, h * 0.36, '#1E2A3B', 700, w * 0.9);
}

/* ------------------------------------------------------------------ computer lab pictures */

export function drawScreen(ctx: Ctx, w: number, h: number, kind: number) {
  const k = kind % 5;
  if (k === 0) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2D8CFF');
    g.addColorStop(1, '#14B8A6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const cols = ['#F5C518', '#FFFFFF', '#FF8A3D', '#E5484D'];
    for (let i = 0; i < 4; i++) fillRR(ctx, w * 0.07, h * (0.08 + i * 0.2), w * 0.1, h * 0.14, w * 0.02, cols[i]);
    robotHead(ctx, w * 0.6, h * 0.42, w * 0.3);
  } else if (k === 1) {
    ctx.fillStyle = '#E8EEF6';
    ctx.fillRect(0, 0, w, h);
    fillRR(ctx, w * 0.14, h * 0.06, w * 0.72, h * 0.88, w * 0.01, '#FFFFFF');
    fillRR(ctx, w * 0.2, h * 0.12, w * 0.4, h * 0.07, 2, '#2D8CFF');
    for (let i = 0; i < 6; i++) fillRR(ctx, w * 0.2, h * (0.26 + i * 0.1), w * (0.5 + ((i * 37) % 20) / 100), h * 0.03, 2, '#C3CCD8');
  } else if (k === 2) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    fillRR(ctx, 0, 0, w, h * 0.14, 0, '#F1F5F9');
    ['#E5484D', '#F5C518', '#22B573', '#2D8CFF', '#8B5CF6'].forEach((c, i) => circle(ctx, w * (0.1 + i * 0.07), h * 0.07, h * 0.04, c));
    circle(ctx, w * 0.5, h * 0.55, h * 0.26, '#FFE680');
    circle(ctx, w * 0.5, h * 0.55, h * 0.26, 'rgba(0,0,0,0)', '#F5A100', h * 0.02);
    circle(ctx, w * 0.42, h * 0.5, h * 0.035, '#1E2A3B');
    circle(ctx, w * 0.58, h * 0.5, h * 0.035, '#1E2A3B');
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.58, h * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = '#1E2A3B';
    ctx.lineWidth = h * 0.025;
    ctx.stroke();
  } else if (k === 3) {
    ctx.fillStyle = '#1E2A5E';
    ctx.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 22; i++) circle(ctx, r() * w, r() * h * 0.8, h * 0.012, '#FFFFFF');
    ctx.fillStyle = '#22B573';
    ctx.fillRect(0, h * 0.82, w, h * 0.18);
    fillRR(ctx, w * 0.2, h * 0.64, w * 0.12, h * 0.18, 3, '#FF8A3D');
    star(ctx, w * 0.72, h * 0.3, h * 0.1, '#F5C518');
  } else {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, w, h);
    fillRR(ctx, w * 0.1, h * 0.12, w * 0.8, h * 0.62, 4, '#DCEFE9');
    ctx.fillStyle = '#2D8CFF';
    [0.2, 0.4, 0.3, 0.55, 0.45].forEach((v, i) => ctx.fillRect(w * (0.16 + i * 0.15), h * (0.7 - v), w * 0.1, h * v * 0.95));
    fillRR(ctx, w * 0.1, h * 0.82, w * 0.5, h * 0.06, 2, '#C3CCD8');
  }
}

/** The projected slide on the lab's screen. */
export function drawProjectedSlide(ctx: Ctx, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#EAF6FF');
  g.addColorStop(1, '#CBEBFA');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  robotHead(ctx, w * 0.77, h * 0.5, h * 0.52);
  text(ctx, 'الكهرباء بأمان', w * 0.4, h * 0.3, h * 0.18, '#1E2A3B', 700, w * 0.38);
  bulb(ctx, w * 0.1, h * 0.3, h * 0.2, true);
  fillRR(ctx, w * 0.1, h * 0.58, w * 0.44, h * 0.26, h * 0.06, '#FFFFFF');
  person(ctx, w * 0.22, h * 0.82, h * 0.2, '#14B8A6', 'sit');
  checkBadge(ctx, w * 0.42, h * 0.7, h * 0.08);
}

/** Posture picture: a child sitting upright at a screen. */
export function drawPosturePoster(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.06, '#FFFFFF', '#CBD5E1', w * 0.02);
  fillRR(ctx, w * 0.06, h * 0.05, w * 0.88, h * 0.62, w * 0.04, '#E3F2FD');
  fillRR(ctx, w * 0.5, h * 0.22, w * 0.32, h * 0.26, w * 0.02, '#1C2430');
  fillRR(ctx, w * 0.53, h * 0.25, w * 0.26, h * 0.2, w * 0.01, '#3BC9B5');
  fillRR(ctx, w * 0.06, h * 0.5, w * 0.78, h * 0.05, 3, '#C98F5A');
  person(ctx, w * 0.22, h * 0.6, h * 0.42, '#14B8A6', 'sit');
  line(ctx, [[w * 0.3, h * 0.2], [w * 0.46, h * 0.2]], '#22B573', w * 0.02);
  checkBadge(ctx, w * 0.5, h * 0.82, w * 0.14);
  text(ctx, 'اجلس مستقيمًا', w / 2, h * 0.94, h * 0.075, '#1E2A3B', 700, w * 0.86);
}

/** Dry hands near electricity. */
export function drawDryHandsPoster(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.06, '#FFFFFF', '#CBD5E1', w * 0.02);
  fillRR(ctx, w * 0.06, h * 0.05, w * 0.88, h * 0.62, w * 0.04, '#FFF4D6');
  // keyboard + juice drop with cross
  fillRR(ctx, w * 0.14, h * 0.4, w * 0.5, h * 0.14, 4, '#B7C0CB');
  for (let i = 0; i < 7; i++) fillRR(ctx, w * (0.17 + i * 0.065), h * 0.43, w * 0.05, h * 0.04, 2, '#EEF2F7');
  fillRR(ctx, w * 0.7, h * 0.28, w * 0.16, h * 0.26, 4, '#FF8A3D');
  fillRR(ctx, w * 0.72, h * 0.3, w * 0.12, h * 0.07, 2, '#FFE680');
  drop(ctx, w * 0.5, h * 0.2, w * 0.18, '#3B9BEA');
  noSign(ctx, w * 0.5, h * 0.3, w * 0.26);
  bulb(ctx, w * 0.2, h * 0.2, w * 0.14, true);
  crossBadge(ctx, w * 0.5, h * 0.82, w * 0.14);
  text(ctx, 'أبعد الماء عن الجهاز', w / 2, h * 0.94, h * 0.07, '#1E2A3B', 700, w * 0.88);
}

/** Do not poke things into sockets. */
export function drawSocketPoster(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.06, '#FFFFFF', '#CBD5E1', w * 0.02);
  fillRR(ctx, w * 0.06, h * 0.05, w * 0.88, h * 0.62, w * 0.04, '#FDE8E8');
  fillRR(ctx, w * 0.28, h * 0.2, w * 0.44, h * 0.34, w * 0.05, '#FFFFFF', '#B7C0CB', w * 0.015);
  fillRR(ctx, w * 0.38, h * 0.33, w * 0.06, h * 0.09, 2, '#1E2A3B');
  fillRR(ctx, w * 0.56, h * 0.33, w * 0.06, h * 0.09, 2, '#1E2A3B');
  // pencil
  line(ctx, [[w * 0.2, h * 0.62], [w * 0.42, h * 0.4]], '#F5C518', w * 0.04);
  line(ctx, [[w * 0.42, h * 0.4], [w * 0.45, h * 0.37]], '#1E2A3B', w * 0.025);
  noSign(ctx, w * 0.5, h * 0.37, w * 0.31);
  crossBadge(ctx, w * 0.5, h * 0.82, w * 0.14);
  text(ctx, 'المقبس ليس للعب', w / 2, h * 0.94, h * 0.075, '#1E2A3B', 700, w * 0.86);
}

/* ------------------------------------------------------------------ biology pictures */

export function drawPlantPoster(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.05, '#FFFFFF', '#CBD5E1', w * 0.02);
  fillRR(ctx, w * 0.05, h * 0.04, w * 0.9, h * 0.92, w * 0.04, '#E8F6E4');
  // soil
  ctx.fillStyle = '#8E5B34';
  ctx.fillRect(w * 0.05, h * 0.6, w * 0.9, h * 0.36);
  // stages: seed, sprout, plant
  circle(ctx, w * 0.2, h * 0.7, w * 0.05, '#C9A227');
  line(ctx, [[w * 0.5, h * 0.6], [w * 0.5, h * 0.45]], '#3DBE6E', w * 0.02);
  circle(ctx, w * 0.46, h * 0.43, w * 0.05, '#3DBE6E');
  circle(ctx, w * 0.54, h * 0.41, w * 0.05, '#3DBE6E');
  line(ctx, [[w * 0.8, h * 0.6], [w * 0.8, h * 0.25]], '#3DBE6E', w * 0.025);
  circle(ctx, w * 0.73, h * 0.4, w * 0.06, '#4CB25E');
  circle(ctx, w * 0.87, h * 0.34, w * 0.06, '#4CB25E');
  for (let i = 0; i < 6; i++) circle(ctx, w * 0.8 + Math.cos((i / 6) * Math.PI * 2) * w * 0.06, h * 0.2 + Math.sin((i / 6) * Math.PI * 2) * w * 0.06, w * 0.04, '#FF6FA8');
  circle(ctx, w * 0.8, h * 0.2, w * 0.035, '#F5C518');
  line(ctx, [[w * 0.8, h * 0.6], [w * 0.74, h * 0.78], [w * 0.7, h * 0.88]], '#E9D9B8', w * 0.012);
  line(ctx, [[w * 0.8, h * 0.6], [w * 0.88, h * 0.8]], '#E9D9B8', w * 0.012);
  // sun
  circle(ctx, w * 0.2, h * 0.2, w * 0.08, '#FFD84D');
  drop(ctx, w * 0.3, h * 0.36, w * 0.07, '#3B9BEA');
  drop(ctx, w * 0.25, h * 0.46, w * 0.06, '#3B9BEA');
}

export function drawCellPoster(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.05, '#FFFFFF', '#CBD5E1', w * 0.02);
  fillRR(ctx, w * 0.05, h * 0.04, w * 0.9, h * 0.92, w * 0.04, '#F3E8FF');
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.5, w * 0.38, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD6E8';
  ctx.fill();
  ctx.lineWidth = w * 0.025;
  ctx.strokeStyle = '#E26AA3';
  ctx.stroke();
  circle(ctx, w * 0.46, h * 0.46, w * 0.15, '#8B5CF6');
  circle(ctx, w * 0.46, h * 0.46, w * 0.06, '#5B3BB8');
  ctx.beginPath();
  ctx.ellipse(w * 0.7, h * 0.64, w * 0.1, h * 0.05, 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#4CB25E';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.28, h * 0.68, w * 0.08, h * 0.04, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFAA1F';
  ctx.fill();
  circle(ctx, w * 0.66, h * 0.32, w * 0.05, '#FFFFFF');
  circle(ctx, w * 0.34, h * 0.34, w * 0.04, '#FFFFFF');
}

export function drawWashHandsPoster(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.06, '#FFFFFF', '#CBD5E1', w * 0.02);
  fillRR(ctx, w * 0.06, h * 0.05, w * 0.88, h * 0.64, w * 0.04, '#DFF3FF');
  // tap + water + hands
  fillRR(ctx, w * 0.4, h * 0.1, w * 0.3, h * 0.07, 6, '#B8C1CC');
  fillRR(ctx, w * 0.6, h * 0.1, w * 0.09, h * 0.14, 6, '#B8C1CC');
  for (const x of [0.62, 0.65]) drop(ctx, w * x, h * (0.3 + (x === 0.65 ? 0.08 : 0)), w * 0.07, '#3B9BEA');
  fillRR(ctx, w * 0.22, h * 0.46, w * 0.44, h * 0.14, h * 0.06, '#FFD7B5');
  fillRR(ctx, w * 0.3, h * 0.38, w * 0.44, h * 0.14, h * 0.06, '#F5C9A0');
  for (let i = 0; i < 5; i++) circle(ctx, w * (0.25 + i * 0.1), h * (0.28 + (i % 2) * 0.05), w * 0.03, '#FFFFFF', '#9DD3EE', 2);
  checkBadge(ctx, w * 0.5, h * 0.83, w * 0.15);
  text(ctx, 'اغسل يديك', w / 2, h * 0.95, h * 0.075, '#1E2A3B', 700, w * 0.86);
}

export function drawLabelCard(ctx: Ctx, w: number, h: number, label: string, color: string) {
  fillRR(ctx, 0, 0, w, h, h * 0.2, '#FFFFFF', color, h * 0.1);
  text(ctx, label, w / 2, h * 0.54, h * 0.5, '#1E2A3B', 700, w * 0.88);
}

/* ------------------------------------------------------------------ art pictures */

export function drawPainting(ctx: Ctx, w: number, h: number, kind: number) {
  const k = kind % 7;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  if (k === 0) {
    // sun over house
    ctx.fillStyle = '#BFE9FF';
    ctx.fillRect(0, 0, w, h * 0.7);
    ctx.fillStyle = '#69B34C';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    circle(ctx, w * 0.78, h * 0.2, w * 0.12, '#FFD84D');
    fillRR(ctx, w * 0.2, h * 0.42, w * 0.4, h * 0.34, 3, '#F0476B');
    ctx.beginPath();
    ctx.moveTo(w * 0.16, h * 0.44);
    ctx.lineTo(w * 0.4, h * 0.22);
    ctx.lineTo(w * 0.64, h * 0.44);
    ctx.fillStyle = '#8E5B34';
    ctx.fill();
    fillRR(ctx, w * 0.34, h * 0.56, w * 0.12, h * 0.2, 2, '#F5C518');
  } else if (k === 1) {
    // rainbow
    ctx.fillStyle = '#DFF3FF';
    ctx.fillRect(0, 0, w, h);
    ['#E5484D', '#FF8A3D', '#F5C518', '#22B573', '#2D8CFF', '#8B5CF6'].forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.85, w * (0.44 - i * 0.055), Math.PI, 0);
      ctx.strokeStyle = c;
      ctx.lineWidth = w * 0.06;
      ctx.stroke();
    });
    circle(ctx, w * 0.14, h * 0.86, w * 0.1, '#FFFFFF');
    circle(ctx, w * 0.86, h * 0.86, w * 0.1, '#FFFFFF');
  } else if (k === 2) {
    // boat
    ctx.fillStyle = '#FFF2C7';
    ctx.fillRect(0, 0, w, h * 0.6);
    ctx.fillStyle = '#3B9BEA';
    ctx.fillRect(0, h * 0.6, w, h * 0.4);
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.62);
    ctx.lineTo(w * 0.8, h * 0.62);
    ctx.lineTo(w * 0.7, h * 0.78);
    ctx.lineTo(w * 0.3, h * 0.78);
    ctx.fillStyle = '#E5484D';
    ctx.fill();
    line(ctx, [[w * 0.5, h * 0.62], [w * 0.5, h * 0.2]], '#6B4A2B', w * 0.02);
    ctx.beginPath();
    ctx.moveTo(w * 0.52, h * 0.22);
    ctx.lineTo(w * 0.78, h * 0.56);
    ctx.lineTo(w * 0.52, h * 0.56);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    circle(ctx, w * 0.2, h * 0.2, w * 0.09, '#FFD84D');
  } else if (k === 3) {
    // flower
    ctx.fillStyle = '#FDE8F3';
    ctx.fillRect(0, 0, w, h);
    line(ctx, [[w / 2, h * 0.9], [w / 2, h * 0.45]], '#22B573', w * 0.03);
    ctx.beginPath();
    ctx.ellipse(w * 0.4, h * 0.7, w * 0.1, h * 0.05, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#4CB25E';
    ctx.fill();
    for (let i = 0; i < 7; i++) circle(ctx, w / 2 + Math.cos((i / 7) * Math.PI * 2) * w * 0.17, h * 0.34 + Math.sin((i / 7) * Math.PI * 2) * w * 0.17, w * 0.1, ['#F0476B', '#FF8A3D'][i % 2]);
    circle(ctx, w / 2, h * 0.34, w * 0.1, '#F5C518');
  } else if (k === 4) {
    // robot (Alrashed)
    ctx.fillStyle = '#E6F7F3';
    ctx.fillRect(0, 0, w, h);
    robotHead(ctx, w / 2, h * 0.42, w * 0.55);
    fillRR(ctx, w * 0.32, h * 0.66, w * 0.36, h * 0.26, w * 0.05, '#FFFFFF', '#C9D2DC', 3);
    circle(ctx, w / 2, h * 0.79, w * 0.05, PAL.teal);
  } else if (k === 5) {
    // cat
    ctx.fillStyle = '#FFF2C7';
    ctx.fillRect(0, 0, w, h);
    circle(ctx, w / 2, h * 0.55, w * 0.3, '#FF9F43');
    ctx.beginPath();
    ctx.moveTo(w * 0.24, h * 0.4);
    ctx.lineTo(w * 0.28, h * 0.12);
    ctx.lineTo(w * 0.46, h * 0.3);
    ctx.fillStyle = '#FF9F43';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.76, h * 0.4);
    ctx.lineTo(w * 0.72, h * 0.12);
    ctx.lineTo(w * 0.54, h * 0.3);
    ctx.fill();
    circle(ctx, w * 0.4, h * 0.5, w * 0.04, '#1E2A3B');
    circle(ctx, w * 0.6, h * 0.5, w * 0.04, '#1E2A3B');
    circle(ctx, w * 0.5, h * 0.6, w * 0.03, '#E26AA3');
    for (const s of [-1, 1]) {
      line(ctx, [[w * (0.5 + s * 0.1), h * 0.6], [w * (0.5 + s * 0.32), h * 0.56]], '#1E2A3B', 2);
      line(ctx, [[w * (0.5 + s * 0.1), h * 0.63], [w * (0.5 + s * 0.32), h * 0.68]], '#1E2A3B', 2);
    }
  } else {
    // abstract splashes
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(0, 0, w, h);
    const r = rng(kind * 31 + 3);
    const cols = ['#E5484D', '#2D8CFF', '#F5C518', '#22B573', '#8B5CF6', '#FF8A3D'];
    for (let i = 0; i < 9; i++) circle(ctx, r() * w, r() * h, w * (0.06 + r() * 0.12), cols[i % cols.length]);
  }
}

export function drawColorWheel(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.06, '#FFFFFF', '#CBD5E1', w * 0.02);
  const cols = ['#E5484D', '#FF8A3D', '#F5C518', '#9ACD32', '#22B573', '#14B8A6', '#2D8CFF', '#5B6CF0', '#8B5CF6', '#E26AA3'];
  cols.forEach((c, i) => {
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.5);
    ctx.arc(w / 2, h * 0.5, w * 0.4, (i / cols.length) * Math.PI * 2, ((i + 1) / cols.length) * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  });
  circle(ctx, w / 2, h * 0.5, w * 0.12, '#FFFFFF');
}

/** Round-tip scissors rules: hold handle-first, cut away from fingers. */
export function drawScissorsRule(ctx: Ctx, w: number, h: number, kind: 0 | 1 = 0) {
  fillRR(ctx, 0, 0, w, h, w * 0.06, '#FFFFFF', '#CBD5E1', w * 0.02);
  fillRR(ctx, w * 0.06, h * 0.05, w * 0.88, h * 0.7, w * 0.04, kind === 0 ? '#E7F8EC' : '#FFF1D6');
  const sc = (x: number, y: number, s: number, rot: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    line(ctx, [[0, -s * 0.5], [s * 0.1, -s * 0.05]], '#B8C1CC', s * 0.09);
    line(ctx, [[0, -s * 0.5], [-s * 0.1, -s * 0.05]], '#B8C1CC', s * 0.09);
    circle(ctx, -s * 0.16, s * 0.18, s * 0.14, 'rgba(0,0,0,0)', '#E5484D', s * 0.06);
    circle(ctx, s * 0.16, s * 0.18, s * 0.14, 'rgba(0,0,0,0)', '#E5484D', s * 0.06);
    ctx.restore();
  };
  if (kind === 0) {
    // hand passing scissors handle first
    fillRR(ctx, w * 0.12, h * 0.4, w * 0.22, h * 0.12, h * 0.05, '#F5C9A0');
    fillRR(ctx, w * 0.66, h * 0.4, w * 0.22, h * 0.12, h * 0.05, '#F5C9A0');
    sc(w / 2, h * 0.4, w * 0.5, Math.PI / 2 - 0.1);
    checkBadge(ctx, w * 0.5, h * 0.88, w * 0.1);
  } else {
    // paper with cut line; fingers kept away
    fillRR(ctx, w * 0.2, h * 0.25, w * 0.6, h * 0.4, 4, '#FFFFFF', '#E0A800', 3);
    ctx.setLineDash([8, 8]);
    line(ctx, [[w * 0.3, h * 0.45], [w * 0.7, h * 0.45]], '#7B8490', 3);
    ctx.setLineDash([]);
    star(ctx, w * 0.5, h * 0.45, w * 0.1, '#F5C518');
    sc(w * 0.78, h * 0.7, w * 0.36, -0.6);
    checkBadge(ctx, w * 0.5, h * 0.88, w * 0.1);
  }
}

export function drawSplat(ctx: Ctx, w: number, h: number, color: string, seed: number) {
  ctx.clearRect(0, 0, w, h);
  const r = rng(seed);
  circle(ctx, w / 2, h / 2, w * 0.2, color);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = w * (0.18 + r() * 0.18);
    circle(ctx, w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, w * (0.03 + r() * 0.06), color);
  }
}

/* ------------------------------------------------------------------ library pictures */

export function drawGlobe(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = '#3B9BEA';
  ctx.fillRect(0, 0, w, h);
  const land = '#4CB25E';
  const blob = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(cx * w, cy * h, rx * w, ry * h, rot, 0, Math.PI * 2);
    ctx.fillStyle = land;
    ctx.fill();
  };
  // Africa/Arabia/Europe/Asia/Americas, loosely
  blob(0.52, 0.55, 0.06, 0.16, 0.1);
  blob(0.6, 0.42, 0.05, 0.08, 0.6);
  blob(0.56, 0.28, 0.08, 0.07);
  blob(0.7, 0.3, 0.12, 0.1);
  blob(0.78, 0.55, 0.05, 0.06);
  blob(0.2, 0.3, 0.07, 0.12, 0.3);
  blob(0.26, 0.64, 0.04, 0.14, -0.2);
  blob(0.9, 0.78, 0.06, 0.04);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h * 0.07);
  ctx.fillRect(0, h * 0.94, w, h * 0.06);
  // Arabia in a warmer tone
  ctx.beginPath();
  ctx.ellipse(w * 0.6, h * 0.43, w * 0.03, h * 0.06, 0.6, 0, Math.PI * 2);
  ctx.fillStyle = '#E4CB9B';
  ctx.fill();
}

export function drawCarpet(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = '#F5C518';
  ctx.fillRect(0, 0, w, h);
  const m = w * 0.04;
  fillRR(ctx, m, m, w - m * 2, h - m * 2, m, '#2D8CFF');
  fillRR(ctx, m * 2.6, m * 2.6, w - m * 5.2, h - m * 5.2, m, '#BFE9FF');
  // alphabet-ish colored discs and stars
  const r = rng(11);
  const cols = ['#E5484D', '#F5C518', '#22B573', '#8B5CF6', '#FF8A3D', '#14B8A6'];
  for (let i = 0; i < 18; i++) {
    const x = m * 4 + r() * (w - m * 8);
    const y = m * 4 + r() * (h - m * 8);
    if (i % 3 === 0) star(ctx, x, y, w * 0.035, cols[i % cols.length]);
    else circle(ctx, x, y, w * 0.02 + r() * w * 0.02, cols[i % cols.length]);
  }
  // border stripe of small squares
  for (let i = 0; i < 40; i++) {
    const t = i / 40;
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(m * 1.1 + t * (w - m * 2.2), m * 1.2, w * 0.012, w * 0.012);
    ctx.fillRect(m * 1.1 + t * (w - m * 2.2), h - m * 1.2 - w * 0.012, w * 0.012, w * 0.012);
  }
  text(ctx, 'اقرأ', w / 2, h / 2, h * 0.3, 'rgba(45,140,255,0.55)', 700, w * 0.5);
}

export function drawLibraryBanner(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, h * 0.3, '#FFFFFF');
  fillRR(ctx, h * 0.07, h * 0.07, w - h * 0.14, h * 0.86, h * 0.24, '#8B5CF6');
  text(ctx, 'المكتبة', w * 0.55, h * 0.54, h * 0.66, '#FFFFFF', 700, w * 0.6);
  // book icon
  const bx = w * 0.12;
  const by = h * 0.52;
  fillRR(ctx, bx - h * 0.32, by - h * 0.22, h * 0.31, h * 0.44, h * 0.04, '#FFE680');
  fillRR(ctx, bx + h * 0.01, by - h * 0.22, h * 0.31, h * 0.44, h * 0.04, '#FFD84D');
  for (let i = 0; i < 3; i++) {
    line(ctx, [[bx - h * 0.26, by - h * 0.1 + i * h * 0.1], [bx - h * 0.07, by - h * 0.1 + i * h * 0.1]], '#C9A227', h * 0.025);
    line(ctx, [[bx + h * 0.07, by - h * 0.1 + i * h * 0.1], [bx + h * 0.26, by - h * 0.1 + i * h * 0.1]], '#C9A227', h * 0.025);
  }
}

/** Mural: a big tree whose leaves are colorful books and kids reading beneath it. */
export function drawReadingMural(ctx: Ctx, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#DFF3FF');
  g.addColorStop(1, '#EAF8E4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#7ACB6B';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 1.0, w * 0.7, h * 0.18, 0, Math.PI, 0);
  ctx.fill();
  fillRR(ctx, w * 0.46, h * 0.42, w * 0.08, h * 0.5, w * 0.02, '#9A7348');
  const r = rng(5);
  const cols = ['#E5484D', '#2D8CFF', '#F5C518', '#22B573', '#8B5CF6', '#FF8A3D'];
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * w * 0.3;
    const x = w * 0.5 + Math.cos(a) * d;
    const y = h * 0.28 + Math.sin(a) * d * 0.55;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((r() - 0.5) * 1.2);
    fillRR(ctx, -w * 0.03, -w * 0.04, w * 0.06, w * 0.08, 3, cols[i % cols.length]);
    ctx.restore();
  }
  person(ctx, w * 0.3, h * 0.94, h * 0.34, '#14B8A6', 'sit', 1);
  person(ctx, w * 0.7, h * 0.94, h * 0.34, '#FF8A3D', 'sit', -1);
  star(ctx, w * 0.1, h * 0.14, w * 0.03, '#F5C518');
  star(ctx, w * 0.9, h * 0.2, w * 0.025, '#F5C518');
}

export function drawNamePlate(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, h * 0.2, '#14B8A6');
  fillRR(ctx, h * 0.08, h * 0.08, w - h * 0.16, h * 0.84, h * 0.14, '#0F9F8F');
  text(ctx, 'أمين المكتبة', w / 2, h * 0.54, h * 0.52, '#FFFFFF', 700, w * 0.88);
}

export function drawBookPoster(ctx: Ctx, w: number, h: number) {
  fillRR(ctx, 0, 0, w, h, w * 0.06, '#FFFFFF', '#CBD5E1', w * 0.02);
  fillRR(ctx, w * 0.06, h * 0.05, w * 0.88, h * 0.72, w * 0.04, '#FFF2C7');
  person(ctx, w * 0.5, h * 0.74, h * 0.5, '#14B8A6', 'sit');
  fillRR(ctx, w * 0.54, h * 0.4, w * 0.2, h * 0.14, 3, '#E5484D');
  star(ctx, w * 0.2, h * 0.2, w * 0.07, '#F5C518');
  star(ctx, w * 0.8, h * 0.18, w * 0.05, '#FF8A3D');
  text(ctx, 'هدوء من فضلك', w / 2, h * 0.9, h * 0.08, '#1E2A3B', 700, w * 0.86);
}
