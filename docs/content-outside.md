# Outside content (content-outside)

`src/content/data/outside.ts` holds the intro «مَنْ هُوَ الرَّاشِدُ؟» and the 17 outside scenarios from
`docs/plan/Outside_scenarios.md` (with the fixes from `docs/plan/Text_corrections.md` already in the plan text).

## Exports

| Export | What |
| --- | --- |
| `INTRO: Scenario` | `id 'intro'`, `mode 'intro'`, `n 0`, `body` (one gender-neutral paragraph), no `text` |
| `OUTSIDE_SCENARIOS: Scenario[]` | the 17 scenarios in plan order (`n` 1..17), each with the 4-part `text` |
| `OUTSIDE_SCENARIO_IDS` | their ids in plan order |
| `type OutsideScenarioId` | union of the 17 ids |

All are re-exported through `src/content/index.ts` (`ALL_SCENARIOS`, `SCENARIO_BY_ID`).

Field notes for consumers:

- **Arabic text** (`title`, `text.opening`, `text.must[]`, `text.avoid[]`, `text.slogan`, `body`) is the
  plan's text byte for byte with only the markdown removed: full diacritics, `{boy/girl}` markup, the `..`
  between slogan words, the closing `:` of each opening and the `!` of each slogan are all kept. Render
  with `renderGender()` before speaking. `must` items are spoken after `MUST_LEAD`, `avoid` items after
  `AVOID_LEAD` (each `avoid` item starts with «لَا»).
- **`weather`** is the weather the scenario *starts* in (`travelTo`). Two scenarios change weather inside
  their `before` cutscene: `heavy_rain` starts in `rain` and blends to `wet`; `dust_storm` starts `sunny`
  and blends to `dust`. The intro has `weather: null` and `time: null` (keep current conditions).
- **`location`** is the first location the plan lists; where the plan moves on (see "Plan notes"),
  the cutscene moves the robot and camera.
- **`speakingSetup`** (English, never shown) exists only where the plan has a "Speaking setup"
  paragraph: `getting_out_of_bus`, `crossing_road`, `reaching_school`, `dismissal`. For the others the
  shot table describes the speaking setup.
- **`icon`** is a canonical lucide-react name present in lucide's `icons` map (the UI's `ContentIcon`
  looks names up there; aliases such as `Waves` would not resolve, so `WavesHorizontal` is used).
- **`color`** is the panel button color. White icons read on all of them (contrast with white ≥ 2.6;
  the intro keeps the brand teal `#14B8A6`), and no two buttons that sit next to each other in a 3- or
  4-column grid (intro first, then plan order) look alike (CIE ΔE ≥ 30; any two ≥ 12).
- **`examples`** = the plan's example questions first (verbatim), then 6-8 added phrasings in Saudi
  dialect and simple MSA, no diacritics. No example appears in two outside scenarios.
- **`keywords`** = 12-15 `{ word, weight }` per scenario, plain Arabic without diacritics, weight 3 for
  the most specific words. Single words are stored without «ال» (the matcher strips it on both sides, and
  the bare form also works for substring matching), except where the bare form hides inside common words
  («الراشد», «الزر», «القول», «البارك», «الكرة», «الصبح»).

## Scenarios

| n | id | title | location | weather | time | order | icon | color | must / avoid | setup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `intro` | مَنْ هُوَ الرَّاشِدُ؟ | `classroom` | null (current) | null | before, speak, after | Bot | `#14B8A6` | body |  |
| 1 | `getting_out_of_bus` | النُّزُولُ مِنَ الْحَافِلَةِ | `bus_stop` | `sunny` | `morning` | speak, after | Bus | `#E08700` | 4 / 3 | yes |
| 2 | `crossing_road` | طَرِيقَةُ الْعُبُورِ | `crosswalk_main` | `sunny` | `afternoon` | speak, after | Footprints | `#2D8CFF` | 5 / 3 | yes |
| 3 | `reaching_school` | الْوُصُولُ لِلْمَدْرَسَةِ | `sidewalk_far` | `sunny` | `morning` | speak, after | School | `#2EA94C` | 4 / 3 | yes |
| 4 | `crossing_with_friends` | الْعُبُورُ مَعَ أَصْدِقَائِي | `crosswalk_main` | `sunny` | `afternoon` | before, speak, after | Users | `#E64FA6` | 5 / 4 |  |
| 5 | `open_sewer` | مَخَاطِرُ الطَّرِيقِ: الصَّرْفُ الصِّحِّيُّ | `roadworks` | `wet` | `morning` | before, speak, after | TrafficCone | `#F2552C` | 5 / 3 |  |
| 6 | `dismissal` | الْعَوْدَةُ لِلْمَنْزِلِ: الانْصِرَافُ | `gate` | `sunny` | `afternoon` | speak, after | House | `#9A4DDB` | 5 / 3 | yes |
| 7 | `heavy_rain` | بَعْدَ الْمَطَرِ | `gate` | `rain` | `afternoon` | before, speak, after | CloudRain | `#119ED8` | 6 / 5 |  |
| 8 | `dust_storm` | الْغُبَارُ | `yard` | `sunny` | `morning` | before, speak, after | Wind | `#C68A35` | 5 / 3 |  |
| 9 | `bus_stop_waiting` | الانْتِظَارُ فِي مَوْقِفِ الْحَافِلَةِ | `bus_stop` | `sunny` | `morning` | before, speak, after | Clock | `#C2185B` | 5 / 3 |  |
| 10 | `inside_bus` | دَاخِلَ الْحَافِلَةِ | `bus_stop` | `sunny` | `morning` | before, speak, after | Armchair | `#F05D4E` | 5 / 3 |  |
| 11 | `parked_cars` | اللَّعِبُ قُرْبَ السَّيَّارَاتِ الْمُتَوَقِّفَةِ | `parking` | `sunny` | `afternoon` | before, speak, after | SquareParking | `#3F55D4` | 4 / 3 |  |
| 12 | `traffic_light` | إِشَارَةُ الْمُشَاةِ | `signal_crossing` | `sunny` | `afternoon` | before, speak, after | PersonStanding | `#58A527` | 4 / 3 |  |
| 13 | `family_car` | فِي سَيَّارَةِ الْأُسْرَةِ | `pickup_lane` | `sunny` | `afternoon` | before, speak, after | Car | `#2F4AA8` | 4 / 3 |  |
| 14 | `stranger_at_gate` | الْغَرِيبُ عِنْدَ الْبَوَّابَةِ | `gate` | `sunny` | `afternoon` | before, speak, after | UserX | `#C03BB4` | 4 / 3 |  |
| 15 | `flood_safety` | السُّيُولُ وَالْأَوْدِيَةُ | `flood_dip` | `wet` | `afternoon` | before, speak, after | WavesHorizontal | `#0AA3B5` | 4 / 3 |  |
| 16 | `football_field` | مَلْعَبُ كُرَةِ الْقَدَمِ | `football_field` | `sunny` | `morning` | before, speak, after | Volleyball | `#10A06C` | 5 / 3 |  |
| 17 | `park_safety` | السَّلَامَةُ فِي الْحَدِيقَةِ | `park` | `sunny` | `afternoon` | before, speak, after | Trees | `#84AA14` | 4 / 3 |  |

