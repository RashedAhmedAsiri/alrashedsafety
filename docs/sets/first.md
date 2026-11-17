# set-first: first-floor rooms (computer_lab, biology_lab, art_room, library)

Files: `src/world/inside/first.set.tsx` (registers `rooms`), `src/world/inside/first/` (`ComputerLab.tsx`,
`BiologyLab.tsx`, `ArtRoom.tsx`, `Library.tsx`, `shell.tsx` walls/door/windows, `furn.ts` furniture,
`draw.ts`+`paint.ts` canvas pictures, `batch.ts`+`common.tsx` static batching, `landmarks.ts`).
**All coordinates are LOCAL** (room centre, floor y = 0; world y = 4 + local y). Use `ctx.at(x, z, y)` in the room
or `firstWorld(room, [x, y, z])` from `first/landmarks.ts` (also exports every landmark constant: `COMPUTER_LAB`,
`CL_STATIONS`, `BIOLOGY_LAB`, `BIO_BENCHES`, `bioSink(i)`, `ART_ROOM`, `LIBRARY`).
Facing: rotY 0 faces +Z (south), PI faces -Z (north), PI/2 faces +X (east), -PI/2 faces -X (west).
Each room is 3.4 m high; ~15 draw calls per room; screens, grow light and fish-tank light are self-lit.

## Flags (all rooms)
`lights: 'off'` dark panels, screens black, fans stop; `alarm: true` flashing beacon; `exitGlow: true` brighter exit signs/strips;
`door: 'open'` corridor door swings open (outwards). Room flags below.

## computer_lab (14 x 10; default cam [0.5,1.6,4.4] -> robot [0,1.5] facing south; shows the projector screen, island desks, door at right)
- Door N wall `[5.7,0,-5]`; inside `[5.7,0,-4.3]`. Windows S wall. Projector screen N wall centre `[0,1.95,-4.94]` 2.6x1.45, ceiling projector `[0,3.02,-1]`.
- 16 stations in `CL_STATIONS` (id, keyboard, seat, rotY, monitor): W1..W5 west wall (z -3.15,-2.05,-0.95,0.15,1.25; seat x -5.88, facing west rotY -PI/2),
  E1..E5 east wall (seat x 5.88, rotY PI/2), IW1..3 / IE1..3 on the island (x -0.75..0.75, z -3.15..-0.95; IW seat x -1.2 rotY PI/2, IE seat x 1.2 rotY -PI/2). Desk top 0.66, chairs on wheels are baked at the seats.
- Hero: W5 `heroStation`; S1 seat `[-5.88,0,1.25]`, keyboard `[-6.5,0.66,1.25]`, tissues `[-6.55,0.66,1.85]`.
- Wall socket (child height, west wall) `[-6.99,0.38,2.4]`; S2 kneels `[-6.45,0,2.4]` rotY -PI/2; Alrashed `[-5.6,0,2.6]`.
- Drinks shelf `[-6.86,1.05,3.2]`; juice box: `juice: 'shelf'` (default, `[-6.84,1.07,3.05]`) or `juice: 'desk'` (`[-6.45,0.66,1.68]`).
- `socketCover: true` snaps the blue safety cover onto the socket. Power strips with covers on desks (x +-6.9, z -2.6,-0.4,1.78; island z -3.5,-0.65).
- Cable trays (y 0.98) on west/north/east walls. «ممنوع الأكل والشرب» signs: `[4.35,1.65,-4.98]` (N wall) and `[-6.98,1.72,3.2]` (W wall).
- Teacher desk `[-3.4,0.74,-4.05]`, presenter `[-1.9,0,-4.2]`; printer `[6.35,0.78,3.55]`; AC `[-4.6,2.95,-4.87]`; clock `[3,2.65,-4.96]`. Clear front aisle `aisleWest [-4.2,0,1.6]`.

