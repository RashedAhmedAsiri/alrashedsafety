/**
 * Alrashed's face screen: a 512x224 canvas drawn in glowing light on black glass and used as the
 * screen's map + emissive map. Every Expression is a set of target parameters (eye shapes, brows,
 * mouth) plus overlay weights (stars, hearts, sound bars, icons...). Parameters ease toward their
 * targets (~0.2 s), so expressions morph into each other. The canvas is redrawn only when something
 * moved: static faces cost nothing, animated ones redraw at most 30 times a second.
 *
 * Canvas x grows to the viewer's right, i.e. toward the ROBOT'S LEFT. Eye 'a' is the one drawn on the
 * canvas left (his right eye), eye 'b' the one on the canvas right (his left eye).
 */
import * as THREE from 'three';
import type { Expression } from '../../core/types';
import { FONT_FAMILY } from '../../core/fonts';
import { clamp, damp } from './rig';

export const FACE_W = 512;
export const FACE_H = 224;
const CX = FACE_W / 2;
const EYE_Y = 94;
const EYE_SEP = 96;
const MOUTH_Y = 170;

/* -------------------------------------------------------------------- parameters */

const EYE_KEYS = ['w', 'h', 'open', 'tilt', 'smile', 'browA', 'browY', 'browT'] as const;
type EyeKey = (typeof EYE_KEYS)[number];
const FACE_KEYS = [
  ...EYE_KEYS.map((k) => `a_${k}` as const),
  ...EYE_KEYS.map((k) => `b_${k}` as const),
  'gx',
  'gy',
  'sep',
  'ey',
  'mA',
  'mCurve',
  'mW',
  'mOpen',
  'mRound',
  'mTilt',
  'mY',
] as const;
type FaceKey = (typeof FACE_KEYS)[number];
type FaceP = Record<FaceKey, number>;

const OV_KEYS = [
  'eyes',
  'bars',
  'dots',
  'red',
  'star',
  'heart',
  'q',
  'bulb',
  'timer',
  'count',
  'sundrop',
  'confetti',
  'zzz',
  'glow',
  'sweat',
  'blush',
  'closedU',
  'icon',
  'corner',
] as const;
type Ov = (typeof OV_KEYS)[number];
type OvP = Record<Ov, number>;

const EYE0: Record<EyeKey, number> = { w: 66, h: 84, open: 1, tilt: 0, smile: 0, browA: 0, browY: 0, browT: 0 };
const MOUTH0 = { mA: 1, mCurve: 0.45, mW: 52, mOpen: 0, mRound: 0, mTilt: 0, mY: 0 };

interface ExprDef {
  face: FaceP;
  ov: OvP;
  blink: boolean;
  saccade: boolean;
  /** Icon expressions hide the speaking mouth. */
  noSpeech?: boolean;
}

function def(o: {
  eyes?: Partial<Record<EyeKey, number>>;
  a?: Partial<Record<EyeKey, number>>;
  b?: Partial<Record<EyeKey, number>>;
  mouth?: Partial<typeof MOUTH0>;
  g?: [number, number];
  sep?: number;
  ey?: number;
  ov?: Partial<OvP>;
  blink?: boolean;
  saccade?: boolean;
  noSpeech?: boolean;
}): ExprDef {
  const face = {} as FaceP;
  for (const side of ['a', 'b'] as const) {
    const e = { ...EYE0, ...o.eyes, ...(side === 'a' ? o.a : o.b) };
    for (const k of EYE_KEYS) face[`${side}_${k}`] = e[k];
  }
  Object.assign(face, MOUTH0, o.mouth);
  face.gx = o.g?.[0] ?? 0;
  face.gy = o.g?.[1] ?? 0;
  face.sep = o.sep ?? 0;
  face.ey = o.ey ?? 0;
  const ov = {} as OvP;
  for (const k of OV_KEYS) ov[k] = 0;
  ov.eyes = 1;
  Object.assign(ov, o.ov);
  return { face, ov, blink: o.blink ?? false, saccade: o.saccade ?? false, noSpeech: o.noSpeech };
}

