# Engine: runtime, camera, travel, cutscenes, conversation

Owner: engine. Files: `src/engine/**`, `src/cutscenes/engine.ts`.

| File | What |
| --- | --- |
| `src/engine/MainApp.tsx` | The real app: `<Canvas>` (world, actors, props, StageDriver, CameraRig) + fade fallback + `<Overlay/>` + `<ExamOverlay/>` |
| `src/engine/conversation.ts` | The brain: modes, calls, listening, matching, scenarios, short answers, system lines, creative, travel entry point |
| `src/engine/travel.ts` | `doTravel` (fade / fly / same place), `switchLocation` (ctx.go), the opening fly-in |
| `src/engine/driver.ts` + `StageDriver.tsx` | Per-frame stage advance: moves, one-shot clips, turns, prop tweens/drives, shake |
| `src/engine/rig.ts` + `CameraRig.tsx` | The camera: travel/fly-in override, scripted shots, hold, free look |
| `src/cutscenes/engine.ts` | `createCutsceneCtx` / `runCutscene` (the `CutsceneCtx` implementation) |
| `src/engine/loading.ts`, `quality.ts`, `idle.ts`, `warm.ts`, `devApi.ts` | Loading progress, quality auto-pick, sleepy + audio unlock, matcher warm-up, `window.__alrashed` |
| `src/engine/*.test.ts` | vitest: driver, cutscene ctx (fake clock, abort), conversation sequencing |

## Lifecycle

1. **loading** (`phase: 'loading'`): the Canvas renders the outdoor world **and** the classroom (hidden
   under the UI's loading screen) so shaders compile. `loadProgress` goes 0→1 from real readiness:
   fonts 20 %, canvas created 15 %, `gl.compileAsync` of the scene 40 %, first 30 frames 25 %. It never
   reaches 1 before 2.6 s (title animation); after 20 s it completes anyway. At 1 it holds 0.8 s (bus
   arrives, final bounce).
2. **flyin**: the outdoor world only. The camera follows a Catmull-Rom path (4.2 s) from high above the
   street south-east of the school, over the street and the yard, down to the classroom window
   (`FLY_POS`/`FLY_LOOK` in `travel.ts`). Near the end the screen dips to paper (`fade`), the phase
   becomes **menu**, the location the classroom, Alrashed is put on his spot (face `smile`), the camera
   cuts to the classroom default camera, and the paper fades out (the UI draws its fog and cards).
3. **menu → mode**: the UI calls `enterMode(mode)`.

Dev: `?skip=1` skips the title wait and the fly-in. `?quality=low|medium|high` overrides the quality
for one load (not saved).

## Presentations (one at a time)

Every public action that makes Alrashed do something (`playScenario`, `playShort`, `playSystem`
without a signal, `askByVoice`, `askText`, `enterMode`, `startCall`, `travelTo` without a signal,
`stopAll`, `backToMenu`) starts a new **presentation**:

1. the previous presentation's `AbortSignal` aborts (speech stops, every cutscene wait rejects, movers
   freeze), `stopSpeech()` is called;
2. the scene is reset: `clearScene()` (non-persistent actors and props, the shot, set flags), cutscene
   looping sounds stopped, engine turns cleared, Alrashed back to `idle` with empty hands, no flags,
   visible. He stays where he is, unless he is seated/in the bus, off the walkable ground (outdoors) or
   outside the active room's box (indoors): then he goes to the location's robot spot;
3. the flow runs under the new signal (`currentSignal()`);
4. when it ends normally: the same reset, `status: 'ready'`, face `smile`, `playing: null`, and the
   free camera glides back to the home view after ~1.4 s.

`useApp.playing` is set while he presents (`{kind, id}`); it is `null` while he listens or thinks.

## How a scenario plays (`playScenario(id)`)

