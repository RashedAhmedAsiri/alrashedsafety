# Integration testing (real app, headless via tools/shot.mjs)

Sizes used: 900x600, 600x400, 390x780. Scripts drove the UI with clicks and `window.__alrashed`.

## Checked and working
- Loading screen, fly-in, menu (5 cards, Arabic, `dir=rtl`, `lang=ar`, title and manifest Arabic).
- Outside mode: wave and spoken mode line, scenario panel (18 items), scenarios play end to end
  (crossing_road about 79 s in software GL, then status ready, smile, playing null); weather and time
  change by scenario (heavy_rain gives rain and afternoon); stop via the status pill and back button reset to the classroom.
- Inside mode (15 items), short mode (46 chips), creative mode (8 chips + intro), settings, map
  (3 sheets, pin travel works), call and mic buttons (headless: sys.not_heard), exam (phase tap, 10 questions
  by tap, certificate, leave-early confirm with نعم).
- Matcher via `askText`: cross-mode match (inside asked about crossing plays crossing_road), short answer match,
  off-topic gives the confused line and intro.
- speak() fallback: `mouth` varies 0..0.4 while speaking with no Arabic voice.
- No English text and no MOE references in the UI, manifest or index.html. Logo letters «الراشد» are drawn
  as an SVG with antenna dots; school name «مدرسة الراشد» appears on 3D signs.
- No console errors. Only warning: KHR_parallel_shader_compile (SwiftShader).

## Fixed
- Menu clipped at 900x600 and on phones (logo cut at top, exam card cut at bottom): `.menu` now scrolls,
  `justify-content: safe center`, fog is `position: fixed`, compact cards under 700 px height or 600 px width (`src/ui/ui.css`).

## Added after the first pass
- Typed question box in the HUD (`QuestionBox` in `src/ui/Hud.tsx`, hidden while the exam runs): Arabic placeholder,
  send icon button, Enter sends, calls `askText` (matcher in the current mode). Verified: short match, off-topic, creative.
- Creative mode with no backend or offline now plays the existing `offline_creative` line (needs internet, try other
  modes) instead of off-topic. No new content was invented.

## Still open / notes
- Intermittent empty `[pageerror] Aborted` (unhandled AbortError) seen in some runs when a question interrupts a
  playing scenario; not reproducible in later runs, source not found (gestureLoop and cutscene sleeps are caught).
- Phone portrait: scenario panel title is ellipsised («السلامة خارج الم...»).
- Real microphone, Azure voices and the Worker could not be tested headless.

## Review pass (Nov 2026)
Every location, every scenario part (contact sheets) and every scenario's speech in the real app were rendered
(`tools/steps/review/`: `run.sh <id>` for part sheets, `speak.sh <id>` for the speech through the real app,
`ui.mjs` for menu/modes/panels, `exam.mjs` for the full tapped exam, certificate, leave-confirm and teacher PIN).
Fixed:
- Alrashed's face screen went blank (no eyes or mouth) whenever he showed `explaining`, the face used for every
  answer: on Chrome's GPU canvas a glowing brow stroke near the top edge wiped the clipped screen. The face canvas
  is now a software canvas (`willReadFrequently`, `src/characters/robot/face.ts`).
- He talked with his back to the student in about ten scenarios (a `during` part pointed him at something, then
  explained). `keepFacingViewer` in `src/engine/conversation.ts` (helpers in `src/engine/viewer.ts`) turns him to a
  three-quarter view when he only stands and talks; `face()` during speech is now a quick smooth turn, not a snap.
  open_sewer (kneeling) and stranger_at_gate (hand on the boy's shoulder) were set up by hand.
- After a map visit to a place where he stands facing the street, he now turns round to the student.
- power_outage: the room went almost black while he spoke (his screen only lit the room with the `glow` face).
- heavy_rain: at the houses a sidewalk palm hid him at his gate; the camera now follows from the other side.
- Stray `[pageerror] Aborted` when a question interrupts a scenario: AbortError rejections are now ignored globally
  (`src/main.tsx`).
- Matcher: «كيف أركب الحافلة», «ليش أربط الحزام», «متى أقدر أعبر» went to the wrong item (now 756/756 own examples).
- Phone portrait: long panel titles wrap instead of «...». No white flash before the loading screen (`index.html`).
Not testable here: real Arabic voice (the sandbox has no internet, so `/api/tts` and Google TTS could not be reached;
the silent mouth fallback worked), microphone, and the Cloudflare Worker.
