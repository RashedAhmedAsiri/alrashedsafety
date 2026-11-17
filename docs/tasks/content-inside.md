# Brief: content-inside

**You own:** `src/content/data/inside.ts`, `src/content/data/systemLines.ts`, `tools/content/inside*.mjs`,
`docs/content-inside.md`.

**Source:** `docs/plan/Inside_scenarios.md` (14 scenarios) and the system lines table in
`docs/plan/Voice_and_AI.md` ("Pre-recorded system lines").

1. Write `tools/content/inside.mjs` (plain Node, no deps) that parses the markdown and emits every
   Arabic field so no Arabic is retyped: `id`, `n`, `title`, `location`, `weather`, `time`, `order`,
   `text.opening`, `text.must[]`, `text.avoid[]` (the Remember list), `text.slogan`, `speakingSetup`
   (the English "Speaking setup" paragraph, when present) and the plan's example questions. Strip only
   markdown; keep every Arabic character, diacritic, `{boy/girl}` brace and `..` exactly. Missing
   weather → `null` only if the plan says current; inside scenarios normally state it.
2. Generate `src/content/data/inside.ts` (`mode: 'inside'`), then add by hand per scenario:
   `icon` (a lucide-react icon that really exists; check `node_modules/lucide-react/dist/lucide-react.d.ts`;
   e.g. Flame, FireExtinguisher, Bandage, Droplet, HeartPulse, Footprints, ArrowUpDown, Plug, FlaskConical,
   Dumbbell, Sun, Utensils, LightbulbOff, Scissors), `color` (bright, distinct), `examples` (the plan's
   plus 6-8 more in Saudi kids' dialect and simple MSA), `keywords` (8-15 weighted, plain Arabic).
3. `SYSTEM_LINES`: every row of the system lines table, `id` exactly as in the table
   (`greet_first`, `greet_call`, `not_heard`, `off_topic`, `mic_denied`, `offline_creative`, `thinking`,
   `mode_outside`, `mode_inside`, `mode_short`, `mode_creative`, `need_internet_listen`), text copied
   programmatically. Also look through every plan file for other lines Alrashed must say that are not
   scenarios, short answers or exam lines (e.g. a mode line for exam if one exists); include any you
   find with a clear id and note them. Do not invent new Arabic for system lines.
4. Write `tools/content/check_inside.mjs` verifying: 14 scenarios; ids unique and as in the plan; every
   Arabic field verbatim in the plan; braces well formed; valid locations/weather/time/order; icons
   exist. Run it until it passes, then typecheck.

Write `docs/content-inside.md`: regeneration steps, the id list with location/weather/time/order, the
system line ids.
