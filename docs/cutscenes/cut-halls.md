# Cutscenes: cut-halls

Files: `src/cutscenes/inside/{corridor_running,stairs_safety,sports_hall,canteen_safety}.cut.ts`, helper `src/cutscenes/inside/halls.util.ts`
(`bg` fire-and-forget, `slideTo` backwards running by repeated placement), steps script `tools/steps/cut-halls/play.mjs`
(`node tools/shot.mjs --out=shots/cut-halls --size=640x400 --wait=6000 --script=tools/steps/cut-halls/play.mjs "name=<id>"`; shoots
before / mid-speech / after frames automatically). Note `c.at(dx, dz, dy)`: height is the THIRD argument.

## corridor_running (setup, before, during, after)
Before: 0-2 cleaner sets sign, S1 (red) and S2 (green striped) race toward a long-lens camera at the east end; 2-3.5 S1 slips on the patch
(x 6.3..8.9), Alrashed jogs in and catches him, then the boys step back and gather (about +1 s over the table). During: points at the sign,
the right side, S1's shoe. After: 0-2 close on shoe, S1 crouches; 2-6 tracking, boys steer around the patch on the right; 6-8 cut to the
classroom door (local x 24.8), boys wave, Alrashed waves back, face hearts.

## stairs_safety (setup, before, during, after)
Before: S1 (orange) astride the inner handrail at the top of flight 1 slides a little (slideRail), Alrashed at the bottom raises a palm
(stopHand, alert chime), S1 freezes. During: points at step edges and the keep-right arrow. After: S1 steps off the rail, walks down the
west half (right side) at 0.65 m/s with a tracking camera at foot level, high five at the bottom (wave + raiseHand + clap).

## sports_hall (setup, before, during, after)
Before: wide from the bleachers, 7 boys play dodgeball (looping runs), balls roll; low ankle camera, S1 runs backwards (`slideTo`) onto a
ball, Alrashed jogs in and catches him; close point at the balls; everyone gathers (boys sit on the front bleacher row, Alrashed to centre).
During: slow orbit (about 155 degrees, north side) while he points at balls, mat, teacher. After: top-down-ish at the cart, six boys carry
balls into it; warm-up circle (stretch then jump, whistle); pull-back as S1 jumps onto the landing mat, teacher watching, cheer.

## canteen_safety (setup, during, after)
Setup: Alrashed beside the sinks, four boys queue along the north wall. During: camera slides along the sinks, tap runs, he mimes washing
and nodding. After: close on S1 washing (tap flag 1); over the table, S2 laughs and coughs; S1 raises a hand, teacher runs in, S2 gives
a thumbs-up (coughing only); close on the lunchbox, S3 hands the peanut snack back (question, cross, then check icon), face proud.

## Gaps
- `corridor_ground` and `stairs` rooms were not built when verified (grey placeholder box), so corridor_running and stairs_safety were
  only run for errors (none), not judged visually; coordinates come from `src/world/inside/core/landmarks.ts`. Re-check: wet patch/sign
  (I add my own `wetFloorSign` prop plus flag `wetFloor`; remove the prop if the set draws the sign), rail height of S1, step walking.
- Props (ball, tray, lunchbox, peanutSnack, wetFloorSign, speechBubbleIcon, held items) were still stubs: not seen yet.
- Soap bubbles not shown. "Rolls in" is a jog; backwards running is placement-stepped.
