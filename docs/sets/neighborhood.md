# Neighborhood set (houses, park, roadworks, flood dip, terrain)

Files: `src/world/outside/neighborhood.set.tsx` (registers `outdoorParts`), `neighborhood/{build,atlas,layout,static}.ts`.
All coordinates are WORLD metres (north = -Z, east = +X). All constants are exported from
`src/world/outside/neighborhood/layout.ts`. Surfaces follow `src/core/ground.ts`.

## Terrain and skyline
Sand plane at y = -0.02 out to 900 m (hole over the side road so the dip can sink), soft sand patches,
a ring of ~600 low beige/white buildings (from 146 m out, every direction incl. behind the school, none
on the signal-road strip x -75.5..-68.5), minarets, distant palms and low hills at 470-580 m.

## Side road and flood dip (`flood_dip`, origin -14, 20)
- Road x -17.5..-10.5, z 3.5..44, asphalt following `groundHeight`; white edge lines and dashed centre line; low barrier at z 43.5.
- Dip: z 15..25, lowest -0.35 at z 20; concrete retaining walls on both sides; yellow/black bollards at z 13.4 and 26.6; depth gauge post at (-10.85, z 20).
- Park-side walking route: paved strip x -20.8..-17.65 (ground level 0, i.e. 0.35 above the dip floor), z 7.7..44. House side: strip x -10.35..-9.5.
- Water: flows toward +X across x -17.6..-10.4, z 16.4..23.6, surface y -0.14. Shown when `weatherBlend.wet` or `rain` > 0.03, or flag `floodWater: true`; `floodWater: false` hides it. Leaves and a bottle float along it.

## Houses (`houses`, origin 20, 9)
Six villas, front wall z = 10, back wall z = 30, plots x [-9.5, 2, 14, 26, 38, 48, 56.5]. Pavement strip z 7.5..10.
| # | Plot x | Gate x (width) | Notes |
|---|---|---|---|
| 1 | -9.5..2 | -3.2 (3.0) | beige, crenellated roof, dark gate; white car in yard |
| 2 | 2..14 | 8 (3.2) | white, blue-domed corner tower, brown gate; grey car |
| 3 | 14..26 | 20 (3.2) | **Alrashed's house**: white with TEAL gate, door, trim and teal number plate; no car; door at (20, z 15.2) |
| 4 | 26..38 | 32 (3.4) | sand, crenellated, green gate, blue car (nose -X) |
| 5 | 38..48 | 43 (3.0) | beige, round tower with terracotta cone |
| 6 | 48..56.5 | 54.6 (2.6) | white, narrow; red car |
Each: two-story body, balcony with railing, arched windows, AC units, roof water tanks, dish, bougainvillea on the wall, palms, glowing gate lanterns, number plate (Arabic digits).
Utility poles at z 8.9, x 3, 29, 51 with wires (birds sit on them). Cat at (11.4, 8.55). Robot default spot is (20, 8.3) facing north; to "go in": walk (20, 8.3) -> (20, 9.4) -> through gate (20, 10) -> door (20, 14.6).

