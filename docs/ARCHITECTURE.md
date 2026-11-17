# Alrashed app: architecture and rules for everyone building it

The product spec is `docs/plan/*.md` (exported from the plan doc). This file says how the code is
organised, which contracts connect the parts, and the rules every builder follows. When the plan
and this file disagree on *how* to build, this file wins; on *what* the product does, the plan wins.

## Run it

```
npm run dev                 # http://localhost:5173  (the real app)
npx tsc -p . --noEmit       # typecheck everything (filter to your files: | grep 'src/world/inside/')
npm test                    # vitest (src/**/*.test.ts)
node tools/shot.mjs --out=shots/<you> "view=classroom" "view=crosswalk_main&weather=rain"
```

`tools/shot.mjs` starts its own Vite server, renders headless Chromium with software WebGL, saves
PNGs and prints console/page errors. Look at your PNGs with the Read tool; that is how 3D work is
checked. Useful queries (see `src/dev/Viewer.tsx`):

| Query | Shows |
| --- | --- |
| `view=<locationId>` | that location with its default camera and Alrashed on his spot |
| `&lcam=dx,dy,dz&llook=dx,dy,dz` | camera relative to the location origin (`&cam=`/`&look=` for world) |
| `&weather=rain\|wet\|dust&time=afternoon` | conditions |
| `&flags=lights:off,board:flame` | set flags (stage store `flags`) |
| `&norobot=1`, `&expr=warning&mouth=0.6` | hide the robot / set his face |
| `view=characters&clip=walk` | robot + every person kind in a row (`&cam=`/`&look=` to frame) |
| `view=props` | every PropKind and HoldItem in a grid |
| `view=overview` | the whole outdoor world from above |
| `dev=<Name>` | any preview page `src/dev/<Name>.tsx` (default export; set `window.__ready = true` when drawn) |
| `name=<file>` | PNG file name |
| `--script=steps.mjs` | `export default async (page, shot) => {...}` to click through UI and `await shot('x')` |
| (no view) `--wait=8000` | the real app |

## Folder map and ownership

Each file has one owner. **Edit only files you own.** If you need a change in someone else's file,
work around it in your own files and list the request in your final report.

| Path | Owner | What |
| --- | --- | --- |
| `src/core/*`, `src/App.tsx`, `src/main.tsx`, `src/dev/Viewer.tsx`, `tools/shot.mjs`, `vite.config.ts`, `package.json`, `docs/ARCHITECTURE.md` | lead | shared contracts (read-only for workers; see exceptions below) |
| `src/world/kit.tsx`, `src/world/registry.ts` | lead | shared 3D building blocks, set discovery |
| `src/content/types.ts`, `src/content/index.ts` | lead | content shapes |
| `src/content/data/outside.ts` | content-outside | intro + 17 outside scenarios |
| `src/content/data/inside.ts`, `src/content/data/systemLines.ts` | content-inside | 14 inside scenarios, system lines |
| `src/content/data/shortAnswers.ts`, `exam.ts`, `creativeChips.ts` | content-short | 45 short answers, exam, chips |
| `src/content/voiceLines.ts`, `src/voice/**`, `tools/generate_voice.ts` | voice | speech, listening, gender, voice recording tool |
| `src/match/**`, `tools/build_index.ts` | matcher | normalizer, synonyms, scoring, meaning model |
| `src/exam/**`, `src/backend/**`, `workers/**` | exam | exam flow + screens + teacher chart, API client, Cloudflare Worker + D1 |
| `src/engine/**`, `src/cutscenes/engine.ts` | engine | MainApp, StageDriver, CameraRig, travel, conversation controller, cutscene runtime |
| `src/characters/Robot.tsx`, `src/characters/robot/**` | robot | Alrashed model, face screen, clips |
| `src/characters/Human.tsx`, `src/characters/human/**` | humans | boys and adults, clips, StaticPerson |
| `src/props/**` | props | PropLayer, vehicles, hand items, ambient traffic |
| `src/weather/**` | weather | Lighting, sky, rain, wet, dust, time of day |
| `src/ui/**`, `src/audio/**`, `public/icons/**`, `public/manifest*` | ui | all 2D screens, sounds, music, PWA |
| `src/world/inside/<group>.set.tsx` | set workers | rooms (one file per worker) |
| `src/world/grounds/*.set.tsx`, `src/world/outside/*.set.tsx` | set workers | outdoor parts |
| `src/cutscenes/{outside,inside}/<scenarioId>.cut.ts`, `src/cutscenes/intro.cut.ts` | cutscene workers (wave 2) | shot lists as scripts |
| `docs/<area>.md` | the area's owner | notes other builders need (see "Docs you write") |
| `src/dev/<YourName>.tsx` | whoever creates it | preview pages |

