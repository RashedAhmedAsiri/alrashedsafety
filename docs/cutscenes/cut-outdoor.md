# Cutscenes: cut-outdoor

Files: `src/cutscenes/outside/{dismissal,stranger_at_gate,dust_storm,football_field,park_safety}.cut.ts`.
Steps scripts: `tools/steps/cut-outdoor/*.mjs` (shared `_lib.mjs`): they run each part directly through
`runCutscene` (no speech, so no waiting for the voice), hide the UI (`.ar-ui`) and take a 640x400 shot ~0.9 s
after every new camera shot. Shots are in `shots/cut-outdoor/<id>_<part>_NN.png`.
All boys: S1..S5 have fixed distinct `spec`s in each file (same look in every part).

## dismissal (gate, then pickup_lane; order speak, after)
setup: S1 (orange, backpack) sits on the bench beside the guard room, S2 sits, S3 stands, Alrashed beside them.
after (go to `pickup_lane` first, fade): 1 (0-3) white car pulls into spot 3 (cars wait in spots 1-2), S1 points, beep,
Alrashed nods and holds a hand out; 2 (3-7) hand in hand along the sidewalk behind the lay-by, camera tracks ahead of
them; 3 (7-9) camera inside the car looking out at the door, S1 climbs in and sits; 4 (9-11) close on the buckle
(`buckle` clip, seatbelt flag, click); 5 (11-14) wide from the road, door thud, Alrashed steps back and waves (hearts),
the car drives off west with S1 riding (S1 follows the car route with the `sit` clip).

## stranger_at_gate (gate; before, speak, after)
setup: gate open, S1 (light blue) on the bench, S2 on the next bench, guard in the guard room, the man (cap, sunglasses) at the gate, Alrashed far in the yard.
before: 1 wide, man beckons with a snack (prop `peanutSnack`, stand-in for a candy bar); 2 medium on S1, stands and steps
toward the gate while Alrashed jogs over; 3 Alrashed arrives, hand on S1's shoulder (worried then warning); speech cam medium.
after: 1 S1 shakes his head; 2 tracking to the guard room, guard steps out of the door; 3 wide, guard walks to the gate,
the man leaves, S1 sits back, gate closes, father's car arrives (hearts, wave).

## dust_storm (yard; before, speak, after)
before: 1 wide yard, boys with a ball, Alrashed at the canopy; 2 camera pans up, `weather('dust')`, wind rising, `dustCloud`
prop on the horizon; 3 medium, `coverFace`, beep, waves boys over. during: medium on the group, collars up (`collarUp`, `coverNose`).
after: 1 tracking to the main entrance; 2 `go('lobby')`: looking at the glass doors, last boy in, door hiss, wind muffled;
3 `go('corridor_ground')`: boys at the fountain and sink (`washHands`), one rubs his eye (`wipeForehead`), Alrashed shows him to rinse (gentle, then hearts).

## football_field (before, speak, after)
before: 1 wide, six boys, S1 (red) jumps and hangs on the south crossbar (`hangGoal`); 2 whistle face, Alrashed jogs over and
holds the post; 3 close on S1 landing; boys gather in the goal mouth. during: he taps the post (`point`).
after: 1 warm-up (celebrate = arm circles, jog in place = knee lifts, explain3 = side stretch; boys `stretch` / `run`, beeps);
2 boys sit on the team bench drinking (`waterBottle`, `drink`, face sunDrop); 3 game restarts, S1 trips, S2 raises a hand, whistle, Alrashed jogs over, thumbs up.

## park_safety (before, speak, after)
before: 1 wide, S1 swings (`swing` clip, amp 0.75), S2 runs across the swing path; 2 Alrashed jogs in, catches the chain (`catch`),
holds S2 (stopStepBack); speech cam by the swings, father on the bench. during: points at swing path, slide, park gate.
after: 1 S2 waits behind S3, climbs, tests the metal with the back of his hand (`point`); 2 slides down sitting (`slide`, feet first) and lands; 3 wide, runs to his father, Alrashed waves.

## Gaps
- Goal wobble, car doors opening, slide "whee" are not possible with the current props/sets (the car door is simply left out; Alrashed uses a reach/point gesture and a door sound).
- Candy bar: no such prop; the man holds out a `peanutSnack` prop placed at his hand (static, not attached).
- stranger_at_gate: the guard room stands between the bench and the gate, so S1 and the man only see each other in the wide shots.
- dust_storm: the "nearest door" is the main entrance into the lobby, then the corridor (the corridor's own outside doors are far from the yard).
- Headless software rendering runs far below real frame rate, so shot times in the PNGs do not match the beats; actual play uses wall clock.
