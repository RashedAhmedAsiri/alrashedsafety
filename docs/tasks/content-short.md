# Brief: content-short

**You own:** `src/content/data/shortAnswers.ts`, `src/content/data/exam.ts`,
`src/content/data/creativeChips.ts`, `tools/content/short*.mjs`, `tools/content/exam*.mjs`,
`docs/content-short.md`.

**Source:** `docs/plan/Short_answers.md` (45 answers in groups), `docs/plan/Exam.md` (flow, judging,
10 questions, score lines, bands), `docs/plan/Voice_and_AI.md` (creative topic chips).

1. Short answers: parse with a script (no retyping): `id` (backticked), `n`, `group` (map the plan's
   group headings to the `ShortAnswer['group']` union in `src/content/types.ts`; if a heading does not
   fit, choose the closest and note it), `asks[]` (the plan's asks plus 4-6 more Saudi-kid phrasings
   you write), `answer` (exact), `location` (Place), `face` (the plan's Face mapped to an `Expression`
   id: Warning→warning, Gentle→gentle, Explaining→explaining, Happy→happy, Proud→proud,
   Lightbulb→lightbulb, Worried→worried, Sun and drop→sunDrop ...), `chip` (a short plain Arabic label
   of 2-4 words for the panel button, e.g. «جرس الحريق»), `keywords` (6-12 weighted).
2. Exam (`EXAM_QUESTIONS`, `EXAM_LINES`): parse every field of the 10 questions per `ExamQuestion`
   (question with options inside it, `options` with letter/text/picture, `answer`, `spoken` variants,
   `concepts` with id/label/words, `wrongWords`, `pass` rule, `cards`, `correct`, `wrong`), plus the
   phase question, the start line, the score lines for 0..10 and the bands (min, max, text, face) from
   Exam.md. If Exam.md words something differently from the types, adapt the data faithfully and note it.
3. `CREATIVE_CHIPS`: the 8 topic chips from Voice_and_AI.md, exact.
4. Write `tools/content/check_short.mjs` verifying counts (45, 10, 11 score lines, 8 chips), unique ids,
   every Arabic answer/question/feedback/score text verbatim in its plan file, braces well formed, valid
   locations and faces. Run until it passes, then typecheck.

Write `docs/content-short.md` with regeneration steps and anything the exam builder must know.

Note on score lines: Exam.md gives a template «{حَصَلْتَ/حَصَلْتِ} عَلَى X مِنْ عَشْرٍ» and the X words; build
the 11 full lines by inserting the X text into the template programmatically (0 replaces the whole line),
e.g. 3 → «… عَلَى ثَلَاثِ دَرَجَاتٍ مِنْ عَشْرٍ». The check script should verify the pieces, not the composed line.
