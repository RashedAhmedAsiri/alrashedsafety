# Alrashed School Safety Robot: Full Build Plan

Oct 13, 2026 · @rashedkillthejews

This is the complete plan for the programmer. This tab covers decisions, technology and build order. The other tabs cover the 3D world, the screens, voice and AI, every scenario with its full diacritized text and animation, short answers, the exam, and a log of corrections made to the original texts.

## Decisions

These are your answers from the questions doc, turned into rules the programmer must follow.

| Area | Decision |
| --- | --- |
| Devices | iPads, PCs and laptops. Touch and mouse both first-class. |
| Where used | Anywhere: class smartboard, a student's own device, home. |
| Grades | All elementary grades (1 to 6). |
| Language | Arabic only. No English text anywhere in the app. Right-to-left layout. |
| On-screen text | No subtitles and no answer text on screen, ever. Only titles, scenario names, buttons and labels. |
| Schools | Boys' and girls' schools. Alrashed's speech changes by gender. |
| Students in the 3D world | Boys only, in normal shirts of random colors with blue or black pants. |
| Branding | No MOE logo, name or reference anywhere. The only logo is «الراشد». Everything reflects Saudi Arabia (right-hand traffic, Arabic signs, local houses, palms, weather). |
| School name | «مدرسة الراشد» (ALRASHED school) on the sign. |
| Cost | Free. Only free tiers of services, see Tech stack. |
| Offline | As offline as possible. See Offline strategy. |
| Login | None. |
| Gender | Detected from the student's voice, with a manual switch in settings as a correction. |
| Student's name | Never used, except creative mode may use it if the student says it. |
| Premade answers | Matched by meaning, both boy and girl versions written by hand, every word diacritized. |
| No match or off-topic | Alrashed plays the intro scenario «مَنْ هُوَ الرَّاشِدُ؟» in every mode. |
| Talking | Press the mic for each question. Exam mode listens again automatically. |
| Interrupting | The status button (top left) stops Alrashed and returns to the classroom. |
| Weather | Controlled by the scenario or question. Sunny, rain, wet after rain, dust. |
| Time of day | Morning for arrival scenarios, early afternoon for dismissal. |
| Camera | Cinematic shots, plus the student can rotate and zoom around the current place. |
| Scenarios button | On every mode, colorful buttons. In exam mode it is hidden while the test runs (your original exam rule) and returns when it ends. |
| Short answers and creative mode | Alrashed moves to the room or place the question is about, then answers there with face expressions only, no cutscene. |
| Creative mode | Answers anything about safety or school. Off-topic plays the intro. |
| Exam | Same 10 questions for pre-test and post-test, mixed format, results saved anonymously and shown as an improvement chart. |
| Conversations | Never saved. Audio is never stored. |
| Font | IBM Plex Sans Arabic. |
| Style | Playful, colorful, organized, simple. Hand-designed, not generic AI look. |

## Tech stack and free services

