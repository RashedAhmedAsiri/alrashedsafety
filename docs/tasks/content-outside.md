# Brief: content-outside

**You own:** `src/content/data/outside.ts`, `tools/content/outside.mjs` (and any helper under
`tools/content/` named `outside*`), `docs/content-outside.md`.

**Source:** `docs/plan/Outside_scenarios.md` (intro + 17 scenarios) and `docs/plan/Text_corrections.md`.

Fill `INTRO` and `OUTSIDE_SCENARIOS` (17 entries, plan order) following `src/content/types.ts`.

1. Write `tools/content/outside.mjs` (plain Node, no deps) that parses the markdown and emits the
   Arabic fields so no Arabic is retyped: `id` (the backticked id), `n`, `title` (the diacritized
   heading text), `location`, `weather` (`current` → null), `time` (missing → null), `order`,
   `text.opening`, `text.must[]`, `text.avoid[]` (the Remember list), `text.slogan`, intro `body`,
   `speakingSetup` (the English "Speaking setup" paragraph when present), and the plan's example
   questions. Strip only the markdown (bold labels, list numbers/bullets, «» around the intro body);
   keep every Arabic character, diacritic, `{boy/girl}` brace and the `..` in slogans exactly.
2. Generate `src/content/data/outside.ts` from it (a generated block is fine; keep it readable and
   deterministic), then add by hand per scenario:
   - `icon`: a lucide-react icon name that really exists (check `node_modules/lucide-react/dist/lucide-react.d.ts`)
     and fits (Bus, Footprints, School, Users, Construction, Home, CloudRain, Wind, Clock, Armchair,
     Car, TrafficCone, Shield, Waves, Goal, Trees...).
   - `color`: a bright, distinct hex per scenario (playful, no two neighbours alike, readable with white icons).
   - `examples`: the plan's examples plus 6-8 more that real Saudi kids (grade 1-6) would say, in Saudi
     dialect and simple MSA, varied in wording (e.g. «كيف أقطع الشارع», «وش أسوي إذا نزلت من الباص»).
   - `keywords`: 8-15 weighted words or short phrases (weight 1-3, the most specific ones 3) in plain
     Arabic without diacritics, mixing dialect and MSA.
3. Write `tools/content/check_outside.mjs` that verifies: 17 scenarios + intro; ids unique and as in
   the plan; every Arabic text field appears verbatim in the plan file (after only the markdown strip);
   every `{x/y}` has exactly one slash; locations are valid `LocationId`s; weather/time valid; order valid;
   icons exist in lucide-react. Run it until it passes, then typecheck.

Write `docs/content-outside.md`: how to regenerate, the id list with location/weather/time/order.
