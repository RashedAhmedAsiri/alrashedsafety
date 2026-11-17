// OWNER: ui worker. Mode menu: soft fog + blur over the classroom and five cards sliding up one after
// another. Tap → the card pops, the others drop away, the fog clears, then enterMode(mode).
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Brain, Car, Pencil, School, Zap, type LucideIcon } from 'lucide-react';
import { MODE_COLORS } from '../core/theme';
import type { ModeId } from '../core/types';
import { enterMode } from '../engine/conversation';
import { playSfx, unlockAudio } from '../audio/sfx';
import { edgeOf } from './color';
import { MODE_TEXT } from './labels';
import { Logo } from './Logo';

export const MODE_ORDER: ModeId[] = ['outside', 'inside', 'short', 'creative', 'exam'];
export const MODE_ICONS: Record<ModeId, LucideIcon> = { outside: Car, inside: School, short: Zap, creative: Brain, exam: Pencil };

/** Time from tap to enterMode(): pop + drop + fog clearing. */
const LEAVE_MS = 380;

function ModeCard({ mode, i, state, onChoose }: { mode: ModeId; i: number; state: 'idle' | 'chosen' | 'dropped'; onChoose: (m: ModeId) => void }) {
  const [pressed, setPressed] = useState(false);
  const Icon = MODE_ICONS[mode];
  const color = MODE_COLORS[mode];
  const t = MODE_TEXT[mode];
  return (
    <button
      type="button"
      className={`card${pressed ? ' is-pressed' : ''}${state === 'chosen' ? ' is-chosen' : ''}${state === 'dropped' ? ' is-dropped' : ''}`}
      style={{ '--i': i, '--c': color, '--edge': edgeOf(color), '--d': i, '--r': (i % 2 ? 1 : -1) * (6 + i * 2) } as CSSProperties}
      data-mode={mode}
      disabled={state !== 'idle'}
      onPointerDown={(e) => {
        if (e.button > 0) return;
        unlockAudio();
        setPressed(true);
        playSfx('pop');
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={() => onChoose(mode)}
    >
      <span className="card-icon">
        <Icon size={46} strokeWidth={2.5} />
      </span>
      <span className="card-title">{t.title}</span>
      <span className="card-desc">{t.desc}</span>
    </button>
  );
}

export function ModeMenu() {
  const [chosen, setChosen] = useState<ModeId | null>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const choose = (m: ModeId) => {
    if (chosen) return;
    setChosen(m);
    playSfx('whoosh', { volume: 0.6 });
    timer.current = window.setTimeout(() => {
      void enterMode(m);
    }, LEAVE_MS);
    // Safety: if the engine never leaves the menu, give the cards back.
    window.setTimeout(() => {
      setChosen((c) => (c === m ? null : c));
    }, 6000);
  };

  return (
    <div className={`menu${chosen ? ' is-leaving' : ''}`}>
      <div className="fog" />
      <div className="menu-logo">
        <Logo height="clamp(64px, 11vh, 96px)" />
      </div>
      <div className="cards">
        {MODE_ORDER.map((m, i) => (
          <ModeCard key={m} mode={m} i={i} state={!chosen ? 'idle' : chosen === m ? 'chosen' : 'dropped'} onChoose={choose} />
        ))}
      </div>
    </div>
  );
}
