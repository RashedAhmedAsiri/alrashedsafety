# Exam mode

## Flow

1. The student opens Exam mode. The camera flies to the `classroom`; Alrashed stands at the board with a clipboard. The scenarios button is hidden for the whole test.
2. Alrashed asks: «هَلْ هَذَا التَّقْيِيمُ قَبْلَ التَّدْرِيبِ عَلَى هَذَا التَّطْبِيقِ أَمْ بَعْدَهُ؟» Two big buttons appear: «قَبْلَ التَّدْرِيبِ» (orange, seed icon) and «بَعْدَ التَّدْرِيبِ» (green, tree icon). The student may also say «قبل» or «بعد».
3. Alrashed says «هَيَّا نَبْدَأْ! عَشْرَةُ أَسْئِلَةٍ سَهْلَةٍ.» and the ten questions run in the same fixed order for pre and post.
4. For each question: Alrashed asks it (Talking face), then the mic opens by itself (Listening face, sound-wave ring). Listening stops after 1.5 s of silence or 8 s total.
5. The answer is judged (see Judging). Alrashed plays the correct or wrong feedback line, then the next question. Ten progress dots at the top fill green (correct) or soft yellow (wrong). No answer text is ever shown.
6. After question 10: drum roll, the score line, the band message, confetti, then the certificate card.
7. The result is saved (see Results) and two buttons appear: «أَعِدِ الاخْتِبَارَ» (retake) and «الْفَصْلُ» (back to the classroom).

**Leaving early:** the status button (top left) or back button stops the test with a small confirm card («نَعَمْ» / «لَا» icons). A stopped test is not saved.

**Tap fallback:** if two listening tries give no confident answer, or the device cannot listen (no mic, no permission, offline iPad), the answer buttons appear and the mic stays off for that question. Choice questions show three buttons with the letters أ ب ج and a picture of each option; yes/no shows ✔ «نَعَمْ» and ✖ «لَا»; open questions switch to three picture cards (listed per question). The buttons carry only a letter or one word, never the answer sentence.

## Judging

- **Choice:** accept the letter (أ، ألف، الأول • ب، باء، الثاني • ج، جيم، الثالث) or the keywords of the option itself.
- **Yes/no:** yes = نعم، ايه، إيه، أيوه، صح، اي • no = لا، لأ، أبد، أبدًا، مو، غلط، لا ما يصير. If both appear, the first one wins.
- **Open:** the normalized text is checked against each question's concept keyword lists, offline. Each question below says which concepts pass and which words make it wrong.
- **Gemini (optional, online only):** when the offline check finds no concept, the Worker sends the question ID, the concept list and the text, and gets back `{"pass": true or false, "concepts": [...]}`. Gemini never writes feedback; the pre-recorded lines still play. Offline, the tap fallback is used instead.
- Each question is scored 1 or 0. No half marks.

## The ten questions

Every line below is recorded in both boy and girl versions. «Correct» and «Wrong» are the feedback lines Alrashed says (Face Proud for correct, Gentle for wrong).

### س١ · `q1_fire_alarm` · choice · place `classroom`

- **Question:** إِذَا {سَمِعْتَ/سَمِعْتِ} جَرَسَ الْحَرِيقِ فِي الْفَصْلِ، مَاذَا {تَفْعَلُ/تَفْعَلِينَ}؟ أ: أَجْمَعُ أَغْرَاضِي ثُمَّ أَخْرُجُ. ب: أَخْرُجُ بِهُدُوءٍ مَعَ {مُعَلِّمِي/مُعَلِّمَتِي}. ج: أَخْتَبِئُ تَحْتَ الطَّاوِلَةِ.
- **Answer:** ب. Spoken variants: أطلع مع المعلم • أخرج بهدوء • أطلع بهدوء.
- **Pictures:** a backpack and a door • a teacher leading a line • a desk.
- **Correct:** {أَحْسَنْتَ/أَحْسَنْتِ}! نَخْرُجُ بِهُدُوءٍ مَعَ {الْمُعَلِّمِ/الْمُعَلِّمَةِ} وَنَتْرُكُ الْأَغْرَاضَ.
- **Wrong:** لَا بَأْسَ، الصَّوَابُ أَنْ {تَخْرُجَ/تَخْرُجِي} بِهُدُوءٍ مَعَ {مُعَلِّمِكَ/مُعَلِّمَتِكِ}، لِأَنَّ جَمْعَ الْأَغْرَاضِ يُؤَخِّرُ{كَ/كِ}.

