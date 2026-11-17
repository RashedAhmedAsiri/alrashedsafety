# Brief: exam (exam mode, results, backend)

**You own:** `src/exam/**`, `src/backend/**`, `workers/**`, `docs/exam.md`, `docs/deploy.md`,
optional `src/dev/Exam.tsx` (preview page).

**Source:** `docs/plan/Exam.md` (all of it), the exam parts of `docs/plan/Screens_and_UI.md`, creative
mode in `docs/plan/Voice_and_AI.md`, "Offline strategy" and "Keys" in `docs/plan/Overview_and_tech.md`.

Keep the exports of `src/exam/flow.ts`, `src/exam/ExamOverlay.tsx`, `src/backend/api.ts` exactly.

1. **Flow** (`src/exam/flow.ts` + your own `src/exam/store.ts` zustand store for exam UI state): exactly
   the plan's flow: the engine calls `startExam()` after entering exam mode. Travel/positioning through
   `travelTo` from `src/engine/conversation.ts`; speech through `speak()` from `src/voice/speech.ts` with
   keys `exam.*` (helpers in `src/content/voiceLines.ts` once the voice builder adds them; until then
   build keys yourself per ARCHITECTURE) and text via `renderGender`; listening via `listenOnce()`
   (8 s max per the plan); faces/status via `useApp`; robot clips via the stage store (clipboard in hand,
   at the board). Phase question with two big buttons, start line, 10 questions in order, each at its
   listed place (and the q6 lights-dim flag), auto-listen, judge, feedback line, progress dots, tap
   fallback after two failed listens or when listening is unavailable, drum roll + score line + band
   message + celebration + certificate after q10, save the result, retake/back buttons, leave-early
   confirm card (not saved). `abortExam()` stops everything cleanly. Respect `currentSignal()`.
2. **Judging** (`src/exam/judge.ts`, pure functions + vitest tests): choice letters/names/ordinals,
   spoken variants and option keywords; yes/no word lists (first one wins); open questions: concepts,
   wrong words, pass rule; all on `normalizeArabic` from `src/match` (if it is still a stub when you test,
   include a local fallback normalizer used only when the import is a no-op). Optional online Gemini
   judge via the Worker when the offline check finds no concept. Test with realistic dialect answers.
3. **Screens** (`src/exam/ExamOverlay.tsx`): ten progress dots (green right / soft amber wrong), phase
   buttons («قَبْلَ التَّدْرِيبِ» orange with a seed icon, «بَعْدَ التَّدْرِيبِ» green with a tree icon), answer
   buttons for choice (letter + picture) and yes/no (✔ نَعَمْ / ✖ لَا), three picture cards for open
   questions; pictures as simple flat SVG pictograms you draw for each described picture (no text,
   no external images); result stars filling one by one; certificate card per the plan (title by
   gender, logo «الراشد», «مدرسة الراشد», stars, phase, Hijri + Gregorian dates via `Intl` with the
   `islamic-umalqura` calendar, dotted name line, print and save-as-image (canvas) buttons, gold/silver/
   bronze by band); confirm card. Style: the toy-button style and palette in Screens_and_UI.md and
   `src/core/theme.ts`, RTL, IBM Plex Sans Arabic, big touch targets, no answer text ever on screen.
4. **Teacher dashboard** (`TeacherDashboard`, rendered by `ExamOverlay` when `useApp.ui.teacherOpen`):
   4-digit PIN (set on first open; stored hashed in D1 when online, and locally for offline use), the
   five views in Exam.md with Chart.js (RTL, Arabic labels, app colors), filters, CSV export. Data from
   the Worker when online, otherwise this device's local results.
5. **Results storage**: device id (random UUID in localStorage), result rows exactly as in Exam.md,
   queued in IndexedDB when offline and flushed on `online` events and app start.
6. **Backend client** (`src/backend/api.ts`): implement `askCreative`, `tieBreak`, plus new exports
   `judgeOpen`, `postExamResult`, `getResults`, `setTeacherPin`/`checkTeacherPin`; timeouts, AbortSignal,
   `API_BASE` empty or offline → resolve null quickly (callers fall back).
7. **Cloudflare Worker** (`workers/`): `wrangler.toml` (placeholders, D1 binding), `schema.sql`,
   `src/index.ts` with routes `POST /api/creative` (Gemini with the plan's system rules verbatim and a
   JSON response schema; the plan's checks; then Azure TTS REST to MP3 returned as a data URL or
   base64; visemes empty is fine, the client animates from amplitude), `POST /api/tiebreak`,
   `POST /api/judge`, `POST /api/exam`, `GET /api/results`, teacher PIN endpoints, CORS, per-IP rate
   limits, strict input validation. Model id from env `GEMINI_MODEL` (default the latest Flash alias).
   Secrets: `GEMINI_API_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `ADMIN_PIN`. No npm installs:
   write minimal ambient types in `workers/src/env.d.ts` and typecheck with your own
   `workers/tsconfig.json` (`npx tsc -p workers --noEmit`).
8. `docs/deploy.md`: step-by-step for a non-programmer to create the free Cloudflare account, D1
   database, secrets, deploy the Worker and the site (Cloudflare Pages), and set `VITE_API_BASE`.

Verify the screens with a preview page `src/dev/Exam.tsx` (`?dev=Exam`, set `window.__ready`) that
shows each exam screen state, screenshot them with `tools/shot.mjs`, and fix what looks off.
Write `docs/exam.md` (flow, judging rules, how the engine and UI connect to it).
