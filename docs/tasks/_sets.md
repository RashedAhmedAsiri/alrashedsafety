# Rules for all set builders (in addition to _common.md)

- Build with `src/world/kit.tsx` (palette `PAL`, `mat`/`wetMat`/`glow`, `GEO`, `Box`/`RBox`/`Cyl`/
  `Ball`/`Plane`, `Label` for Arabic 3D text, `canvasTexture`/`canvasText` for painted posters and
  pictogram signs, `RoomShell`/`WindowPane`/`DoorLeaf` for rooms, `Palm`/`PalmPlanter`). Add your own
  helpers inside your own files/folder; do not edit kit.tsx (put requests in your report).
- Rooms are authored in local coordinates (floor y = 0, interior centred), registered by
  `export const rooms = { <locationId>: Component }` in `src/world/inside/<file>.set.tsx`. Outdoor
  parts are in world coordinates, registered by `export const outdoorParts = [Component, ...]` in
  `src/world/{grounds,outside}/<file>.set.tsx`. Helper modules go in a folder named after your file
  (e.g. `src/world/inside/core/`) and must not end in `.set.tsx`.
- Every room is fully furnished per the plan table, nothing is an empty box; every sign is Arabic and
  pictograms carry no English. Saudi details. Soft cartoon look, flat clean colors, rounded where cheap.
- Each location's default camera must frame Alrashed nicely on his robot spot with the room's character
  visible behind him; you may tune the `robot`, `robotFacing`, `camera`, `orbit` fields of your own
  locations in `src/core/locations.ts` (Edit tool, small hunks; never origins or sizes).
- Read every scenario that happens in your locations (see "Scenarios" in the location table of
  `docs/plan/3D_world.md`, then the shot tables in `docs/plan/Outside_scenarios.md` /
  `docs/plan/Inside_scenarios.md`) and make sure everything those shots need exists and has room to
  happen (where kids line up, which door they leave by, the sink, the bench, the curb...).
- Support the shared flags in ARCHITECTURE that apply (`lights`, `alarm`, `exitGlow`, `board`) and add
  flags your scenarios need (read with `useStage(s => s.flags)`; e.g. a door that opens, a light state).
- Background life where the plan wants it (use `StaticPerson`/`Crowd` from `src/characters/Human.tsx`,
  being built now; they may render nothing yet), but keep the robot's spot and the scenario action
  areas clear.
- Performance: instance repeated furniture (drei `<Instances>`/`<Merged>`), share materials, aim well
  under 150 draw calls per view for a room, and keep outdoor parts lean (the whole outdoor world renders
  at once).
- Verify every location with `node tools/shot.mjs --out=shots/<key> "view=<id>" ...` from the default
  camera and 3-4 other angles (`&lcam=&llook=`), plus `&norobot=1` overviews, weather variants for
  outdoor places and the flags you support. Look at each PNG critically and iterate until each place
  looks finished, inviting and true to the plan.
- Write `docs/sets/<file>.md`: per location, the landmarks with coordinates (local for rooms, world for
  outdoor) that cutscene writers need (doors, board, desks and seat spots, sink, bench, curb lines,
  crossing ends, bus stop line, goal mouth, swings, etc.), walking routes (e.g. stair step waypoints),
  flags supported, and what the default camera shows.
