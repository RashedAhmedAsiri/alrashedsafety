# Screens, UI and style

The interface looks like a set of colorful toy buttons resting on top of the 3D world: playful, bright and chunky, but with few elements, fixed positions and generous space. All text is Arabic, right to left, in IBM Plex Sans Arabic (Medium 500 and Bold 700).

## Visual style

| Token | Value | Use |
| --- | --- | --- |
| Ink | #1E2A3B | All text and icons on light surfaces |
| Paper | #FFF8EC | Panels, cards, settings |
| Outside (blue) | #2D8CFF | Mode 1 |
| Inside (green) | #22B573 | Mode 2, listening state |
| Short answers (amber) | #FFAA1F | Mode 3 |
| Creative (purple) | #8B5CF6 | Mode 4, thinking state |
| Exam (red) | #F0476B | Mode 5 |
| Alrashed teal | #14B8A6 | Logo, call button, walking state |

- **Toy buttons.** Solid color, 22 px rounded corners, a 6 px darker edge under the button so it looks raised. Pressing pushes it down 4 px with a soft pop sound. Minimum size 64 px.
- **Icons.** Lucide icons, stroke width 2.5, white on the colored button.
- **Avoid** the generic AI look: no purple-to-blue gradients, no glowing glass cards everywhere, no stock 3D blobs. Flat solid colors, one shadow style, consistent spacing (8 px grid).
- **Motion.** Springy, short (200 to 350 ms). Panels slide in from their own corner. Nothing moves when idle except Alrashed.
- **Logo.** «الراشد» in rounded bold Arabic lettering, teal, with the dot of the ش drawn as Alrashed's antenna light. Small robot face in a circle as the app icon.

## Start: intro and loading

1. Paper background. The title «الراشد روبوت السلامة المدرسية» animates in word by word with a bounce, holds, fades out and plays again, looping until loading finishes.
2. Under it, the progress bar is a little road: a yellow school bus drives from right to left as the world loads.
3. When loading finishes, the bus reaches the end, the title does a final bounce, and the camera flies down from the sky over the school and the street into the classroom window, landing on Alrashed (about 4 seconds).
4. A soft fog and blur fades over the classroom. The five mode cards slide up one after another.

## Mode menu

Five cards over the fog. Landscape: one row of five. Portrait iPad: two rows (3 and 2). Each card: a colored circle with the white icon, the title, and the short description, all from your list.

| Mode | Icon | Color | Title | Description |
| --- | --- | --- | --- | --- |
| outside | Car | Blue | السلامة خارج المدرسة | قصص ونصائح للتعامل مع الطريق |
| inside | School | Green | السلامة داخل المدرسة | إرشادات هامة للحفاظ على سلامتنا |
| short | Zap | Amber | نصائح قصيرة | مواقف سريعة وإجابات ذكية |
| creative | Brain | Purple | الوضع الإبداعي | تحدث مع الروبوت بحرية |
| exam | Pencil | Red | التقييم | اختبر معلوماتك في السلامة |

Tapping a card: the card pops, the other cards drop away, the fog clears, Alrashed waves and his face shows a big smile, and the buttons appear. A thin bar in the mode's color runs along the top edge of the screen while inside a mode.

## Buttons on screen

| Corner | Button | Behavior |
| --- | --- | --- |
| Top left | Status | A pill showing Alrashed's current state with icon and color. Tapping it stops speech and any cutscene and returns to the classroom |
| Top right, upper | Back | Arrow icon. Returns to the mode menu (fog comes back) |
| Top right, lower | Settings | Gear icon. Opens the settings panel |
| Bottom right | Call | Teal phone. Tapping starts the call: a soft ring chime, Alrashed turns to the camera, and the mic button rises above the call button. The call button turns red to end the call |
| Bottom right, above call | Mic | Appears only during a call. Tap to speak. Pulses green with sound rings while listening. Stops listening after 1.5 seconds of silence or 12 seconds total |
| Bottom left | Scenarios | Grid icon. Opens a panel of colorful scenario buttons for the current mode |

### Status states

