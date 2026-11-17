# Brief: robot (Alrashed)

**You own:** `src/characters/Robot.tsx`, `src/characters/robot/**`, `docs/robot.md`.

**Source:** "Alrashed" in `docs/plan/3D_world.md`, "Alrashed's face expressions" in
`docs/plan/Screens_and_UI.md`, the shot tables in `docs/plan/Outside_scenarios.md` and
`docs/plan/Inside_scenarios.md` (to see how every clip is used), ARCHITECTURE "Characters".

Keep `Robot({ actorId })` exactly. It reads its actor from the stage store every frame.

1. **Model** (procedural, from primitives: capsules, rounded boxes, spheres, lathes, tubes): 1.45 m tall,
   glossy white rounded body, teal-green and sky-blue accent panels, soft grey joints, rounded capsule
   head with a black glass face screen, short antenna with a round light glowing in
   `STATUS_COLORS[useApp.status]`, chest badge with the «الراشد» logo (canvas texture, Arabic), two arms
   with four-finger hands, two legs with rounded feet. Friendly, chunky, toy-like, instantly likeable
   for 6-year-olds. Keep it efficient (share materials, few dozen meshes max, cast shadows).
2. **Face screen** (canvas texture or shader on the screen): every `Expression` in `src/core/types.ts`,
   drawn in glowing light per the plan table (idle with random blinks, smile, happy big smile, listening
   with sound bars under the eyes, thinking eyes up with three dots, talking, explaining with raised
   brows, warning serious eyes with a red edge tint, surprised, worried, proud star eyes, gentle,
   hearts, laughing closed happy eyes, confused with one brow up and a question mark, lookLRL eyes
   sliding left-right-left, lightbulb, timer clock, counting 1-2-3, sunDrop, celebration confetti,
   sleepy with half-closed eyes and a small z, glow bright white screen, relieved, focused). The mouth
   follows `useApp.mouth` (and `viseme` if you like) on top of any expression whenever it is > 0. Eyes
   glance toward the actor's `lookAt`. Smooth transitions between expressions; redraw only when needed.
3. **Clips**: every `RobotClip`, procedural joint animation with ~0.2 s crossfades: idle breathing,
   wave, walk with a slight happy bounce (1.2 m/s), jog, look left/right, lookLRL (one clip ~2 s), point,
   stopHand (palm out), warnRaise, explain1-3, thumbsUp, nod, headShake, clap, celebrate dance, sitDrive
   (seated in the bus driver's seat, hands on the wheel, can turn around to talk when flag
   `turnToCamera` is true), holdHandWalk (walking with one hand lowered at a child's hand height),
   closeUmbrella, crouch (to child height), catch, extinguisher (pull pin, aim, squeeze, sweep; ~4 s
   loop), washHands, bandage, gloves, coverFace (hand over the screen), countFingers, kneel, talk.
   Loops vs one-shots: give each one-shot a natural duration and document it.
4. **Hands**: hand sockets per the grip convention in ARCHITECTURE; render `hold`/`holdLeft` with
   `HoldItemMesh` from `src/props/holdItems.tsx` (the props builder is writing it now; a null render is
   fine meanwhile). Support flags: `seated`, `umbrellaOpen`, `turnToCamera`, and any others the shot
   tables need (list them).
5. Verify with `tools/shot.mjs`: `view=characters&clip=<clip>` for every clip (frame the robot with
   `&cam=0,1.3,3.2&look=0,0.9,0`), face close-ups for every expression (`&expr=<e>` with a close camera,
   also `&mouth=0.7`), at several moments of animated clips (use `&clip=` + `--wait=` values). Iterate
   until he looks polished and every pose reads clearly.

Write `docs/robot.md`: clips with durations and loop/one-shot, flags, head/hand heights, socket
positions, any tips for cutscene writers (e.g. how to seat him in the bus).
