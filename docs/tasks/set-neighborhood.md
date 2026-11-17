# Brief: set-neighborhood (houses, park, roadworks, flood dip, terrain)

**You own:** `src/world/outside/neighborhood.set.tsx`, `src/world/outside/neighborhood/**`,
`docs/sets/neighborhood.md`, and the camera/robot fields of `houses`, `park`, `roadworks`, `flood_dip`
in `src/core/locations.ts`. Read `docs/tasks/_sets.md` first. Outdoor parts are in WORLD coordinates;
surfaces must match `src/core/ground.ts` (side road and flood dip heights).

Build (see the layout comment in `src/core/locations.ts`, `src/core/ground.ts`, and "Outside the school"
in `docs/plan/3D_world.md`):
- **Terrain**: the base ground for the whole world, a large sand-colored plane at y = -0.02 out to the
  horizon (other sets draw their surfaces on top), plus a gentle low skyline of distant Saudi buildings,
  palms and low hills so no view ends in emptiness (in every direction, including behind the school).
- **Houses** (`houses`, south of the street, east of the side road, about x -10..56, z 8..32): six
  two-story Saudi villas with beige, white and sand-colored walls, decorative boundary walls with metal
  gates, palm trees and bougainvillea over the walls, AC units, water tanks on roofs, a car in front of
  some (`CarModel`). One is Alrashed's "house" at the end of crossing scenarios (mark it; e.g. a teal
  gate). A cat near the houses, birds on palms/wires (simple, animated a little).
- **Side road** x -17.5..-10.5 from the main street south to z ≈ 44 (asphalt, `wetMat`), with the
  **flood dip** (`flood_dip`) at z ≈ 20 following `groundHeight` (down to -0.35): a low section where
  rainwater flows across like a small stream when `weatherBlend.wet` or `rain` is up (animated water,
  hidden when dry), and a raised sidewalk route around it on the park side.
- **Park** (`park`, west of the side road, about x -63..-17, z 8..40): grass, a playground with swings,
  a slide and a seesaw on soft rubber flooring, a small fountain, a walking track, shaded benches,
  palms, lamp posts, a park guard booth, a park gate facing the main street near the crossing.
- **Roadworks** (`roadworks`, on the south sidewalk around x -32..-20): an open manhole with its cover
  beside it, orange cones, red-and-white barrier tape, a small pile of sand, a warning sign with a
  workers pictogram, uneven paving.

Scenarios to support: crossing_road (ends walking into the park), open_sewer, flood_safety,
park_safety, heavy_rain, dismissal and crossing endings at the houses; read their shot tables.
