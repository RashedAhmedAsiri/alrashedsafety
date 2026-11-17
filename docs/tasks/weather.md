# Brief: weather (light, sky, rain, wet, dust, time of day, ambience)

**You own:** `src/weather/**`, `docs/weather.md`.

**Source:** "Weather" and "Performance targets" in `docs/plan/3D_world.md`; ARCHITECTURE (flags,
wet surfaces, performance); `src/world/wet.ts`; `src/core/store.ts` (`weather`, `time`, `settings.quality`).

Keep `weatherBlend`, `Lighting({ indoor })`, `WeatherSystem({ indoor, weather?, time? })` exactly
(the optional props override the store, e.g. in previews).

1. `weatherBlend` eased toward targets from `useApp.weather` / `time` over 3 s every frame
   (`rain`, `wet`, `dust`, `afternoon`, 0..1). Other modules read it inside `useFrame`.
2. **Lighting**: outdoor: warm sun (directional, shadows only near the camera: shadow camera follows the
   camera's look point, map size by quality, soft bias tuned so nothing acnes), hemisphere sky light,
   colors/intensity per weather and time (sunny crisp; rain dim cool; wet brightening; dust orange,
   pale sun; afternoon lower warmer sun). Indoor: bright soft classroom lighting without shadows acne;
   flag `lights: 'off'` dims to a cool dusk level; flag `alarm` adds a slow red pulse; when the robot's
   face is `glow` and lights are off, a soft light follows Alrashed's head (he lights the room).
   Sensible tone mapping/exposure that keeps the flat cartoon colors bright.
3. **WeatherSystem** (outdoor; indoor only what makes sense): sky dome (gradient + sun disc + soft
   cartoon clouds that thicken in rain and break up in wet; orange haze in dust), fog distances per
   weather (dust short), rain streaks near the camera (instanced, follows the camera), splashes on the
   ground, thunder flashes now and then in rain, puddles that appear in rain/wet at sensible spots
   (street edges, sidewalks, yard; glossy sky-reflecting), wet surfaces via `WET_MATERIALS` (darker,
   lower roughness, slight metalness), drips from roof edges in wet, a faint rainbow over the park in
   wet, dust streaks with wind and fine dust in the air, a subtle heat shimmer over the asphalt at
   sunny midday if cheap. Ambient sound loops through `playSfx`/`stopSfx` from `src/audio/sfx.ts`
   (rain, wind, birds, drips) matched to weather and indoor/outdoor, cross-faded on change.
4. Respect `settings.quality` (particle counts, shadow map size). Keep it cheap on iPads.
5. Verify with `tools/shot.mjs` across weather × time × places: `view=crosswalk_main`, `view=yard`,
   `view=park`, `view=overview` with `&weather=sunny|rain|wet|dust&time=morning|afternoon`, and indoor
   `view=classroom&flags=lights:off` (+ `&expr=glow`) and `&flags=alarm:true`. Outdoor sets are being
   built at the same time, so judge your sky, light, particles and fog; iterate until each weather is
   unmistakable and pretty.

Write `docs/weather.md`: what each weather looks like, flags you react to, `weatherBlend` usage for
other builders (e.g. palms bending in dust, wipers in rain), performance notes.
