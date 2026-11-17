# Inside content (content-inside)

`src/content/data/inside.ts` holds the 14 inside scenarios from `docs/plan/Inside_scenarios.md`;
`src/content/data/systemLines.ts` holds the system lines from the "Pre-recorded system lines" table of
`docs/plan/Voice_and_AI.md`. Both are re-exported through `src/content/index.ts`.

## Exports

| File | Export | What |
| --- | --- | --- |
| `inside.ts` | `INSIDE_SCENARIOS: Scenario[]` | the 14 scenarios in plan order (`n` 1..14), `mode: 'inside'`, each with the 4-part `text` |
| `inside.ts` | `type InsideScenarioId` | union of the 14 ids |
| `inside.ts` | `INSIDE_LOCATIONS` | every location each scenario visits, in plan order (first = `location`; cutscenes move on with `ctx.go`) |
| `inside.ts` | `INSIDE_PLAN_NOTES` | the plan's raw Location / Weather / Time notes and other English notes (scene safety, lighting) per id |
| `systemLines.ts` | `SYSTEM_LINES` | the 12 system lines `{ id, text }`, in table order |
| `systemLines.ts` | `type SystemLineId` | union of the 12 ids |
| `systemLines.ts` | `SYSTEM_LINE_WHEN` | when each line plays (English, builders only) |

Field notes:

- **Arabic text** (`title`, `text.opening`, `text.must[]`, `text.avoid[]` = the plan's Remember list,
  `text.slogan`, system line `text`) is cut out of the plan programmatically with only the markdown
  removed: full diacritics, `{boy/girl}` markup, the `..` between slogan words and final punctuation are
  kept. Render with `renderGender()` before speaking. `greet_first` and `mic_denied` have no braces
  (plural on purpose, gender unknown).
