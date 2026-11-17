# Set: school grounds (set-school)

Files: `src/world/grounds/school.set.tsx` (registers `outdoorParts = [SchoolSet]`) and `src/world/grounds/school/`
(`layout.ts` numbers + `SCHOOL_LANDMARKS`, `building.ts`, `compound.ts` fence/gate/guard room/waiting area,
`yard.ts`, `field.ts`, `atlas.ts` sign atlas, `textures.ts` painted ground, `materials.ts`, `batch.ts`, `parts.ts`).
WORLD coordinates (north = -Z, east = +X, ground y = 0). Facing angles are `rotY`: 0 faces +Z (south), PI north,
PI/2 east, -PI/2 west. Import `SCHOOL_LANDMARKS` from `src/world/grounds/school/layout.ts` for exact numbers.

All geometry is baked into about 16 meshes (one draw call each): vertex-colored dry/wet/glass/glow, one sign atlas
(Arabic signs, pictograms), alpha-tested rail, chain-link and goal net, and four painted/tiled ground meshes.
No real lights. Ground, roofs and benches are wet-registered (darker and glossier in rain).

## Flags (stage `flags`)

| Flag | Effect |
| --- | --- |
| `gateOpen: true` | sliding gate leaf slides east (x 4.6..12.6, behind the fence) in about a second; default closed |
| `alarm: true` | red beacons on the building flash |
| `exitGlow: true` | green exit signs brighter |
| `schoolPeople: false` | hides the background students (yard 15, field 5, one teacher at the entrance) |

## Compound

- Ground x -56..56, z -80..-7.5 (minus the lay-by notch x -50..-16, z -10.5..-7.5): sand tiles; lawn z -80..-75;
  painted yard texture x -22..22, z -36..-7.5; turf x 26..52, z -44..-10. A threshold ramp (sidewalk 0.15 to 0) sits at
  the gate, z -7.9..-7.5, x -4..4.
- Fence: wall 1 m (cream, yellow stripe, teal cap) + teal railing to 2.2 m, pillars every 4 m. Outer face on z = -7.5
  (front), z = -10.5 (notch back, x -50..-16), x = +-56 (sides) and z = -80 (back).

## Gate (location `gate`)

Default camera: from inside the yard, looking south through the gate canopy at the closed teal sliding gate, guard room
on the right, Alrashed at (-2.5, -11) facing the street.

| Landmark | World |
| --- | --- |
| gate centre / opening | (0, 0, -7.5), opening x -4..4 |
| gateInside (under the canopy) | (0, 0, -9.0) |
| gateOutside (sidewalk, y 0.15) | (0, 0.15, -6.6) |
| ramp foot | (0, 0, -7.95) |
| canopy spot (rain start) | (-1.6, 0, -9.0); canopy x -4.9..4.9, z -10.1..-7.0, roof y 3.7 |
| traffic organizer's spot (yellow painted square) | (2.7, 0, -9.3) |
| guard room | x -8..-4.85, z -11.3..-7.85, h 2.9; window (outside, face north) (-5.9, 0, -12.0); door (-7.25, 0, -11.9); seat inside (-6.4, 0, -9.6) |
| waiting area (shade roof 2.85 m) | x -16..-9.2, z -12.6..-8.0; benches face south at (-14.6, -12.3, -10.05; z -10.55), seat height 0.45; bench beside the guard room (-10.05, 0, -10.55) |
| sliding gate leaf | z -7.97, closed x -4.1..4.1, open x 4.5..12.7 |

The name sign «مدرسة الراشد» is on the canopy fascia (faces the street); the «الراشد» logo panels are on the street face
of the fence at x = +-9.5.

## Yard (location `yard`)

Default camera: (0, 2.2, -11) looking north at Alrashed (0, -18) on the walkway medallion, entrance portal with the
name sign, stage and canopy to the sides.

