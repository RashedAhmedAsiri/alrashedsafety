# Brief: engine (the app's runtime and brain)

**You own:** `src/engine/**`, `src/cutscenes/engine.ts`, `docs/engine.md`. (`src/App.tsx` stays as is.)

**Source:** all of `docs/ARCHITECTURE.md`; in the plan: Overview_and_tech (decisions, how it works),
Screens_and_UI (intro and loading, mode menu, buttons, status states, sleepy), 3D_world (Camera,
Weather blend), Voice_and_AI (what happens in each mode, listening, gender rules, creative flow),
Short_answers ("How short answers work"), Exam (flow start). Contracts: `src/cutscenes/api.ts`,
`src/core/stage.ts`, `src/core/store.ts`, `src/engine/conversation.ts` (keep every export exactly).

Other builders are writing, at the same time: the robot and humans (render stage actors), props
(render stage props), weather (Lighting/WeatherSystem), sets (rooms/outdoor parts), UI (Overlay calls
your conversation functions), voice (`speak`, `listenOnce`, gender), matcher (`matchQuestionAsync`),
exam (`startExam`), content. Code against their contracts; their stubs may still be placeholders.

Build:

1. **StageDriver** (`src/engine/StageDriver.tsx`, inside the Canvas, `useFrame`): advance every actor's
   `move` along its waypoints at its speed (y interpolated between waypoints), turning smoothly to face
   travel, calling `onArrive` and clearing `move` at the end; advance prop `anim` (path drive at speed
   with `faceTravel`, or tween `from`→`to` over `dur` with `ease`), calling `onDone`; return one-shot
   clips to `idle` after `clipDuration`; decay `shake`. Write to the store sparingly (batch per frame).
2. **CameraRig**: scripted shots (blend from the current camera to `shot` over `dur` with `ease`, then
   `onDone`), camera shake, and free look when nothing plays: OrbitControls around Alrashed's chest
   with the location's `orbit` limits, touch + mouse, snapping back softly to the location's default
   camera after 5 s without touch. Disabled during travel and fly-in.
3. **Cutscene runtime** (`src/cutscenes/engine.ts`): `createCutsceneCtx` implementing every method of
   `CutsceneCtx` over the stores (spawn → `upsertActor`, walkTo → `move` + promise on arrive, play with
   `dur` → one-shot clip + wait, prop drive/moveTo → `anim` + promise, cam → `setShot` + promise,
   `offset`, sfx via `src/audio/sfx.ts`, expr/status/weather/time via `useApp`, setFlag); every wait
   rejects with an AbortError when the signal aborts, and aborting freezes movers in place.
   `runCutscene` runs one and swallows only AbortError.
4. **Travel** (`travelTo`): fade (dip to the paper color ~300 ms, switch `location`, place the robot on
   the location's robot spot, set camera, fade back) when indoor↔outdoor, room↔room or far; fly
   (camera arc 1.5-2.5 s, robot repositioned while the camera is high) when both places are outdoor and
   near. Weather/time set on arrival (the weather system blends over 3 s). Sets `traveling`/`fade` in
   `useApp` (the UI draws the fade overlay from `fade`; render a simple fallback overlay yourself only if
   `Overlay` does not).
5. **Conversation controller** (`src/engine/conversation.ts`, with an XState machine or a clear state
   module): every export per its comment and the plan: `enterMode` (from the menu: mode bar, Alrashed
   waves with a big smile, speaks `sys.mode_<mode>`; exam → `startExam()`), `backToMenu`, `stopAll`
   (status button: abort current, `stopSpeech`, `stopAllSfx`, clear the scene, back to the classroom,
   status ready), calls (`startCall`: ring sfx, Alrashed turns to the camera, greets with
   `sys.greet_first` on the very first call on this device (neutral), else `sys.greet_call`; `endCall`),
   `askByVoice` (listening state + face, `listenOnce`, `not_heard` then one retry, `mic_denied`,
   `need_internet_listen`, gender via `detectGender` + `applyGenderDetection`, thinking state, then per
   mode: outside/inside/short → `matchQuestionAsync` → scenario / short answer / off-topic line +
   confused face + intro; creative → offline line or `thinking` line + `askCreative` → travel to its
   location, set weather, face, speak live audio, keep the last 6 turns in memory only; exam → delegate
   to the exam module), `askText` (same path with known text), `playScenario` (the exact sequence in
   ARCHITECTURE "Playing a scenario", using `scenarioLines()` from `src/content/voiceLines.ts` when
   it exists, else build the sequence from the scenario text with `MUST_LEAD`/`AVOID_LEAD` and the key
   table; face per part via `PART_EXPRESSION`; `during` cutscene in parallel; default gestures),
   `playShort`, `playSystem` (`sys.<id>`), `currentSignal`. Every new presentation aborts the previous.
   Status pill values per the plan (explaining for scenarios, speaking for short/creative/exam,
   walking/waving during cutscenes when he walks or waves).
6. **MainApp** (`src/engine/MainApp.tsx`): the Canvas (dpr and shadows from `settings.quality`;
   auto-pick quality on the very first launch from device hints; `frameloop` always), `Lighting` +
   `WeatherSystem` with `indoor` from the location kind, the world (active room inside
   `<group position={origin}>` from `ROOM_SETS`, or all `OUTDOOR_PARTS` + `AmbientTraffic`), actors
   (`Robot` for kind robot, `Human` otherwise), `PropLayer`, StageDriver, CameraRig, and outside the
   Canvas `<Overlay/>` and `<ExamOverlay/>`. The opening: `phase` loading (drive `loadProgress` 0→1
   from real readiness: fonts, first compiled frame, lazy chunks; at least ~2.5 s so the title
   animation plays) → `flyin` (render the outdoor world: camera flies from high above the street over
   the school and down into the classroom window, ~4 s, then cut/fade into the classroom with Alrashed
   on his spot) → `menu` (fog is drawn by the UI). Idle: 60 s without touch while ready → face
   `sleepy`, any touch → `smile`. In dev builds expose `window.__alrashed` with the conversation
   functions, `travelTo`, `app`, `stage` so others can script the real app.
7. Audio unlock: on the first pointer/touch anywhere call `unlockAudio()` (sfx) and the voice unlock if
   the voice module exports one.

Verify: typecheck; write `src/engine/*.test.ts` for the cutscene ctx (abort, walkTo resolution with a
fake clock) where practical; run the real app through `tools/shot.mjs` (`--wait=9000`, plus a
`--script` that waits for the menu, enters a mode, and uses `window.__alrashed.travelTo(...)` /
`playScenario('intro')` and short answers) and look at the frames for the fly-in, the menu, travel
fades and the free camera. Fix every page error you cause. Write `docs/engine.md`: lifecycle, how a
scenario plays, how to test with `window.__alrashed`, the cutscene runtime's behaviour (timing,
abort, what is cleared when).
