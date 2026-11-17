# Rules for cutscene writers (wave 2, in addition to _common.md)

You turn the plan's shot tables into scripts. Wave 1 built everything you use; read its docs first:
`docs/engine.md` (how a scenario plays, timing, `window.__alrashed`), `docs/robot.md` (clips, flags,
heights, sockets), `docs/humans.md` (kinds, clips, flags), `docs/props.md` (prop kinds, params, bus and
car local points), `docs/weather.md`, the set docs for your places (`docs/sets/*.md`: landmarks,
routes, flags), and `src/cutscenes/api.ts` (the only API you use; plus `locAt` from
`src/core/locations.ts` for points in other places).

For each scenario you own, write `src/cutscenes/{outside|inside}/<scenarioId>.cut.ts` (the intro:
`src/cutscenes/intro.cut.ts`), `export default [cutscene(id, 'setup', ...), cutscene(id, 'before', ...),
cutscene(id, 'during', ...), cutscene(id, 'after', ...)]` with only the parts the scenario needs:

- `setup` for the plan's "Speaking setup" (and the starting arrangement for `before`), instant.
- One `await` per beat; follow each row's seconds (sum of beats ≈ the table's times), its Camera
  (cinematic: child eye height 1.2 m on street scenes, the stated angle and lens feel), Action, Sound
  (`c.sfx`, stop loops you start) and Face (`c.expr`), and set `c.status('walking' | 'waving')` while
  Alrashed walks or waves without speaking.
- `during` only when the table has a "During speech" row (e.g. the intro's board pictures).
- Respect the world rules: right-hand traffic, cars come from the LEFT first for a pedestrian on either
  sidewalk; sidewalks are 0.15 high (use `c.at()` which returns surface heights, add a waypoint at a
  curb edge); crossings at the zebra stripes.
- Boys are varied: give each scenario's S1..S5 distinct `spec` (shirts from `SHIRT_COLORS`, a striped
  one, mixed heights) and keep the same look for the same boy across that scenario's parts.
- Gentle tone: injuries are never graphic, nobody is scary, near-misses resolve safely, Alrashed is
  kind. Never show phones.
- Multi-place scenarios use `await c.go('<location>')` and re-place the actors.

Verify each scenario in the real app: `node tools/shot.mjs --out=shots/<key> --wait=6000
--script=<your steps.mjs> "name=<id>"` where the steps script calls
`window.__alrashed.playScenario('<id>')` (see docs/engine.md for the dev hooks that skip or shorten
speech) and takes `shot()`s at each beat. Look at every frame: is the camera framing what the row says,
are characters where they should be (not floating, not inside walls or cars), do the actions read?
Iterate until each scenario plays cleanly from start to end with no page errors.

Write `docs/cutscenes/<key>.md`: per scenario, beat list with times, anything you could not do and why.