### س٢ · `q2_bus_front` · yes/no · place `bus_stop`

- **Question:** هَلْ مِنَ الْآمِنِ أَنْ {تَعْبُرَ/تَعْبُرِي} الشَّارِعَ مِنْ أَمَامِ الْحَافِلَةِ بَعْدَ النُّزُولِ مِنْهَا؟
- **Answer:** لَا.
- **Correct:** {أَحْسَنْتَ/أَحْسَنْتِ}! السَّائِقُ قَدْ لَا يَرَا{كَ/كِ}، فَنَنْتَظِرُ حَتَّى تَتَحَرَّكَ الْحَافِلَةُ.
- **Wrong:** لَا بَأْسَ، الصَّوَابُ: لَا، لِأَنَّ السَّائِقَ قَدْ لَا يَرَا{كَ/كِ}، {فَانْتَظِرْ/فَانْتَظِرِي} حَتَّى تَتَحَرَّكَ الْحَافِلَةُ.

### س٣ · `q3_look_left` · choice · place `crosswalk_main`

- **Question:** عِنْدَ عُبُورِ الشَّارِعِ، إِلَى أَيِّ جِهَةٍ {تَنْظُرُ/تَنْظُرِينَ} أَوَّلًا؟ أ: إِلَى الْيَمِينِ. ب: إِلَى الْيَسَارِ. ج: لَا أَنْظُرُ.
- **Answer:** ب. Spoken variants: يسار • اليسار • شمال.
- **Pictures:** arrow right • arrow left • closed eyes.
- **Correct:** {أَحْسَنْتَ/أَحْسَنْتِ}! أَقْرَبُ سَيَّارَةٍ إِلَيْنَا تَأْتِي مِنَ الْيَسَارِ.
- **Wrong:** لَا بَأْسَ، الصَّوَابُ أَنْ {تَنْظُرَ/تَنْظُرِي} إِلَى الْيَسَارِ أَوَّلًا، لِأَنَّ السَّيَّارَاتِ تَسِيرُ عَلَى الْيَمِينِ.

### س٤ · `q4_nosebleed` · open · place `clinic`

- **Question:** إِذَا نَزَفَ أَنْفُ{كَ/كِ}، مَاذَا {تَفْعَلُ/تَفْعَلِينَ}؟
- **Concepts:** sit (أجلس، أقعد) • lean forward (أميل، لقدام، للأمام، أنزل راسي) • pinch the nose (أضغط، أمسك خشمي، أسكر أنفي) • tell an adult (أقول، أخبر، المعلم، العيادة، المرشد).
- **Wrong words:** tilt back (أرفع راسي، لورا، للخلف، أنام على ظهري).
- **Pass:** at least two concepts and no wrong words.
- **Picture cards (fallback):** a child sitting and leaning forward pinching the nose (correct) • a child with head tilted back • a child running.
- **Correct:** {أَحْسَنْتَ/أَحْسَنْتِ}! نَجْلِسُ، وَنُمِيلُ الرَّأْسَ لِلْأَمَامِ، وَنَضْغَطُ عَلَى الْأَنْفِ.
- **Wrong:** لَا بَأْسَ، الصَّوَابُ أَنْ {تَجْلِسَ وَتُمِيلَ/تَجْلِسِي وَتُمِيلِي} رَأْسَ{كَ/كِ} لِلْأَمَامِ {وَتَضْغَطَ/وَتَضْغَطِي} عَلَى أَنْفِ{كَ/كِ}، وَلَا {تَرْفَعْ/تَرْفَعِي} رَأْسَ{كَ/كِ} لِلْخَلْفِ.

