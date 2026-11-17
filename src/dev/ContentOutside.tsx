import { useEffect } from 'react';
import { icons, type LucideIcon } from 'lucide-react';
import { INTRO, OUTSIDE_SCENARIOS } from '../content/data/outside';

/**
 * Preview of the outside scenarios panel colors and icons (content-outside worker).
 *   ?dev=ContentOutside            4 columns
 *   ?dev=ContentOutside&cols=3     3 columns (portrait iPad)
 * Only a stand-in for the real panel (src/ui), drawn in the plan's toy-button style so the content
 * choices (icon, color, title length) can be judged.
 */

const darker = (hex: string, f = 0.78) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f));
  return `rgb(${c.join(',')})`;
};

export default function ContentOutside() {
  const cols = Number(new URLSearchParams(location.search).get('cols') ?? 4);
  const list = [INTRO, ...OUTSIDE_SCENARIOS];
  useEffect(() => {
    const t = setTimeout(() => ((window as unknown as { __ready: boolean }).__ready = true), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: '#FFF8EC',
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        color: '#1E2A3B',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16,
          maxWidth: cols * 260,
          margin: '0 auto',
        }}
      >
        {list.map((s) => {
          const Icon = (icons as Record<string, LucideIcon>)[s.icon];
          return (
            <div
              key={s.id}
              style={{
                background: s.color,
                borderRadius: 22,
                boxShadow: `0 6px 0 ${darker(s.color)}`,
                padding: '14px 16px',
                minHeight: 64,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#fff',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.18)',
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                }}
              >
                {Icon ? <Icon size={30} strokeWidth={2.5} color="#fff" /> : <span style={{ fontWeight: 700 }}>?</span>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.5 }}>{s.title}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
