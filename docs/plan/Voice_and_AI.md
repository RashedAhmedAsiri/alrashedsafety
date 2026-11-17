# Voice, matching and AI

Every spoken exchange follows the same path: listen, detect gender, match (or ask Gemini in creative mode), move to the right place, play the before animation, speak, play the after animation. Only the source of the answer changes by mode.

## What happens in each mode after a question

| Mode | Searches | Then |
| --- | --- | --- |
| Outside | Outside scenarios and the intro | Travels to the scenario's location, sets its weather, plays before, speaks, plays after |
| Inside | Inside scenarios and the intro | Same as outside, in the scenario's room |
| Short answers | The 45 short answers and the intro | Travels to the answer's location, speaks with face expressions only |
| Creative | Gemini (online) | Travels to the location Gemini picks, speaks the generated answer with face expressions only |
| Exam | The current question's accepted answers | Judges, gives feedback, asks the next question |

In outside and inside modes, if a question clearly belongs to the other mode's list (score at least 0.65 and 0.15 above the best match in the current mode), that scenario plays anyway, since it is still safety.

## Listening

- **Primary:** the browser's built-in speech recognition with language `ar-SA`, one phrase per tap, no partial results shown. Works in Chrome, Edge and Safari on iPad. It needs internet.
- **Fallback:** Whisper (base, multilingual) running inside the browser with transformers.js, language forced to Arabic. Used on Firefox, when the built-in one fails, and when offline. Downloaded in the background on PCs and laptops only, then cached.
- Silence detection ends listening after 1.5 seconds of quiet; 12 seconds is the maximum.
- If nothing usable is heard, Alrashed says the not-heard line (below) and listens again once.

## Gender from the voice

**Be aware:** before puberty, boys' and girls' voices are very similar, so no method is fully reliable for elementary students. Expect mistakes, especially with grades 1 to 3. The settings switch is the dependable correction.

- Each utterance's audio is analyzed in the browser: median pitch, pitch range and the first two vocal resonances (formants), fed to a small classifier.
- The classifier must be trained on recordings of Saudi children aged 6 to 12 (both genders), collected with parents' consent and deleted after training. Until then, use pitch thresholds as a placeholder.
- **Confidence rule:** if the classifier is at least 75% sure, the gender is set. Otherwise the last known gender stays. The very first call on a device starts with a gender-neutral greeting so there is speech to analyze before any gendered answer.
- On a shared smartboard, every new call re-detects, because the speaker may have changed.
- A manual choice in settings overrides detection for 30 minutes on that device.

## Matching a question to a premade answer

1. **Normalize the Arabic.** Remove diacritics and tatweel, unify أ إ آ to ا, ة to ه, ى to ي, strip punctuation, and map Saudi dialect words to standard ones using `synonyms.json`. Starting list: أبي / أبغى → أريد, وش / إيش → ماذا, ليش → لماذا, طاح → سقط, الباص → الحافلة, أقطع → أعبر, الدرج → السلالم, الفيش / الفيشة → المقبس, المويه / الماي → الماء, عجاج → غبار, خشمي → أنفي, انجرحت → جرحت, يعورني → يؤلمني, الموتر / السيكل → الدراجة, الطفاية → طفاية الحريق, المزلقة → الزحليقة. The list grows from testing with students.
2. **Keyword score.** Each scenario and short answer has weighted keywords and 6 to 10 example questions (some given in the scenario tabs). Score with BM25 over the examples plus keyword hits.
3. **Meaning score.** A small multilingual sentence model (multilingual-e5-small, quantized, about 110 MB) runs in the browser. Example questions are embedded at build time; only the student's question is embedded live. Downloaded in the background after the first load; until it is ready, the keyword score is used alone.
4. **Combine.** Final score = 0.4 × keyword + 0.6 × meaning.
5. **Decide.**
   - Score 0.55 or more: play the best match.
   - Score 0.40 to 0.55: if online and the top two are within 0.05, ask Gemini to pick one of the two IDs (it returns only an ID, never text). Otherwise play the best match.
   - Below 0.40, or the question is not about safety or school: play the off-topic line, then the intro scenario.