1. New presentation (above). `playing = {kind: 'scenario', id}`, status `walking`, face `smile`.
2. `travelTo(scenario.location, {weather, time})` (null weather/time = keep the current).
3. Status `explaining`. Cutscene `setup` (if any), then each step of `order`:
   - `before` / `after`: the cutscene part (missing parts are skipped). Each part gets a fresh ctx whose
     `loc` is the **active** location (so a part after a `ctx.go()` continues where the scene is).
   - `speak`: the lines from `scenarioLines(scenario)` (`src/content/voiceLines.ts`) when that module
     exists, else built here: `<id>.opening` (600 ms after), `lead.must` = `MUST_LEAD` (400 ms), each
     `<id>.must.<i>` (400 ms, the last 600 ms), `lead.avoid` = `AVOID_LEAD` (400 ms), each
     `<id>.avoid.<i>` (400 ms, last 600 ms), `<id>.slogan`. A scenario with `body` (the intro) speaks
     `<id>.body` (`intro.body`). Before each line the face is `PART_EXPRESSION[part]` (happy /
     explaining / warning / proud / talking) and status `explaining`. Text goes through
     `renderGender(text, gender)`; empty lines are skipped.
   - In parallel with the speech: the `during` cutscene (aborted when the speech ends; its camera shot
     stays where it was), or, without one, the default gestures `explain1, talk, explain2, talk,
     explain3, talk` (one-shots of 2.8 / 2.4 s with 0.25 s gaps) **only while Alrashed stands idle**
     (not seated / `inBus` / `sitDrive`, not walking, not in a pose such as `kneel` a setup left him in).
4. End of the presentation (above).

Errors thrown by a cutscene (bugs) are logged with `console.error` and the scenario continues.

## Other flows

- **Short answer** (`playShort(id)`): travel to its location (no weather change), Alrashed turns to the
  camera, face = the answer's `face`, status `speaking`, speak `short.<id>` with the default gestures.
- **System line** (`playSystem(id, signal?)`): key `sys.<id>`, status `speaking`, face from the plan
  (greet → happy, not_heard / mic_denied / offline_creative / need_internet_listen → gentle, off_topic →
  confused, thinking → thinking, mode_* → happy). With a signal it is a step of the caller's flow and
  rejects with an AbortError on abort; without one it is its own presentation. A line missing from
  content is skipped with `console.info`.
- **enterMode(mode)**: `mode` set, `phase: 'mode'`, scenarios panel closed; Alrashed (travelling to the
  classroom first if he is elsewhere) turns to the camera, plays `wave` (2 s), face `happy`, status
  `waving`, then speaks `sys.mode_<mode>` (face happy). **Exam**: the same wave, then `startExam()`
  under presentation `{kind: 'exam'}`; when `startExam()` resolves the presentation ends, unless
  `ui.examRunning` is still true (then the exam owns the stage until it finishes or is stopped).
- **backToMenu()**: aborts (and `abortExam()` in exam mode), `phase: 'menu'`, `mode: null`, call ended,
  `ui.scenariosOpen/examRunning` false, then travels to the classroom (sunny morning) under the fog.
- **stopAll()** (status pill): aborts everything (`abortExam()` in exam mode), `stopSpeech()`,
  `stopAllSfx()`, clears the scene, status ready / smile, travels back to the classroom with sunny
  morning weather. The mode stays.
- **startCall()**: `inCall: true`, creative memory cleared, `ring` sfx (the engine plays it; the UI
  should only play its button pop), 0.65 s, Alrashed turns to the camera, waves (1.8 s, face happy),
  then `sys.greet_first` on the very first call on this device (localStorage
  `alrashed.firstCallDone.v1`), else `sys.greet_call`.
- **endCall()**: `inCall: false`, creative memory cleared; stops listening/the greeting; a scenario or
  answer already playing keeps going.
