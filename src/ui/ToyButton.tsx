// OWNER: ui worker. The chunky toy button used everywhere: solid color, 22 px radius, 6 px darker
// edge, pressing pushes it 4 px down with a soft pop. Works with touch and mouse.
import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { playSfx, unlockAudio } from '../audio/sfx';
import { edgeOf, textOn } from './color';

export interface ToyButtonProps {
  color: string;
  /** Text/icon color; white by default, ink on very light colors. */
  fg?: string;
  onPress?: () => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  label?: string;
  disabled?: boolean;
  /** Sound on press (default 'pop'); null for silent. */
  sound?: 'pop' | 'click' | null;
  /** Round button (circle) instead of the 22 px rounded square. */
  round?: boolean;
  /** Extra attributes for tests and styling hooks. */
  data?: Record<string, string>;
}

export function ToyButton({ color, fg, onPress, children, className, style, label, disabled, sound = 'pop', round, data }: ToyButtonProps) {
  const [pressed, setPressed] = useState(false);
  const downAt = useRef(0);

  const down = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.button !== undefined && e.button > 0) return;
      unlockAudio();
      setPressed(true);
      downAt.current = performance.now();
      if (sound) playSfx(sound, { volume: 0.9 });
    },
    [disabled, sound],
  );

  const up = useCallback(() => setPressed(false), []);

  const dataAttrs: Record<string, string> = {};
  if (data) for (const [k, v] of Object.entries(data)) dataAttrs[`data-${k}`] = v;

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={`toy${round ? ' toy--round' : ''}${pressed ? ' is-pressed' : ''}${className ? ' ' + className : ''}`}
      style={{ '--c': color, '--edge': edgeOf(color), '--fg': fg ?? textOn(color), ...style } as CSSProperties}
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
      onClick={() => {
        if (!disabled) onPress?.();
      }}
      {...dataAttrs}
    >
      {children}
    </button>
  );
}