### س٥ · `q5_puddle` · yes/no · place `sidewalk_far`

- **Question:** هَلْ مِنَ الْآمِنِ أَنْ {تَقْفِزَ/تَقْفِزِي} فَوْقَ بِرْكَةِ مَاءٍ فِي الشَّارِعِ؟
- **Answer:** لَا.
- **Correct:** {أَحْسَنْتَ/أَحْسَنْتِ}! نَمْشِي حَوْلَهَا، فَقَدْ تَكُونُ عَمِيقَةً أَوْ زَلِقَةً.
- **Wrong:** لَا بَأْسَ، الصَّوَابُ: لَا، {امْشِ/امْشِي} حَوْلَهَا لِأَنَّهَا قَدْ تَكُونُ عَمِيقَةً أَوْ زَلِقَةً.

### س٦ · `q6_power_outage` · choice · place `classroom` (lights dim for this question)

- **Question:** إِذَا انْقَطَعَتِ الْكَهْرَبَاءُ فِي الْفَصْلِ، مَاذَا {تَفْعَلُ/تَفْعَلِينَ}؟ أ: أَبْقَى فِي مَكَانِي وَأَسْتَمِعُ إِلَى {الْمُعَلِّمِ/الْمُعَلِّمَةِ}. ب: أَرْكُضُ إِلَى الْبَابِ. ج: أَبْحَثُ عَنْ مِفْتَاحِ الْكَهْرَبَاءِ.
- **Answer:** أ. Spoken variants: أجلس مكاني • أبقى مكاني • أسمع المعلم.
- **Pictures:** a child sitting calmly with an ear icon • a child running to a door • a hand on a light switch.
- **Correct:** {أَحْسَنْتَ/أَحْسَنْتِ}! نَبْقَى هَادِئِينَ وَنَسْتَمِعُ إِلَى التَّعْلِيمَاتِ.
- **Wrong:** لَا بَأْسَ، الصَّوَابُ أَنْ {تَبْقَى/تَبْقَيْ} فِي مَكَانِ{كَ/كِ} {وَتَسْتَمِعَ/وَتَسْتَمِعِي} إِلَى {مُعَلِّمِكَ/مُعَلِّمَتِكِ}.

Note: in the girl version the boy line «نَبْقَى هَادِئِينَ» becomes «نَبْقَى هَادِئَاتٍ».

### س٧ · `q7_open_sewer` · open · place `roadworks`

- **Question:** {رَأَيْتَ/رَأَيْتِ} بَالُوعَةً مَفْتُوحَةً فِي طَرِيقِ{كَ/كِ}، مَاذَا {تَفْعَلُ/تَفْعَلِينَ}؟
- **Concepts:** stay away (أبتعد، أبعد، ما أقرب) • go around (أمشي حولها، ألف، طريق ثاني) • tell an adult (أقول، أخبر، أبوي، المعلم، كبير).
- **Wrong words:** look in or jump (أطالع فيها، أنط، أقفز، أسكرها).
- **Pass:** stay away or go around, and no wrong words.
- **Picture cards (fallback):** a child walking a wide path around a cone (correct) • a child peeking into the hole • a child jumping over it.
- **Correct:** {أَحْسَنْتَ/أَحْسَنْتِ}! نَبْتَعِدُ عَنْهَا وَنَمْشِي مِنْ حَوْلِهَا، وَنُخْبِرُ الْكِبَارَ.
- **Wrong:** لَا بَأْسَ، الصَّوَابُ أَنْ {تَبْتَعِدَ/تَبْتَعِدِي} عَنْهَا {وَتَمْشِيَ/وَتَمْشِي} مِنْ حَوْلِهَا، {وَتُخْبِرَ/وَتُخْبِرِي} شَخْصًا كَبِيرًا.

### س٨ · `q8_stranger` · yes/no · place `gate`