- **askByVoice()**: `canListen()` unavailable → `sys.need_internet_listen`. Else up to two tries:
  status/face `listening`, `listening: true`, `listenStart` sfx, `listenOnce({maxMs: 12000,
  silenceMs: 1500})`, `listenStop` sfx. Denied/no mic → `sys.mic_denied`; offline/unsupported →
  `sys.need_internet_listen`; nothing usable → `sys.not_heard` then the one retry (a second failure
  ends quietly). Heard samples → `applyGenderDetection(detectGender(...))`. Then **answer**:
  - outside / inside / short: status + face `thinking`, `matchQuestionAsync(text, mode, {online})`;
    band `low` → off-topic (face `confused` + `sys.off_topic`, then the intro scenario); `short` →
    short answer; `intro` or a scenario id → that scenario.
  - creative: offline → `sys.offline_creative`. Online: `askCreative(text, gender, last 6 turns)`
    starts, the `sys.thinking` line plays (status/face thinking) while waiting; null / off-topic / empty
    → off-topic path; else travel to its location (validated) with its weather, turn to the camera,
    face = its expression (default `lightbulb`), status `speaking`, speak key `creative.live` with
    `live: {audioUrl, visemes}`; the turn is kept (6 max, memory only).
  - exam: not handled here (see "Exam" below).
- **askText(text)**: the same answer path with known text (creative chips, debugging).
- **travelTo(loc, {weather, time, signal})**: with a signal it is a step of the caller's flow (rejects
  with AbortError). Without one (map pin) it is its own presentation (status `walking`, then ready);
  while the exam runs it joins the exam's signal instead of aborting it.

### Exam

`enterMode('exam')` → wave → `startExam()`. The exam module uses `currentSignal()`, `travelTo(...,
{signal})`, `playSystem(id, signal)` and `speak()`. The mic button in exam mode does **not** start a
presentation (that would abort the exam): `askByVoice()` calls `examAskByVoice()` and `askText(t)`
calls `examAnswerText(t)` **if `src/exam/flow.ts` exports them** (optional; otherwise they do nothing
in exam mode because the exam listens by itself). `stopAll()`/`backToMenu()` call `abortExam()`.

## Travel

| Case | What happens |
| --- | --- |
| same location, Alrashed on his spot | weather/time set; he turns to his facing; the camera glides (0.9 s) to the default camera if it is elsewhere |
| both outdoor, < 60 m apart (robot to robot spot), not faded | **fly**: camera arc 1.5-2.5 s (height 3.5-16 m) from the current view to the new default camera, `whoosh` sfx; at the top of the arc: location, robot spot, weather/time |
| anything else (indoor↔outdoor, room↔room, far) | **fade**: `fade` 0→1 (300 ms), location, robot spot (pose flags cleared, clip idle, hand items kept), camera cut, weather/time, wait 3 drawn frames + 90 ms, `fade` 1→0 (350 ms) |

`traveling` is true while it runs. The newest travel owns `fade` and the camera; an aborted travel that
nothing replaced fades back in by itself. Weather/time are set on arrival; the weather system blends.

**`ctx.go(location, {fade})`** (multi-place cutscenes): with fade: paper dip, `location` switched, the
camera cut to the new location's default camera **as a stage shot** (dur 0), wait for 3 drawn frames,
then the promise **resolves while the screen is still covered**; the fade-in starts ~0.1 s later by
itself. So place actors and set the camera right after `await c.go(...)` and nothing pops. Actors and
props keep their world positions (Alrashed too). `{fade: false}` switches `location` instantly.

## Camera (CameraRig)

Modes, checked each frame: **override** (travel fly, fly-in) → **shot** (`useStage.shot`) → **hold**
(not in a mode, something `playing`, or `traveling`: the camera keeps still) → **free**.

- Shots blend from the camera at the moment the shot object appeared to `pos/look/fov` over `dur` with
  `ease` (`inOut` = cubic), then call `onDone` once. A shot replaced or cleared before it finished still
  calls its `onDone`. `dur: 0` cuts on the next frame.
- Free look (only in `phase: 'mode'`, nothing playing): drei `OrbitControls`, drag/one-finger rotate,
  wheel/pinch zoom, no pan, damping. Pivot: the location's default look point moved along with
  Alrashed (or his chest at 1.0 m when that point is more than 1.5 m from him). Distance limits from
  the location's `orbit` (defaults: indoor 2-6 m, outdoor 3-12 m; always wide enough for the default
  view). Polar 0.2 rad to just past the default view. Indoors the azimuth stays within ±1.35 rad of the
  default view and the camera is kept inside the room box (origin ± size/2 − 0.25 m, floor + 0.4 to
  ceiling − 0.25). After 5 s without touch the camera glides back to the home view (default camera
  moved along with Alrashed).
