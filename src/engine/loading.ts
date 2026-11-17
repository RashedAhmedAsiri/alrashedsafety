import { useApp } from '../core/store';
import { fontsReady } from '../core/fonts';
import { clock } from './clock';
import { playFlyIn } from './travel';

/**
 * Opening sequence driver: `loadProgress` 0→1 from real readiness (fonts, canvas created, the first
 * world compiled, a few frames drawn), never faster than MIN_MS so the title animation plays; then a
 * short hold for the bus to arrive and the title's final bounce, then phase 'flyin' (camera flight
 * into the classroom), then 'menu'.
 */

const MIN_MS = 2600;
const HOLD_MS = 800;
const GIVE_UP_MS = 20000;

const WEIGHTS = { fonts: 0.2, canvas: 0.15, compiled: 0.4, frames: 0.25 } as const;
type Part = keyof typeof WEIGHTS;
const done: Record<Part, number> = { fonts: 0, canvas: 0, compiled: 0, frames: 0 };

let started = false;
let t0 = 0;

export function markLoaded(part: Part, v = 1) {
  done[part] = Math.max(done[part], Math.min(1, v));
}

function real(): number {
  let s = 0;
  for (const k of Object.keys(WEIGHTS) as Part[]) s += WEIGHTS[k] * done[k];
  return s;
}

/** Starts the progress loop once. `skip` jumps straight to the menu (dev: ?skip=1). */
export function startLoading(opts: { skip?: boolean } = {}) {
  if (started) return;
  started = true;
  t0 = clock.now();
  fontsReady.then(() => markLoaded('fonts'));
  let shown = 0;
  const timer = setInterval(() => {
    const el = clock.now() - t0;
    const target = Math.min(el > GIVE_UP_MS ? 1 : real(), opts.skip ? 1 : el / MIN_MS);
    // Ease the bar toward the target; never backwards.
    shown = Math.max(shown, shown + (target - shown) * 0.35);
    if (target >= 0.999 && shown > 0.985) shown = 1;
    if (Math.abs(useApp.getState().loadProgress - shown) > 0.004 || shown === 1) useApp.setState({ loadProgress: shown });
    if (shown >= 1) {
      clearInterval(timer);
      setTimeout(
        () => {
          if (useApp.getState().phase !== 'loading') return;
          useApp.getState().set({ phase: 'flyin' });
          playFlyIn({ skip: opts.skip }).catch((e) => console.error('[engine] fly-in', e));
        },
        opts.skip ? 0 : HOLD_MS,
      );
    }
  }, 50);
}