const EXPR: Record<Expression, ExprDef> = {
  idle: def({ blink: true, saccade: true }),
  smile: def({ eyes: { smile: 0.3 }, mouth: { mCurve: 0.9, mW: 78 }, ov: { blush: 0.35 }, blink: true, saccade: true }),
  happy: def({ eyes: { smile: 0.62, h: 88, w: 70 }, mouth: { mCurve: 1, mW: 92, mOpen: 0.34 }, ov: { blush: 0.7 } }),
  listening: def({ eyes: { w: 72, h: 94, browA: 0.55, browY: 0.7 }, mouth: { mCurve: 0.4, mW: 38 }, ov: { bars: 1 }, blink: true }),
  thinking: def({
    eyes: { open: 0.86 },
    a: { browA: 0.7, browY: 0.15, browT: -0.08 },
    b: { browA: 0.85, browY: 0.75, browT: 0.05 },
    g: [0.55, -0.85],
    mouth: { mA: 0 },
    ov: { dots: 1 },
  }),
  talking: def({ mouth: { mCurve: 0.35, mW: 58 }, blink: true, saccade: true }),
  explaining: def({ eyes: { h: 90, browA: 1, browY: 0.85, browT: 0.12 }, mouth: { mCurve: 0.4, mW: 64 }, blink: true }),
  warning: def({ eyes: { h: 80, open: 0.78, tilt: 0.17, browA: 1, browY: -0.35, browT: -0.14 }, mouth: { mCurve: -0.06, mW: 54 }, ov: { red: 1 } }),
  surprised: def({ eyes: { w: 80, h: 96, browA: 1, browY: 1.25 }, mouth: { mRound: 1, mOpen: 0.6, mW: 36, mCurve: 0 } }),
  worried: def({ eyes: { h: 78, open: 0.92, tilt: -0.2, browA: 1, browY: 0.45, browT: 0.45 }, mouth: { mCurve: -0.32, mW: 46 }, blink: true }),
  proud: def({ mouth: { mCurve: 1, mW: 92, mOpen: 0.28 }, ov: { eyes: 0, star: 1, blush: 0.55 } }),
  gentle: def({ eyes: { open: 0.74, smile: 0.32, h: 80, browA: 0.5, browY: 0.2, browT: 0.22 }, mouth: { mCurve: 0.65, mW: 52 }, ov: { blush: 0.4 }, blink: true }),
  hearts: def({ mouth: { mCurve: 0.95, mW: 72, mOpen: 0.14 }, ov: { eyes: 0, heart: 1, blush: 0.8 } }),
  laughing: def({ eyes: { smile: 1, h: 76, w: 72 }, mouth: { mCurve: 1, mW: 104, mOpen: 0.64 }, ov: { blush: 0.85 } }),
  confused: def({
    a: { open: 0.8, browA: 1, browY: -0.1, browT: 0.1 },
    b: { h: 90, browA: 1, browY: 1.1, browT: -0.3 },
    g: [-0.2, -0.2],
    mouth: { mCurve: -0.1, mW: 46, mTilt: 0.55 },
    ov: { q: 1 },
  }),
  lookLRL: def({ mouth: { mCurve: 0.25, mW: 44 } }),
  lightbulb: def({ eyes: { smile: 0.45 }, g: [0, -0.55], sep: 8, mouth: { mCurve: 0.9, mW: 70, mOpen: 0.18 }, ov: { bulb: 1, blush: 0.4 } }),
  timer: def({ mouth: { mA: 0 }, ov: { eyes: 0, timer: 1 }, noSpeech: true }),
  counting: def({ mouth: { mA: 0 }, ov: { eyes: 0, count: 1 }, noSpeech: true }),
  sunDrop: def({ mouth: { mCurve: 0.8, mW: 62 }, ov: { eyes: 0, sundrop: 1 } }),
  celebration: def({ eyes: { smile: 0.92, h: 80, w: 70 }, mouth: { mCurve: 1, mW: 100, mOpen: 0.52 }, ov: { confetti: 1, blush: 0.8 } }),
  sleepy: def({ eyes: { open: 0.3, tilt: -0.06, h: 80 }, mouth: { mRound: 0.8, mOpen: 0.16, mW: 26, mCurve: 0 }, ov: { zzz: 1 } }),
  glow: def({ mouth: { mCurve: 0.5, mW: 50 }, ov: { glow: 1 }, blink: true }),
  relieved: def({ mouth: { mCurve: 0.75, mW: 64 }, ov: { eyes: 0, closedU: 1, sweat: 1, blush: 0.4 } }),
  focused: def({ eyes: { open: 0.62, tilt: 0.1, smile: 0.12, browA: 1, browY: -0.3, browT: -0.05 }, mouth: { mCurve: 0.05, mW: 36 }, blink: true }),
};

/** Expressions whose eyes are drawn as icons by the 'icon' flag path. */
export type FaceIcon =
  | 'whistle'
  | 'bolt'
  | 'pin'
  | 'target'
  | 'check'
  | 'cross'
  | 'sun'
  | 'drop'
  | 'warning'
  | 'heart'
  | 'star'
  | 'firstAid'
  | 'question'
  | 'clock'
  | 'bulb'
  | 'stop';

/**
 * Look left-right-left curve shared by the lookLRL clip and the lookLRL face: +1 = his left.
 * 0-0.25 to the left, hold, 0.75-1.1 to the right, hold, 1.5-1.85 back left, hold, 2.2-2.5 centre.
 */
export function lookLRLCurve(t: number) {
  const s = (x: number) => x * x * (3 - 2 * x);
  const seg = (a: number, b: number) => s(clamp((t - a) / (b - a), 0, 1));
  return seg(0, 0.25) - 2 * seg(0.75, 1.1) + 2 * seg(1.5, 1.85) - seg(2.2, 2.5);
}
export const LOOK_LRL_DUR = 2.5;

/* ---------------------------------------------------------------- visemes */

/** Azure viseme id -> [roundness, wideness]. */
const VISEME_SHAPE: Record<number, [number, number]> = {
  1: [0, 0.1],
  2: [0, 0.25],
  3: [0.6, 0],
  4: [0.1, 0.1],
  5: [0.4, 0],
  6: [0, 0.45],
  7: [0.95, 0],
  8: [0.8, 0],
  9: [0.45, 0.1],
  10: [0.6, 0],
  11: [0.1, 0.3],
  13: [0.5, 0],
  15: [0, 0.45],
  16: [0.6, 0],
  19: [0, 0.2],
  20: [0.1, 0.15],
};