Exceptions, allowed with the Edit tool and small hunks only:

- Set workers may edit the `robot`, `robotFacing`, `camera` and `orbit` fields of **their own**
  locations in `src/core/locations.ts` (never origins or sizes, which other parts depend on).
- The ui worker may add the PWA plugin to `vite.config.ts` (plugins array only) and manifest/icon
  links to `index.html`.

Never run `npm install` (the dependency set is fixed; ask in your report). Never `git commit`.
Never write to `/mnt/project-files` (the lead syncs). Put screenshots in `shots/<your-area>/`.

Installed packages you may use: react 19, three 0.180, @react-three/fiber 9, @react-three/drei 10,
zustand 5, xstate 5 + @xstate/react 6, howler, lucide-react, chart.js 4, @huggingface/transformers 4.2
(lazy-loaded only), vite-plugin-pwa, vitest, playwright (dev only).

## The world

Read the layout comment at the top of `src/core/locations.ts`. In short: metres, Y up, north is -Z,
east is +X. The street runs along X at z = 0; traffic drives on the right (eastbound lane z 0..3.5,
westbound z -3.5..0), so a pedestrian facing the road meets cars from the **left** first. The school
is north of the street (fence at z = -7.5), houses and park south of it.

Every location has an `origin`, a default robot spot and a default camera (offsets from the origin).
`locAt(id, dx, dz, dy)`, `robotSpot(id)`, `cameraSpot(id)` convert to world points.

**Ground heights.** `src/core/ground.ts` `groundHeight(x, z)` is the walkable outdoor surface:
roads 0, sidewalks 0.15 (curb height), the raised zebra crossing 0.15, the flood dip down to -0.35,
everything else 0. Outdoor sets must model surfaces at exactly these heights. `locAt()` (and so
`ctx.at()`, `robotSpot()`, `cameraSpot()`) returns outdoor points on that surface; indoors y is the
room floor. The StageDriver interpolates y linearly between path waypoints, so a path that steps off
a curb should include a waypoint at the curb edge.

**What renders.** Inside rooms render one at a time (only the active one) inside
`<group position={origin}>`, so rooms are authored in **local** coordinates (floor y = 0, interior
centred on x = 0, z = 0). Windows show painted views (`kit.tsx` `WindowPane`). All outdoor parts
(grounds + outside) render together whenever the active location is outdoor, in **world**
coordinates. During the opening fly-in the outdoor world renders too, so the building exterior must
look complete from the sky and from the yard.

## Shared state

- `src/core/store.ts` `useApp`: UI phase, mode, location, weather, time, status, face
  (`expression`, `mouth`, `viseme`), gender, call/listening state, settings, panels.
- `src/core/stage.ts` `useStage`: actors (Alrashed is `alrashed`), props, camera shot, shake, flags.

**Frame loop rule.** 3D components read per-frame values with `useStage.getState()` /
`useApp.getState()` inside `useFrame`, never by subscribing and re-rendering every frame. Subscribe
(`useApp(s => s.weather)`) only for values that change rarely (weather, location, quality, flags).

**Time base.** `clipStart` is `performance.now()` in ms. A character computes
`t = (performance.now() - clipStart) / 1000 * clipSpeed` seconds into its clip.

## Characters

