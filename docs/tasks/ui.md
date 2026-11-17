# Brief: ui (screens, sounds, PWA)

**You own:** `src/ui/**`, `src/audio/**`, `public/icons/**`, `docs/ui.md`, `src/dev/Ui.tsx` (preview),
and (small Edit-tool hunks only) the `plugins` array of `vite.config.ts` and icon/manifest links in
`index.html`.

**Source:** `docs/plan/Screens_and_UI.md` (all), `src/core/theme.ts`, `src/core/store.ts`,
`src/engine/conversation.ts` (the only functions the UI calls), `src/content/index.ts`.

Keep `Overlay` and every export of `src/audio/sfx.ts` exactly.

1. **Overlay** (all 2D over the canvas, RTL, IBM Plex Sans Arabic 500/700, `pointer-events` only on
   controls so the 3D free look still works):
   - Loading (`phase === 'loading'`): paper background; the title «الراشد روبوت السلامة المدرسية»
     animating in word by word with a bounce, holding, fading, looping; under it the road progress bar
     where a yellow school bus drives right→left with `loadProgress`; final bounce when done. The
     «الراشد» logo per the plan (rounded bold teal lettering, the ش dot as Alrashed's antenna light) as
     an inline SVG/HTML you design.
   - Menu (`phase === 'menu'`): soft fog + blur over the classroom, five mode cards sliding up one after
     another (landscape one row; portrait two rows 3 + 2), icon circles, titles and descriptions exactly
     from the plan table; tap → card pops, others drop away, fog clears, then `enterMode(mode)`.
   - In a mode: thin top bar in the mode color; status pill top-left (label, lucide icon, color from
     theme; tap → `stopAll()`); back top-right upper (`backToMenu()`); settings top-right lower; call
     bottom-right (teal phone, turns red to end; ring); mic rising above the call button only during a
     call (tap → `askByVoice()`, pulses green with sound rings while `listening`); scenarios bottom-left
     (grid icon; hidden while `ui.examRunning`).
   - Scenarios panel: slides up from the bottom-left over a light fog; colorful grid (3-4 columns) of the
     current mode's items: outside/inside → intro first then that mode's scenarios (icon + title +
     color from content, `playScenario(id)`); short → intro + 45 chips (`playShort(id)`); creative → the
     8 chips (`askText(chip)`); empty-content safe.
   - Settings panel (slides from top-right, paper card): voice volume, sfx volume, music toggle,
     student switch بَطَلٌ / بَطَلَةٌ (calls `setManualGender` from `src/voice/gender.ts`), the map, quality
     low/medium/high, «لَوْحَةُ النَّتَائِجِ» button → `setUi({ teacherOpen: true })` (the exam builder
     draws the dashboard).
   - Map: a flat colorful top-down drawing (SVG) of ground floor, first floor and the outside area with
     a floor switch, drawn from `src/core/locations.ts` coordinates (origins/sizes), a pin per location
     with its Arabic name; tap → `travelTo(id)`; the current pin bounces.
   - Travel fade overlay from `useApp.fade` (paper color).
   - Toy-button style exactly as the plan: solid colors, 22 px radius, 6 px darker bottom edge, press
     moves 4 px down with a pop sound, min 64 px, lucide stroke 2.5 white, springy 200-350 ms motion, 8 px
     grid, nothing moves when idle. Avoid the generic AI look (no gradients, no glass). Touch + mouse.
2. **Sounds** (`src/audio/sfx.ts`): synthesize every `SfxName` with the Web Audio API (no files): short,
   soft, pleasant, adjustable (`settings.sfxVolume`); loops (`rain`, `wind`, `busEngine`, `murmur`,
   `birds`, `fireAlarm`, `heartbeat`...) when `loop: true`; `menuMusic` a gentle looping tune controlled
   by `setMusic` and `settings.music`; `unlockAudio()` resumes the context on the first gesture.
3. **PWA**: `vite-plugin-pwa` (generateSW, autoUpdate) with an Arabic manifest (name «الراشد روبوت
   السلامة المدرسية», short name «الراشد», `dir: rtl`, `lang: ar`, theme `#14B8A6`, background
   `#FFF8EC`, standalone, any orientation), icons you generate into `public/icons/` (render an SVG robot-
   face icon to 192/512/maskable/apple-touch PNGs with a small Playwright script under `tools/`),
   precache the build, runtime CacheFirst for `audio/voice/` and Hugging Face model files. Make sure
   `npm run build` still succeeds.
4. **Preview** `src/dev/Ui.tsx` (`?dev=Ui&state=loading|menu|mode|panel|settings|map|call`): renders the
   Overlay over a plain classroom-colored background with the store set to that state (set
   `window.__ready = true`). Screenshot every state at 1280×720 and 820×1180 (portrait iPad) with
   `tools/shot.mjs --size=...`, look at them critically against the plan and fix until they look
   hand-designed, playful and tidy.

Write `docs/ui.md`: components, how states map to screens, sound list, PWA notes.
