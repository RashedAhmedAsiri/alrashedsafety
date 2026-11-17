// OWNER: weather worker. Sky, sun/ambient lighting, fog, rain/dust particles, wet look, time of day.
// Public API (keep exactly): weatherBlend, Lighting({ indoor }), WeatherSystem({ indoor, weather?, time? }).
import { useLayoutEffect } from 'react';
import { useApp } from '../core/store';
import type { Weather, TimeOfDay } from '../core/types';
import { override, weatherBlend as blend } from './blend';
import { Sky } from './Sky';
import { Dust, Drips, Rain, Splashes } from './Particles';
import { Flood, HeatShimmer, Puddles, WetSurfaces } from './Ground';
import { useAmbience } from './Ambience';

export { Lighting } from './Lighting';
export { cond, WIND, onThunder } from './blend';

/** Live blend values (0..1), updated every frame by <WeatherSystem/>. Read them inside useFrame. */
export const weatherBlend = blend;

/** Sky dome, fog and weather particles (outdoor only; indoors only the ambient sound and the blend). */
export function WeatherSystem({ indoor, weather, time }: { indoor: boolean; weather?: Weather; time?: TimeOfDay }) {
  const quality = useApp((s) => s.settings.quality);
  const storeWeather = useApp((s) => s.weather);
  // Previews override the store; the blend reads this module-level override every frame.
  useLayoutEffect(() => {
    override.weather = weather;
    override.time = time;
    return () => {
      override.weather = undefined;
      override.time = undefined;
    };
  }, [weather, time]);
  const effective = weather ?? storeWeather;
  useAmbience(effective, indoor, effective === 'rain');

  if (indoor) return null;
  return (
    <>
      <Sky />
      <WetSurfaces />
      <Puddles quality={quality} />
      <Flood />
      <HeatShimmer />
      <Rain quality={quality} />
      <Splashes quality={quality} />
      <Drips quality={quality} />
      <Dust quality={quality} />
    </>
  );
}