- **Question:** جَاءَ شَخْصٌ لَا {تَعْرِفُهُ/تَعْرِفِينَهُ} وَقَالَ: {أَبُوكَ/أَبُوكِ} أَرْسَلَنِي، {ارْكَبْ/ارْكَبِي} مَعِي. هَلْ {تَرْكَبُ/تَرْكَبِينَ} مَعَهُ؟
- **Answer:** لَا.
- **Correct:** {أَحْسَنْتَ/أَحْسَنْتِ}! لَا نَذْهَبُ مَعَ غَرِيبٍ مَهْمَا قَالَ، وَنُخْبِرُ الْمَدْرَسَةَ.
- **Wrong:** لَا بَأْسَ، الصَّوَابُ: لَا، {ارْجِعْ/ارْجِعِي} إِلَى الْمَدْرَسَةِ {وَأَخْبِرْ/وَأَخْبِرِي} {مُعَلِّمَكَ/مُعَلِّمَتَكِ} فَوْرًا.

### س٩ · `q9_car_seat` · choice · place `parking`

- **Question:** أَيْنَ {تَجْلِسُ/تَجْلِسِينَ} فِي سَيَّارَةِ الْعَائِلَةِ؟ أ: فِي الْمَقْعَدِ الْأَمَامِيِّ. ب: فِي الْمَقْعَدِ الْخَلْفِيِّ مَعَ حِزَامِ الْأَمَانِ. ج: فِي أَيِّ مَكَانٍ بِدُونِ حِزَامٍ.
- **Answer:** ب. Spoken variants: ورا • المقعد الخلفي • ورا مع الحزام.
- **Pictures:** front seat • back seat with a belt • a child standing between the seats.
- **Correct:** {أَحْسَنْتَ/أَحْسَنْتِ}! الْمَقْعَدُ الْخَلْفِيُّ مَعَ الْحِزَامِ هُوَ الْأَكْثَرُ أَمَانًا.
- **Wrong:** لَا بَأْسَ، الصَّوَابُ أَنْ {تَجْلِسَ/تَجْلِسِي} فِي الْمَقْعَدِ الْخَلْفِيِّ {وَتَرْبِطَ/وَتَرْبِطِي} حِزَامَ الْأَمَانِ.

### س١٠ · `q10_friend_fainted` · open · place `yard`

- **Question:** {سَقَطَ زَمِيلُكَ/سَقَطَتْ زَمِيلَتُكِ} فِي الطَّابُورِ مُغْمًى {عَلَيْهِ/عَلَيْهَا}، مَاذَا {تَفْعَلُ/تَفْعَلِينَ}؟
- **Concepts:** call the teacher (أنادي، أصيح، أقول، المعلم، المعلمة، المرشد) • give space (أبعد، نبتعد، هواء، ما نتجمع).
- **Wrong words:** give water or lift alone (أعطيه موية، أشيله، أرفعه، أصب موية).
- **Pass:** call the teacher, and no wrong words.
- **Picture cards (fallback):** a child waving to a teacher while others step back (correct) • a crowd in a tight circle • a child pouring water on a friend.
- **Correct:** {أَحْسَنْتَ/أَحْسَنْتِ}! نُنَادِي {الْمُعَلِّمَ/الْمُعَلِّمَةَ} فَوْرًا وَنُفْسِحُ الْمَكَانَ.
- **Wrong:** لَا بَأْسَ، الصَّوَابُ أَنْ {تُنَادِيَ/تُنَادِي} {الْمُعَلِّمَ/الْمُعَلِّمَةَ} فَوْرًا {وَتُفْسِحَ/وَتُفْسِحِي} الْمَكَانَ لِيَصِلَ الْهَوَاءُ.

## Score and celebration

**Score line:** «{حَصَلْتَ/حَصَلْتِ} عَلَى X مِنْ عَشْرٍ», recorded as 11 separate files per gender. X is:

- 0: «لَمْ {تَحْصُلْ/تَحْصُلِي} عَلَى دَرَجَاتٍ هَذِهِ الْمَرَّةَ» (replaces the whole line)
- 1: دَرَجَةٍ وَاحِدَةٍ
- 2: دَرَجَتَيْنِ
- 3 to 10: ثَلَاثِ • أَرْبَعِ • خَمْسِ • سِتِّ • سَبْعِ • ثَمَانِي • تِسْعِ • عَشْرِ + دَرَجَاتٍ