## Pre-recorded system lines

All fully diacritized, recorded in both versions where braces appear.

| ID | Text |
| --- | --- |
| `greet_first` | أَهْلًا وَسَهْلًا! أَنَا الرَّاشِدُ، صَدِيقُكُمْ فِي السَّلَامَةِ. اضْغَطُوا عَلَى زِرِّ الْمِيكْرُوفُونِ وَسَلِّمُوا عَلَيَّ. |
| `greet_call` | أَهْلًا يَا {بَطَلُ/بَطَلَةُ}! {اسْأَلْنِي/اسْأَلِينِي} عَنْ أَيِّ شَيْءٍ فِي السَّلَامَةِ. |
| `not_heard` | لَمْ {أَسْمَعْكَ/أَسْمَعْكِ} جَيِّدًا، {أَعِدْ سُؤَالَكَ مِنْ فَضْلِكَ/أَعِيدِي سُؤَالَكِ مِنْ فَضْلِكِ}. |
| `off_topic` | هَذَا سُؤَالٌ جَمِيلٌ، لَكِنَّنِي مُتَخَصِّصٌ فِي السَّلَامَةِ الْمَدْرَسِيَّةِ، {دَعْنِي أُعَرِّفْكَ/دَعِينِي أُعَرِّفْكِ} بِنَفْسِي. |
| `mic_denied` | أَحْتَاجُ إِلَى الْمِيكْرُوفُونِ لِأَسْمَعَكُمْ، اطْلُبُوا مِنْ شَخْصٍ كَبِيرٍ أَنْ يُشَغِّلَهُ. |
| `offline_creative` | هَذَا الْوَضْعُ يَحْتَاجُ إِلَى الْإِنْتِرْنِتْ، {جَرِّبِ الْأَوْضَاعَ/جَرِّبِي الْأَوْضَاعَ} الْأُخْرَى حَتَّى يَعُودَ الاتِّصَالُ. |
| `thinking` | سُؤَالٌ رَائِعٌ! {دَعْنِي/دَعِينِي} أُفَكِّرُ قَلِيلًا. |
| `mode_outside` | هَيَّا نَتَعَلَّمُ السَّلَامَةَ خَارِجَ الْمَدْرَسَةِ! |
| `mode_inside` | هَيَّا نَتَعَلَّمُ السَّلَامَةَ دَاخِلَ الْمَدْرَسَةِ! |
| `mode_short` | مَوَاقِفُ سَرِيعَةٌ وَإِجَابَاتٌ ذَكِيَّةٌ، هَيَّا نَبْدَأُ! |
| `mode_creative` | أَنَا مُسْتَعِدٌّ لِكُلِّ أَسْئِلَتِكُمْ عَنِ السَّلَامَةِ وَالْمَدْرَسَةِ! |
| `need_internet_listen` | أَحْتَاجُ إِلَى الْإِنْتِرْنِتْ لِأَسْمَعَكُمْ عَلَى هَذَا الْجِهَازِ، وَيُمْكِنُكُمْ اسْتِخْدَامُ زِرِّ السِّينَارِيُوهَاتِ. |

The `greet_first` and `mic_denied` lines use the plural on purpose, because the gender is not known yet.

## Recording the voice

- Voice: Azure `ar-SA-HamedNeural`, pitch raised 6% and rate 0.92 for a friendly young robot sound. If the team prefers, test `ar-SA-ZariyahNeural` for the girl version only; the default is one voice for everyone since Alrashed is one character.
- `generate_voice.ts` sends SSML, saves an MP3 (48 kbps mono) and the viseme timeline as JSON for each text and gender.
- **Listening check:** a teacher listens to every file once against the text in this plan. Any word read wrongly is fixed with an SSML `phoneme` or `sub` tag, or a small rewording, then regenerated.

