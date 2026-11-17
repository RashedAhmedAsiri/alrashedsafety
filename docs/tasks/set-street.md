# Brief: set-street (the street and everything along it)

**You own:** `src/world/outside/street.set.tsx`, `src/world/outside/street/**`, `docs/sets/street.md`, and
the camera/robot fields of `street_front`, `crosswalk_main`, `signal_crossing`, `bus_stop`,
`pickup_lane`, `parking`, `sidewalk_far`, `mosque` in `src/core/locations.ts`.
Read `docs/tasks/_sets.md` first. Outdoor parts are in WORLD coordinates; surfaces must match
`src/core/ground.ts` exactly (roads 0, sidewalks 0.15, the crossing hump).

Build (see the layout comment in `src/core/locations.ts`, `src/core/ground.ts`, and "Outside the school"
in `docs/plan/3D_world.md`):
- **Main street** x -130..130, z -3.5..3.5: dark asphalt (`wetMat`), white lane centre line, yellow edge
  lines, curbs painted black and yellow along the school, two speed bumps with yellow stripes,
  «منطقة مدرسية» sign with a children pictogram, speed-limit 30 sign («٣٠»), street lights, drain grates
  along the curbs, an electrical cabinet on the sidewalk.
- **Sidewalks** north z -7.5..-3.5 and south z 3.5..7.5 at 0.15 with curbs, tiles, palms in square
  planters, benches and street lights on the south side (`sidewalk_far`), interrupted at road
  crossings exactly as `ground.ts` says.
- **Raised zebra crossing** at the gate (`crosswalk_main`): flat top x -2.5..2.5 at 0.15 with ramps to
  |x| = 3.5, wide white stripes, flashing yellow pedestrian signs both sides, low bollards.
- **Signal intersection** at x = -72 (north-south road x -75.5..-68.5 running the whole map): car
  traffic lights, a signalised pedestrian crossing at `signal_crossing` with pedestrian lights (red
  standing man, green walking man) driven by flags `pedLight` ('red' | 'green' | 'greenFlash', default
  'red') and `carLight` ('green' | 'yellow' | 'red', default 'green'), a push-button box at child height,
  stop lines, zebra stripes.
- **Bus stop** (`bus_stop`, x ≈ 30, north sidewalk): shelter with bench and roof, a yellow waiting line
  painted three steps back from the curb, a bus stop sign with a bus pictogram. (The bus is a prop.)
- **Pick-up lay-by** (`pickup_lane`, x -50..-16): the lay-by lane at road level z -7.5..-3.5 with
  numbered waiting spots, the sidewalk behind it z -10.5..-7.5 at 0.15 with a covered waiting area, a
  traffic organizer spot.
- **Parking** (`parking`, x 58..78, z -32..-8, driveway x 60..66 across the north sidewalk): bays with
  lines and wheel stops, several parked cars (`CarModel` from `src/props/models.tsx`, being built now).
- **Mosque** (`mosque`, NW corner of the intersection, around x -84, z -18): small mosque with a minaret
  and a green dome, boundary wall, palms.

Scenarios to support: getting_out_of_bus, crossing_road, reaching_school, crossing_with_friends,
dismissal, heavy_rain, bus_stop_waiting, inside_bus, parked_cars, traffic_light, family_car; read their
shot tables so every curb, line and sign they mention is where the action needs it.