### Plan notes the data fields cannot hold

- `crossing_road`: plan says location «`crosswalk_main` (school side)».
- `reaching_school`: plan says location «`sidewalk_far` facing `crosswalk_main`».
- `crossing_with_friends`: plan says location «`crosswalk_main` (school side)»; time «afternoon (after the last bell)».
- `dismissal`: plan says location «`gate` then `pickup_lane`».
- `heavy_rain`: plan says location «`gate` then `crosswalk_main` and `houses`»; weather «rain, changing to wet during the before animation».
- `dust_storm`: plan says weather «sunny, changing to dust in the before animation»; time «morning break».
- `inside_bus`: plan says location «`bus_stop` (inside the bus, then driving along `street_front`)».
- `flood_safety`: plan says weather «wet, with flowing water in the dip».
- `football_field`: plan says time «morning (physical education class)».

## Regenerate and check

```
node tools/content/outside.mjs              # print what the parser reads from the plan (JSON)
node tools/content/outside.mjs --write      # rewrite the GENERATED block in src/content/data/outside.ts
node tools/content/check_outside.mjs        # verify everything (exit 1 on any problem)
node tools/content/check_outside.mjs --data=<copy.ts>   # check another copy (used to test the checker)
```

`outside.ts` has two parts:

1. **GENERATED block** (between the `BEGIN GENERATED` / `END GENERATED` markers): the `OutsideScenarioId`
   union and `PLAN`, i.e. id, n, title, location, weather, time, order, text or body, speaking setup and
   the plan's example questions. Never edit it by hand; change the plan and run `--write`. The parser
   strips only the bold labels, list numbers and bullets, and the «» around the intro body.
2. **HAND block** (`HAND`): icon, color, extra examples and keywords per id. TypeScript forces one entry
   per id. `build()` merges the two into `Scenario` objects.

`check_outside.mjs` checks: intro + 17 scenarios in plan order with the plan's ids and numbers; each
title, opening, must item, Remember item, slogan and the intro body equals the plan's line with only
the markdown removed (and is a substring of the plan file); every `{x/y}` group has exactly one slash and
no slash sits outside braces; every Arabic line has diacritics and no Latin letters; location is a
`LocationId` and the plan's location; weather/time are valid and the plan's; order is a valid
`before → speak → after` sequence equal to the plan's; speaking setup matches the plan; icons exist in
lucide-react (canonical name and icon module); colors (format, white-icon contrast, neighbour and global
distinctness); examples (plan's first, 6-8 added, no diacritics, no duplicates within or across
scenarios); keywords (8-15, weights 1-3, at least one 3, no diacritics, no duplicates once «ال» is
stripped); and that the GENERATED block is up to date. It also prints warnings (not failures) when an
example's own keywords score lower than another scenario's in a simple whole-word keyword count;
currently there are none.

`src/dev/ContentOutside.tsx` previews the panel colors and icons in the plan's toy-button style:
`node tools/shot.mjs --out=shots/content-outside "dev=ContentOutside"` (add `&cols=3` for portrait).

## Known gaps

- Example phrasings and keywords were written by hand without testing on real students; extend them
  from what students actually say (plan build step 9).
- Only the plan's "Speaking setup" paragraphs are in `speakingSetup`; the scene-safety note of
  `crossing_with_friends` («the car never comes near the boys») and the stranger note in
  `stranger_at_gate` («calm and ordinary, not a villain») live only in the plan.
