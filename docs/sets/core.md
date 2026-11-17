# set-core: classroom, lobby, corridors, stairs

Code: `src/world/inside/core.set.tsx` registers `classroom`, `lobby`, `corridor_ground`, `corridor_first`, `stairs`.
Components: `core/Classroom.tsx`, `core/Lobby.tsx`, `core/Corridor.tsx` (both floors), `core/Stairs.tsx`; shared `core/common.tsx`,
`core/parts.tsx` (fixtures), `core/pictos.ts` (drawings), `core/batch.ts`. **All coordinates below are LOCAL** (metres from the
location origin, y above the room floor); use `ctx.at(x, z, y)`, or `coreWorld(room, [x,y,z])` from `core/landmarks.ts`, which also
exports every constant (`CLASSROOM`, `LOBBY`, `CORRIDOR`, `STAIR`, `STAIRS_ROUTES`, `STAIR_STEPS`, `CORRIDOR_GROUND_DOORS`, `CORRIDOR_FIRST_DOORS`).
Rotations: 0 faces south (+Z), PI north, PI/2 east (+X), -PI/2 west.

## Flags (read with `useStage(s => s.flags)`)
| flag | effect |
| --- | --- |
| `lights: 'off'` | ceiling panels dull, green emergency strips/exit signs brighten, lamp halos, fans stop (all five rooms) |
| `exitGlow: true` | exit signs and green strips brighten without turning lights off |
| `alarm: true` | red beacon flashes at the alarm button (classroom x 3.75; corridors x 14.55; stairs x 1.95; lobby x 4.6) |
| `board` | classroom smartboard picture: logo (default), flame, bulbOff, rain, extinguisher, firstAid, blank |
| `door: 'open'` | classroom door leaf swings open |
| `wetFloor: true` | corridor_ground only: wet patch, cleaner's cart, yellow A-frame sign (sign is skipped if a prop with id `wetSign` exists) |
| `elevatorCross: true` | red cross pops onto the lift door (corridors and stairs) |
| `extinguisherGone: true` | hides the extinguisher standing in the corridor cabinet (both floors) |

## classroom (12 x 10, h 3.6)
Unchanged; see `CLASSROOM` in landmarks.ts (robot spot (0.15,-2.75)... default robot (0,-2.6), door north-east (4.85,-5), 24 seats `CLASS_SEATS`).

## lobby (12 x 12, h 4)
Default: robot (0,-1) facing the camera at (0,1.8,5); behind him the name sign «مدرسة الراشد», trophy cabinet, plants, medallion in front.
- Main glass doors (south): centre (0,0,6), width 2.4; exit sign (0,3.0,5.93). Window (-4.2, 1.8, 6).
- Opening to the corridor: (3.9,0,-6), width 2.6, exit sign above it.
- Name sign (-1.3,3.05,-5.9); trophy cabinet (-1.3,0,-5.68), 2.6 wide.
- Honor board west wall (-5.95,1.75,-1.4); notice board east wall (5.95,1.6,0.2); evac map south wall (3.2,1.55,5.93); alarm (4.6,1.4,6).
- Benches (back to wall): (-5.45,-1.4) (-5.45,2.6) (5.45,-2.3); water cooler (5.6,0,2.9); floor medallion centre (0,0,1.2), r 1.7.
- Clear floor for kids: z -4..4 between x -4.5..4.5 apart from the medallion (flat).

## corridor_ground and corridor_first (60 x 5, h 3.6)
x -30 (west end door) .. 30 (east end door); north wall z -2.5, south wall z +2.5; centre dashes z 0; keep-right: walking east use z +1.1,
west z -1.1 (floor arrows on those lanes). Default: robot (11.2,0.35) facing west toward the camera (6.2,1.5,1.2); extinguisher cabinet,
elevator and stairs opening behind-right.
Doors (x, side, width), signs are Arabic with numbers, names come from `locations.ts`:
- Ground: clinic -25 S 1.1; canteen -13 S 1.9 (double); lobby opening 5.6..8.2 S (open); classroom 24.85 S 1.2 («الفصل» ١/أ);
  sports hall -18 N 2.2 (double); principal -2 N; prayer room 8 N.