- Shake (`ctx.shake(strength = 0.05, seconds = 0.6)`): applied on shots/held views only; the driver
  clears it when expired.

## StageDriver (per frame, `advanceStage(dt, now)`)

- `dt` is clamped to 0.5 s. All changes of a frame are written with **one** `setState`; nothing is
  written when nothing moves. Callbacks (`onArrive`, `onDone`) run after the write.
- **Actor moves**: along the remaining waypoints at `speed` (horizontal m/s); y is interpolated
  linearly between waypoints (add a waypoint at a curb edge to step down there); the actor turns to the
  travel direction (exponential, rate 10/s) and finishes that turn after arriving; on arrival `move` is
  cleared and `onArrive` runs. The visible clip is `move.clip` while moving.
- **One-shot clips**: `clipDuration` is **wall-clock seconds** from `clipStart`; after it the actor goes
  to `idle` (`clipStart` = now, `clipDuration` 0, `clipSpeed` 1).
- **Engine turns** (`turnActor`): smooth rotation to a target angle (used for "turn to the camera").
- **Prop tween** (`anim.from/to/dur/ease`): position eased over `dur`; then `onDone`.
- **Prop drive** (`anim.path/speed`): constant `speed`, but braking softly into the **last** waypoint
  (3.5 m/s², min 0.6 m/s): a car at 8 m/s stops about 1.1 s later than distance/speed. Pass a whole
  route in one `drive` call for a car that keeps going. With `faceTravel` (vehicles, +X forward) the
  prop turns toward the travel direction (rate 5/s), and outdoors y follows `groundHeight` (it rides
  over the raised crossing).

## Cutscene runtime (`src/cutscenes/engine.ts`)

`createCutsceneCtx(location, signal)` implements every `CutsceneCtx` method:

| Method | Behaviour |
| --- | --- |
| `at(dx, dz, dy)` | `locAt(current loc, ...)` (outdoors on `groundHeight`) |
| `offset(base, rotY, local)` | three.js Y rotation: `x' = x cos + z sin`, `z' = −x sin + z cos` |
| `wait(s)` | timer; rejects with AbortError on abort |
| `cam({pos, look, fov, dur = 1.2, ease = 'inOut'})` | sets `useStage.shot`; resolves when the blend ends. `fov` defaults to the location's camera fov |
| `shake(strength = 0.05, s = 0.6)` | `useStage.shake` |
| `spawn(id, kind, {pos, rotY, spec, clip, hold})` | upsert actor (idle unless `clip`), returns its handle |
| `actor(id)` / `robot` | handles (Alrashed is `alrashed`; `spawn('alrashed')` just places him) |
| `walkTo(to, {speed, clip})` | `move`; resolves on arrival. Default speeds: robot 1.2, boys 1.3, adults 1.4; by clip: `run`/`chaseBall` 3.2, `jog` 2.2, `walkDistracted` 1.0, `holdHandWalk`/`holdHands` 1.1. Default clip: robot `walk` (`jog` ≥ 1.9 m/s), people `walk` (`run` ≥ 2.4 m/s). A new walk/place replaces the old one and resolves its promise |
| `place(pos, rotY?)` / `face(target or angle)` | instant |
| `play(clip, {dur, speed})` | with `dur`: one-shot for `dur` wall-clock seconds, resolves at the end (the driver returns to idle); without: loop, resolves now |
| `hold(item, 'right'/'left')`, `lookAt`, `flag`, `show` | patch the actor |
| `remove()` | removes the actor (Alrashed is only hidden) |
| `prop(id, kind, {pos, rotY, scale, params})` | add or update; re-placing stops a running animation; params of the same kind are merged |
| `PropHandle.set` / `moveTo(pos, dur, ease = 'inOut')` / `drive(path, speed)` | `set` merges params; `moveTo` tween; `drive` see StageDriver |
| `sfx(name, {loop})` / `stopSfx` | `playSfx`; loops are remembered and stopped when the scene is reset |
| `expr`, `status`, `weather`, `time`, `setFlag` | `useApp` / `useStage` (ignored after abort). `status(s)` also becomes the status shown after walking/waving |
| `go(location, {fade})` | see Travel |

