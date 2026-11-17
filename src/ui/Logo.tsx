// OWNER: ui worker. The «الراشد» logo: rounded bold teal lettering with a darker toy edge; the three
// dots of the ش are redrawn so the top dot is Alrashed's glowing antenna light on a little stem.
// Glyph metrics measured from IBM Plex Sans Arabic Bold (the bundled font): the word is drawn without
// the dots («الراسد», identical advance width) and the dots are placed at the measured em offsets.
// OWNER: ui worker. The «الراشد» logo: the real word in rounded bold teal lettering with a darker toy
// edge drawn as a plain offset copy (no fattening stroke, so the letters and the three dots of the ش
// stay clean and separate). Text is shaped by the browser, never split into pieces.
import { COLORS } from '../core/theme';

const WORD = 'الراشد';

export interface LogoProps {
  /** Rendered height: px number or any CSS length (width follows the aspect ratio). */
  height?: number | string;
  color?: string;
  edge?: string;
  /** Kept for callers; the logo no longer draws a separate light. */
  light?: string;
  className?: string;
  title?: string;
}

export function Logo({ height = 96, color = COLORS.teal, edge = '#0B8C7E', className, title = 'الراشد' }: LogoProps) {
  const F = 100;
  const vb = { x: -135, y: -92, w: 270, h: 150 };
  const word = (fill: string, dx: number, dy: number) => (
    <text
      x={dx}
      y={dy}
      textAnchor="middle"
      fontFamily='"IBM Plex Sans Arabic", sans-serif'
      fontWeight={700}
      fontSize={F}
      fill={fill}
      direction="rtl"
      style={{ letterSpacing: 0, wordSpacing: 0 }}
    >
      {WORD}
    </text>
  );
  return (
    <svg
      className={className}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      role="img"
      aria-label={title}
      style={{ overflow: 'visible', display: 'block', height, width: 'auto', aspectRatio: `${vb.w} / ${vb.h}` }}
    >
      {/* toy edge: the same word, a little lower */}
      {word(edge, 0, 5)}
      {word(color, 0, 0)}
    </svg>
  );
}
