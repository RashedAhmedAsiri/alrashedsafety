# Brief: set-core (classroom, lobby, corridors, stairs)

**You own:** `src/world/inside/core.set.tsx`, `src/world/inside/core/**`, `docs/sets/core.md`, and the
camera/robot fields of `classroom`, `lobby`, `corridor_ground`, `corridor_first`, `stairs` in
`src/core/locations.ts`. Read `docs/tasks/_sets.md` first.

Rooms (see the "Inside the school" table in `docs/plan/3D_world.md` and ARCHITECTURE for layout):
- `classroom` (Classroom 1/أ, Alrashed's home, the first thing everyone sees: make it the most charming
  room): 24 desks in rows of pairs facing the north wall board, green chalkboard plus a smartboard that
  shows the `board` flag picture (logo «الراشد» by default; flame, bulbOff, rain, extinguisher,
  firstAid, blank), teacher's desk with globe and books, wall clock, Arabic alphabet frieze, a «قواعد
  السلامة» poster with pictures only, student artwork, lockers with colored doors at the back,
  backpacks on chairs, two large windows on the south wall (yard view), ceiling fans (slowly turning),
  two AC units, evacuation map by the door, fire alarm button (+ red light reacting to `alarm`), a corner
  plant, door to the corridor (north side, toward the corridor at z -52). `lights`/`exitGlow` flags.
  Alrashed's desk near the board (intro: "Alrashed by his desk ... walks two steps to the smartboard").
- `lobby`: «مدرسة الراشد» in large letters, trophy cabinet, honor board with star frames, notice board,
  benches, water cooler, evacuation map, green exit sign over the main doors (south, toward the yard).
- `corridor_ground` and `corridor_first` (60 m long, 5 m wide): tiled with a centre line, classroom doors
  with numbers (and names of the real rooms that open off it, matching their x positions in
  `locations.ts`), red fire extinguisher cabinet (near the stairs), fire alarm button, green exit signs,
  emergency lights, wall posters, drinking fountain, yellow wet-floor sign + cleaner's cart (ground
  floor, toggled by a flag such as `wetFloor`), windows over the yard on the first floor's south wall.
  Only the active room renders, so the far ends can be closed by painted doors/views.
- `stairs` (both floors, height 8): wide stairs with yellow edge strips on each step, handrails on both
  sides at child height, a keep-right arrow, a window at the landing, an elevator door beside the stairs
  with a «لا تستخدم عند الحريق» picture sign. Document exact step waypoints (bottom, each flight's top,
  landing, first floor) so characters can walk up and down in cutscenes.

Scenarios to support: intro, power_outage, nosebleed (start), fire_evacuation (classroom→corridor→
stairs), corridor_running, fire_extinguisher, stairs_safety, exam (Alrashed at the board with a clipboard).