## Park (`park`, origin -40, 24; x -63..-21.5, z 8..40)
- Fence all round; north gate (arch with painted sign) at x -28.5, z 8 (opening x -30.5..-26.5), paved path to the track; east side gate at (-21.5, 12) opening z 10.8..13.2, path to the north path. Guard booth at (-24.6, 10.1), guard stands at (-27.1, 11.9).
- Walking track ring: centre (-40.5, 25), 35 x 22, 1.8 wide (terracotta rubber).
- Track ring: outer x -58..-23, z 14..36; inner edge x -56.2..-24.8, z 15.8..34.2. Lamps, palms and trees stand off it.
- **Playground** (fenced, soft teal rubber, pale curb): x -55..-33, z 18.5..34. Low fence 0.95 m (blue posts, yellow pickets); openings: north x -36.7..-34.5 (paved path from the track, small sign over it) and east z 24.1..25.9 (path from the fountain).
  - Swing set: yellow beam y 2.4 along x at z 22.6, blue A-frames at x -48.9 / -43.7 (legs z 21.45..23.75); swings at x -47.3 and -45.3 (red rubber seat 0.65 above the floor, swing along Z). Painted yellow keep-out zone x -49.5..-43.1, z 20.4..24.8 on a light-blue panel. Flag `swingRider: true` hides the first swing (a boy on clip `swing` at dy 0.2 brings his own seat; pivot 2.2 above him = the beam).
  - Slide tower: deck (-39.6, 27.2) 1.4 m square at y 1.7, red side panels, red peaked roof (top ~3.7). Ladder on the west side, foot x -40.85 (climb from (-41.0, z 27.2)). Stainless chute with orange walls from x -38.9 (y 1.72) down to x -36.1 (y 0.42), slope ~24 deg (`slope` -0.42), flat run-out to x -35.3.
  - Seesaw (-42.5, 29.3) along X (x -44.2..-40.8). Climbing dome (-52.3, 31.0) r 1.3. Spring riders (-37.3, 21.2) green, (-35.3, 22.5) yellow. Hopscotch x -53.2..-51.2, z 22.2..27.2; coloured stepping dots around (-47, 28.5).
  - Bench row facing north at z 33.2, x -48.5 / -43 (father sits here) / -37.5, under a cantilever striped shade (posts z 33.75, front edge z 31.95 at y 2.62). Bench (-54.3, 26.6) faces east.
- Fountain at (-30, 25) r 1.9. Shaded benches outside the playground: (-30, 31.5) faces north, (-29.5, 18) faces south. 8 lamp posts, 16 palms, 4 trees.
- Robot default spot (-43, 22) facing the camera, which stands at (-33, 19).

## Roadworks (`roadworks`, south sidewalk y 0.15, x -36..-17.8)
An open sewer trench dug into the sidewalk, inside a fenced works zone, with a marked pedestrian path behind it. Constants: `WORKS` in `neighborhood/layout.ts`; geometry: `works()` in `neighborhood/static.ts`.
- Sidewalk z 3.75 (curb) .. 7.42 (edge stone, park wall behind). The trench is **cut out** of the sidewalk tiles (`cut` option of `sidewalk()` in `street/static.ts`) and of the terrain plane, so it has real depth.
- **Trench** x -29.6..-26, z 4.4..5.4, 1.1 m deep: layered earth walls (dark at the bottom), plywood shoring + two steel struts, floor with muddy water, a concrete sewer pipe broken open in the middle (collars, dark bore), a blue water main across and a black cable duct; low soil lip and soil stains on the rim.
- **Zone** x -34..-23.5: street side (z 4.05) 5 tape stanchions (black bases, red/white tape, 2.6 m apart) with a cone halfway between them (4 truncated cones, white bands); walkway side (z 5.85, feet 5.6..6.1) 7 low striped barricades (rails 0.52..0.72 so people behind stay visible from the road) and two end barricades, with alternately flashing amber lamps on the post tops (zones `lampA`/`lampB`, blinked in `neighborhood.set.tsx`).
- West of the trench: manhole cover lying flat (-30.45, 4.9), spoil heap with a shovel (-32.6, 4.85). East: 3 stacked orange pipes on sleepers, shovel + pickaxe, bucket (-24.8, 4.55).
- Warning sign on a tripod at the west end (-35.4, 4.5): workers triangle over the plate «خطر / أعمال طرق» (atlas cell `roadSign`), both sides.
- **Safe pedestrian path**: green mat with white edges and double arrows, z 6.3..7.4 (centre 6.85), x -36..-17.8, in front of the park gate. East of x -23.5 the sidewalk is open (cutscene kneeling spot (-22.4, 5.7)). Nothing stands in the path; the palm planter at x -38 ends it on the west.
- Camera: `roadworks` looks from the road at the trench and the path. Cutscene cameras (open_sewer) look south from the road at height 1.7-2.6.

## Flags
`floodWater` (bool), `swingAmp` (radians, first swing; the second sways 0.05), `swingRider` (true hides the first swing), `neighborhoodLife` (false hides birds, cat, park people), `yardCars` (false hides yard cars). Birds fly over the park (centre -40, 13, 24).

## Cameras
`houses`: from the sidewalk looking at the teal gate; `park`: toward the swings with slide and fountain; `roadworks`: from the road, high, toward the trench and the green path (robot on the path at (-24, 6.9)); `flood_dip`: across the dip toward the houses.
