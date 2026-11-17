import { useApp } from '../core/store';
import { unlockAudio } from '../audio/sfx';
import * as speech from '../voice/speech';
import { clock } from './clock';

/**
 * Global input hooks:
 *  - audio unlock: the first pointer/touch/key gestures call unlockAudio() (sfx) and the voice
 *    module's unlockVoice() when it exports one (iPad Safari needs a gesture);
 *  - sleepy: 60 s without any touch while Alrashed is ready → face 'sleepy'; any touch → 'smile'.
 */

const SLEEP_MS = 60_000;
let lastInput = clock.now();
let installed = false;

function unlockAll() {
  try {
    unlockAudio();
  } catch (e) {
    console.error('[engine] unlockAudio', e);
  }
  const uv = (speech as unknown as Record<string, unknown>)['unlockVoice'];
  if (typeof uv === 'function') {
    try {
      (uv as () => void)();
    } catch (e) {
      console.error('[engine] unlockVoice', e);
    }
  }
}

export function noteInput() {
  lastInput = clock.now();
  const a = useApp.getState();
  if (a.expression === 'sleepy') a.set({ expression: 'smile' });
}

export function installInputHooks(): () => void {
  if (installed) return () => {};
  installed = true;
  let unlocks = 0;
  const onGesture = () => {
    noteInput();
    if (unlocks < 4) {
      unlocks++;
      unlockAll();
    }
  };
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener('pointerdown', onGesture, opts);
  window.addEventListener('touchend', onGesture, opts);
  window.addEventListener('keydown', onGesture, opts);
  window.addEventListener('wheel', noteInput, opts);

  const timer = setInterval(() => {
    const a = useApp.getState();
    const idle =
      (a.phase === 'mode' || a.phase === 'menu') && a.status === 'ready' && !a.playing && !a.listening && !a.traveling;
    if (idle && a.expression !== 'sleepy' && clock.now() - lastInput > SLEEP_MS) a.set({ expression: 'sleepy' });
    if (!idle) lastInput = clock.now(); // the minute starts when he becomes ready again
  }, 1000);

  return () => {
    installed = false;
    window.removeEventListener('pointerdown', onGesture, opts);
    window.removeEventListener('touchend', onGesture, opts);
    window.removeEventListener('keydown', onGesture, opts);
    window.removeEventListener('wheel', noteInput, opts);
    clearInterval(timer);
  };
}
