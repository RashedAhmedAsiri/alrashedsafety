# cut-street cutscenes

Files: `src/cutscenes/outside/{open_sewer,heavy_rain,flood_safety,parked_cars}.cut.ts`, helper `streetKit.ts` (`wp(c, worldX, worldZ, dy)` = world point on the surface), steps `tools/steps/cut-street/run.mjs` (env `SCN=id,id`; plays setup/before/simulated speech/during/after through `playCutsceneScript`, captures a canvas frame 0.4 s after every camera change), shots in `shots/cut-street/m_<id>.png`.
No `setup` parts: these tables have no "Speaking setup", so each `before` ends in the speech arrangement.

## open_sewer (roadworks, wet, morning) - before ~13 s, during, after ~10 s
Before: wide along sidewalk, S1 (green) walks head-down toward hole (0-4); cut to Alrashed beyond the hole, stop palm + beep, warning (4-5); low angle from beside the hole through the tape, S1 stops 1.5 m short, steps back, lifts head (5-7); Alrashed walks the safe strip, kneels beside S1 (speech start). During: his eyes move hole/puddles/cones. After: points along safe strip (0-2); high angle, S1 curves around hole/cones/puddle (2-7); thumbs up + chime (7-9).

## heavy_rain (gate -> houses, rain->wet, afternoon)
Before: wide of gate in rain, thunder (0-3); push in, weather blends to wet, drips/birds (3-6). After: close on umbrella, closeUmbrella (0-2); walks around puddle (2-5); look L-R-L, car splashes by (5-8); crosses on zebra (8-12); `go('houses')`, walks to the teal gate, waves, goes in (12-16). Ambient traffic is switched off for the crossing and back on at the end.

## flood_safety (flood_dip, wet, afternoon)
Before: wide of dip with Alrashed on the strip (0-3); low at the water edge, S1 lifts a foot (3-5); Alrashed jogs over, stop-arm, S1 steps back (5-7); speech camera north of them, water behind. After: close on water, branch swept away (0-2); high wide, both walk the raised strip to the park east gate (2-8); wide at park gate, hearts (8-10).

## parked_cars (parking, sunny, afternoon)
Before: wide, S1 (yellow) kicks ball at the fence, it rolls between cars (0-3); low behind the SUV, S1 runs and crouches, reverse lights + beep, SUV creeps back 0.7 m (3-5); Alrashed rushes in, stop palm, horn tap, brake lights, leads S1 by hand to the walkway (5-7); kneels (speech). During: eyes toward the reverse lights. After: SUV backs out and drives away, Alrashed fetches the ball (0-4); hands it over, both walk off, `go('football_field')` and walk in (4-8).

## Gaps / notes
- No gate exists in the parking-side fence; the walk to the football field ends at the fence and a fade (`go`) carries them to the field entrance (26, -20.5).
- The speech-phase two-shots rely on the default gestures being skipped while he kneels (open_sewer, parked_cars); flood_safety stands and uses the default gestures.
- Headless SwiftShader runs at about 2 fps, so walks take about 1.5-2x longer in my tests than on a device; real timing follows the tables.
- Held umbrella/ball render now; puddle/leaf props used as "branch" (scaled leaf) are small.