- First: computer lab -22 S; biology lab -6 S; art room 10 S; library 4 N 2.0 (double); three yard windows on the south wall at x 17.5, 21.6, 25.7;
  sports-hall window onto the hall at x -18 on the north wall (w 3.6, sill 1.0).
- Both floors, north wall: extinguisher cabinet (13.4,0,-2.5), stand at (13.4,0,-1.8) facing PI; alarm button (14.55,1.4,-2.5) + beacon at y 2.55;
  lift (16.75,0,-2.5) with «لا تستخدم عند الحريق» sign beside it; keep-right sign x 25.0; stairs opening x 17.9..23.9 (2.9 high) leading into a
  small stair hall: flat floor to z -8.3, then 10 steps of 0.3 m (yellow nosings, blue handrails both sides); ground floor climbs to y 1.7 with a
  window on the back wall, first floor steps go DOWN from y 0 to -1.7. Bottom/top of that flight at x 20.9.
- Ground only: drinking fountain (9.75,0,2.5) and hand sink (10.45,0,2.5) on the south wall; paper bin (17.6,0,2.18), rim y 0.42 (fire_extinguisher scene);
  wet patch centre (7.6,0.9) size 2.6 x 1.6; sign (7.0,-0.05); cleaner's cart (5.0,-1.85). First only: fountain (9.6,0,-2.5).
- Exit signs: over both end doors (arrow-less), over the lobby opening, and wall signs with arrows toward the exits (east at x 3 and 11 on the north wall,
  west at x -6.5 south / -19.5 north). Green floor strips run along both walls, emergency lamps every 13 m, benches and bins along the walls.

## stairs (8 x 10, height 8, first floor at y 4)
Ground floor with lift (-3.2,0,5) and the corridor doorway on the south wall at x -0.2 (2.4 wide); the first-floor doorway is the same x at y 4.
Flight 1: x -3.9..-1.3, 12 steps (riser 0.1667, tread 0.275) climbing north from z 0.1 (y 0) to z -3.2 (y 2). Landing y 2, x -3.9..1.5, z -5..-3.2
(window on the north wall at x -1.2, centre y 3.4). Flight 2: x -1.1..1.5, 12 steps climbing south from z -3.2 (y 2) to z 0.1 (y 4); first floor y 4 for z > 0.1.
East of x 1.5 is a solid wall mass whose south face (z 0.1) carries the alarm button (1.95,1.4), keep-right sign (2.75,1.65), evacuation map (3.5,1.65), poster of rules.
Yellow strips on every step nosing, handrails (blue, top 0.75 above the nosing) on both sides of both flights, slab-edge balustrade on the first floor above flight 1.
Walking: `STAIRS_ROUTES.upKeepRight` / `downKeepRight` (point lists, y included) follow the nosings within a few cm; `STAIR_STEPS.flight1/flight2` give
`[z centre, y tread top]` for each of the 12 steps. Key points: bottom (-2.6,0,0.9), top of flight 1 (-2.6,2,-3.5), landing (-1.2,2,-4.1),
top of flight 2 (0.2,4,0.4), first floor (0.2,4,3.0). Default: robot (-0.55,2.3) facing south, camera (2.5,1.5,4.8): flight 1, rules poster and alarm behind him.
Lift picture signs: on the corridor wall next to each lift, and beside the lift door in the stairs hall.

## Cameras / robot tuning (locations.ts)
stairs robot [-0.55,2.3] camera pos [2.5,1.5,4.8] look [-1.4,1.2,0.3]; both corridors robot [11.2,0.35] facing -PI/2 camera pos [6.2,1.5,1.2] look [12.6,1.15,-0.4].
Lobby and classroom unchanged. Verified screenshots: `shots/set-core/`.
