import { useEffect } from 'react';
import { icons, type LucideIcon } from 'lucide-react';
import { INTRO } from '../content/data/outside';
import { INSIDE_SCENARIOS } from '../content/data/inside';

/**
 * Preview of the inside scenarios panel colors and icons (content-inside worker).
 *   ?dev=ContentInside            4 columns
 *   ?dev=ContentInside&cols=3     3 columns (portrait iPad)
 *   ?dev=ContentInside&alt=1      also show alternative icons for comparison
 * Only a stand-in for the real panel (src/ui), drawn in the plan's toy-button style (solid color,
 * 22 px corners, 6 px darker edge, white Lucide icon at stroke 2.5) so the content choices can be judged.
 */

const darker = (hex: string, f = 0.78) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f));
  return `rgb(${c.join(',')})`;
};

const ALTERNATIVES: Record<string, string[]> = {
  fire_evacuation: ['Flame', 'Siren', 'DoorOpen', 'BellRing', 'AlarmSmoke'],
  stairs_safety: ['ArrowUpDown', 'ChevronsUpDown', 'DoorStairwell', 'MoveVertical', 'Footprints'],
  sports_hall: ['Volleyball', 'Dumbbell', 'Trophy', 'Whistle', 'Medal'],
  heat_water: ['Sun', 'ThermometerSun', 'GlassWater', 'SunMedium', 'Droplets'],
  friend_fainted: ['HeartPulse', 'Activity', 'HandHelping', 'Stethoscope', 'Hand'],
  electricity_lab: ['PlugZap', 'Plug', 'Zap', 'Monitor', 'Cable'],
};

function Button({ color, icon, title }: { color: string; icon: string; title: string }) {
  const Icon = (icons as Record<string, LucideIcon>)[icon];
  return (
    <div
      style={{
        background: color,
        borderRadius: 22,
        boxShadow: `0 6px 0 ${darker(color)}`,
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
        {Icon ? <Icon size={30} strokeWidth={2.5} color="#fff" /> : <span style={{ fontWeight: 700 }}>؟</span>}
      </div>
      <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.5 }}>{title}</div>
    </div>
  );
}

export default function ContentInside() {
  const params = new URLSearchParams(location.search);
  const cols = Number(params.get('cols') ?? 4);
  const alt = params.get('alt') === '1';
  const list = [INTRO, ...INSIDE_SCENARIOS];
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
        {list.map((s) => (
          <Button key={s.id} color={s.color} icon={s.icon} title={s.title} />
        ))}
      </div>
      {alt && (
        <div style={{ maxWidth: 1100, margin: '32px auto 0', display: 'grid', gap: 12 }}>
          {Object.entries(ALTERNATIVES).map(([id, names]) => {
            const s = INSIDE_SCENARIOS.find((x) => x.id === id)!;
            return (
              <div key={id} style={{ display: 'grid', gridTemplateColumns: `repeat(${names.length}, 1fr)`, gap: 12 }}>
                {names.map((n) => (
                  <Button key={n} color={s.color} icon={n} title={s.title} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
