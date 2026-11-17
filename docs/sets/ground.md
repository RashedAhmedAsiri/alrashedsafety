# Ground-floor rooms (set-ground)

Files: `src/world/inside/ground.set.tsx` registers `clinic, canteen, prayer_room, sports_hall, principal`.
Builders: `ground/{clinic,canteen,prayer,sports,principal}.tsx`; shared: `batch.tsx` (merged geometry),
`shell.tsx`, `furniture.ts`, `paint.ts`. Landmark constants (importable): `ground/landmarks.ts`
(`CLINIC, CANTEEN, PRAYER, SPORTS, PRINCIPAL`). All coordinates are LOCAL to the room origin, floor y = 0,
[x, z]. Facing is rotY: 0 = +Z (south), PI = north, PI/2 = east, -PI/2 = west. North walls (z < 0) face
the corridor for the canteen and clinic; the prayer room, sports hall and principal have doors in the SOUTH
wall (corridor at larger z).

## Flags (useStage flags)
All rooms: `lights:'off'` (ceiling panels dim), `alarm:true` (strobe), `exitGlow:true` (exit sign halo),
`door:'open'|'closed'` (clinic/prayer/sports/principal open only with `'open'`; canteen double doors are
open unless `'closed'`), `people:false` hides background people. Canteen: `tap:true|0|1|2` runs a sink tap.
Clinic: `tap:true|0`, `counselor:true` seats the counselor.

## clinic (8x8, h 3.4)
Door north wall x 2.5 (doorIn [2.5,-3.3], doorOut [2.5,-5]); sink [-1.1,-3.72] (stand [-1.05,-3.05] facing N);
first aid kit on N wall [0.4, h1.5]; bed centre [-3.5,0.73,-0.55] (bedSit [-3.05,-0.3] facing E, bedLie
[-3.5,-0.5] head to -Z); counselor desk [2.75,-0.6], counselor seat [3.5,-0.6] (face W), student chair
[1.85,-0.6] (face E); scale [-3.55,2.3]; fridge [1.35,-3.7]. Camera: robot front, cabinet, sink and kit behind.

## canteen (14x12, h 3.6)
Double door N wall x -3 (1.9 wide). Hand-wash basins x [0.2,1.1,2.0] on N wall (z -5.7, top 0.9, stand at
z -4.9 facing N). Counter east: centre [5.6, 0], runs z -2.5..2.5, students stand west of it (x ~4.5);
queue starts [4.5,1.8] and runs toward -Z facing E (floor footprints). Menu board and slogan above it.
Tables (4 stools at r 0.8): [-5,-2.2] [-1.5,-2.2] [2,-2.2] [-5.3,1.3] [1.6,1.3] [3,4.2] (diners sit here).
Bins (green/blue/yellow) on W wall z [-4.7,-4,-3.3]; water cooler W wall z -1.8; bench beside the door
[-4.9,-5.75]. Windows on S wall. Camera: robot [0,3.2]; sinks, counter and tables in view.

## prayer_room (10x10, h 3.6)
Door S wall x 3.2 (doorIn [3.2,4]); shoe racks at [0.9,4.55] and [-0.5,4.55] (south wall), bench by the door.
Carpet x -4.2..4.2, z -4..3.2 with 5 prayer rows (z -3.2,-2,-0.8,0.4,1.6; people face N). Qibla niche and
sign on N wall x 0. Quran shelves on W wall z -3.2/0/3.2; Quran stands [±3.6,-4.45]. Sheer curtains on E windows.

## sports_hall (22x14, h 8)
Door S wall x -8.5 (doorIn [-8.5,5.8]). Court 18x10 centred [0,0], centre circle r 1.8, keys painted blue.
Hoops rim [±10.4, 3.05, 0]. Wall bars N wall x -9.5..-3.5. Ropes [4.2,-6.1] [5,-6.1]. Low beam [-1.2,-5] (top
0.3). Landing mat [6.3,-3.6] (2.2x1.4, top 0.2), foam stack [9.2,-6]. Ball cart [-6.5,5.6] (12 balls inside,
floor is clear for loose balls). 3-tier bleachers on S wall x 1.1..9.3: seats z 5.4 (y 0.45), 6.0 (0.9),
6.6 (1.35). Water cooler E wall [10.75,4.8]. Scoreboard high on N wall; Arabic banners over both hoops.
Camera: robot at centre circle, scoreboard, wall bars, ropes and mats behind.

## principal (8x8, h 3.4)
Door S wall x 2.6. Desk [0,-2.5] faces S; principal seat [0,-3.4]; visitor chairs [-0.9,-0.9], [0.9,-0.9]
(face N). Bookshelf W wall z -1.5; flag stand [3.1,-3.1] (plain green flag); tea table [2.9,0.6] with dallah
and cups; certificates on N wall; window on E wall. Camera: robot [0,1] with desk and certificates behind.