| Landmark | World |
| --- | --- |
| yard centre | (0, 0, -22) |
| walkway gate to entrance | x -3..3, tile medallion at (0, -22) |
| stage (top y 0.6), steps at the front centre | x 4.5..11.5, z -35.8..-32.6; front (8, 0, -31.9); top (8, 0.6, -33.6) |
| microphone stand | (8, 0.6, -33.0) |
| class row lines (faces north, painted dots every 0.8 m, number badges) | x = 4, 6, 8, 10, 12, 14; first spot z -30.2, running to z -19 |
| shade canopy (eave 5.2 m) | x -22..-4, z -33.5..-13.5; shade centre (-13, 0, -23.5) |
| canopy benches | (-17.5, -27.5), (-12.5, -27.5), (-7.5, -27.5) face south; (-17.5, -19.5), (-12.5, -19.5), (-7.5, -19.5) face north |
| water coolers (taps face east, stand 0.6 m east) | (-21, 0, -29), (-21, 0, -23.5); sunny one at (21, 0, -29.5) faces west |
| fire assembly point (green area, white lines) | x 15.5..21.5, z -16..-10.8; centre (18.5, 0, -13.4); sign post (18.5, 0, -10.3), panel faces north |
| sunny play area (ball games, chasing, painted circle at (17.5, -25)) | (16, 0, -24) |
| hopscotch (painted) | around x -7, z -15..-11 |
| bike rack | (-24.6, 0, -14), five bikes, sign post |
| arcade benches (yellow, backs to the wall) | z -39.2, x -30.5, -22, -14, 19.5 |
| flag pole (logo flag) | (2.2, 0, -34.4) |

Palms in planters line the walkway and the yard edges; round shade trees ring the compound; lamp posts and bins are
dressing. Keep x -3..3, z -22..-11 clear for the robot and camera.

## Building exterior

Cream walls with teal/blue accents, two floors (first floor y 4), parapet 9 m with triangle crenellations, roof tanks, AC
units and a solar array (x -15..-5, z -64..-51), shaded arcade z -40..-37.8 with columns at z -38.25.

| Landmark | World |
| --- | --- |
| main entrance (pointed-arch portal, protrudes to z -37.2, x -9..3) | stand (-3, 0, -37.0); doors (-3, 0, -38.3); green exit sign above (y 3.1) |
| east corridor door (toward the field) | stand (24.8, 0, -55) |
| west corridor door | stand (-36.8, 0, -55) |
| classroom fly-in window | centre (14, 1.9, -40), glass x 12.3..15.7, y 0.8..3.0; a furnished classroom is visible behind it (desks, chalkboard, smartboard with logo); approach from the south over the arcade |
| building name sign + clock | portal front, z -37.2, y 8.8 / 7.45 |

## Football field (location `football_field`)

Default camera: world (31, 2.2, -15) looking north-east over the pitch; Alrashed at (33, -21), team bench and cooler
on the left, goal and netting ahead.

| Landmark | World |
| --- | --- |
| field / pitch | field x 26..52, z -44..-10; pitch x 29..49, z -41..-13; centre (39, 0, -27) |
| goal mouths | north (39, 0, -41) opens south; south (39, 0, -13) opens north; posts x 36.5 and 41.5, crossbar y 2.0, depth 1.4 |
| penalty spots | (39, 0, -35), (39, 0, -19) |
| team bench (faces east, shade roof, 6.6 m long) | seat centre (27.35, 0, -27.75), z -31..-24.5 |
| field cooler (faces east) | (27.3, 0, -23.0) |
| entrance gap in the west netting (sign «ملعب كرة القدم» arch) | (26, 0, -20.5), z -21.8..-19.2 |
| floodlights | four corners inside the netting, 9.6 m |
| no-hanging-on-goal signs | on posts beside each goal |

## Walking routes

- Gate to entrance: (0, -9) to (0, -37) along the walkway x -3..3.
- Yard to field: along z -20.5 east to the gap (26, -20.5), then onto the pitch.
- Yard to assembly point: from the entrance east along z -36 to x 18.5, then south to (18.5, -13.4).
- Arcade: z -38.9 between x -35 and 23.

## Known gaps

- Background students use `Crowd` from `src/characters/Human.tsx`; they only show where that implementation draws them.
- The building interior behind windows is dark except the classroom diorama behind the fly-in window.