| State | Label | Icon | Color |
| --- | --- | --- | --- |
| Ready | جَاهِزٌ | smile | grey |
| Listening | يَسْتَمِعُ | ear | green |
| Thinking | يُفَكِّرُ | three dots | purple |
| Speaking | يَتَحَدَّثُ | sound waves | blue |
| Explaining | يَشْرَحُ | presentation | amber |
| Waving | يُلَوِّحُ | hand | amber |
| Walking | يَمْشِي | footprints | teal |

Speaking is used for short answers, creative mode and the exam. Explaining is used while a scenario is spoken. While a cutscene plays without speech, the state shows Walking or Waving to match what Alrashed is doing.

### Scenarios panel

Slides up from the bottom left over a light fog. Buttons in a 3 or 4 column grid, each in a different bright color with an icon and the scenario name. The first button in every mode is «مَنْ هُوَ الرَّاشِدُ؟». In short answers mode the buttons are the 45 questions as short chips. In creative mode they are 8 topic chips that send a ready question to Gemini. Hidden during the exam.

## Settings panel

Slides in from the top right on a paper card.

- Alrashed's voice volume (slider)
- Sound effects volume (slider)
- Music on or off
- Student: بَطَلٌ or بَطَلَةٌ, a two-option switch that corrects voice detection
- Location: a small illustrated map (below)
- Graphics quality: low, medium, high (auto-picked on first launch)
- Teacher results: opens the exam chart after a 4-digit PIN

**Map.** A flat, colorful top-down drawing of the school's two floors (a floor switch) and the outside area, with round pins on every location ID. Tapping a pin flies Alrashed and the camera there. The current location pin bounces.

## Alrashed's face expressions

| Expression | When |
| --- | --- |
| Idle blink | Ready state, random blinks |
| Smile | Default while listening is off |
| Big smile and wave | Mode chosen, call started |
| Listening (eyes wide, sound bars under the eyes) | Listening state |
| Thinking (eyes look up, three dots) | Matching or waiting for Gemini |
| Talking (mouth follows visemes) | Any speech |
| Explaining (raised eyebrows, mouth follows visemes) | Must-list part of a scenario |
| Warning (serious eyes, red tint on the screen edge) | Avoid-list part, dangerous moments in cutscenes |
| Surprised (round eyes) | Near-misses in cutscenes |
| Worried (soft eyebrows) | A child hurt or unwell |
| Proud (star eyes) | Slogan, correct exam answers |
| Gentle (soft eyes, small smile) | Wrong exam answers. Never sad or angry |
| Hearts | After a child is helped |
| Laughing (closed happy eyes) | Funny moments, end of exam |
| Confused (one eyebrow up, question mark) | No match, before the intro plays |
| Looking left, right, left (eyes slide) | Every crossing |
| Lightbulb | Creative mode answers |
| Timer clock | Nosebleed ten-minute pinch |
| Counting numbers (1, 2, 3...) | Counting students at the assembly point |
| Sun and drop | Heat and drinking water |
| Celebration (confetti on the screen) | Exam result |
| Sleepy (half-closed eyes, small z) | No touch for 60 seconds |
| Glow (bright white screen) | Power outage, he lights the room |

## Sounds

Button pop, panel slide, call ring chime, listening start and stop tones, school bell, footsteps, bus engine and door hiss, car pass, car horn, engine roar (speeding car), tire screech, rain, thunder, drips, wind and dust, fire alarm, extinguisher spray, water tap, seatbelt click, whistle, ball bounce, crowd cheer, confetti pop, a gentle looping menu tune. All soft, short and adjustable.

## Exam screens

- Ten round dots at the top show progress, filling green for right and amber for wrong.
- For yes-or-no and choice questions, big answer buttons with an icon and a short label appear so a student can tap if speaking fails. Open questions show only the mic.
- **Result:** confetti, Alrashed dances, his face shows stars, and the score appears as ten stars filling one by one.
- **Certificate:** «شهادة بطل السلامة» or «شهادة بطلة السلامة», the stars, the date and the «الراشد» logo, with a blank line for the student to write their name by hand. Print button.
- **Teacher chart:** a bar chart of average score before and after training, plus a per-question chart showing which questions improved most. Counts of pre-tests and post-tests taken.