**Band message** (Face Proud, Happy or Gentle):

- **9 to 10:** رَائِعٌ! {أَنْتَ بَطَلُ/أَنْتِ بَطَلَةُ} السَّلَامَةِ، {اسْتَمِرَّ وَعَلِّمْ أَصْدِقَاءَكَ مَا تَعَلَّمْتَهُ/اسْتَمِرِّي وَعَلِّمِي صَدِيقَاتِكِ مَا تَعَلَّمْتِهِ}! Big confetti burst, Alrashed jumps and spins, gold certificate.
- **6 to 8:** {أَحْسَنْتَ/أَحْسَنْتِ}! {أَنْتَ/أَنْتِ} عَلَى الطَّرِيقِ الصَّحِيحِ، {رَاجِعِ السِّينَارْيُوهَاتِ لِتَصِلَ/رَاجِعِي السِّينَارْيُوهَاتِ لِتَصِلِي} إِلَى الْعَلَامَةِ الْكَامِلَةِ. Confetti, Alrashed claps, silver certificate.
- **0 to 5:** شُكْرًا لِمُحَاوَلَتِ{كَ/كِ}! {تَعَالَ/تَعَالَيْ} نَتَعَلَّمْ مَعًا مِنَ السِّينَارْيُوهَاتِ، ثُمَّ {حَاوِلْ/حَاوِلِي} مَرَّةً أُخْرَى. Soft star shower, Alrashed gives a thumbs-up, bronze certificate. Never a sad face.

**Certificate card:** title «شَهَادَةُ {بَطَلِ/بَطَلَةِ} السَّلَامَةِ», the «الراشد» logo, «مدرسة الراشد», the score as stars (out of ten), the phase (قبل / بعد) and the date in Hijri and Gregorian. Because no name is collected, it has a dotted line «الاسْمُ: ..........» for writing by hand. Buttons: print and save as image. Gender comes from the voice result or the settings override.

## Results and the improvement chart

**Saved per finished test (Cloudflare D1, table `exam_results`):**

- `id`: random UUID
- `device_id`: random UUID created on first launch and kept in local storage; not linked to any person
- `phase`: `pre` or `post`
- `score`: 0 to 10
- `answers`: ten characters of 1 or 0, in question order (for example `1101111011`)
- `input`: ten characters of v (voice) or t (tap), so teachers can see how often tapping was needed
- `gender`: `boy`, `girl` or `unknown`
- `created_at`: UTC timestamp
- `app_version` and `exam_version` (bump `exam_version` if any question changes, so old and new results are never mixed)

No audio, no transcript and no name is ever stored. If the device is offline, the row is queued in IndexedDB and sent by the Worker endpoint `POST /api/exam` when the connection returns. The Worker accepts only this shape, rate-limits by IP and rejects anything else.

**Teacher dashboard:** Settings → «لَوْحَةُ النَّتَائِجِ», behind a 4-digit teacher PIN (set on first open, stored hashed in D1; reset needs the admin PIN in the Worker's secrets). It shows, in Arabic only:

1. **Big numbers:** average score before and after, and the change as an arrow (for example ٥٫٢ ← ٨٫٧).
2. **Bar chart per question:** two bars for each of the ten questions (orange before, green after), showing the share of correct answers. Tapping a bar names the topic in one word (الحريق، الحافلة، ...).
3. **Score spread:** a small histogram of scores 0 to 10, before and after overlaid.
4. **Paired view:** devices that have both a pre and a post result, with a line from each pre score to its post score. On shared iPads one device may be several students, so this view is labeled as per device, not per student.
5. **Filters:** date range, gender, latest attempt only (default) or all attempts.

Charts use Chart.js with an Arabic RTL layout and IBM Plex Sans Arabic, colors from the app palette. An export button downloads a CSV of the rows above.
