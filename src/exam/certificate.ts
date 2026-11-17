// OWNER: exam worker. Certificate helpers: bands, dates (Hijri + Gregorian), canvas drawing, print.
import { renderGender } from '../core/gender';
import type { Gender } from '../core/types';
import { EXAM_LABELS, EXAM_LINES } from '../content/data/exam';

export type Tier = 'gold' | 'silver' | 'bronze';

export const TIER_COLORS: Record<Tier, { main: string; dark: string; light: string }> = {
  gold: { main: '#F2B01E', dark: '#B97F00', light: '#FFE08A' },
  silver: { main: '#A9B4C2', dark: '#6F7C8C', light: '#E3E8EE' },
  bronze: { main: '#C98A4B', dark: '#8E5A27', light: '#F0CDA6' },
};

/** Index into EXAM_LINES.bands for a score (0 = 9..10, 1 = 6..8, 2 = 0..5). */
export function bandIndex(score: number): number {
  const i = EXAM_LINES.bands.findIndex((b) => score >= b.min && score <= b.max);
  return i < 0 ? EXAM_LINES.bands.length - 1 : i;
}

export function tierOf(score: number): Tier {
  return score >= 9 ? 'gold' : score >= 6 ? 'silver' : 'bronze';
}

const fmt = (locale: string, d: Date) => {
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  } catch {
    return d.toLocaleDateString('ar');
  }
};

/** «١٤ ربيع الأول ١٤٤٨ هـ» (Umm al-Qura) and «٢٠ سبتمبر ٢٠٢٦ م». */
export function certificateDates(d: Date): { hijri: string; gregorian: string } {
  return {
    hijri: fmt('ar-SA-u-ca-islamic-umalqura-nu-arab', d),
    gregorian: fmt('ar-SA-u-ca-gregory-nu-arab', d),
  };
}

export const certTitle = (gender: Gender) => renderGender(EXAM_LABELS.certTitle, gender);
export const phaseWord = (phase: 'pre' | 'post') => (phase === 'pre' ? EXAM_LABELS.phasePre : EXAM_LABELS.phasePost);

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.48;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export interface CertInput {
  score: number;
  phase: 'pre' | 'post';
  gender: Gender;
  date: Date;
}

/** Draw the certificate (1600 x 1131) on a canvas. Fonts must be loaded (src/core/fonts fontsReady). */
export function drawCertificate(canvas: HTMLCanvasElement, c: CertInput): void {
  const W = 1600;
  const H = 1131;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const tier = TIER_COLORS[tierOf(c.score)];
  const ink = '#1E2A3B';
  const FONT = '"IBM Plex Sans Arabic", sans-serif';
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFF8EC';
  ctx.fillRect(0, 0, W, H);
  // frame
  ctx.fillStyle = tier.main;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = tier.dark;
  ctx.fillRect(28, 28, W - 56, H - 56);
  ctx.fillStyle = '#FFF8EC';
  ctx.fillRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = tier.main;
  ctx.lineWidth = 6;
  ctx.setLineDash([2, 16]);
  ctx.lineCap = 'round';
  ctx.strokeRect(78, 78, W - 156, H - 156);
  ctx.setLineDash([]);

  // logo (teal word with a darker toy edge and the amber antenna light)
  ctx.font = `700 150px ${FONT}`;
  ctx.fillStyle = '#0B8C7E';
  ctx.fillText(EXAM_LABELS.logo, W / 2, 262 + 8);
  ctx.fillStyle = '#14B8A6';
  ctx.fillText(EXAM_LABELS.logo, W / 2, 262);
  ctx.fillStyle = ink;
  ctx.font = `500 44px ${FONT}`;
  ctx.fillText(EXAM_LABELS.school, W / 2, 346);

  // title
  ctx.fillStyle = tier.dark;
  ctx.font = `700 92px ${FONT}`;
  ctx.fillText(certTitle(c.gender), W / 2, 470);

  // stars
  const gap = 118;
  const x0 = W / 2 + gap * 4.5;
  for (let i = 0; i < 10; i++) {
    const cx = x0 - i * gap;
    starPath(ctx, cx, 590, 50);
    if (i < c.score) {
      ctx.fillStyle = '#FFC62B';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#D99100';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else {
      ctx.fillStyle = '#EFE6D3';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#CDBF9F';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  // phase and dates
  const { hijri, gregorian } = certificateDates(c.date);
  ctx.fillStyle = ink;
  ctx.font = `700 50px ${FONT}`;
  ctx.fillText(`${phaseWord(c.phase)} التدريب`, W / 2, 712);
  ctx.font = `500 40px ${FONT}`;
  ctx.fillText(`${hijri}  ·  ${gregorian}`, W / 2, 786);

  // name line
  ctx.font = `500 52px ${FONT}`;
  ctx.fillStyle = ink;
  ctx.textAlign = 'right';
  ctx.fillText(EXAM_LABELS.nameLine.replace(/\.+$/, '').trim(), W - 250, 930);
  ctx.textAlign = 'center';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.setLineDash([3, 14]);
  ctx.beginPath();
  ctx.moveTo(W - 560, 930);
  ctx.lineTo(260, 930);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function certificateToDataUrl(c: CertInput): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  drawCertificate(canvas, c);
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export function downloadImage(dataUrl: string, name = 'alrashed-certificate.png') {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Print the certificate image through a hidden iframe (landscape page, image fills it). */
export function printImage(dataUrl: string) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(f);
  const doc = f.contentDocument;
  if (!doc) return f.remove();
  doc.open();
  doc.write(
    `<!doctype html><html><head><style>@page{size:A4 landscape;margin:0}html,body{margin:0;height:100%}img{width:100%;height:100%;object-fit:contain;display:block}</style></head><body><img src="${dataUrl}"></body></html>`,
  );
  doc.close();
  const go = () => {
    try {
      f.contentWindow?.focus();
      f.contentWindow?.print();
    } finally {
      setTimeout(() => f.remove(), 60000);
    }
  };
  const img = doc.querySelector('img');
  if (img && !img.complete) img.onload = go;
  else setTimeout(go, 50);
}
