# Brief: set-ground (clinic, canteen, prayer room, sports hall, principal)

**You own:** `src/world/inside/ground.set.tsx`, `src/world/inside/ground/**`, `docs/sets/ground.md`, and
the camera/robot fields of `clinic`, `canteen`, `prayer_room`, `sports_hall`, `principal` in
`src/core/locations.ts`. Read `docs/tasks/_sets.md` first.

Rooms (see the "Inside the school" table in `docs/plan/3D_world.md`):
- `clinic`: examination bed with paper roll, white cabinet with first aid supplies, green cross on the
  door, sink with soap and paper towels, first aid kit on the wall, scale and height chart, eye chart
  with shapes, small fridge, the health counselor's desk, a box of gloves, a chair for students.
- `canteen`: serving counter with sandwiches, juice, fruit and water bottles, round tables with stools,
  handwashing sinks at the entrance, trash and recycling bins, a menu board with food pictures.
- `prayer_room`: green carpet with rows, shoe racks at the door, Quran shelves, a qibla marker, soft light.
- `sports_hall` (22 × 14 m, 8 m high): wooden floor with court lines, basketball hoops, blue foam mats,
  a ball basket, climbing rope and a low beam, wall bars, water cooler, benches, high windows.
- `principal`: desk, chairs, bookshelf, a school flag stand without logos, plants, framed certificates.

Scenarios to support: small_cut, nosebleed (end), friend_fainted (end) in the clinic; canteen_safety;
sports_hall; heat_water may use the canteen/cooler (check the plan); short answers placed here.