export interface FaceInput {
  expr: Expression;
  /** 0..1 speech mouth openness. */
  mouth: number;
  viseme: number;
  /** -1..1 eye glance (x: +1 = toward his left; y: +1 = down). */
  gazeX: number;
  gazeY: number;
  flags?: Record<string, boolean | number | string>;
}

const COL = {
  eye: '#A6F7FF',
  glow: '#22D3EE',
  dark: '#3E5568',
  red: '#FF3B4A',
  star: '#FFD447',
  heart: '#FF5C9A',
  sun: '#FFA726',
  drop: '#4FC3F7',
  blush: '#FF7AA8',
  check: '#4ADE80',
};

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (n: number) =>
  String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join('');

/* ------------------------------------------------------------------ the screen */

export class FaceScreen {
  readonly texture: THREE.CanvasTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layer: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private cur: FaceP;
  private ov: OvP;
  private expr: Expression | null = null;
  private exprT0 = 0;
  private iconName = '';
  private iconT0 = 0;
  private cornerName = '';
  private blinkT0 = -10;
  private blinkNext = 1.5;
  private blinkDouble = false;
  private sacc = { x: 0, y: 0, next: 0 };
  private speak = 0;
  private lastDraw = -1;
  private needs = true;
  /** Brightness boost the material should apply (glow expression). */
  glowLevel = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = FACE_W;
    this.canvas.height = FACE_H;
    // Software canvas on purpose: on Chrome's GPU canvas a glowing stroke that reaches past the top edge
    // (the raised brows of 'explaining') wipes the whole clipped glass, leaving a blank head. The
    // texture is re-uploaded from the pixels every redraw anyway, so software is also the cheaper path.
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.layer = document.createElement('canvas');
    this.layer.width = FACE_W;
    this.layer.height = FACE_H;
    this.lctx = this.layer.getContext('2d', { willReadFrequently: true })!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.cur = { ...EXPR.idle.face };
    this.ov = { ...EXPR.idle.ov };
  }

  dispose() {
    this.texture.dispose();
  }

  /** Advance and redraw if needed. `now` in seconds. Returns true when the texture changed. */
  update(now: number, dt: number, inp: FaceInput): boolean {
    const d = EXPR[inp.expr] ?? EXPR.idle;
    if (inp.expr !== this.expr) {
      this.expr = inp.expr;
      this.exprT0 = now;
      this.needs = true;
    }
    const te = now - this.exprT0;
    const flags = inp.flags ?? {};
    const icon = typeof flags.faceIcon === 'string' ? flags.faceIcon : '';
    if (icon !== this.iconName) {
      if (icon) this.iconT0 = now;
      if (icon) this.iconName = icon;
      else if (this.ov.icon < 0.02) this.iconName = '';
    }
    const corner = typeof flags.faceCorner === 'string' ? flags.faceCorner : '';
    if (corner) this.cornerName = corner;

    // ---- targets
    const tgt = { ...d.face };
    const tov = { ...d.ov };
    if (icon) {
      tov.icon = 1;
      tov.eyes = 0;
      tov.star = tov.heart = tov.sundrop = tov.closedU = tov.timer = tov.count = tov.bulb = tov.q = 0;
      tgt.mA = 0;
    }
    tov.corner = corner ? 1 : 0;
    if (inp.expr === 'lookLRL') tgt.gx = lookLRLCurve(te % 3.3) * 0.95;
    if (inp.expr === 'sleepy') {
      const br = Math.sin(te * 1.6) * 0.06;
      tgt.a_open = tgt.b_open = 0.3 + br;
    }
    if (inp.expr === 'laughing') tgt.ey = Math.sin(te * 18) * 3;
    // idle glances
    if (d.saccade && Math.abs(inp.gazeX) < 0.05 && Math.abs(inp.gazeY) < 0.05) {
      if (now > this.sacc.next) {
        const r1 = Math.random();
        this.sacc.x = r1 < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.4;
        this.sacc.y = r1 < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.18;
        this.sacc.next = now + 1.2 + Math.random() * 2.6;
      }
      tgt.gx += this.sacc.x;
      tgt.gy += this.sacc.y;
    }
    tgt.gx = clamp(tgt.gx + inp.gazeX, -1.1, 1.1);
    tgt.gy = clamp(tgt.gy + inp.gazeY, -1.1, 1.1);

    // speech mouth on top of the expression
    const speaking = inp.mouth > 0.02 && !d.noSpeech && !icon;
    this.speak += ((speaking ? 1 : 0) - this.speak) * damp(12, dt);
    if (speaking) {
      const [round, wide] = VISEME_SHAPE[inp.viseme] ?? [0.15, 0.1];
      tgt.mA = 1;
      tgt.mOpen = Math.max(tgt.mOpen, clamp(inp.mouth, 0, 1) * 0.85);
      tgt.mRound = Math.max(tgt.mRound * 0.5, round * 0.8);
      tgt.mW = Math.max(46, tgt.mW) * (1 + wide * 0.35);
      tgt.mCurve = Math.max(0.15, tgt.mCurve * 0.7);
    }

    // ---- ease toward targets
    let moved = 0;
    const kf = damp(13, dt);
    const km = damp(speaking ? 32 : 14, dt);
    for (const k of FACE_KEYS) {
      const kk = k.startsWith('m') ? km : k === 'gx' || k === 'gy' ? damp(16, dt) : kf;
      const v = this.cur[k] + (tgt[k] - this.cur[k]) * kk;
      const scale = k.endsWith('_w') || k.endsWith('_h') || k === 'mW' ? 0.02 : 1;
      moved = Math.max(moved, Math.abs(v - this.cur[k]) * scale);
      this.cur[k] = v;
    }
    const ko = damp(10, dt);
    for (const k of OV_KEYS) {
      const v = this.ov[k] + (tov[k] - this.ov[k]) * ko;
      moved = Math.max(moved, Math.abs(v - this.ov[k]));
      this.ov[k] = v < 0.002 && tov[k] === 0 ? 0 : v;
    }
    this.glowLevel = this.ov.glow;

    // ---- blinks
    let blink = 0;
    if (d.blink && !icon) {
      if (now > this.blinkNext) {
        this.blinkT0 = now;
        this.blinkDouble = Math.random() < 0.18;
        this.blinkNext = now + 2.2 + Math.random() * 3.5;
      }
      const bt = now - this.blinkT0;
      const one = (x: number) => (x >= 0 && x <= 0.17 ? Math.sin((x / 0.17) * Math.PI) : 0);
      blink = Math.max(one(bt), this.blinkDouble ? one(bt - 0.26) : 0);
    }

    const ov = this.ov;
    const animated =
      blink > 0 ||
      ov.bars > 0.01 ||
      ov.dots > 0.01 ||
      ov.red > 0.01 ||
      ov.star > 0.01 ||
      ov.heart > 0.01 ||
      ov.q > 0.01 ||
      ov.bulb > 0.01 ||
      ov.timer > 0.01 ||
      ov.count > 0.01 ||
      ov.sundrop > 0.01 ||
      ov.confetti > 0.01 ||
      ov.zzz > 0.01 ||
      ov.sweat > 0.01 ||
      ov.icon > 0.01 ||
      ov.corner > 0.01 ||
      inp.expr === 'laughing';
    if (!(this.needs || moved > 0.0015 || animated)) return false;
    if (!this.needs && now - this.lastDraw < 1 / 30) return false;
    this.needs = false;
    this.lastDraw = now;
    this.draw(now, te, blink, flags);
    this.texture.needsUpdate = true;
    return true;
  }

  /* ---------------------------------------------------------------- drawing */

  private draw(now: number, te: number, blink: number, flags: Record<string, boolean | number | string>) {
    const ctx = this.ctx;
    const f = this.cur;
    const ov = this.ov;
    ctx.save();
    ctx.clearRect(0, 0, FACE_W, FACE_H);
    // glass
    rr(ctx, 2, 2, FACE_W - 4, FACE_H - 4, 44);
    ctx.clip();
    const bg = ctx.createRadialGradient(CX, FACE_H * 0.45, 20, CX, FACE_H * 0.5, FACE_W * 0.6);
    bg.addColorStop(0, '#0C141C');
    bg.addColorStop(1, '#03060A');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, FACE_W, FACE_H);
    if (ov.glow > 0.01) {
      ctx.globalAlpha = ov.glow;
      const g = ctx.createRadialGradient(CX, FACE_H / 2, 30, CX, FACE_H / 2, FACE_W * 0.55);
      g.addColorStop(0, '#FFFFFF');
      g.addColorStop(1, '#FFF6D8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, FACE_W, FACE_H);
      ctx.globalAlpha = 1;
    }
    // warning: red inner edge
    if (ov.red > 0.01) {
      const pulse = 0.72 + 0.28 * Math.sin(now * 6);
      ctx.save();
      ctx.globalAlpha = ov.red * pulse;
      ctx.strokeStyle = COL.red;
      ctx.shadowColor = COL.red;
      ctx.shadowBlur = 30;
      ctx.lineWidth = 22;
      rr(ctx, 2, 2, FACE_W - 4, FACE_H - 4, 44);
      ctx.stroke();
      ctx.restore();
    }

    const eyeCol = mix(COL.eye, COL.dark, ov.glow);
    const glowCol = ov.glow > 0.5 ? 'rgba(0,0,0,0)' : COL.glow;
    const ex = (side: 'a' | 'b') => CX + (side === 'a' ? -1 : 1) * (EYE_SEP + f.sep) + f.gx * 22;
    const ey = EYE_Y + f.ey + f.gy * 15;

    // blush
    if (ov.blush > 0.01 && ov.glow < 0.5) {
      ctx.save();
      ctx.globalAlpha = ov.blush * 0.55;
      ctx.fillStyle = COL.blush;
      ctx.shadowColor = COL.blush;
      ctx.shadowBlur = 18;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(CX + s * 168, EYE_Y + 50, 24, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // eyes (drawn on a layer so lids can cut them, then composited with glow)
    if (ov.eyes > 0.01) {
      const l = this.lctx;
      l.clearRect(0, 0, FACE_W, FACE_H);
      for (const side of ['a', 'b'] as const) this.eyeShape(l, side, ex(side), ey, blink);
      ctx.save();
      ctx.globalAlpha = ov.eyes;
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = 22;
      ctx.drawImage(this.layer, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
      // tint the layer pixels: draw the layer as a mask filled with the eye colour
      // (the layer was drawn in the eye colour already)
    }

    // brows
    for (const side of ['a', 'b'] as const) {
      const a = f[`${side}_browA`] * ov.eyes;
      if (a < 0.01) continue;
      const inner = side === 'a' ? 1 : -1;
      const x = ex(side);
      const y = ey - f[`${side}_h`] / 2 - 18 - f[`${side}_browY`] * 13;
      const t = f[`${side}_browT`];
      const L = 30;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = eyeCol;
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // outer end, arched middle, inner end (browT > 0 lifts the inner end: worried)
      ctx.moveTo(x - inner * L, y + Math.sin(t) * L * 0.6);
      ctx.quadraticCurveTo(x, y - 5, x + inner * L, y - Math.sin(t) * L * 0.6);
      ctx.stroke();
      ctx.restore();
    }

    // special eyes
    const eyeAlphaSp = (k: Ov) => ov[k] * (1 - ov.icon);
    if (eyeAlphaSp('star') > 0.01) {
      for (const side of ['a', 'b'] as const) {
        const s = 1 + 0.06 * Math.sin(now * 5 + (side === 'a' ? 0 : 1.2));
        drawStar(ctx, ex(side), ey, 46 * s, Math.sin(now * 1.8) * 0.18, COL.star, eyeAlphaSp('star'));
      }
    }
    if (eyeAlphaSp('heart') > 0.01) {
      for (const side of ['a', 'b'] as const) {
        const beat = 1 + 0.1 * Math.max(0, Math.sin(now * 7)) ** 3;
        drawHeart(ctx, ex(side), ey + 2, 44 * beat, COL.heart, eyeAlphaSp('heart'));
      }
    }
    if (eyeAlphaSp('sundrop') > 0.01) {
      drawSun(ctx, ex('a'), ey, 30, now, eyeAlphaSp('sundrop'));
      drawDrop(ctx, ex('b'), ey + 4, 36, COL.drop, eyeAlphaSp('sundrop'));
    }
    if (eyeAlphaSp('closedU') > 0.01) {
      ctx.save();
      ctx.globalAlpha = eyeAlphaSp('closedU');
      ctx.strokeStyle = eyeCol;
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      for (const side of ['a', 'b'] as const) {
        ctx.beginPath();
        ctx.arc(ex(side), ey - 4, 28, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      ctx.restore();
    }

    // mouth
    const mA = f.mA * (1 - ov.icon);
    if (mA > 0.01) this.mouth(ctx, mA, eyeCol, glowCol);

    // ---- overlays
    if (ov.bars > 0.01) {
      ctx.save();
      ctx.globalAlpha = ov.bars;
      ctx.fillStyle = COL.check;
      ctx.shadowColor = '#22C55E';
      ctx.shadowBlur = 12;
      for (const side of ['a', 'b'] as const) {
        for (let i = 0; i < 5; i++) {
          const hh = 6 + 22 * Math.abs(Math.sin(now * 7.3 + i * 1.37 + (side === 'a' ? 0 : 2.1))) * (0.55 + 0.45 * Math.sin(now * 2.3 + i));
          const x = ex(side) - 32 + i * 16;
          rr(ctx, x - 4, EYE_Y + 66 - hh / 2, 8, hh, 4);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    if (ov.dots > 0.01) {
      ctx.save();
      ctx.globalAlpha = ov.dots;
      ctx.fillStyle = eyeCol;
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = 14;
      for (let i = 0; i < 3; i++) {
        const ph = (now * 2.2 - i * 0.28) % 1.4;
        const up = ph > 0 && ph < 0.5 ? Math.sin((ph / 0.5) * Math.PI) : 0;
        ctx.beginPath();
        ctx.arc(CX - 34 + i * 34, MOUTH_Y + 4 - up * 12, 9 + up * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (ov.q > 0.01) {
      ctx.save();
      ctx.globalAlpha = ov.q;
      ctx.translate(FACE_W - 64, 66);
      ctx.rotate(Math.sin(now * 3) * 0.12);
      ctx.font = `700 92px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COL.star;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 16;
      ctx.fillText('؟', 0, 0);
      ctx.restore();
    }
    if (ov.bulb > 0.01) drawBulb(ctx, CX, 52, 34, now, ov.bulb * (1 - ov.icon));
    if (ov.timer > 0.01) {
      const secs = Number(flags.timerSecs ?? 3) || 3;
      drawTimer(ctx, CX, FACE_H / 2, 78, clamp(te / secs, 0, 1), now, ov.timer * (1 - ov.icon), eyeCol, glowCol);
    }
    if (ov.count > 0.01) {
      const to = Math.max(1, Math.round(Number(flags.countTo ?? 3) || 3));
      const step = Number(flags.countStep ?? 0.75) || 0.75;
      const k = Math.floor((te - 0.1) / step);
      const a = ov.count * (1 - ov.icon);
      if (k >= to) {
        const tk = te - 0.1 - to * step;
        drawCheck(ctx, CX, FACE_H / 2 + 4, 70 * pop(tk), COL.check, a);
      } else if (k >= 0) {
        const tk = te - 0.1 - k * step;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(CX, FACE_H / 2 + 8);
        const s = pop(tk);
        ctx.scale(s, s);
        ctx.font = `700 150px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = eyeCol;
        ctx.shadowColor = glowCol;
        ctx.shadowBlur = 22;
        ctx.fillText(toArabicDigits(k + 1), 0, 0);
        ctx.restore();
      }
    }
    if (ov.confetti > 0.01) drawConfetti(ctx, now, ov.confetti);
    if (ov.zzz > 0.01) drawZzz(ctx, now, ov.zzz, eyeCol, glowCol);
    if (ov.sweat > 0.01) drawDrop(ctx, FACE_W - 70, 40 + ((now * 10) % 14), 18, COL.drop, ov.sweat * 0.9);
    if (ov.icon > 0.01 && this.iconName) {
      const s = pop(now - this.iconT0);
      drawIcon(ctx, this.iconName as FaceIcon, CX, FACE_H / 2, 80 * s, now, ov.icon, eyeCol, glowCol);
    }
    if (ov.corner > 0.01 && this.cornerName) {
      const s = 1 + 0.12 * Math.sin(now * 5);
      drawIcon(ctx, this.cornerName as FaceIcon, FACE_W - 66, 50, 30 * s, now, ov.corner, eyeCol, glowCol);
    }

    // glass sheen and rim
    const sheen = ctx.createLinearGradient(0, 0, FACE_W * 0.4, FACE_H);
    sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
    sheen.addColorStop(0.45, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, FACE_W, FACE_H);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#2B3540';
    rr(ctx, 2, 2, FACE_W - 4, FACE_H - 4, 44);
    ctx.stroke();
    ctx.restore();
  }

  private eyeShape(l: CanvasRenderingContext2D, side: 'a' | 'b', cx: number, cy: number, blink: number) {
    const f = this.cur;
    const w = f[`${side}_w`];
    const h0 = f[`${side}_h`];
    const h = Math.max(6, h0 * (1 - 0.9 * blink));
    const open = f[`${side}_open`];
    const tilt = f[`${side}_tilt`];
    const smile = f[`${side}_smile`];
    const inner = side === 'a' ? 1 : -1;
    const top = cy - h / 2 + (h0 - h) * 0.25;
    l.save();
    l.fillStyle = mix(COL.eye, COL.dark, this.ov.glow);
    rr(l, cx - w / 2, top, w, h, Math.min(w, h) * 0.46);
    l.fill();
    l.globalCompositeOperation = 'destination-out';
    if (open < 0.995 || Math.abs(tilt) > 0.005) {
      const y0 = top + (1 - open) * h;
      const k = Math.tan(tilt) * inner;
      l.beginPath();
      l.moveTo(cx - w, y0 - k * w - 2);
      l.lineTo(cx + w, y0 + k * w - 2);
      l.lineTo(cx + w, -10);
      l.lineTo(cx - w, -10);
      l.closePath();
      l.fill();
    }
    if (smile > 0.005) {
      const R = w * 0.95;
      l.beginPath();
      l.arc(cx, top + h + R - smile * h * 0.78, R, 0, Math.PI * 2);
      l.fill();
    }
    l.restore();
  }

  private mouth(ctx: CanvasRenderingContext2D, alpha: number, col: string, glowCol: string) {
    const f = this.cur;
    const round = clamp(f.mRound, 0, 1);
    const w = f.mW * (1 - 0.45 * round);
    const half = w / 2;
    const my = MOUTH_Y + f.mY + f.ey * 0.5;
    const cx = CX + f.gx * 6;
    const yL = my + f.mTilt * 10;
    const yR = my - f.mTilt * 10;
    const mid = (yL + yR) / 2;
    const sag = f.mCurve * 20 * (1 - round * 0.8);
    const oh = clamp(f.mOpen, 0, 1) * 44;
    const inset = 0.22 - 0.2 * round;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(cx - half, yL);
    ctx.bezierCurveTo(cx - half + w * inset, mid + sag - oh * (0.15 + 0.35 * round), cx + half - w * inset, mid + sag - oh * (0.15 + 0.35 * round), cx + half, yR);
    ctx.bezierCurveTo(cx + half - w * (inset * 0.4), mid + sag + oh * (1 - 0.2 * round), cx - half + w * (inset * 0.4), mid + sag + oh * (1 - 0.2 * round), cx - half, yL);
    ctx.closePath();
    ctx.shadowColor = glowCol;
    ctx.shadowBlur = 16;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.strokeStyle = col;
    ctx.stroke();
    if (oh > 1) {
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = col;
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ icon drawing */

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, Math.max(0.01, h), Math.max(0, Math.min(r, w / 2, h / 2)));
}

function mix(a: string, b: string, t: number) {
  if (t <= 0.001) return a;
  if (t >= 0.999) return b;
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return '#' + ca.lerp(cb, t).getHexString();
}

/** Pop-in scale for an icon appearing t seconds ago. */
function pop(t: number) {
  if (t < 0) return 0.01;
  if (t > 0.45) return 1;
  return 1 + Math.sin(t * 14) * Math.exp(-t * 9) * 0.35 - Math.exp(-t * 25) * 0.6;
}

function withGlow(ctx: CanvasRenderingContext2D, color: string, alpha: number, blur = 18) {
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string, alpha: number) {
  ctx.save();
  withGlow(ctx, '#F59E0B', alpha, 20);
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.48 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.42);
  ctx.bezierCurveTo(x - s * 0.95, y - s * 0.2, x - s * 0.5, y - s * 0.85, x, y - s * 0.38);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.85, x + s * 0.95, y - s * 0.2, x, y + s * 0.42);
  ctx.closePath();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, alpha: number) {
  ctx.save();
  withGlow(ctx, color, alpha, 20);
  heartPath(ctx, x, y, s);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, now: number, alpha: number) {
  ctx.save();
  withGlow(ctx, '#FB8C00', alpha, 20);
  ctx.translate(x, y);
  ctx.rotate(now * 0.6);
  ctx.strokeStyle = COL.sun;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25);
    ctx.lineTo(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = COL.sun;
  ctx.fill();
  ctx.restore();
}

function drawDrop(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, alpha: number) {
  ctx.save();
  withGlow(ctx, color, alpha, 16);
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.bezierCurveTo(x + s * 0.25, y - s * 0.55, x + s * 0.72, y - s * 0.05, x + s * 0.72, y + s * 0.3);
  ctx.arc(x, y + s * 0.3, s * 0.72, 0, Math.PI);
  ctx.bezierCurveTo(x - s * 0.72, y - s * 0.05, x - s * 0.25, y - s * 0.55, x, y - s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = alpha * 0.8;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#E1F5FE';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.3, y + s * 0.2, s * 0.1, s * 0.2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBulb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, now: number, alpha: number) {
  ctx.save();
  const pulse = 0.8 + 0.2 * Math.sin(now * 4);
  withGlow(ctx, '#FFC107', alpha, 26 * pulse);
  ctx.strokeStyle = COL.star;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    const a = -Math.PI / 2 + i * 0.55;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3);
    ctx.lineTo(x + Math.cos(a) * r * (1.55 + 0.1 * pulse), y + Math.sin(a) * r * (1.55 + 0.1 * pulse));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(x + r * 0.42, y + r * 1.05);
  ctx.lineTo(x - r * 0.42, y + r * 1.05);
  ctx.closePath();
  ctx.fillStyle = COL.star;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#B0BEC5';
  rr(ctx, x - r * 0.42, y + r * 1.12, r * 0.84, r * 0.22, 3);
  ctx.fill();
  rr(ctx, x - r * 0.36, y + r * 1.4, r * 0.72, r * 0.2, 3);
  ctx.fill();
  ctx.restore();
}

function drawTimer(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, now: number, alpha: number, col: string, glowCol: string) {
  ctx.save();
  withGlow(ctx, glowCol, alpha, 16);
  ctx.strokeStyle = col;
  ctx.globalAlpha = alpha * 0.28;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = alpha * (p >= 1 ? 0.75 + 0.25 * Math.sin(now * 8) : 1);
  ctx.strokeStyle = p >= 1 ? COL.check : col;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, p));
  ctx.stroke();
  // ten ticks
  ctx.lineWidth = 5;
  ctx.strokeStyle = col;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 10;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
    ctx.lineTo(x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74);
    ctx.stroke();
  }
  // hand
  const a = -Math.PI / 2 + Math.PI * 2 * p;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = col;
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, alpha: number) {
  ctx.save();
  withGlow(ctx, '#22C55E', alpha, 20);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(4, s * 0.24);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.62, y + s * 0.02);
  ctx.lineTo(x - s * 0.18, y + s * 0.45);
  ctx.lineTo(x + s * 0.7, y - s * 0.45);
  ctx.stroke();
  ctx.restore();
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, alpha: number) {
  ctx.save();
  withGlow(ctx, color, alpha, 20);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(4, s * 0.24);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s * 0.5);
  ctx.lineTo(x + s * 0.5, y + s * 0.5);
  ctx.moveTo(x + s * 0.5, y - s * 0.5);
  ctx.lineTo(x - s * 0.5, y + s * 0.5);
  ctx.stroke();
  ctx.restore();
}

const CONFETTI = Array.from({ length: 38 }, (_, i) => {
  const r = (n: number) => {
    const v = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  return { x: r(1) * FACE_W, y: r(2) * FACE_H, v: 50 + r(3) * 70, rot: r(4) * 6, vr: (r(5) - 0.5) * 8, c: ['#FF5C8A', '#FFD447', '#4ADE80', '#60A5FA', '#F472B6', '#FB923C'][i % 6], w: 8 + r(6) * 6 };
});

function drawConfetti(ctx: CanvasRenderingContext2D, now: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const c of CONFETTI) {
    const y = ((c.y + now * c.v) % (FACE_H + 30)) - 15;
    const x = c.x + Math.sin(now * 2 + c.rot) * 10;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(c.rot + now * c.vr);
    ctx.fillStyle = c.c;
    ctx.shadowColor = c.c;
    ctx.shadowBlur = 8;
    ctx.fillRect(-c.w / 2, -3, c.w, 6);
    ctx.restore();
  }
  ctx.restore();
}

function drawZzz(ctx: CanvasRenderingContext2D, now: number, alpha: number, col: string, glowCol: string) {
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = (now / 2.4 + i / 3) % 1;
    const s = 12 + ph * 16;
    const x = FACE_W - 120 + ph * 50 + i * 4;
    const y = 70 - ph * 50;
    withGlow(ctx, glowCol, alpha * Math.sin(ph * Math.PI), 10);
    ctx.beginPath();
    ctx.moveTo(x - s / 2, y - s / 2);
    ctx.lineTo(x + s / 2, y - s / 2);
    ctx.lineTo(x - s / 2, y + s / 2);
    ctx.lineTo(x + s / 2, y + s / 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawIcon(ctx: CanvasRenderingContext2D, name: FaceIcon, x: number, y: number, s: number, now: number, alpha: number, col: string, glowCol: string) {
  switch (name) {
    case 'check':
      return drawCheck(ctx, x, y, s, COL.check, alpha);
    case 'cross':
      return drawCross(ctx, x, y, s * 0.9, COL.red, alpha);
    case 'heart':
      return drawHeart(ctx, x, y, s * 1.1, COL.heart, alpha);
    case 'star':
      return drawStar(ctx, x, y, s * 0.75, 0, COL.star, alpha);
    case 'sun':
      return drawSun(ctx, x, y, s * 0.45, now, alpha);
    case 'drop':
      return drawDrop(ctx, x, y, s * 0.7, COL.drop, alpha);
    case 'bulb':
      return drawBulb(ctx, x, y - s * 0.2, s * 0.45, now, alpha);
    case 'clock':
      return drawTimer(ctx, x, y, s * 0.8, (now % 3) / 3, now, alpha, col, glowCol);
    case 'question': {
      ctx.save();
      withGlow(ctx, '#F59E0B', alpha, 16);
      ctx.font = `700 ${Math.round(s * 1.6)}px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COL.star;
      ctx.fillText('؟', x, y);
      ctx.restore();
      return;
    }
    case 'bolt': {
      ctx.save();
      withGlow(ctx, '#F59E0B', alpha * (0.8 + 0.2 * Math.sin(now * 20)), 24);
      ctx.fillStyle = COL.star;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.18, y - s * 0.95);
      ctx.lineTo(x - s * 0.5, y + s * 0.12);
      ctx.lineTo(x - s * 0.02, y + s * 0.12);
      ctx.lineTo(x - s * 0.22, y + s * 0.95);
      ctx.lineTo(x + s * 0.52, y - s * 0.18);
      ctx.lineTo(x + s * 0.04, y - s * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    case 'warning': {
      ctx.save();
      withGlow(ctx, '#F59E0B', alpha, 18);
      ctx.fillStyle = COL.star;
      ctx.lineJoin = 'round';
      ctx.lineWidth = s * 0.16;
      ctx.strokeStyle = COL.star;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.8);
      ctx.lineTo(x + s * 0.85, y + s * 0.65);
      ctx.lineTo(x - s * 0.85, y + s * 0.65);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1E2A3B';
      rr(ctx, x - s * 0.08, y - s * 0.35, s * 0.16, s * 0.6, s * 0.08);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + s * 0.42, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    case 'firstAid': {
      ctx.save();
      withGlow(ctx, '#22C55E', alpha, 18);
      ctx.fillStyle = '#FFFFFF';
      rr(ctx, x - s * 0.8, y - s * 0.62, s * 1.6, s * 1.24, s * 0.22);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#22B573';
      rr(ctx, x - s * 0.14, y - s * 0.44, s * 0.28, s * 0.88, 4);
      ctx.fill();
      rr(ctx, x - s * 0.44, y - s * 0.14, s * 0.88, s * 0.28, 4);
      ctx.fill();
      ctx.restore();
      return;
    }
    case 'stop': {
      ctx.save();
      withGlow(ctx, COL.red, alpha, 18);
      ctx.fillStyle = COL.red;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + (i * Math.PI) / 4;
        ctx.lineTo(x + Math.cos(a) * s * 0.85, y + Math.sin(a) * s * 0.85);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      // a raised palm
      rr(ctx, x - s * 0.3, y - s * 0.05, s * 0.6, s * 0.45, s * 0.12);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        rr(ctx, x - s * 0.3 + i * s * 0.155, y - s * 0.45, s * 0.13, s * 0.5, s * 0.065);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    case 'whistle': {
      ctx.save();
      withGlow(ctx, glowCol, alpha, 18);
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      ctx.lineWidth = s * 0.1;
      // body
      ctx.beginPath();
      ctx.arc(x - s * 0.18, y + s * 0.1, s * 0.48, Math.PI * 0.05, Math.PI * 1.95, false);
      ctx.lineTo(x + s * 0.85, y - s * 0.38);
      ctx.lineTo(x + s * 0.85, y - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#05080C';
      ctx.beginPath();
      ctx.arc(x - s * 0.18, y + s * 0.1, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      // sound lines
      withGlow(ctx, glowCol, alpha * (0.6 + 0.4 * Math.sin(now * 14)), 12);
      ctx.strokeStyle = col;
      ctx.lineCap = 'round';
      ctx.lineWidth = s * 0.08;
      for (let i = 0; i < 3; i++) {
        const a = -0.9 + i * 0.45;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.55 + Math.cos(a) * s * 0.65, y - s * 0.55 + Math.sin(a) * s * 0.65);
        ctx.lineTo(x + s * 0.55 + Math.cos(a) * s * 0.95, y - s * 0.55 + Math.sin(a) * s * 0.95);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    case 'pin': {
      ctx.save();
      withGlow(ctx, '#F59E0B', alpha, 18);
      ctx.strokeStyle = COL.star;
      ctx.fillStyle = COL.star;
      ctx.lineWidth = s * 0.14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x - s * 0.35, y, s * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * 0.03, y);
      ctx.lineTo(x + s * 0.95, y);
      ctx.stroke();
      ctx.restore();
      return;
    }
    case 'target': {
      ctx.save();
      withGlow(ctx, COL.red, alpha, 16);
      ctx.strokeStyle = COL.red;
      ctx.lineWidth = s * 0.12;
      for (const r of [0.85, 0.5]) {
        ctx.beginPath();
        ctx.arc(x, y, s * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = COL.red;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
  }
}
