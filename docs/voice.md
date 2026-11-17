# Voice (speech, listening, gender)

Code: `src/voice/` (speech.ts, listen.ts, gender.ts, ssml.ts, whisper.worker.ts), `src/content/voiceLines.ts`,
`tools/generate_voice.mjs`. Tests: `npx vitest run src/voice`.

## speak()
`speak(opts)` resolves when finished, rejects with a DOMException `AbortError` when aborted. Sources in order:
1. Recording `public/audio/voice/<key>.<b|g>.mp3` if `manifest.json` lists it (missing manifest = none). The `.json`
   viseme timeline (`[[ms, azureVisemeId 0-21], ...]`) drives `useApp.viseme` and `mouth` (openness table, smoothed).
2. `live` audio (creative mode): plays `audioUrl`; with no visemes the mouth follows the audio amplitude (AnalyserNode).
3. Browser `speechSynthesis`, best `ar-SA`/`ar-*` voice, rate 0.92, pitch 1.1, mouth = syllable-like oscillation plus
   `boundary` events.
4. Online Arabic voice (`src/voice/netTts.ts`): when there is no recording and no Arabic `speechSynthesis` voice (or it
   does not start within 1.5 s), the text is cut at sentence boundaries into chunks under 180 characters and each is
   played in order through an `HTMLAudioElement` from the free Google Translate TTS endpoint. The audio is cross-origin
   so it cannot be analysed: the mouth uses the timed estimate synced to play/ended and the real duration once known.
5. Nothing worked (offline, blocked): timed mouth animation lasting `estimateDuration(text)`.
The order of 1, 3, 4 is `VOICE_TIER_ORDER` in speech.ts (`['recorded','tts','net']`), the only place to change it.
Volume = `settings.voiceVolume`. `mouth` is always 0 afterwards. `stopSpeech()` stops everything.
iPad: call `unlockVoice()` (and `unlockAudio()` from `src/audio/sfx.ts`) inside the first user tap.

## listenOnce() / canListen()
Primary: Web Speech API (`ar-SA`, one phrase) plus a parallel microphone capture for silence detection (ends after
1500 ms of quiet once speech began, max 12 s) and for gender. Fallback (desktop only, not iPad/phones): Whisper via
`@huggingface/transformers` in a Web Worker, lazy-loaded, used when the browser has no recognition or it errors, and
offline if the model is cached. Failures map to `ListenError`; the AbortSignal is honored; mic tracks are always released.

## Gender
`detectGender(samples, sampleRate)`: YIN pitch on voiced frames, median F0 + range, LPC formants; null if too little
voiced audio. Thresholds are placeholders (`GENDER_MODEL`), tune with real recordings. `applyGenderDetection` ignores
results below 0.75 confidence or while a manual choice is active; `setManualGender` lasts 30 min and survives reload.

## Recording real voices with Azure (teacher steps)
1. Create a free Azure account, then a "Speech" resource, pricing tier F0 (free, 500,000 characters per month).
   The whole app is about 47,000 characters, so one run fits.
2. Open the resource, "Keys and Endpoint": copy KEY 1 and the Region (for example `uaenorth`).
3. In a terminal in the project folder (after `npm install` once):
   `AZURE_SPEECH_KEY=<key> AZURE_SPEECH_REGION=<region> node tools/generate_voice.mjs`
   (Windows PowerShell: `$env:AZURE_SPEECH_KEY="..."; $env:AZURE_SPEECH_REGION="..."; node tools/generate_voice.mjs`).
4. Check first with `node tools/generate_voice.mjs --dry` (no network: counts, characters, sample SSML).
5. Files appear in `public/audio/voice/` with `manifest.json`. Rerun is safe (existing files are skipped);
   `--force` re-records everything, `--only=crossing_road` records keys with that prefix.
6. Rebuild/redeploy the app. Voice: `ar-SA-HamedNeural`, rate 0.92, pitch +6%, `..` becomes a 250 ms pause.

## Free recorded voices with Edge (no account, no key)
Uses the `edge-tts` Python package (Microsoft Edge online voices, `ar-SA-HamedNeural`, rate -8%, pitch +8Hz). The
`.g` files use the same voice (only the text differs); `--voice-girl=<voice>` overrides. Edge gives no visemes, so
the mouth timeline `<key>.<b|g>.json` is computed from the loudness of the mp3 (ffmpeg decodes it). Run on your own
computer (needs internet), in the project folder, after `npm install` once:
```
pip install edge-tts           # also install ffmpeg (brew install ffmpeg / winget install ffmpeg)
python tools/generate_voice_edge.py --dry     # lists what will be recorded (no TTS call)
python tools/generate_voice_edge.py           # records everything, writes public/audio/voice/manifest.json
```
Options: `--force` (redo all), `--only=ui.name` (prefix), `--lines=file.json` (job list; default is made by
`node tools/generate_voice.mjs --dump=lines.json`). Then rebuild/redeploy. Quick first test: `--only=ui.name`
records only the loading-screen name clip (key `ui.name`, `NAME_CLIP` in voiceLines.ts).

## No sound? (runtime fallback)
Order: recording, then `speechSynthesis`, then the online voice, then a silent mouth animation. The loading screen plays `ui.name` when
recorded, else speaks it, queued until the first tap (a pulsing speaker icon shows it waits; a crossed speaker
means no Arabic voice or the browser blocked speech; the console has a `[voice]` warning). `speak()` does the
same: it waits up to 6 s for the first tap, picks the best Arabic voice after `voiceschanged`, cancels stale
utterances, resumes a paused engine. Exports: `getVoiceStatus()`, `onVoiceStatus()`, `isVoiceLocked()`,
`whenVoiceUnlocked()`. Fix at the root: install an Arabic voice in the OS, or record files as above.

### Online tier: honest limits
It needs internet and uses an unofficial, undocumented free endpoint (no key, no guarantee; Google may rate-limit,
change or block it, and the text is sent to Google). It is a safety net, not the product: recorded files from
`tools/generate_voice_edge.py` remain the reliable, offline, lip-synced path. Failures (offline, blocked) fall through
to the silent timed mouth. While it speaks `getVoiceStatus()` is `'net'` (the loading screen shows a small dot on the
speaker); `getVoiceTier()` returns the tier of the last line. A tap anywhere unlocks Web Audio, speechSynthesis and a
silent `<audio>` (`unlockVoice()` from the global pointerdown hook in `engine/idle.ts`), and queued lines play then.

## What engine and exam should call
- `scenarioLines(scenario)` for the ordered sequence `{key, text, part, pauseAfterMs}`; speak each with
  `speak({ key, text })` then wait `pauseAfterMs`. Keys: `voiceKey.*` helpers in voiceLines.ts.
- Exam: `voiceKey.examQuestion/examCorrect/examWrong/examScore/examBand/examStart/examPhaseQuestion`.
- After `listenOnce()`, gender detection is applied by listen.ts from the captured samples.
- Pass `text` already rendered with `renderGender(text, gender)` (speak does not render markup); `prefetchVoice(key)` warms a recording.