**Is Azure free? Yes, for this app.** Azure AI Speech has a free tier (F0) with 0.5 million characters of neural voice per month and 5 hours of speech recognition per month ([Azure pricing](https://azure.microsoft.com/pricing/details/cognitive-services/speech-services)). All scripted speech in this plan is about 80,000 characters for both boy and girl versions, so it is recorded once for free and shipped as audio files. Creative mode's live voice uses the same monthly allowance, which covers roughly 1,000 creative answers a month. Creating the Azure account normally asks for a card to verify identity, but the free tier is not charged.

| Part | Choice | Why |
| --- | --- | --- |
| App framework | Vite, React, TypeScript | Fast, standard, easy to hand to any programmer |
| 3D | Three.js through React Three Fiber, with drei and postprocessing | Answer from the questions doc |
| Cutscenes | Theatre.js, one sequence per scenario (before and after) | Timeline editor to choreograph camera and characters by eye |
| App states | XState state machine | Many states (intro, menu, mode, listening, thinking, speaking, animating, exam) with clear rules |
| Audio playback | Howler.js | Reliable on iPad Safari, sprites, volume control |
| 3D content | Blender, exported as glTF with meshopt compression and KTX2 textures | Small downloads, fast loading on iPads |
| Offline | Progressive Web App with a service worker (vite-plugin-pwa) | Installable, works without internet after the first load |
| Voice recording | Azure Neural TTS, voice ar-SA-HamedNeural, pre-recorded at build time with viseme data | Correct tashkeel, lip sync, free |
| Live voice (creative mode) | Azure TTS through a small server function | Same voice as the rest |
| Listening | Browser speech recognition (free, built into Chrome, Edge and Safari), with Whisper running inside the browser as the offline and Firefox fallback | Free, and works offline on PCs and laptops |
| Matching | Arabic text normalizer, keyword and synonym scoring, plus a small meaning model running in the browser | Free and offline |
| Creative mode AI | Gemini Flash (latest) through a server function | Your choice, free tier |
| Server functions and hosting | Cloudflare Pages and Workers, free plan | Free, fast in the Middle East, keeps API keys secret |
| Exam results database | Cloudflare D1, free plan | Free, same platform |

**One caution about Gemini's free tier.** Google's terms for free (unpaid) use allow Google to use the prompts and responses to improve its products, and humans may review them ([Simon Willison on the Gemini terms](https://simonwillison.net/2024/Oct/17/gemini-terms-of-service)). The app never sends names, voice audio or anything personal, only the question text, so this is acceptable. If the program later gets a budget, switching the Gemini project to paid removes this.

## How it works

&#91;embedded content: how a question becomes an answer · listen, match, play\]

Most questions never leave the device after listening: matching runs locally and the answer is a pre-recorded file. The Worker is called only for close scores (0.40 to 0.55), creative mode, and saving exam results.

## Offline strategy, data and privacy

Everything works offline after the first visit except creative mode and saving exam results, which wait for internet.

| Feature | Offline? | How |
| --- | --- | --- |
| 3D world, characters, animations | Yes | Cached by the service worker on first load |
| All scripted speech (scenarios, short answers, exam) | Yes | Pre-recorded audio files, cached |
| Listening on PCs and laptops | Yes | Whisper model (about 75 MB, "base" size) downloaded once in the background and cached |
| Listening on iPad | Needs internet | Safari's built-in recognition sends audio to Apple. Whisper is too heavy for most iPads. |
| Matching a question to an answer | Yes | Runs in the browser |
| Gender from voice | Yes | Runs in the browser |
| Creative mode | Needs internet | Gemini and live voice. Offline, Alrashed says he needs internet for this mode, using a pre-recorded line. |
| Exam | Yes | Questions, judging and scoring run in the browser. The result is queued and uploaded when internet returns. |

**Loading in two steps.** First load downloads the classroom, Alrashed, the UI and the intro audio (target under 25 MB) so the menu appears fast. The rest of the school, outside world and audio download in the background while the student uses the menu. A room or area not yet downloaded shows a short loading animation of Alrashed walking.

**What is saved.** Only exam results, with no personal data: a random device ID created on the device, pre or post, score, which questions were right, date, and app version. No names, no audio, no transcripts, no conversations. Pre and post results are compared in two ways: per device (when a student uses the same device) and as group averages (always). The results chart is in settings behind a 4-digit teacher PIN set by the school.

**Microphone.** Audio is processed live and thrown away. The browser asks for microphone permission once; Alrashed explains with a pre-recorded line if permission is refused.

**Keys.** The Gemini key, Azure key and database live only in Cloudflare Workers, never in the app code.

## Project structure and data formats

```
alrashed/
  app/                    React app (UI, state machine, audio, matching)
    src/scene/            3D: world loader, characters, weather, camera rigs
    src/cutscenes/        one Theatre.js sequence per scenario (before, after)
    src/voice/            listening, gender detection, matching
    src/ui/               screens and buttons
  content/
    scenarios.json        every scenario: text, location, weather, animation ids
    short_answers.json
    exam.json
    synonyms.json         dialect words and synonyms for matching
  assets/
    models/               glTF files from Blender
    audio/voice/          generated speech files and viseme files
    audio/sfx/            sound effects and music
  tools/
    generate_voice.ts     reads content/*.json, calls Azure, writes audio/voice
    build_index.ts        builds the matching index
  workers/
    creative.ts           Gemini + live Azure voice
    results.ts            saves and reads exam results (D1)
```

**Gender markup.** Every Arabic text in this plan uses `{boy/girl}`, boy version before the slash and girl version after it. For example `يَا {بَطَلُ/بَطَلَةُ}، {تَذَكَّرْ/تَذَكَّرِي}` becomes «يَا بَطَلُ، تَذَكَّرْ» for boys and «يَا بَطَلَةُ، تَذَكَّرِي» for girls. `generate_voice.ts` expands each text twice and records two files. Text without braces is the same for both. Arabic text never contains a slash, so the markup is unambiguous.

**Text for the voice.** Before recording, the script removes the dots between slogan words (`..`), exclamation marks and line numbers, and replaces them with SSML pauses: 400 ms between list items, 600 ms between the four parts, 250 ms between slogan words. Speaking rate 0.92 for young listeners.

**A scenario entry:**

```json
{
  "id": "crossing_road",
  "mode": "outside",
  "title": "طريقة العبور",
  "icon": "footprints",
  "location": "crosswalk_main",
  "weather": "sunny",
  "time": "afternoon",
  "order": ["speak", "after"],
  "before": null,
  "after": "crossing_road_after",
  "text": { "opening": "...", "must": ["..."], "avoid": ["..."], "slogan": "..." },
  "examples": ["كيف أقطع الشارع", "أبي أروح الحديقة"],
  "audio": { "m": "voice/crossing_road_m.mp3", "f": "voice/crossing_road_f.mp3" }
}
```

`order` lists what happens in sequence: `before`, `speak`, `after`. Each scenario in the scenario tabs states its order. The face expression during speech is set by the part being spoken: opening `happy`, must-list `explaining`, avoid-list `warning`, slogan `proud`.

## Build order

Each phase ends with something a teacher can try. Content review by a teacher can run alongside phases 2 to 5.

1. **Skeleton.** Vite app, PWA, state machine, Arabic RTL UI shell with all buttons, placeholder classroom and placeholder robot. Done when every screen and button works with dummy content.
2. **Alrashed and the classroom.** Final robot model with rig, face screen with all expressions and lip sync, final classroom. Intro loading animation and mode menu with fog. Done when choosing a mode makes him wave and smile.
3. **Voice pipeline.** `generate_voice.ts` produces all audio. Listening, gender detection, matching, intro fallback. Done when asking any outside question by voice plays the right recorded answer in the classroom.
4. **Outside world and weather.** Street, crossings, bus stop, houses, park, football field, all four weather states. Done when all outside locations can be visited from the map.
5. **Outside cutscenes.** All 17 outside sequences in Theatre.js. Done when each scenario plays before, speak and after in the right order.
6. **Inside school.** All rooms and both floors, then the 14 inside cutscenes.
7. **Short answers and creative mode.** Location jumps with expressions, Gemini worker, live voice.
8. **Exam mode and results.** Exam flow, judging, celebration, certificate, D1 results, teacher chart.
9. **Polish and testing.** Performance on an older iPad and a low-end laptop, sound mix, testing with real students of grades 1 and 6, fixing matching mistakes from what students actually said.
