/**
 * Painted (canvas) textures used by the props. All cached by key through kit.canvasTexture and redrawn
 * once the Arabic font has loaded. No English anywhere: plates use Arabic letters and digits only.
 */
import * as THREE from 'three';
import { canvasTexture, canvasText, PAL } from '../world/kit';
import { FONT_FAMILY } from '../core/fonts';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PLATE_LETTERS = ['أ ب ح', 'د ر س', 'ص ط ع', 'ق ك ل', 'م ن هـ', 'و ى ب', 'ح د ص', 'ل م ر'];

/** Simple Saudi-style plate: white, black border, Arabic digits over Arabic letters, a small blue side strip. */
export function plateTexture(variant: number) {
  const v = Math.abs(variant) % 8;
  return canvasTexture(`plate:${v}`, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1B1B1B';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    // side strip (left on the plate)
    ctx.fillStyle = '#2F6FB5';
    ctx.fillRect(8, 8, 34, h - 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(25, h / 2 - 12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(17, h / 2 + 4, 16, 18);
    // divider
    ctx.fillStyle = '#1B1B1B';
    ctx.fillRect(44, h / 2 - 2, w - 52, 4);
    const n = ((v * 2741 + 1307) % 9000) + 1000;
    const digits = String(n)
      .split('')
      .map((d) => AR_DIGITS[+d])
      .join(' ');
    canvasText(ctx, digits, (w + 44) / 2, h * 0.28, 44, '#1B1B1B');
    canvasText(ctx, PLATE_LETTERS[v], (w + 44) / 2, h * 0.74, 44, '#1B1B1B');
  });
}

/** «حافلة مدرسية» side lettering on transparent background (black with white outline). */
export function busTextTexture() {
  return canvasTexture('bus:text', 1024, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = `700 118px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeText('حافلة مدرسية', w / 2, h / 2 + 6);
    ctx.fillStyle = '#16181C';
    ctx.fillText('حافلة مدرسية', w / 2, h / 2 + 6);
  });
}

/** Front header sign of the bus (black panel, yellow letters). */
export function busFrontSignTexture() {
  return canvasTexture('bus:front', 512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#16181C';
    ctx.fillRect(0, 0, w, h);
    canvasText(ctx, 'حافلة مدرسية', w / 2, h / 2 + 4, 62, '#F7C531');
  });
}

/** Red octagon with «قف» (stop arm of the bus and the organizer's sign uses a round version). */
export function stopTexture(round: boolean) {
  return canvasTexture(`stop:${round ? 'round' : 'oct'}`, 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const path = (r: number) => {
      ctx.beginPath();
      if (round) ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      else
        for (let i = 0; i < 8; i++) {
          const a = Math.PI / 8 + (i * Math.PI) / 4;
          const x = w / 2 + Math.cos(a) * r;
          const y = h / 2 + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      ctx.closePath();
    };
    ctx.fillStyle = '#FFFFFF';
    path(126);
    ctx.fill();
    ctx.fillStyle = '#D92D2D';
    path(114);
    ctx.fill();
    canvasText(ctx, 'قف', w / 2, h / 2 + 8, 118, '#FFFFFF');
  });
}

/** Pedestrian signal head pictograms: 'red' standing man, 'green' walking man, 'off' dark. */
export function pedSignalTexture(which: 'red' | 'green' | 'offRed' | 'offGreen') {
  return canvasTexture(`ped:${which}`, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#121418';
    ctx.fillRect(0, 0, w, h);
    const on = which === 'red' || which === 'green';
    const col = which === 'red' ? '#FF3B30' : which === 'green' ? '#33E07A' : which === 'offRed' ? '#3A1C1C' : '#173322';
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.lineWidth = 13;
    const cx = w / 2;
    ctx.beginPath();
    ctx.arc(cx, 26, 11, 0, Math.PI * 2);
    ctx.fill();
    if (which === 'red' || which === 'offRed') {
      // standing man
      ctx.beginPath();
      ctx.moveTo(cx, 44);
      ctx.lineTo(cx, 82);
      ctx.moveTo(cx - 18, 50);
      ctx.lineTo(cx - 18, 78);
      ctx.moveTo(cx + 18, 50);
      ctx.lineTo(cx + 18, 78);
      ctx.moveTo(cx - 8, 84);
      ctx.lineTo(cx - 8, 116);
      ctx.moveTo(cx + 8, 84);
      ctx.lineTo(cx + 8, 116);
      ctx.stroke();
      ctx.fillRect(cx - 18, 42, 36, 44);
    } else {
      // walking man
      ctx.beginPath();
      ctx.moveTo(cx + 2, 44);
      ctx.lineTo(cx - 4, 82);
      ctx.moveTo(cx, 50);
      ctx.lineTo(cx + 22, 70);
      ctx.moveTo(cx, 50);
      ctx.lineTo(cx - 20, 72);
      ctx.moveTo(cx - 4, 82);
      ctx.lineTo(cx + 18, 100);
      ctx.lineTo(cx + 20, 118);
      ctx.moveTo(cx - 4, 82);
      ctx.lineTo(cx - 20, 116);
      ctx.stroke();
    }
    if (on) {
      const g = ctx.createRadialGradient(cx, h / 2, 10, cx, h / 2, 70);
      g.addColorStop(0, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });
}

/** Wet-floor sign face: yellow, warning triangle with a slipping figure. */
export function wetFloorTexture() {
  return canvasTexture('wetfloor', 256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#FFD21F';
    ctx.fillRect(0, 0, w, h);
    // triangle
    ctx.fillStyle = '#16181C';
    ctx.beginPath();
    ctx.moveTo(w / 2, 40);
    ctx.lineTo(w - 22, 250);
    ctx.lineTo(22, 250);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFD21F';
    ctx.beginPath();
    ctx.moveTo(w / 2, 72);
    ctx.lineTo(w - 46, 234);
    ctx.lineTo(46, 234);
    ctx.closePath();
    ctx.fill();
    // slipping person
    ctx.strokeStyle = '#16181C';
    ctx.fillStyle = '#16181C';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(146, 118, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(138, 136);
    ctx.lineTo(118, 182); // body leaning back
    ctx.moveTo(136, 146);
    ctx.lineTo(168, 136); // arm up
    ctx.moveTo(132, 152);
    ctx.lineTo(100, 150); // arm back
    ctx.moveTo(118, 182);
    ctx.lineTo(160, 196); // leg forward (slipping)
    ctx.lineTo(176, 182);
    ctx.moveTo(118, 182);
    ctx.lineTo(104, 214);
    ctx.stroke();
    // floor + drops
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(78, 220);
    ctx.lineTo(182, 220);
    ctx.stroke();
    for (const [x, y] of [
      [90, 206],
      [186, 206],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.quadraticCurveTo(x + 7, y, x, y + 4);
      ctx.quadraticCurveTo(x - 7, y, x, y - 12);
      ctx.fill();
    }
    // lower band: big exclamation
    ctx.fillStyle = '#16181C';
    ctx.beginPath();
    ctx.arc(w / 2, 320, 36, 0, Math.PI * 2);
    ctx.fill();
    canvasText(ctx, '!', w / 2, 322, 56, '#FFD21F');
  });
}

export type BubbleIcon = 'check' | 'cross' | 'warning' | 'question' | 'heart' | 'star';

/** Speech bubble (white with tail) and a pictogram; transparent outside. */
export function bubbleTexture(icon: BubbleIcon) {
  return canvasTexture(`bubble:${icon}`, 256, 256, (ctx, w) => {
    ctx.clearRect(0, 0, w, w);
    // bubble with outline
    const bubble = () => {
      ctx.beginPath();
      const x = 20,
        y = 14,
        bw = 216,
        bh = 184,
        r = 60;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + bw, y, x + bw, y + bh, r);
      ctx.arcTo(x + bw, y + bh, x, y + bh, r);
      ctx.lineTo(150, y + bh);
      ctx.lineTo(128, 246);
      ctx.lineTo(104, y + bh);
      ctx.arcTo(x, y + bh, x, y, r);
      ctx.arcTo(x, y, x + bw, y, r);
      ctx.closePath();
    };
    bubble();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1E2A3B';
    ctx.stroke();
    const cx = 128,
      cy = 106;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (icon === 'check') {
      ctx.strokeStyle = '#22B573';
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.moveTo(cx - 52, cy + 2);
      ctx.lineTo(cx - 14, cy + 40);
      ctx.lineTo(cx + 56, cy - 38);
      ctx.stroke();
    } else if (icon === 'cross') {
      ctx.strokeStyle = '#E23B3B';
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.moveTo(cx - 44, cy - 44);
      ctx.lineTo(cx + 44, cy + 44);
      ctx.moveTo(cx + 44, cy - 44);
      ctx.lineTo(cx - 44, cy + 44);
      ctx.stroke();
    } else if (icon === 'warning') {
      ctx.fillStyle = '#FFAA1F';
      ctx.strokeStyle = '#FFAA1F';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 62);
      ctx.lineTo(cx + 66, cy + 54);
      ctx.lineTo(cx - 66, cy + 54);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1E2A3B';
      ctx.fillRect(cx - 8, cy - 26, 16, 48);
      ctx.beginPath();
      ctx.arc(cx, cy + 38, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === 'question') {
      ctx.fillStyle = '#2D8CFF';
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.fill();
      canvasText(ctx, '؟', cx, cy + 10, 120, '#FFFFFF');
    } else if (icon === 'heart') {
      ctx.fillStyle = '#F0476B';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 62);
      ctx.bezierCurveTo(cx - 100, cy - 4, cx - 54, cy - 84, cx, cy - 34);
      ctx.bezierCurveTo(cx + 54, cy - 84, cx + 100, cy - 4, cx, cy + 62);
      ctx.fill();
    } else if (icon === 'star') {
      ctx.fillStyle = '#F7C531';
      ctx.strokeStyle = '#E09A10';
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 30 : 72;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const x = cx + Math.cos(a) * r;
        const y = cy + 6 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  });
}

export type BoardImage = 'logo' | 'flame' | 'bulbOff' | 'rain' | 'extinguisher' | 'firstAid' | 'blank';

/** Smartboard pictures (16:9). */
export function boardTexture(image: BoardImage) {
  return canvasTexture(`board:${image}`, 640, 360, (ctx, w, h) => drawBoard(ctx, w, h, image));
}

function drawBoard(ctx: CanvasRenderingContext2D, w: number, h: number, image: BoardImage) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  const sky = image === 'rain' ? ['#5D6E82', '#9AA9B8'] : image === 'bulbOff' ? ['#1A2130', '#2B3446'] : ['#FFFFFF', '#EAF6F4'];
  bg.addColorStop(0, sky[0]);
  bg.addColorStop(1, sky[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2,
    cy = h / 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (image === 'blank') return;
  if (image === 'logo') {
    // robot head badge + name
    ctx.fillStyle = '#14B8A6';
    ctx.beginPath();
    ctx.arc(cx + 150, cy - 6, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, cx + 88, cy - 62, 124, 100, 34);
    ctx.fill();
    ctx.fillStyle = '#1C2430';
    roundRect(ctx, cx + 100, cy - 48, 100, 70, 24);
    ctx.fill();
    ctx.fillStyle = '#7CF5E6';
    ctx.beginPath();
    ctx.ellipse(cx + 128, cy - 18, 10, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 172, cy - 18, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7CF5E6';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx + 150, cy - 2, 16, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + 150, cy - 62);
    ctx.lineTo(cx + 150, cy - 82);
    ctx.stroke();
    ctx.fillStyle = '#FFAA1F';
    ctx.beginPath();
    ctx.arc(cx + 150, cy - 86, 9, 0, Math.PI * 2);
    ctx.fill();
    canvasText(ctx, 'الراشد', cx - 90, cy - 18, 110, '#1E2A3B');
    ctx.fillStyle = '#14B8A6';
    roundRect(ctx, cx - 210, cy + 48, 240, 12, 6);
    ctx.fill();
    return;
  }
  if (image === 'flame') {
    // bin with a flame, red circle
    ctx.fillStyle = '#FDECEA';
    ctx.beginPath();
    ctx.arc(cx, cy, 150, 0, Math.PI * 2);
    ctx.fill();
    drawFlame(ctx, cx, cy + 40, 1.6);
    ctx.fillStyle = '#7B8794';
    ctx.beginPath();
    ctx.moveTo(cx - 62, cy + 40);
    ctx.lineTo(cx + 62, cy + 40);
    ctx.lineTo(cx + 48, cy + 128);
    ctx.lineTo(cx - 48, cy + 128);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (image === 'bulbOff') {
    ctx.fillStyle = '#3B4659';
    ctx.beginPath();
    ctx.arc(cx, cy - 30, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8A94A6';
    ctx.fillRect(cx - 40, cy + 50, 80, 56);
    ctx.fillStyle = '#5D6778';
    for (let i = 0; i < 3; i++) ctx.fillRect(cx - 42, cy + 58 + i * 16, 84, 6);
    ctx.strokeStyle = '#1C2430';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy + 40);
    ctx.lineTo(cx - 12, cy - 30);
    ctx.lineTo(cx, cy - 10);
    ctx.lineTo(cx + 12, cy - 30);
    ctx.lineTo(cx + 24, cy + 40);
    ctx.stroke();
    // little stars of darkness
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 18; i++) ctx.fillRect((i * 97) % w, (i * 53) % (h / 2), 3, 3);
    return;
  }
  if (image === 'rain') {
    ctx.fillStyle = '#E6ECF2';
    for (const [x, y, r] of [
      [cx - 80, cy - 70, 60],
      [cx, cy - 96, 76],
      [cx + 86, cy - 66, 58],
      [cx - 140, cy - 46, 40],
      [cx + 150, cy - 44, 40],
    ])
      ctx.beginPath(), ctx.arc(x, y, r, 0, Math.PI * 2), ctx.fill();
    ctx.fillRect(cx - 170, cy - 60, 340, 50);
    ctx.strokeStyle = '#7CC4FA';
    ctx.lineWidth = 7;
    for (let i = 0; i < 14; i++) {
      const x = cx - 160 + i * 25;
      const y = cy + 10 + ((i * 37) % 60);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 10, y + 34);
      ctx.stroke();
    }
    // umbrella
    ctx.fillStyle = '#F0476B';
    ctx.beginPath();
    ctx.arc(cx + 150, cy + 100, 60, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#1E2A3B';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + 150, cy + 100);
    ctx.lineTo(cx + 150, cy + 160);
    ctx.arc(cx + 140, cy + 160, 10, 0, Math.PI);
    ctx.stroke();
    return;
  }
  if (image === 'extinguisher') {
    ctx.fillStyle = '#E23B3B';
    roundRect(ctx, cx - 50, cy - 70, 100, 210, 40);
    ctx.fill();
    ctx.fillStyle = '#1E2A3B';
    ctx.fillRect(cx - 18, cy - 110, 36, 44);
    ctx.fillRect(cx - 60, cy - 110, 110, 14);
    ctx.strokeStyle = '#1E2A3B';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(cx + 18, cy - 92);
    ctx.quadraticCurveTo(cx + 110, cy - 90, cx + 100, cy + 20);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, cx - 34, cy - 10, 68, 70, 10);
    ctx.fill();
    ctx.fillStyle = '#F7C531';
    ctx.beginPath();
    ctx.arc(cx - 40, cy - 100, 14, 0, Math.PI * 2);
    ctx.fill();
    // spray puff
    ctx.fillStyle = 'rgba(200,210,220,0.9)';
    for (const [x, y, r] of [
      [cx + 120, cy + 50, 24],
      [cx + 150, cy + 76, 30],
      [cx + 190, cy + 100, 36],
    ])
      ctx.beginPath(), ctx.arc(x, y, r, 0, Math.PI * 2), ctx.fill();
    return;
  }
  if (image === 'firstAid') {
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, cx - 140, cy - 90, 280, 190, 26);
    ctx.fill();
    ctx.strokeStyle = '#1FAE5B';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.fillStyle = '#1FAE5B';
    ctx.fillRect(cx - 22, cy - 66, 44, 132);
    ctx.fillRect(cx - 66, cy - 22, 132, 44);
    ctx.fillStyle = '#1E2A3B';
    roundRect(ctx, cx - 50, cy - 118, 100, 36, 14);
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#1E2A3B';
    ctx.stroke();
    return;
  }
}

export function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const layer = (col: string, k: number) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 60 * s * k, y - 10 * s, x - 40 * s * k, y - 80 * s * k, x - 4 * s, y - 120 * s * k);
    ctx.bezierCurveTo(x + 10 * s * k, y - 80 * s * k, x + 40 * s * k, y - 90 * s * k, x + 30 * s * k, y - 130 * s * k);
    ctx.bezierCurveTo(x + 70 * s * k, y - 80 * s * k, x + 60 * s * k, y - 10 * s, x, y);
    ctx.fill();
  };
  layer('#FF5A1F', 1);
  layer('#FFAA1F', 0.68);
  layer('#FFE36B', 0.38);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Football panels (equirectangular-ish, good enough on a small sphere). */
export function footballTexture() {
  return canvasTexture('ball:football', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1E1E1E';
    const pent = (x: number, y: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        ctx.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    };
    for (let i = 0; i < 4; i++) {
      pent(i * 64 + 16, 34, 13);
      pent(i * 64 + 48, 94, 13);
    }
    pent(128, 4, 20);
    pent(128, 124, 20);
  });
}

export function basketballTexture() {
  return canvasTexture('ball:basket', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#F07C2B';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2A1A10';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    for (const x of [0, w / 4, w / 2, (3 * w) / 4, w]) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(w / 4, h / 2, 34, 64, 0, -Math.PI / 2, Math.PI / 2);
    ctx.ellipse((3 * w) / 4, h / 2, 34, 64, 0, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.stroke();
  });
}

/** Snack bag with a peanut picture. */
export function peanutTexture() {
  return canvasTexture('snack:peanut', 128, 192, (ctx, w, h) => {
    ctx.fillStyle = '#F2A33A';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(0, 0, w, 26);
    ctx.fillRect(0, h - 26, w, 26);
    ctx.fillStyle = '#FFF5DE';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 46, 0, Math.PI * 2);
    ctx.fill();
    // peanut
    ctx.fillStyle = '#C98A45';
    ctx.strokeStyle = '#8A5A28';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 2 - 14, h / 2 - 8, 18, 22, -0.6, 0, Math.PI * 2);
    ctx.ellipse(w / 2 + 12, h / 2 + 10, 18, 22, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#A8713A';
    for (let i = 0; i < 6; i++) ctx.fillRect(w / 2 - 22 + i * 8, h / 2 - 12 + (i % 2) * 12, 3, 3);
  });
}

/** Allergy sticker (red circle with crossed peanut). */
export function allergyStickerTexture() {
  return canvasTexture('sticker:allergy', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C98A45';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 12, h / 2 - 8, 16, 20, -0.6, 0, Math.PI * 2);
    ctx.ellipse(w / 2 + 12, h / 2 + 10, 16, 20, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E23B3B';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 52, 0, Math.PI * 2);
    ctx.moveTo(w / 2 - 36, h / 2 - 36);
    ctx.lineTo(w / 2 + 36, h / 2 + 36);
    ctx.stroke();
  });
}

/** Scrolling chevrons for the ground arrow (white on transparent; tinted by the material colour). */
export function chevronTexture() {
  const t = canvasTexture('arrow:chevron', 128, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const y of [70, 198]) {
      ctx.beginPath();
      ctx.moveTo(18, y + 34);
      ctx.lineTo(w / 2, y - 22);
      ctx.lineTo(w - 18, y + 34);
      ctx.stroke();
    }
  });
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Soft round particle (white, alpha falloff). */
export function softDotTexture() {
  return canvasTexture('particle:soft', 64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Soft dark blob for contact shadows under vehicles and props. */
export function blobShadowTexture() {
  return canvasTexture('shadow:blob', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Red and white diagonal stripes (barrier tape, poles). */
export function stripeTexture(a = '#E23B3B', b = '#FFFFFF', repeat: [number, number] = [1, 1]) {
  return canvasTexture(
    `stripe:${a}:${b}:${repeat.join('x')}`,
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = b;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = a;
      for (let i = -2; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 32, 0);
        ctx.lineTo(i * 32 + 16, 0);
        ctx.lineTo(i * 32 + 16 + h, h);
        ctx.lineTo(i * 32 + h, h);
        ctx.closePath();
        ctx.fill();
      }
    },
    { repeat },
  );
}

/** Manhole: dark hole with depth gradient and a concrete rim. */
export function holeTexture() {
  return canvasTexture('manhole:hole', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2 + 6, 6, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#000000');
    g.addColorStop(0.7, '#14161A');
    g.addColorStop(0.92, '#3A3D44');
    g.addColorStop(1, '#3A3D44');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    ctx.fill();
    // ladder rungs
    ctx.strokeStyle = 'rgba(160,160,160,0.6)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 - 14, 22 + i * 12);
      ctx.lineTo(w / 2 + 14, 22 + i * 12);
      ctx.stroke();
    }
  });
}

export function manholeCoverTexture() {
  return canvasTexture('manhole:cover', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4C5058';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#363A40';
    ctx.lineWidth = 5;
    for (let r = 14; r < 60; r += 14) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(4, h / 2);
    ctx.lineTo(w - 4, h / 2);
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w / 2, h - 4);
    ctx.stroke();
  });
}

export { PAL };
