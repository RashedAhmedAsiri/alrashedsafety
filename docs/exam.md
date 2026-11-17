# Exam mode, results and backend (exam builder)

Owner files: `src/exam/**`, `src/backend/**`, `workers/**`, `src/dev/Exam.tsx`.

## How the engine and UI connect

| Piece | Connection |
| --- | --- |
| Engine | `enterMode('exam')` waves, then `await startExam()` (`src/exam/flow.ts`). `startExam` sets `ui.examRunning = true`, starts the test in the background and returns at once, so the engine keeps the stage for the exam. `stopAll()` and `backToMenu()` call `abortExam()`. |
| Mic button in exam mode | The engine calls the optional exports `examAskByVoice()` (open the mic now, used after the tap buttons appeared) and `examAnswerText(text)` (judge typed text, for dev tools). |
| Overlay | `<ExamOverlay/>` is mounted by `MainApp` (always). It draws only while `phase==='mode' && mode==='exam'` and renders `<TeacherDashboard/>` when `ui.teacherOpen` (Settings button). It reads `src/exam/store.ts` (`useExam`) and calls `answerTap`, `confirmLeave`, `startExam`, `backToMenu`. |
| Leave early | A capture-phase click listener in the overlay intercepts the status pill (`data-ui="status"`) and back button (`data-ui="back"`) while a test is unfinished and shows the «نعم / لا» card; «نعم» then calls `stopAll()` / `backToMenu()`. The test is paused (at step boundaries) while the card is open. A stopped test is never saved; a «أعد الاختبار» button stays on screen. |
| Hidden scenarios button | `ui.examRunning` (Hud and ScenariosPanel already honour it). |
| Voice keys | `voiceKey.examQuestion/Correct/Wrong/PhaseQuestion/Score/Band` from `src/content/voiceLines.ts`; `exam.start` for the start line. Text always goes through `renderGender`. |

## Flow (src/exam/flow.ts)

1. Clipboard in hand (`hold: 'clipboard'`), classroom, phase question: two buttons (قبل orange/seed, بعد green/tree) are visible while Alrashed asks; a tap, or «قبل/بعد» by voice (`readPhase`), answers. Up to two listening tries, then taps only.
2. `exam.start` line, then q1..q10 in fixed order. Each: `travelTo(place)` (q5 uses `wet` weather, q6 sets stage flag `lights: 'off'` and restores it after the feedback), speak the question (face `talking`), listen (status/face `listening`, `listenOnce` 8 s max / 1.5 s silence, sound-wave ring), judge, feedback line (face `proud` or `gentle`, clip `thumbsUp` / `nod`), dot fills green or soft amber.
3. Two failed tries (nothing recognised, or `unclear`), or no listening available (no mic, denied, offline iPad), show the tap buttons for that question and keep the mic off (the mic button can still open it). `sys.not_heard` plays between the two tries.
4. After q10: result saved at once (`saveResult`), travel to the classroom, face `counting` + `drumroll` sfx (2.4 s), score line `exam.score.<n>` with ten stars filling one by one (face `celebration`), then the band message (`exam.band.<i>`, face proud/happy/gentle), confetti (big / normal / soft star shower), clip celebrate / clap / thumbsUp, and the certificate with print, save-as-image, «أعد الاختبار» (restart from the phase question) and «الفصل» (`backToMenu`).
5. Gender for the result: `unknown` while `genderSource === 'default'`, else the app gender (voice detection from the answers keeps updating it, so feedback lines use the right form).

Everything respects the abort signal (own controller chained to `currentSignal()`).

## Judging (src/exam/judge.ts, pure, tested in judge.test.ts)

All checks run on a local normalizer (`basicNormalize`) and, when the matcher is implemented, also on `normalizeArabic`; every phrase is compared by light stems (prefix/suffix stripping, dialect map such as قدام→امام، ورا→خلف، شمال→يسار), content words only, up to two filler words between the words of a phrase, and mentions right after a negation (لا، ما، مو، بدون...) do not count.

