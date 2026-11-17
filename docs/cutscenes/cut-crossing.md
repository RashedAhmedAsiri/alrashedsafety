# cut-crossing: crossing scenarios

Files: `src/cutscenes/outside/{crossing_road,reaching_school,crossing_with_friends,traffic_light}.cut.ts`, helper
`src/cutscenes/outside/crossing-common.ts` (`at(c)(worldX, worldZ, dy)` = world coordinates, surface-aware).
All four set stage flag `traffic: 'off'` (their own cars only). Verify: `tools/steps/cut-crossing/run.mjs`
(runs setup/before/during/after directly, no speech; env `SCEN`, `LOC`, `SCHED` seconds per part).
Orientation used: north sidewalk = school side (z -3.5..-7.5), westbound lane z -1.75 (cars from the EAST), eastbound z +1.75.

## crossing_road (setup, after)
Setup: Alrashed on the north sidewalk facing the camera (camera north, park side behind him), white car parked far east.
After: 1 (0-2) behind him at 1.2 m, turns, steps to curb z -3.8 | 2 (2-5) over shoulder, lookLRL, car drives in from the left |
3 (5-7) side view, car stops at x 7, he nods | 4 (7-11) tracking at child height, crosses at x 0 (speed 1.7), eyes glance at the car mid-way |
5 (11-15) wide from the south sidewalk, hearts, waves, car leaves, he walks west toward the park.
Gaps: the park is 40 m west of the gate crossing, so he only walks a few metres west; driver does not lift a hand (no clip), car driver is the prop's `driver`.

## reaching_school (setup, after)
Setup: far sidewalk, Alrashed beside the palm planter at x -7 with a backpack in his left hand (cannot be worn), organizer standing inside the gate,
two boys (S1 orange, S2 purple striped, small) walk past eastward. After: 1 walk to the curb | 2 face close-up then over-shoulder, pickup (car prop seed 5) passes from the left
(west, east-bound lane), then lookLRL | 3 low angle, steps forward | 4 tracking across the stripes | 5 wide at the gate: gate opens, high five (organizer raiseHand, robot wave, clap), bell, walks in.
Gap: the gate crossing is a raised table flush with the sidewalk, so "steps down from the curb" is a plain step onto the stripes.

## crossing_with_friends (setup, before, during, after)
Setup: Alrashed at the curb, S1 red / S2 yellow inside the gate (gate opened). Before: 1 bell, boys run | 2 `catch`, boys `stopStepBack`, hands held (flags holdHand) |
3 engine roar, red car from the left | 4 horn, shake 0.12 x 0.4 s, leaf + bag swirl | 5 close on worried boys, they look at each other then up.
Car path: near westbound lane at z -1.1 (3.2 m from the boys); the plan says "far lane" but cars from the left use the near lane, so it hugs the centre line.
During: crouch between the boys, hands held, after ~6 s turnToCamera. After: 1 stand, step to curb | 2 all lookLRL, car stops | 3 cross holding hands (speed 1.65) | 4 hands released, high five, boys walk on calmly west.

## traffic_light (setup, before, during, after)
Setup at the north corner of the signal crossing (centre x -64.5): Alrashed, S1 (striped green), far boy S3 on the south corner; lights red.
Before: 1 wide, cars pass both lanes, S1 steps to the curb | 2 hand on shoulder (handOnShoulder), S1 steps back, he points up.
During: camera medium, gesture loop (button, light, stripes), a background car every 9 s. After: 1 S1 presses the button (pedWait lamp) |
2 carLight yellow -> red, cars stop at their lines, pedLight green | 3 lookLRL | 4 cross (speed 1.8) | 5 wide from the far corner, pedLight greenFlash, S3 waits, thumbs up.

## Not verified / gaps
- At the time of verification `PropLayer`/`CarModel` were still stubs: cars, leaf, plastic bag, extra props never rendered, so car timing, stops and the red-car pass were not seen. Props use `params.seed` and `color`; driving paths and stop positions are computed for ~4.2 m cars.
- Verification shots were taken under software rendering where the simulation runs ~2x slower than wall time; beat sums were checked against code, not wall clock.
