# Brief: voice

**You own:** `src/voice/**`, `src/content/voiceLines.ts`, `tools/generate_voice.mjs`, `docs/voice.md`,
optional `src/dev/Voice.tsx` (preview page).

**Source:** `docs/plan/Voice_and_AI.md`, the voice sections of `docs/plan/Overview_and_tech.md`,
"Voice keys and files" in `docs/ARCHITECTURE.md`.

Keep the exports of `src/voice/speech.ts`, `listen.ts`, `gender.ts` exactly.

1. **`src/content/voiceLines.ts`**: `allVoiceLines(): { key: string; text: string; gendered: boolean }[]`
   built from `src/content/index.ts` (intro body, every scenario part per the key table, the two leads,
   short answers, system lines, exam questions/feedback/phase/start/score/bands). Plus helpers the
   engine and exam will call: `scenarioLines(scenario)` returning the ordered spoken sequence with
   `{ key, text, part, pauseAfterMs }` (opening; lead.must; must items; lead.avoid; avoid items; slogan,
   pauses 400 ms between items and 600 ms between parts), and `voiceKey` helpers for short/sys/exam.
   It must work while content arrays are still empty or partial (other builders are filling them).
2. **`speech.ts`**: `speak()` resolves when done and rejects with a DOMException `AbortError` on abort.
   Order of sources: (a) recorded file `public/audio/voice/<key>.<b|g>.mp3` if the manifest lists it
   (load `manifest.json` once; missing manifest = none recorded), played with Howler or Web Audio,
   driving `useApp` `viseme` and `mouth` from the `.json` viseme timeline (map Azure viseme ids 0-21 to
   a mouth openness 0..1 with smoothing); (b) `live` audio (creative mode): play `audioUrl`; if
   `visemes` is empty, drive the mouth from the audio amplitude with an AnalyserNode; (c) the browser's
   `speechSynthesis` with the best `ar-SA`/`ar-*` voice, rate ~0.92, pitch ~1.1, mouth driven by a
   syllable-like oscillation while speaking (and `boundary` events if available); (d) no Arabic voice:
   a timed mouth animation lasting `estimateDuration(text)`. Volume from `settings.voiceVolume`. Always
   leave `mouth` at 0 when done/aborted. `stopSpeech()` stops everything immediately. Make
   `estimateDuration` realistic for diacritized Arabic at rate 0.92 (count letters without diacritics).
   Note iPad Safari quirks: audio must be unlocked by a user gesture (the UI calls `unlockAudio()` from
   `src/audio/sfx.ts`; also expose `unlockVoice()` from speech.ts that the UI can call).
3. **`listen.ts`**: `canListen()` and `listenOnce()` per the plan: primary Web Speech API (`ar-SA`, one
   phrase, no interim results), with a parallel `getUserMedia` capture that collects the utterance's
   samples (for gender) and runs silence detection (end after `silenceMs` 1500 of quiet once speech
   started, `maxMs` 12000 max). Fallback: Whisper via `@huggingface/transformers`
   (`automatic-speech-recognition`, a Whisper base/small ONNX model, language arabic, task transcribe)
   in a Web Worker, lazy-loaded, only on desktop-class devices (not iPad/phones); used when the browser
   has no recognition (Firefox) or it errors, and offline if the model is already cached. Map failures
   to `ListenError`. Honor the AbortSignal. Release the mic tracks every time.
4. **`gender.ts`**: `detectGender(samples, sampleRate)`: voiced-frame pitch tracking (YIN or
   autocorrelation), median F0 and range, plus rough formants (LPC) if you can; placeholder thresholds
   for children (girls tend higher, the overlap is large) mapped to a confidence 0..1; return null when
   too little voiced audio. `applyGenderDetection`: ignore while a manual choice is active
   (`genderManualUntil > now`); set `gender` + `genderSource: 'detected'` only when confidence ≥ 0.75.
   `setManualGender`: set gender, source manual, until now + 30 min, persisted in localStorage so a
   reload keeps it (restore on module load).
5. **`tools/generate_voice.mjs`**: loads content through Vite's `ssrLoadModule` (create a Vite server in
   middleware mode with this repo's config) to get `allVoiceLines()`, expands each text with
   `renderGender` into b/g versions (only b when not gendered), turns it into SSML per the plan (voice
   `ar-SA-HamedNeural`, rate 0.92, pitch +6%, `..` in slogans → 250 ms breaks, strip `!` and list
   numbers), synthesizes with `microsoft-cognitiveservices-speech-sdk` (installed) using
   `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION`, writes `<key>.<v>.mp3` (24 kHz 48 kbps mono) and
   `<key>.<v>.json` visemes (`[[ms, id], ...]` from `visemeReceived`), skips files that already exist
   unless `--force`, and writes `manifest.json`. `--dry` prints counts, total characters (to check the
   free tier) and a few SSML samples without calling Azure; it must run now (`node tools/generate_voice.mjs --dry`).
6. Tests (`src/voice/*.test.ts`, vitest): gender detection on synthetic voiced signals (e.g. 210 Hz vs
   320 Hz harmonics + noise), key uniqueness from `allVoiceLines()`, SSML conversion, estimateDuration.

Write `docs/voice.md`: how speech/listen/gender behave, the fallbacks, how to record voices with Azure
(step by step for a non-programmer teacher with a free F0 key), and what the engine/exam should call.
