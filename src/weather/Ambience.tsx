// OWNER: weather worker. Ambient sound loops matched to weather and indoor/outdoor, plus thunder.
import { useEffect } from 'react';
import { playSfx, stopSfx } from '../audio/sfx';
import type { SfxName, Weather } from '../core/types';
import { onThunder } from './blend';

type Mix = Partial<Record<SfxName, number>>;

/** Loop volumes per weather, outdoors and indoors (muffled). */
export function ambienceFor(weather: Weather, indoor: boolean): Mix {
  if (indoor) {
    switch (weather) {
      case 'rain': return { rain: 0.3 };
      case 'wet': return { drips: 0.12 };
      case 'dust': return { wind: 0.25 };
      default: return {};
    }
  }
  switch (weather) {
    case 'rain': return { rain: 1, wind: 0.18 };
    case 'wet': return { drips: 0.5, birds: 0.35 };
    case 'dust': return { wind: 1 };
    default: return { birds: 0.45, wind: 0.08 };
  }
}

/** What this module started, so changes stop only the loops that must go (they fade out) and start the new ones. */
const running = new Map<SfxName, number>();

function apply(want: Mix) {
  for (const [name, vol] of running) {
    if (want[name] !== vol) {
      stopSfx(name);
      running.delete(name);
    }
  }
  for (const [name, vol] of Object.entries(want) as [SfxName, number][]) {
    if (!running.has(name)) {
      playSfx(name, { loop: true, volume: vol });
      running.set(name, vol);
    }
  }
}

/** Starts / cross-fades the ambient loops for `weather` (the effective target weather). */
export function useAmbience(weather: Weather, indoor: boolean, rainActive: boolean) {
  useEffect(() => {
    apply(ambienceFor(weather, indoor));
  }, [weather, indoor]);
  useEffect(() => () => apply({}), []);
  useEffect(() => {
    if (!rainActive) return;
    const timers: number[] = [];
    const off = onThunder((delay, strength) => {
      timers.push(window.setTimeout(() => playSfx('thunder', { volume: strength * (indoor ? 0.45 : 0.8) }), delay * 1000));
    });
    return () => {
      off();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [rainActive, indoor]);
}
