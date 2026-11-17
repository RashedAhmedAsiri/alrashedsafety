# Matcher (src/match)

Offline Arabic question -> premade answer. Public API in `src/match/index.ts`: `normalizeArabic`, `matchQuestion` (sync, keyword), `matchQuestionAsync` (keyword + meaning + Gemini tie-break), `warmUpMatcher`. Extras: `rankQuestion` (own-list ranking, diagnostics), `whenMatcherReady`, `setEmbedder` (tests/custom backend).

## Files
- `normalize.ts` characters (diacritics, tatweel, hamza, ة->ه, ى->ي, ؤ ئ, digits, punctuation, repeats), dialect mapping, light stemming, stop words, typo-tolerant token match.
- `synonyms.ts` dialect -> standard map (single words, up to 4-word phrases, clitic/pronoun tolerant).
- `corpus.ts` items from content: scenarios (+intro) and short answers; texts = examples/asks + title/chip; keywords. Content hash.
- `keyword.ts` keyword score. `embedder.ts`, `embed.worker.ts` meaning score. `decide.ts` bands and mode rules.
- `tools/build_index.mjs` writes `public/match/embeddings.json` (needs network once; `--check` works offline).

## Scoring
1. Query -> normalised, dialect-mapped, stop words dropped, stemmed tokens.
2. Per item: best example by BM25-style idf weights (72% share of the question covered, 28% of the example covered), 62% of the score; weighted keyword hits `1-exp(-sum/2.6)`, 38%. Multiplied by a coverage factor (share of the question's idf mass the item's vocabulary explains; unknown words lower it), then `^1.35`. Constants in `KW` (keyword.ts). A near copy of an example scores 0.95+, off-topic questions stay under 0.4.
3. Meaning (optional): multilingual-e5-small in a Web Worker (`query: ` prefix), example vectors from `public/match/embeddings.json` if its hash matches, else computed once in the worker and cached in IndexedDB by content hash. cosine is mapped by `(cos-0.80)/(0.94-0.80)`; recalibrate after the first real run (build_index prints cosine stats). Skipped when no Worker/WASM or `deviceMemory <= 2`.
4. final = 0.4 keyword + 0.6 meaning (keyword alone until ready or if embedding fails/times out at 2.5 s).
5. Decide: bands match >= 0.55, close 0.40-0.55, low < 0.40 -> `{kind:'intro', id:'intro', band:'low'}`. Own lists: outside = outside + intro, inside = inside + intro, short = short + intro; exam/creative return low. Another list's item wins only if >= 0.65 and 0.15 above the best own item; short-vs-scenario ties within 0.05 go to the short answer in short mode, the scenario elsewhere. Gemini `tieBreak` only when online, band close and top two within 0.05.
Note: `nosebleed` and `friend_fainted` exist as both scenario and short answer; result `kind` tells them apart.

## Adding synonyms / examples from real student questions
1. Run the question through `matchQuestion` (or `rankQuestion`) and look at `normalizeArabic(q)`.
2. Dialect word not mapped: add an entry to `SYNONYMS` (append at the end; first entry for a key wins). Keys are normalised automatically; list bare words (clitics و ف ب ل ال are handled).
3. Wrong or weak item: add the question to that item's `examples`/`asks` and 1-2 keywords in `src/content/data/*`. Add it to `src/match/heldout.ts` first if you want it as a regression test.
4. `npx vitest run src/match`, then `node tools/build_index.mjs` (when online) to refresh embeddings.

## Test results (keyword only; no model in this sandbox)
- Own examples/asks/titles: 752/754 top-1 = 99.7% (misses: «كيف أركب الحافلة», «ليش أربط الحزام» go to inside_bus).
- Held-out (src/match/heldout.ts): scenarios 84/93 = 90.3%, short answers 43/48 = 89.6% (top-1 in the mode's own lists).
- 24 dialect off-topic questions: all band low in all three modes.
- Cross-mode, tie, band rules, mocked embedder (0.4/0.6 combination, failure degrades), Gemini tie-break mocked.
The real meaning model path was verified only by review and the mocked embedder.

## Content requests
Held-out misses suggest more examples: getting_out_of_bus («أنزل وأنا شايل الشنطة»), reaching_school («وصلت عند باب المدرسة»), parked_cars («سيارة بتطلع من الموقف»), small_cut («طلع دم من يدي»), electricity_lab («مقبس بيد مبلولة»), short burn («حرق»), choking («اللقمة وقفت بحلقي»), puddle («مويه واقفة»).
