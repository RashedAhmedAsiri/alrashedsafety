# cut-fire: intro, fire_evacuation, fire_extinguisher, power_outage

Files: `src/cutscenes/intro.cut.ts`, `src/cutscenes/inside/{fire_evacuation,fire_extinguisher,power_outage}.cut.ts`.
Steps script: `tools/steps/cut-fire/play.mjs` (`SCN=<id> TIMES=1,3,5 node tools/shot.mjs --out=shots/cut-fire --size=640x400 --wait=6000 --script=tools/steps/cut-fire/play.mjs "name=x"`).
All files use `c.at(x, z, y)` for floor points and a local `w(c, x, y, z)` for camera points.

## intro (classroom)
- setup: board `blank`, Alrashed at his desk spot, medium camera.
- before: 0-1.5 wave + chime; 1.5-3 slow push in, two steps to the smartboard (servo, footsteps), board flag `logo` + powerUp.
- during: slow orbit (two views, 9 s blends); board pictures flame, bulbOff, rain, extinguisher, firstAid at the share of the body spoken before each topic word (times scale with `estimateDuration(INTRO.body)`; recordings will differ a little), then logo; `point` gesture per topic.
- after: pull back wide, bow 1.1 s, thumbs up 1.5 s, cheer, face proud.

## fire_evacuation (classroom, corridor_ground, stairs, yard)
5 boys s1..s5 (distinct shirts, two striped, mixed heights) + a teacher closing the line.
- before 1 (2 s) wide, alarm flag + loop, smoke haze at the door, face surprised. before 2 (2 s) medium, stopHand, two boys reach for backpacks (held item), headShake, alarm lowered; then a speech shot from the west with boys standing beside desks. No `during`.
- after 1 doorway shot, door opens, line forms at the door; 2 corridor tracking, collarUp + lookDown boys, smoke props; 3 stairs, low camera, route down both flights keeping right; 4 yard: cut A out of the main doors, cut B arrival at the assembly point; 5 over-the-boys shot, face `counting` (countTo 5), beeps, chime, proud, thumbs up.

## fire_extinguisher (corridor_ground)
- before 1 bin smoke then flame (`fire` prop), crackle loop (`confetti` at low volume, no crackle sfx exists), s3/s2 look, s2 runs to Alrashed and points. before 2 stopHand, boys step back, he walks to the cabinet (click), `catch`, holds the extinguisher, red-white tape floor line, speech shot. No `during`.
- after 1-4 `extinguisher` clip at speed 0.5 (8 s) with faces proud, focused, explaining, proud; pin click; `extinguisherSpray` prop, left/right sweep, fire `out`, powder `dustCloud`; 5 wide, crouch to put it down, thumbs up, boys clap, teacher walks in.

## power_outage (classroom, corridor_ground)
- setup lights on, teacher at the board (`point` clip as writing). before 1 (2 s); 2 powerDown, `lights: off`, `exitGlow`, surprised then `glow`; 3 shake, two boys jump up, calm palm, sit back. during: slow orbit, he points at wall, green lights, door. after 1 line along the east wall to the door; 2 corridor, passes the elevator, he taps it, cross icon (`speechBubbleIcon` cross + flag `elevatorCross`); 3 lights back on, powerUp, claps.

## Gaps and notes
- Not done: boys' "hand on the wall" (no clip); they walk 0.5 m from the wall instead. Extinguisher "pin icon / target icon" on the face use the closest faces (proud, focused).
- Dark scenes: the weather light only follows Alrashed when `expression === 'glow'`, and speech parts overwrite the face; request to weather owner: light on `lights: off` for any expression.
- Camera and timing of the corridor, stairs and prop beats could only be checked as far as those places and props were built (see report).
