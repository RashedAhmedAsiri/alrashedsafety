// OWNER: ui worker. Tiny color helpers for the toy-button style.

function parse(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** Darker edge under a toy button: same hue, ~22% darker, slightly more saturated. */
export function edgeOf(hex: string, amount = 0.22): string {
  const [r, g, b] = parse(hex);
  return toHex(r * (1 - amount), g * (1 - amount * 1.05), b * (1 - amount * 0.9));
}

/** Mix a color toward white (t = 0..1). */
export function tint(hex: string, t: number): string {
  const [r, g, b] = parse(hex);
  return toHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

/** Relative luminance 0..1 (WCAG). */
export function luminance(hex: string): number {
  const c = parse(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** White on most colors; ink on very light ones (pale yellow etc.). */
export function textOn(hex: string, ink = '#1E2A3B'): string {
  return luminance(hex) > 0.58 ? ink : '#FFFFFF';
}
