# Weather (src/weather)

Public API (unchanged): `weatherBlend`, `Lighting({ indoor })`, `WeatherSystem({ indoor, weather?, time? })`.
Extras exported from `src/weather`: `cond` (live light/fog numbers), `WIND` (`dir` Vector2 on XZ, `strength` 0..1), `onThunder(fn)`.

## What each weather looks like
- sunny: blue gradient sky, sun disc, soft cartoon clouds, crisp shadows, birds + breeze sound; at sunny midday a faint heat shimmer sheen over the asphalt (morning stronger than afternoon).
- afternoon: lower, warmer sun, peach horizon.
- rain: grey thick cloud deck, dim cool light, soft shadows, instanced rain streaks around the camera, ground splashes/rings, rippling sky-reflecting puddles, gutter streams along the street curbs, flood water rising in the side-road dip, thunder flashes (lightning brightens sky, light, fog) with delayed thunder sound, rain loop.
- wet (after rain): clouds breaking, sun back, faint rainbow over the park, glossy darker surfaces, puddles of all sizes, flood water in the dip, roof/canopy drips (school arcade, yard canopy, gate canopy, pick-up canopy, bus shelter), drips + birds sound.
- dust: orange-brown sky, pale sun disc, very short fog (4..78 m), horizontal dust streaks and fine motes blowing with the wind, wind howl, surfaces dulled/tan.

Blends take 3 s; they are eased every frame, and the first frame snaps to the target.

## Flags and state it reacts to
`weather`, `time`, `settings.quality` (store); flags `lights: 'off'` (indoor dusk, fast cut, slower return), `alarm` (slow red pulse about every 1.6 s), `expression === 'glow'` with lights off (cool point light following Alrashed's head). Indoors: rain/wet/dust only add muffled ambient sound (no sky, fog or particles).

## For other builders
```ts
import { weatherBlend, WIND } from '../weather';
useFrame(() => { weatherBlend.rain; weatherBlend.wet; weatherBlend.dust; weatherBlend.afternoon; }); // 0..1
```
- palms bending in dust: lean by `weatherBlend.dust * WIND.strength` along `WIND.dir` (x, z).
- wipers: run while `weatherBlend.rain > 0.3`; slower car speed / splashes: `weatherBlend.wet`.
- car headlights on: `weatherBlend.dust > 0.5` (or rain > 0.7).
- wet surfaces: create with `wetMat()` (kit) or `registerWet()` (world/wet.ts); WetSurfaces darkens them, lowers roughness, adds sky reflection (cube env, per material) and tints them tan in dust. Keep base color in `userData.dry` (done by registerWet).

## Files
`blend.ts` (blend state, presets, `cond`, `WIND`, thunder), `Lighting.tsx` (sun with camera-following snapped shadow box, hemisphere, indoor), `Sky.tsx` (dome shader, fog, rainbow), `Particles.tsx` (rain, splashes, drips, dust), `Ground.tsx` (wet look, puddles, flood + gutters, shimmer), `Ambience.tsx` (sound loops), `index.tsx`.

## Performance
Every effect is a single draw call (instanced shader quads, nothing updated on the CPU). Counts by quality (low/medium/high): rain 700/1500/2400, splashes 110/220/340, dust streaks 130 + motes 450 at medium, puddles 60/110/160. Quality low has no shadows; shadow map 1024/2048/4096. Particles hide when the camera is higher than ~45 m (fly-in, overview); fog is pushed out with camera height. Rain/dust draw nothing when their blend is 0.

## Sound
`rain`, `thunder`, `wind`, `birds`, `drips` via `playSfx/stopSfx`, chosen per weather and indoor/outdoor; changes stop the old loops (0.4 s fade) and start the new. Volume is fixed when a loop starts.

## Known gaps
Rain on windows, car wipers and splash-through-puddles belong to the sets/props. Puddle reflections are a sky gradient with fake dark building bands, not real mirroring. Heat shimmer is a sheen, not refraction.