- An actor's visible clip is `move.clip` while `move` is set, otherwise `clip`.
- One-shot clips have `clipDuration > 0`; the StageDriver (engine) puts the actor back to `idle`
  after that many seconds. Looping clips have `clipDuration = 0`.
- `hold` / `holdLeft` render `HoldItemMesh` (props) attached to the hand. Grip convention:
  `HoldItemMesh`'s origin is the grip point; its +Y runs up through the closed fist (thumb side)
  and +Z points forward from the knuckles. Each character has a hand socket whose +Y is world-up
  and +Z is the character's forward when the arm hangs relaxed, so a held umbrella, mop or bucket
  hangs naturally and an extinguisher points forward.
- `lookAt` turns the head (and the robot's eyes) toward a world point.
- `flags` hold special poses, e.g. `seated`, `inBus`, `seatbelt`, `umbrellaOpen`, `collarUp`.
  Each character owner documents the flags they support.
- The robot's face shows `useApp.expression`; the mouth follows `useApp.mouth` (0..1) on top of any
  expression while he speaks. The antenna light shows `STATUS_COLORS[useApp.status]` (`src/core/theme.ts`).
- Walking speed: boys 1.3 m/s, adults 1.4, robot 1.2; running 3.2. The walk cycle should match the
  speed the StageDriver moves them at (it rotates them to face their travel direction).

## Props

`PropState.kind` + `params` (documented beside `PropKind` in `src/core/types.ts`). Vehicles' local
frame: origin at ground level under the vehicle centre, facing +X, +Z to the right side. The props
owner documents the local points cutscenes need (bus door, steps, driver seat, passenger seats, car
doors) in `docs/props.md`. Cutscenes convert them with `ctx.offset(base, rotY, local)`.

## Wet surfaces

Outdoor sets build asphalt, sidewalks, paving, curbs and roofs with `wetMat(color)` from `kit.tsx`
(registered in `src/world/wet.ts`); the weather system darkens and glosses them in rain and after rain.

## Location sets and flags

A set reads `useStage(s => s.flags)` for switches cutscenes flip. Shared flags:

| Flag | Values | Who reacts |
| --- | --- | --- |
| `lights` | `'on'` (default) / `'off'` | rooms (ceiling panels dark) and Lighting (dim room); power_outage |
| `alarm` | `true` / `false` | rooms with alarm lights flash red |
| `board` | `'logo'`, `'flame'`, `'bulbOff'`, `'rain'`, `'extinguisher'`, `'firstAid'`, `'blank'` | classroom smartboard picture |
| `exitGlow` | `true` | exit signs and emergency lights brighter (outage, evacuation) |

Each set worker adds the flags their rooms support and documents them, plus **landmarks**
(local or world coordinates of the board, desks, doors, sink, bench, curb line, goal mouth, swing,
etc.) in `docs/sets/<file>.md`. Cutscene writers depend on these landmark lists.

## Cutscenes

`src/cutscenes/api.ts` is the authoring API: async scripts where each `await` is a beat of the shot
table. Parts: `setup` (the "Speaking setup", runs first), `before`, `during` (alongside speech,
aborted when speech ends), `after`. The scene is not cleared between parts. Scenarios that move
between places (fire_evacuation, small_cut, nosebleed, dismissal, heavy_rain, power_outage) call
`ctx.go(location)`, which fades, switches the active location and keeps the actors. Files:
`src/cutscenes/outside/<scenarioId>.cut.ts`, `src/cutscenes/inside/<scenarioId>.cut.ts`,
`src/cutscenes/intro.cut.ts`, each `export default [cutscene(...), ...]`.

## Playing a scenario (engine)

1. Stop whatever plays (abort its signal), clear the scene.
2. `travelTo(location, { weather, time })`: fly when both places are outdoor and near (< 60 m),
   otherwise fade. Weather blends over 3 s. Robot placed on the location's robot spot, camera on the
   location's camera spot.
3. Run `setup` if it exists.
4. For each step of `order`: `before` → cutscene; `speak` → speech (below) with `during` in
   parallel; `after` → cutscene.
5. Speech: status `explaining`; opening (face `happy`), 600 ms, `MUST_LEAD` then each must item
   (face `explaining`) with 400 ms between items, 600 ms, `AVOID_LEAD` then each avoid item (face
   `warning`), 600 ms, slogan (face `proud`). Without a `during` cutscene and when the robot is not
   `seated`, the engine cycles `explain1..3` / `talk` gestures.
6. At the end: clear non-persistent actors/props, status `ready`, face `smile`, free camera around
   the robot wherever he ended.

In dev builds the engine exposes `window.__alrashed` (playScenario, playShort, travelTo, stopAll,
enterMode, askText, app, stage) so builders can drive the real app from `tools/shot.mjs --script`.

Short answers: travel, robot faces the camera, face = the answer's face, status `speaking`, speak.
Creative: same with Gemini's location, expression and live audio. No cutscenes for either.

The status button (`stopAll`) aborts everything, stops speech and sounds, clears the scene and
returns to the classroom.

## Voice keys and files

Every spoken line has a key. Recordings live in `public/audio/voice/<key>.<v>.mp3` with visemes in
`<key>.<v>.json` (`[[ms, visemeId], ...]`), where `<v>` is `b` (boy) or `g` (girl); a line with no
`{boy/girl}` markup has only `b`. `public/audio/voice/manifest.json` lists what exists:
`{ "version": 1, "keys": { "crossing_road.must.2": ["b", "g"] } }`.

| Line | Key |
| --- | --- |
| Scenario parts | `<scenarioId>.opening`, `<scenarioId>.must.<i>`, `<scenarioId>.avoid.<i>`, `<scenarioId>.slogan` (i from 0) |
| Intro | `intro.body` |
| List leads | `lead.must`, `lead.avoid` |
| Short answers | `short.<id>` |
| System lines | `sys.<id>` |
| Exam | `exam.<questionId>.question`, `.correct`, `.wrong`; `exam.phase_question`, `exam.start`, `exam.score.<n>`, `exam.band.<i>` |

`src/content/voiceLines.ts` (voice owner) exports `allVoiceLines()` returning every `{ key, text }`
from content; `tools/generate_voice.ts` records them with Azure when a key is available. Until then
`speak()` falls back to the browser's Arabic voice, and if there is none, to a timed mouth animation
(`estimateDuration`). Text always goes through `renderGender(text, gender)` before speaking.

## Matching (matcher)

Normalize Arabic, keyword/BM25 score over examples + weighted keywords, optional meaning model
(multilingual-e5-small via transformers.js, lazy, cached), final = 0.4 keyword + 0.6 meaning
(keyword alone until the model is ready). ≥ 0.55 match; 0.40–0.55 close (Gemini tie-break when
online and top two within 0.05); < 0.40 low → off-topic line + intro. Outside/inside: a scenario of
the other mode wins if ≥ 0.65 and 0.15 above the best in the current mode. Short answers vs
scenarios: higher wins; ties within 0.05 go to the short answer in short mode, to the scenario elsewhere.

## Offline and network

The app must work with no network after the first load: no CDN fonts, scripts or textures at
runtime. Only these may use the network: speech recognition (browser), the transformers.js model
downloads (background, optional), and `VITE_API_BASE` calls (creative, tie-break, exam judge,
results). Every network path has an offline fallback described in the plan.

## UI rules

Arabic only, RTL, IBM Plex Sans Arabic 500/700, no subtitles and no answer text on screen. Colors,
labels and status colors from `src/core/theme.ts`. Toy buttons per the plan. Lucide icons only.
No purple-blue gradients, no glass cards.

## Performance

Per view: under 150 draw calls and 500k triangles. Share materials (`mat()`), share geometries
(`GEO`), instance repeated things, no real-time lights in sets, shadows only from the sun (outdoor)
and only on objects near the camera. Respect `settings.quality` (`low` = fewer particles, no
shadows, simpler crowds).

## Docs you write

When you finish, write `docs/<area>.md` (or `docs/sets/<file>.md` for sets) with what another builder
needs: exported components, supported clips/flags/params, landmark coordinates, known gaps.