- **Choice:** letter names first (أ/ألف، ب/باء، ج/جيم), then option keywords (words that only one option has; words after a negation inside the option count half) and the plan's spoken variants, ties go to the earliest mention, ordinals (الأول/الثاني/الثالث) last.
- **Yes/no:** plan word lists, the first yes or no word wins («اكيد لا» = no, «ما» counts as no only at the start).
- **Open:** concepts + wrong words from `EXAM_QUESTIONS`; pass rule `pass.minConcepts` / `requireAnyOf`; any non-negated wrong word fails.
- `unclear` (nothing recognised) = try again / tap buttons. «ما أدري» = wrong. Each question scores 1 or 0.
- **Online help:** only for open questions with no concept found: `judgeOpen(questionId, conceptIds, text)` → Worker `/api/judge` → `{pass, concepts, unsafe}`. The client re-applies the pass rule to the returned concept ids. Gemini never writes feedback.

## Results (src/exam/results.ts)

Row = `ExamRow` (`src/backend/api.ts`): `id, device_id, phase, score, answers (10×1/0), input (10×v/t), gender, created_at (UTC ISO), app_version, exam_version`. `EXAM_VERSION` (results.ts) must be bumped when a question changes; the dashboard only shows the current version. `device_id` is a random UUID in localStorage (`alrashed.deviceId.v1`). Every finished test: local copy (localStorage `alrashed.exam.results.v1`, last 2000, used by the offline dashboard) + IndexedDB queue (`alrashed-exam`/`queue`, localStorage fallback) + immediate upload; `startResultSync()` flushes at start and on the `online` event. No audio, transcript or name is stored.

## Teacher dashboard (TeacherDashboard.tsx, stats.ts)

PIN pad (Arabic digits). First open sets the PIN (twice); stored as salted SHA-256 in localStorage and, when online, in D1 (`/api/pin/set`). A PIN set offline is pushed the first time the dashboard opens online. Forgot: «نسيت الرقم» asks for the Worker's `ADMIN_PIN` (online only), then a new PIN. Views: big numbers (average before ← after, counts), per-question bars (tap a bar to read the topic), score histogram (overlaid), paired line chart per device (labelled per device, not per student), filters (dates, gender, latest attempt only by default / all), CSV export of the filtered rows. Chart.js with RTL axes, IBM Plex Sans Arabic, app colors. Data: Worker `/api/results` when reachable (all devices), else local results (badge shows which).

## Backend client (src/backend/api.ts)

`askCreative`, `tieBreak` (sends scenario/short titles from content with the two ids), `judgeOpen`, `postExamResult` (`'ok' | 'rejected' | 'failed'`), `getResults`, `teacherPinIsSet`, `checkTeacherPin`, `setTeacherPin`, `isOnline`, `backendAvailable`. Empty `VITE_API_BASE` or offline → `null` at once; timeouts and `AbortSignal` honoured; never throws.

## Worker (workers/)

`wrangler.toml` (placeholders), `schema.sql` (`exam_results`, `settings`), `src/index.ts`, `src/prompt.ts` (generated verbatim from the plan's system rules), `src/env.d.ts`. Typecheck: `npx tsc -p workers --noEmit`. Routes: `POST /api/creative` (Gemini JSON schema; checks: strictest safety settings, Arabic letters only, no digits/Latin, no هاتف/جوال/اتصل/اتصال, ≤120 words; then Azure TTS REST → `data:audio/mpeg;base64,...`, visemes `[]`; any rejection → `{on_topic:false}`), `POST /api/tiebreak`, `POST /api/judge` (own concept table + pass rules for q4/q7/q10), `POST /api/exam` (strict shape check, `INSERT OR IGNORE`, 201 / 409 duplicate / 400), `GET /api/results` (header `X-Teacher-Pin`; the admin PIN also works), `GET /api/pin`, `POST /api/pin/check`, `POST /api/pin/set`, `GET /api/health`. CORS from `ALLOWED_ORIGIN`; per-IP rate limits kept in memory per Worker instance (best effort). If Azure keys are missing, creative answers come without audio and the app speaks with the browser voice. See `docs/deploy.md`.

## Preview and tests

`?dev=Exam&state=phase|ask|listen|tap|drum|stars|cert|confirm|stopped|teacher` (+ `q=`, `marks=`, `score=`, `gender=`, `phase=`). `npx vitest run src/exam` (judge, stats, results rows, certificate). The full flow was driven in the real app with `window.__alrashed` + `tools/shot.mjs --script` (taps through all ten questions to the certificate).

## Known gaps

Real microphone judging could not be tested headless (tap fallback path was). The pictograms are simple stroke figures. The leave-early confirm intercepts the HUD by `data-ui` attributes (ui owner: keep them). Worker never deployed or called from here.
