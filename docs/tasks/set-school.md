# Brief: set-school (school grounds and building exterior)

**You own:** `src/world/grounds/school.set.tsx`, `src/world/grounds/school/**`, `docs/sets/school.md`, and
the camera/robot fields of `yard`, `football_field`, `gate` in `src/core/locations.ts`.
Read `docs/tasks/_sets.md` first. Outdoor parts are in WORLD coordinates.

Build everything inside the school fence (see the layout comment in `src/core/locations.ts`,
`src/core/ground.ts`, and the yard/football_field/gate rows of `docs/plan/3D_world.md`):
- **Compound ground** x -56..56, z -80..-7.5 at y = 0 (sand-colored paving/tiles with `wetMat`), except
  the lay-by notch (x -50..-16, the fence steps back to z = -10.5 there).
- **Fence** along z = -7.5 (x -56..56, stepping back to z = -10.5 for x -50..-16) and around the other
  sides: a low painted wall with railings, «مدرسة الراشد» sign with the «الراشد» logo near the gate,
  school-zone friendly colors. Main gate opening x -4..4 with a sliding gate, a small guard room with a
  window, a shaded waiting area with benches for students waiting for parents, a traffic organizer's
  spot. (The street, sidewalks and lay-by outside the fence belong to the street set.)
- **Building exterior** x -36..24, z -74..-38, two floors (ground y 0..4, first 4..8) + roof parapet,
  water tanks/AC units on the roof, cheerful Saudi school architecture (cream walls, teal/blue accents,
  geometric details), a shaded arcade along the yard facade (z -40..-38) with columns, windows on both
  floors (a big ground-floor window centred at x = 14 is the classroom window the opening camera flies
  into), main entrance doors at the lobby (x ≈ -3) with a green exit sign above, the building name in
  Arabic. It must look complete from the sky, from the yard and from the street.
- **Yard** x -22..22, z -36..-9: painted lines for class rows, a shade canopy over half of it, a small
  stage with a microphone stand, water coolers, benches, palm trees in planters, the fire assembly point
  sign (green, people pictogram) in one corner. Background students walking/playing (`Crowd` /
  `StaticPerson`) away from the robot's spot.
- **Football field** x 26..52, z -44..-10: artificial turf with white lines, two goals with nets, high
  fence netting, a team bench under shade, a water cooler, floodlights.
- Anything else inside the compound (paths between yard, field and building; a bike rack; trees).

Scenarios to support: friend_fainted, heat_water, dust_storm, fire_evacuation (end, assembly point),
football_field, stranger_at_gate, dismissal (start), heavy_rain (start), and the opening fly-in over
the school into the classroom window.