- **Status**: while Alrashed speaks, cutscenes leave the pill alone. Otherwise `robot.walkTo` shows
  `walking` and `robot.play('wave')` shows `waving`, returning to the base status (`explaining` during
  scenarios) when he stops.
- **Abort**: every pending wait / walk / drive / moveTo / cam / go rejects with a DOMException named
  `AbortError`; actors and props that this ctx set moving are **frozen where they are** (`move`/`anim`
  cleared). All promises returned by the ctx are pre-marked handled, so fire-and-forget calls never
  report unhandled rejections; awaiting still throws, and scripts do not need to catch it.
- `runCutscene(c, location, signal)` swallows only AbortError; other errors propagate (the controller
  logs them and continues).
- **Cleared when**: nothing is cleared between `setup`, `before`, `during`, `after`. Everything
  non-persistent (actors, props, shot, set flags, cutscene sound loops, Alrashed's pose/hand items) is
  reset when the scenario ends, is stopped, or another presentation starts.

## Stage flags the engine reads

| Flag | Effect |
| --- | --- |
| `traffic: 'off'` (or `false`) | `AmbientTraffic enabled={false}` (cutscenes with their own cars) |

## Quality, idle, audio

- First launch on a device (no saved choice): software renderer / phones → `low`; iPad / Android tablet
  → `medium` (`low` with ≤ 3 GB); desktops with ≥ 8 cores, ≥ 8 GB and a strong GPU → `high`; else
  `medium`. dpr: low 1, medium ≤ 1.5, high ≤ 2. Shadows off on `low`. Antialias is fixed at start.
- Sleepy: 60 s without pointer/touch/key/wheel while ready (nothing playing, not listening/traveling)
  → face `sleepy`; any input → `smile`.
- Audio unlock: the first four pointer/touch/key gestures call `unlockAudio()` and `unlockVoice()`
  (if `src/voice/speech.ts` exports it).
- The matcher's `warmUpMatcher()` starts 1.5 s after the menu first appears.

## Robustness

Every world part, room, actor, `PropLayer`, `Lighting`, `WeatherSystem`, `Overlay` and `ExamOverlay` is
wrapped in its own error boundary + Suspense: a crashing or suspending part is hidden (and logged as
`[engine] "<part>" crashed and is hidden`) instead of blanking the app. A room whose set is not built
yet renders a plain placeholder box.

## Testing with `window.__alrashed` (dev builds)

`window.__alrashed` = every export of `conversation.ts` (`enterMode`, `backToMenu`, `stopAll`,
`startCall`, `endCall`, `askByVoice`, `askText`, `playScenario`, `playShort`, `playSystem`,
`travelTo`, `currentSignal`) + `app` (= `useApp`), `stage` (= `useStage`), `rig`, `skipIntro()` (jump to
the menu), `idle()` (resolves when nothing plays).

```js
// steps.mjs — node tools/shot.mjs --out=shots/me --script=steps.mjs "name=start"
export default async (page, shot) => {
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.evaluate(() => { window.__alrashed.enterMode('outside'); });
  await page.evaluate(() => window.__alrashed.idle());
  await page.evaluate(() => { window.__alrashed.playScenario('crossing_road'); }); // don't await: it plays
  await page.waitForTimeout(3000);
  await shot('crossing_road_speaking');
  await page.evaluate(() => window.__alrashed.stopAll());
};
```

`npx vitest run src/engine/` runs the driver, cutscene-ctx (fake clock, abort, freeze) and
conversation-sequence tests.