## biology_lab (14 x 10; default cam same as computer lab; the glass liquid cabinet fills the wall behind Alrashed)
- Door N wall `[5.7,0,-5]`. 4 benches 3.2x1.2 top 0.86 at `BIO_BENCHES` (±3.1, z -0.3 and -2.9); sink at the aisle end `bioSink(i)` (hero sink `[1.95,0.86,-0.3]`, wash spot `[1.95,0,0.55]`), tap over it.
- Hero bench (east front) `[3.1,0,-0.3]`: S1 `[2.7,0,0.62]`, S2 `[3.7,0,0.62]` (rotY PI), Alrashed `[1.25,0,0.75]`; microscope `[3.35,0.86,-0.55]` (leaf beside it), rack `[4.05,0.86,-0.45]`, green beaker `[2.85,0.86,-0.05]`. Stools sit on the north side of benches; south sides are free.
- `glass: 'broken'` shows shards + green puddle at `breakSpot [3.9,0,0.95]` (unset/'swept' hides). `water: true` runs the hero tap.
- Goggles hooks `goggleHooks` (6, y 1.6, z -4.88), glove hooks `gloveHooks` (3, y 1.18), pegboard `[-3.3,1.45,-4.96]`; lab coats at x -5.3/-4.95.
- Glass cabinet `[0,0,-4.73]` (3 m wide, labelled colour bottles), eyewash `[3.55,1.0,-4.8]` (stand `[3.55,0,-4.15]`), yellow glass bin `[1.85,0,-4.6]`, brush+dustpan `[2.35,0.9,-4.95]`.
- Skeleton `[-6.2,0,-4.2]`, fish tank (animated fish and bubbles) `[-6.55,0.8,1.2]`, plant shelf + magenta grow light `[6.6,0.8,1.6]`, AC `[-6.87,2.95,-1.6]`, clock `[-1.95,2.7,-4.96]`.

## art_room (12 x 10; default cam [0.5,1.6,4.2] -> robot [0,1.2]; hero table, easels, rack and clothesline behind him)
- Door N wall `[4.8,0,-5]`. Hero table centre `[0,0,-0.5]` 2.6x1.3 top 0.64; Alrashed `robotAtTable [0,0,0.55]`.
- Stools `ART_ROOM.seats`: s1 `[-0.8,0,-1.42]`, s2 `[0,0,-1.42]`, s3 `[0.8,0,-1.42]` (rotY 0), s4 `[-1.72,0,-0.5]`, s5 `[1.72,0,-0.5]`. Paper at `[-0.8,0.64,-0.9]`, scissors tray (3 round-tip scissors) `[0.35,0.64,-0.45]`, S3 stands `[0.8,0,-1.85]`.
- `stars: true` hangs paper stars on a string `[-1.4..1.4,1.95,-0.5]` over the table.
- Side tables `[±4,0,0.3]` 1.3x2.4; easels `[-2.6,-3.9] [-0.9,-4.05] [2,-3.95]`; drying rack `[-5.2,0,-4.35]` + clothesline; supplies shelf `[-5.8,0,-0.6]`; sink `[5.62,0.86,-2.6]` (wash spot `[5.05,0,-2.6]`); aprons on the east wall z 1.8-3.8; AC `[-5.87,2.95,2.8]`; clock `[0.55,2.75,-4.96]`.

## library (14 x 12; default cam [0.5,1.6,5] -> robot [0,2] facing south; carpet with bean bags, banner «المكتبة», globe at left)
- Door on the SOUTH wall `[4.6,0,6]` (inside `[4.6,0,5.3]`). Windows N wall. Carpet centre `[0,0,-1.2]` 4.4x3.4; bean bags `LIBRARY.beanBags`.
- Librarian desk `[4.9,0.76,2.6]` (librarian stands `[4.9,0,1.75]` facing south), globe (turning) `[-2.3,0,1.4]`, reading table + 4 chairs `[-4.4,0,3.6]`, book cart `[2.2,0,4.4]`, island shelves `[±4.1,0,-2.0]` (3 m along z), wall shelves on N/W/E walls, AC `[-6.87,2.95,1.0]`, clock `[0,2.85,-5.96]`.

## Notes / gaps
Nobody is placed in the rooms (no StaticPerson); cutscenes add characters. Glass in cabinet/tank is a faint transparent pane. Window views are the kit's painted 'yard' view.
