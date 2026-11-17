# Brief: humans (boys and adults)

**You own:** `src/characters/Human.tsx`, `src/characters/human/**`, `docs/humans.md`.

**Source:** "Students" and "Adults" in `docs/plan/3D_world.md`; the shot tables in
`docs/plan/Outside_scenarios.md` and `docs/plan/Inside_scenarios.md` (how each clip is used);
ARCHITECTURE "Characters"; `BoySpec`, `SHIRT_COLORS`, `CharacterKind`, `HumanClip` in `src/core/types.ts`.

Keep `Human({ actorId })` and `StaticPerson(...)` exactly; you may add exports (e.g. a `Crowd`).

1. **Boys** (ages 6-12, boys only): cartoon proportions (bigger heads), friendly simple faces (eyes,
   brows, smile; never creepy), three heights (~1.15 / 1.30 / 1.45 m), short-sleeved shirts in
   `SHIRT_COLORS` or striped, blue or black pants, sneakers, backpacks in mixed colors (optional),
   skin tones across the Saudi range (5 steps), short black or dark brown hair. `spec` fields override;
   missing ones are randomized deterministically from the actor id (seeded hash), so the same id always
   looks the same and neighbours differ. At least 8 clearly distinct looks.
2. **Adults**: teacher (white thobe, white ghutra), counselor (thobe + light-blue medical vest), guard
   (dark uniform + cap), organizer (thobe + yellow reflective vest), cleaner (blue coverall), stranger
   (casual clothes, cap, sunglasses; calm and ordinary, never scary), parent (thobe + red-white shemagh,
   usually seated driving). Adult height ~1.75 m.
3. **Clips**: every `HumanClip`, procedural with ~0.2 s crossfades, readable from a distance, walk/run
   cycles matching 1.3 / 3.2 m/s; sit poses (`sit`, `sitDesk`, `drive`, bus seat with flag `inBus`),
   `buckle` (with flag `seatbelt` showing a belt), `leanOut`, `climbSteps`, `slip` (caught before
   falling), `trip` (soft onto one knee), `faint` (sway and sit down), `lieDown`, `noseTiltBack` (wrong)
   vs `noseLeanForward` (right), `coverNose` (collar over nose), `hangGoal`, `slideRail`, `swing`,
   `slide`, `forwardRoll`, `mop` (cleaner), etc. Head turns to `lookAt`. Hand sockets per the grip
   convention render `hold`/`holdLeft` with `HoldItemMesh` from `src/props/holdItems.tsx` (being built
   now; null meanwhile). Flags you support are documented (`seated`, `inBus`, `seatbelt`,
   `umbrellaOpen`, `collarUp`, ...).
4. **Performance**: an animated person ≤ ~12 draw calls (merge rigid parts per bone with vertex colors
   and one shared material); `StaticPerson` cheaper still; add `Crowd({ people })` that draws many
   background people efficiently (instancing or merged meshes, subtle idle motion) for the yard,
   canteen, bus queue, etc. Shadows on.
5. Verify with `tools/shot.mjs`: `view=characters&clip=<clip>` for every clip (the row has 4 boys and
   all adult kinds; frame with `&cam=`/`&look=`), close-ups of faces, several boys side by side to check
   variety, and a crowd. Iterate until they look charming, varied and clearly Saudi.

Write `docs/humans.md`: kinds, spec fields, clips (loop/one-shot, natural durations), flags, heights,
how to use `StaticPerson`/`Crowd` in sets.
