# Brief: props (scenario props, vehicles, hand items, traffic)

**You own:** `src/props/**`, `docs/props.md`.

**Source:** `PropKind` (with params in comments), `HoldItem` in `src/core/types.ts`; `PropState` in
`src/core/stage.ts`; the shot tables in `docs/plan/Outside_scenarios.md`, `docs/plan/Inside_scenarios.md`
(how each prop is used); "Outside the school" + "Ambient life" in `docs/plan/3D_world.md`; ARCHITECTURE
"Props", ground heights (`src/core/ground.ts`) and the grip convention.

Keep `PropLayer`, `AmbientTraffic`, `HoldItemMesh`, `CarModel`/`CarProps`, `BusModel`/`BusProps` exactly.

1. **PropLayer**: renders every prop in `useStage.props` by kind, reading position/rotation/scale/
   visibility every frame (the engine's StageDriver moves them; you only render). Subscribe to the prop
   list, not per-frame values.
2. **Every PropKind** with its params, cartoon style, real-world scale: car, bus, ball (football/
   basketball/dodge), cone, barrierTape (red-white between two posts, `length`), manhole (open hole +
   cover beside), puddle (`radius`, `splash` ripples), fire (small contained animated flame, `size`,
   `out`), smoke (soft animated puffs, `density`), extinguisherSpray (white cone of particles),
   wetFloorSign (yellow A-frame with a slipping-person pictogram), umbrella, waterBottle, sodaCan,
   scissors (round tip), paperStar, beaker (`color` liquid), brokenGlass, mat, ballCart, firstAidKit
   (green cross), chair, stool, tray, lunchbox, trafficLight (`state` red/green/greenFlash pedestrian
   light), speechBubbleIcon (billboard bubble with a pictogram: check/cross/warning/question/heart/star,
   gently bobbing), arrowMarker (glowing animated ground arrow), confetti (burst then fall), dustCloud,
   rainbow, boardImage (a picture panel: logo/flame/bulbOff/rain/extinguisher/firstAid/blank drawn on a
   canvas, the «الراشد» logo in Arabic), sandwich, peanutSnack, cable, powerStrip (with child-safety
   covers), socketCover, goggles, gloves, bucket, leaf, plasticBag, stopSign (organizer's handheld round
   «قف» sign). Particles must be cheap (instanced points/sprites) and respect `settings.quality`.
3. **CarModel**: cartoon sedans/SUVs/pickups varied by `seed`, `color`, `lights` (head/brake/reverse
   emissive), animated `wipers`, `driver` (a seated parent: `StaticPerson` kind `parent`, clip `drive`,
   from `src/characters/Human.tsx`, being built now). Wheels, windows, mirrors, Saudi plates (simple).
   **BusModel**: a yellow Saudi school bus with «حافلة مدرسية» on the sides, folding front `door`
   (animated open/closed), `stopArm` (red «قف» sign that swings out), and an `interior` (driver seat +
   wheel + dashboard door button, rows of seats each side of an aisle, handrails at the three entry
   steps, windows you can see through, roof that can stay on) good enough for camera shots from inside.
   Origin at ground level under the vehicle centre, facing +X, right side +Z (door on the right).
4. **HoldItemMesh**: every `HoldItem` at real size with its origin at the grip per the convention
   (umbrella open/closed, extinguisher with hose and nozzle, bandage, gauze, ball, scissors, water bottle,
   soda can, clipboard, mask, backpack (held by the top handle), pencil, sandwich, mop); `phoneless`
   renders nothing.
5. **AmbientTraffic**: background cars (varied `CarModel`s) driving both lanes of the main street on the
   right-hand side (eastbound z ≈ +1.75 → +X, westbound z ≈ -1.75 → -X), at varied speeds, slowing for
   the raised crossing hump at x -3.5..3.5 (and riding over it at `groundHeight`), stopping for the
   signal at x = -72 on a simple cycle, spaced so they never overlap, looping beyond the ends of the
   street, a few cars on the side roads; headlights on in dust, wipers on in rain. Fewer cars on low
   quality. Disabled when `enabled` is false.
6. Verify with `tools/shot.mjs`: `view=props` (all props and hand items; frame with `&cam`/`&look` to
   look closer at each row), a dedicated preview page `src/dev/Props.tsx` (`?dev=Props&...`) for the bus
   from outside with door open, inside the bus from behind the driver seat, cars of several seeds with
   each light state, and `view=crosswalk_main` / `view=overview` for traffic. Iterate until they look
   finished and charming.

Write `docs/props.md`: every kind with params and size; bus and car local points cutscenes need (door
centre, each step, driver seat, seat positions by row/side, aisle line, car doors, driver position);
how AmbientTraffic behaves and how a cutscene can avoid it.