- **`weather` / `time`**: the plan states weather for only three inside scenarios and time for five
  (plus `friend_fainted`'s «morning assembly» location note). Where it says nothing, the generator uses
  `sunny` (the plan's default weather) and `morning` (school day). No inside scenario says "current", so
  none is `null`. `power_outage`'s weather note is "none; lights go out...": the data says `sunny`; the
  darkness is the `lights: 'off'` / `exitGlow` flags its cutscene sets.
- **`speakingSetup`** (English, never shown) exists only where the plan has a "Speaking setup" paragraph:
  `canteen_safety` and `sharp_tools`.
- **`icon`**: a canonical lucide-react name present in lucide's `icons` map (what `ContentIcon` looks up).
  None repeats an outside icon except `Footprints` (`corridor_running`, also `crossing_road`); the two
  never share a panel.
- **`color`**: white icons read on every one (contrast with white ≥ 2.6). In a 3- or 4-column panel with
  the intro (`#14B8A6`) first, neighbours differ by CIE ΔE ≥ 30 and any two by ≥ 12.
- **`examples`** = the plan's example questions first (verbatim), then 6-8 added phrasings in Saudi
  dialect and simple MSA, no diacritics. No example is shared with another scenario except «الأرض مبلولة», which
  the plan itself lists for both `corridor_running` and the outside `heavy_rain`.
- **`keywords`** = 10-15 `{ word, weight }` per scenario, plain Arabic without diacritics, weight 3 for
  the most specific words.

## Scenarios

| n | id | title | locations | weather | time | order | icon | color | must / avoid | setup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `fire_evacuation` | الْإِخْلَاءُ عِنْدَ الْحَرِيقِ | `classroom` → `corridor_ground` → `stairs` → `yard` | `sunny` | `morning` | before, speak, after | Flame | `#F76707` | 5 / 3 |  |
| 2 | `fire_extinguisher` | طَفَّايَةُ الْحَرِيقِ | `corridor_ground` | `sunny` | `morning` | before, speak, after | FireExtinguisher | `#E03131` | 4 / 3 |  |
| 3 | `small_cut` | الْجُرْحُ الْبَسِيطُ | `yard` → `clinic` | `sunny` | `morning` | before, speak, after | Bandage | `#A0522D` | 5 / 3 |  |
| 4 | `nosebleed` | نَزِيفُ الْأَنْفِ | `classroom` → `clinic` | `sunny` | `morning` | before, speak, after | Droplet | `#E64980` | 4 / 3 |  |
| 5 | `friend_fainted` | إِغْمَاءُ زَمِيلٍ | `yard` | `sunny` | `morning` | before, speak, after | HeartPulse | `#7950F2` | 4 / 3 |  |
| 6 | `corridor_running` | الْمَمَرَّاتُ وَالْأَرْضُ الْمُبَلَّلَةُ | `corridor_ground` | `sunny` | `morning` | before, speak, after | Footprints | `#DB8E00` | 4 / 3 |  |
| 7 | `stairs_safety` | السَّلَالِمُ | `stairs` | `sunny` | `morning` | before, speak, after | DoorStairwell | `#2F9E44` | 4 / 3 |  |
| 8 | `electricity_lab` | الْكَهْرَبَاءُ فِي مَعْمَلِ الْحَاسِبِ | `computer_lab` | `sunny` | `morning` | before, speak, after | PlugZap | `#2B3F9E` | 4 / 3 |  |
| 9 | `biology_lab` | مَعْمَلُ الْأَحْيَاءِ | `biology_lab` | `sunny` | `morning` | before, speak, after | FlaskConical | `#1098AD` | 4 / 3 |  |
| 10 | `sports_hall` | الصَّالَةُ الرِّيَاضِيَّةُ | `sports_hall` | `sunny` | `afternoon` | before, speak, after | Dumbbell | `#1C7ED6` | 4 / 3 |  |
| 11 | `heat_water` | الْحَرُّ وَشُرْبُ الْمَاءِ | `yard` | `sunny` | `afternoon` | before, speak | Sun | `#F2635A` | 4 / 3 |  |
| 12 | `canteen_safety` | السَّلَامَةُ فِي الْمَقْصِفِ | `canteen` | `sunny` | `morning` | speak, after | Utensils | `#62A10F` | 4 / 3 | yes |
| 13 | `power_outage` | انْقِطَاعُ الْكَهْرَبَاءِ | `classroom` → `corridor_ground` | `sunny` | `afternoon` | before, speak, after | LightbulbOff | `#4F5D75` | 4 / 3 |  |
| 14 | `sharp_tools` | الْأَدَوَاتُ الْحَادَّةُ | `art_room` | `sunny` | `morning` | speak, after | Scissors | `#BE4BDB` | 4 / 3 | yes |

Plan notes the data fields cannot hold (also in `INSIDE_PLAN_NOTES`):

- `fire_extinguisher`: at the extinguisher cabinet; only Alrashed uses the extinguisher, the message is "move away and tell an adult".
- `small_cut`: `yard` for the before animation, then `clinic`.
- `friend_fainted`: morning assembly, "sunny, midday heat shimmer".
- `sports_hall`: light through high windows. `heat_water`: afternoon break, strong heat shimmer. `canteen_safety`: morning break.
- `canteen_safety`: coughing only; no choking graphics or first-aid manoeuvre.
- `power_outage`: the room goes dark but never black (ambient about 15%), green emergency strips, Alrashed's face is the key light.

## System lines

Voice key `sys.<id>`; recorded for both genders (`b`, `g`) where the text has braces.

| id | voice key | files | when |
| --- | --- | --- | --- |
| `greet_first` | `sys.greet_first` | b only | First call ever on this device: gender is unknown, so it is plural; gives speech to analyze before any gendered answer. |
| `greet_call` | `sys.greet_call` | b, g | Start of every later call (call button tapped), once a gender is known. |
| `not_heard` | `sys.not_heard` | b, g | Nothing usable was heard; say it and listen again once. |
| `off_topic` | `sys.off_topic` | b, g | Match score below 0.40, a question not about safety or school, or any creative-mode failure; then the intro scenario plays. |
| `mic_denied` | `sys.mic_denied` | b only | Microphone permission refused or unavailable (plural, gender unknown). |
| `offline_creative` | `sys.offline_creative` | b, g | Creative mode chosen or asked while offline. |
| `thinking` | `sys.thinking` | b, g | Creative mode, while waiting for Gemini. |
| `mode_outside` | `sys.mode_outside` | b only | Outside mode card tapped. |
| `mode_inside` | `sys.mode_inside` | b only | Inside mode card tapped. |
| `mode_short` | `sys.mode_short` | b only | Short answers mode card tapped. |
| `mode_creative` | `sys.mode_creative` | b only | Creative mode card tapped (online). |
| `need_internet_listen` | `sys.need_internet_listen` | b only | Call or mic used on a device that cannot listen offline (iPad without Whisper); points to the scenarios button. |

The other plan files were searched for further lines Alrashed says that are not scenarios, short answers
or exam lines. None were found: Exam.md's phase question (Flow step 2) and start line (Flow step 3) are
exam lines (`EXAM_LINES.phaseQuestion` / `.start`, keys `exam.phase_question` / `exam.start`, owned by
content-short), and the plan has no mode line for the exam card (the phase question plays instead). The
offline-creative and microphone lines mentioned in Overview_and_tech.md are `offline_creative` and
`mic_denied`. No Arabic was invented.

## Regenerate and check

```
node tools/content/inside.mjs           # regenerate the PLAN block of inside.ts and all of systemLines.ts
node tools/content/inside.mjs --dry     # parse and print a summary, write nothing
node tools/content/inside.mjs --json    # print the parsed plan data as JSON
node tools/content/check_inside.mjs     # verify everything (exit 1 on any problem)
CHECK_INSIDE_TS=<copy.ts> CHECK_SYSTEM_TS=<copy.ts> node tools/content/check_inside.mjs   # check a copy
```

`inside.ts` has two parts:

1. **Generated block** between `// <generated:plan>` and `// </generated:plan>`: the `InsideScenarioId`
   union and `PLAN` (id, n, title, location, locations, weather, time, order, text, speaking setup, the
   plan's example questions, raw plan notes). Never edit it by hand: change the plan and rerun the
   generator, which keeps everything outside the markers. `systemLines.ts` is fully generated.
2. **`EXTRA`** (hand-written): icon, color, added examples and keywords per id. TypeScript forces one
   entry per id; the bottom of the file merges both into `Scenario` objects.

`check_inside.mjs` reads the plan on its own (independently of the generator) and checks: 14 scenarios,
ids unique and equal to the plan headings in order, `n` and title exact; opening, each must item, each
Remember item and the slogan equal the plan line with only markdown removed, appear verbatim in the plan
section, and no plan line is left out; braces well formed (one slash, both sides non-empty, no nesting, no
stray slash); no Latin letters or leftover markdown; locations are `LocationId`s and the plan's (all of
them, in order); weather/time valid and equal to the plan where stated (`null` only for "current"); order
equals the plan's; speaking setup equals the plan's; icons exported by lucide-react and canonical in its
`icons` map; colors (format, unique, white-icon contrast, panel distinctness); examples (plan's first, 6-8
added, Arabic only, no duplicates within or across inside/outside scenarios); keywords (8-15, weight 1-3,
at least one 3, plain letters, no duplicates); system lines (exactly the plan table's 12 ids in order,
text verbatim, braces, plural lines brace-free, a `SYSTEM_LINE_WHEN` note each); no id clash with outside;
and that both generated parts are up to date. It warns (without failing) when an example's own keywords
do not outscore every other scenario's in a whole-word keyword count; the only warning left is the shared
plan example above.

## Known gaps

- Added examples and keywords were written by hand, not tested with real students; extend them from
  what students actually say (plan build step 9).
- The weather/time defaults (`sunny`, `morning`) are a reading of the plan, not stated per scenario.
