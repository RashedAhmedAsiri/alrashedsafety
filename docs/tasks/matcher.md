# Brief: matcher

**You own:** `src/match/**`, `tools/build_index.mjs`, `docs/matcher.md`.

**Source:** "Matching a question to a premade answer" and the mode table in
`docs/plan/Voice_and_AI.md`, "How short answers work" in `docs/plan/Short_answers.md`, "Matching" in
`docs/ARCHITECTURE.md`. Content lives in `src/content/index.ts` (other builders were filling it; it
should be complete by the time you start, check).

Keep the exports of `src/match/index.ts` exactly.

1. `normalizeArabic`: per the plan (diacritics, tatweel, أ إ آ ٱ → ا, ة → ه, ى → ي, ؤ/ئ handling,
   punctuation, Arabic-Indic digits, repeated letters like «لييييش», extra spaces) plus light stemming for
   matching tokens (prefixes و ف ب ل ال وال بال لل, common suffixes) applied consistently to queries,
   examples and keywords.
2. `src/match/synonyms.ts`: the plan's starting list plus a much larger Saudi-dialect → MSA map for
   this domain (questions words, verbs like أبي/أبغى/ودي, وش/ايش/شنو, ليش, وين, شلون, الحين; places,
   vehicles, body parts, injuries, weather, school words, fire/electricity/water words...), including
   multi-word phrases.
3. Index: built lazily from content at first use: for every scenario (all modes), the intro and every
   short answer, its examples / asks, title or chip, and weighted keywords. Keyword score = BM25 over
   example documents plus weighted keyword hits, calibrated to 0..1 (a near copy of an example → ~0.9+,
   a clearly unrelated question → < 0.3).
4. Meaning score: `@huggingface/transformers` `feature-extraction` with `Xenova/multilingual-e5-small`
   (quantized; e5 needs `query: ` prefixes) in a Web Worker, lazy (`warmUpMatcher()` starts it in the
   background; skip on very low-memory devices). Embeddings of examples computed in the worker once and
   cached in IndexedDB keyed by a content hash; if `public/match/embeddings.json` exists (written by
   `tools/build_index.mjs` when someone has network), use it instead. This sandbox cannot download the
   model (Hugging Face is blocked here), so the code must degrade to keyword-only cleanly, and you
   verify the meaning path by code review and a mocked-embedding unit test.
5. Decision rules exactly as in the plan and ARCHITECTURE: final = 0.4 keyword + 0.6 meaning (keyword
   alone until the model is ready), bands match/close/low, cross-mode rule for outside/inside,
   short-vs-scenario tie rule, Gemini tie-break via `tieBreak()` from `src/backend/api.ts` only when
   online and the top two are within 0.05 in the close band, intro for low. Which lists each mode
   searches follows the plan (exam and creative do not use this matcher for answers; return low).
6. Tests (`src/match/*.test.ts`): every example/ask of every item matches its own item (report the
   top-1 rate; aim ≥ 97%); a held-out set you write of ≥ 3 new paraphrases per scenario and per 15 short
   answers (aim ≥ 85% top-1 within the right mode); ≥ 20 off-topic questions in dialect («كم عمرك»،
   «وش أحسن لعبة»، «مين فاز بالمباراة») return band low; cross-mode and tie rules. Tune the normalizer,
   synonyms, weights and calibration until these pass. If content examples are poor, list concrete
   additions in `requests` (the content owners will add them).

Write `docs/matcher.md`: how scoring works, how to add synonyms/examples from real student questions,
test results.