```xml
<speak version="1.0" xml:lang="ar-SA" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="ar-SA-HamedNeural">
    <prosody rate="0.92" pitch="+6%">
      يَا ذَكِيُّ، ... <break time="600ms"/> يَجِبُ عَلَيَّ أَنْ <break time="400ms"/> ...
    </prosody>
  </voice>
</speak>
```

## Creative mode with Gemini

**Flow.** The student's question (text only) goes to the Cloudflare Worker, which calls Gemini with the system rules below and asks for JSON. While waiting, Alrashed plays the `thinking` line. The Worker checks the answer, then turns it into speech with Azure and returns audio plus visemes. The app moves Alrashed to the location and plays it. If anything fails, Alrashed says the off-topic line and plays the intro.

**Memory.** The last 6 turns of the current call are kept in the app's memory only, to allow follow-up questions. Nothing is stored after the call ends.

**Response format from Gemini:**

```json
{
  "on_topic": true,
  "location": "one of the location IDs",
  "weather": "sunny | rain | wet | dust | null",
  "expression": "explaining | warning | happy | lightbulb | worried",
  "answer": "fully diacritized Arabic text"
}
```

**System rules for Gemini** (the programmer pastes this as the system instruction, with the student's gender filled in):

```
You are Alrashed, a friendly safety robot at Alrashed school in Saudi Arabia, talking by voice to an elementary student (ages 6 to 12). The student is a {GENDER: boy or girl}; address them with correct Arabic gender agreement.

Answer only questions about safety or school life. If the question is about anything else, return on_topic false and an empty answer.

Write in simple Modern Standard Arabic with FULL diacritics on every letter, for a text-to-speech engine. No emoji, no symbols, no numbers as digits, no lists with dashes, no English, no Latin letters.

For safety advice, use exactly this structure in one paragraph flow:
1. An encouraging vocative chosen from: يَا بَطَلُ / يَا ذَكِيُّ / يَا مُبْدِعُ / يَا شُجَاعُ (or the feminine forms), then one sentence placing the student in the situation.
2. يَجِبُ عَلَيَّ أَنْ followed by 3 to 5 first-person present-tense steps in time order (subjunctive mood after أَنْ).
3. وَأَتَذَكَّرُ دَوْمًا followed by 2 to 4 points each starting with لَا.
4. A rhythmic slogan of 3 or 4 short imperatives ending with بِأَمَانٍ or بِسَلَامٍ.
For simple questions (about Alrashed, the school, a quick fact), answer in one or two short sentences instead.

Never tell the student to use a phone or make a call; phones are not allowed in schools. Always direct them to tell their teacher, a parent, or the school health counselor. Never give medical dosages or medicines. Never describe injuries graphically. Keep answers under 90 words. Never ask for or repeat personal information; if the student says their name you may use it once.

Pick the location ID where the answer makes most sense from this list: classroom, lobby, corridor_ground, stairs, clinic, canteen, sports_hall, computer_lab, biology_lab, art_room, library, yard, football_field, gate, street_front, crosswalk_main, signal_crossing, bus_stop, pickup_lane, parking, sidewalk_far, houses, roadworks, park, flood_dip.
```

**Checks in the Worker before speaking:** Gemini safety settings at the strictest level; the answer must contain Arabic letters only (plus Arabic punctuation); reject if it mentions phones or calling (هاتف, جوال, اتصل, اتصال); reject if longer than 120 words; on rejection, use the off-topic path.

**Topic chips in the scenarios panel (creative mode):** كيف تعمل طفاية الحريق؟ • لماذا نربط حزام الأمان؟ • لماذا لا نلعب بالكبريت؟ • ما هو الدفاع المدني؟ • لماذا نغسل أيدينا؟ • كيف يعمل إنذار الحريق؟ • لماذا الأرض المبللة خطيرة؟ • كيف أحمي نفسي من الشمس؟

**Note on tashkeel quality.** Gemini's diacritics are good but not perfect, so creative answers may occasionally have a pronunciation slip. All other modes use the checked pre-recorded audio.
