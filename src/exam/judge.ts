// OWNER: exam worker. Offline answer judging for the exam (pure functions, no app state).
//
// Choice:  letters (أ / ألف / ب / باء / ج / جيم ...) first, then the option's own keywords and the
//          question's spoken variants, then ordinals (الأول / الثاني / الثالث).
// Yes/no:  the plan's word lists; the first yes or no word in the answer wins.
// Open:    the question's concept word lists and wrong words (negated mentions are ignored),
//          pass rule `minConcepts` / `requireAnyOf`.
// Every check runs on two normalizations: a local basic one, and the matcher's normalizeArabic
// (which also maps dialect synonyms) when it is implemented.
import { normalizeArabic } from '../match';
import type { ChoiceLetter, ExamQuestion } from '../content/types';

export type Verdict = 'correct' | 'wrong' | 'unclear';

export interface Judgement {
  verdict: Verdict;
  /** What the student picked (choice letter or yes/no) when it could be read. */
  picked?: ChoiceLetter | 'yes' | 'no';
  /** Open questions: concept ids found. */
  concepts?: string[];
  /** Open questions: wrong words found (not negated). */
  wrongHits?: string[];
  /** Short English reason for logs and tests. */
  reason: string;
}

/* ----------------------------------------------------------------------------- normalize */

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Local normalizer: diacritics, tatweel, alef forms, ة, ى, hamza seats, digits, punctuation. */
export function basicNormalize(text: string): string {
  return (text ?? '')
    .normalize('NFC')
    .replace(DIACRITICS, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let matcherIsStub: boolean | null = null;
/** True when src/match normalizeArabic is still the identity stub. */
function matcherStub(): boolean {
  if (matcherIsStub === null) {
    try {
      const probe = 'أَهْلًا';
      matcherIsStub = normalizeArabic(probe) === probe;
    } catch {
      matcherIsStub = true;
    }
  }
  return matcherIsStub;
}

/** The normalizations every check runs on: [basic] or [basic, matcher+basic]. */
export function normalizations(text: string): string[] {
  const a = basicNormalize(text);
  if (matcherStub()) return [a];
  let b = a;
  try {
    b = basicNormalize(normalizeArabic(text ?? ''));
  } catch {
    /* matcher failed: basic only */
  }
  return b && b !== a ? [a, b] : [a];
}

/* ------------------------------------------------------------------------------- tokens */

const PREFIXES = ['وبال', 'وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف'];
const SUFFIXES = ['هما', 'كما', 'هم', 'ها', 'نا', 'كم', 'ين', 'ون', 'ات', 'ه', 'ي', 'ك'];
/** Words that carry no meaning for matching (removed from both sides). */
const STOP = new Set(['مع', 'في', 'الي', 'من', 'عن', 'علي', 'ثم', 'او', 'ان', 'يا', 'هذا', 'هذي', 'هذه', 'انا', 'اني', 'هو', 'هي', 'شي', 'اللي', 'الذي', 'التي', 'عشان', 'لان', 'حتي', 'بس', 'يعني', 'طيب', 'زي']);
/** Negation words: a match right after one of these does not count. */
const NEG = new Set(['لا', 'ما', 'مو', 'مب', 'ماني', 'مانيب', 'بدون', 'ابد', 'ابدا', 'لن', 'لم', 'ليس', 'مافي', 'ممنوع', 'غير']);
/** A few dialect words mapped to the stems used in the questions (after stemming). */
const DIALECT: Record<string, string> = {
  قدام: 'امام',
  لقدام: 'امام',
  ورا: 'خلف',
  وراء: 'خلف',
  لورا: 'خلف',
  شمال: 'يسار',
  اطلع: 'اخرج',
  نطلع: 'اخرج',
  اقعد: 'اجلس',
  اروح: 'اذهب',
  المعلمه: 'معلم',
  الابله: 'معلم',
  ابله: 'معلم',
};

export function stem(word: string): string {
  if (DIALECT[word]) return DIALECT[word];
  let w = word;
  for (const p of PREFIXES) {
    const min = p.length === 1 ? 3 : 2;
    if (w.startsWith(p) && w.length - p.length >= min) {
      w = w.slice(p.length);
      break;
    }
  }
  for (const s of SUFFIXES) {
    if (w.endsWith(s) && w.length - s.length >= 3) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  return DIALECT[w] ?? w;
}

interface Tok {
  raw: string; // normalized word
  stem: string;
  /** Index in the raw token list. */
  i: number;
}

/** Content tokens (stop words dropped) with their raw positions; raw words kept for negation. */
function tokenize(norm: string): { raw: string[]; content: Tok[] } {
  const raw = norm ? norm.split(' ') : [];
  const content: Tok[] = [];
  raw.forEach((w, i) => {
    if (!STOP.has(w)) content.push({ raw: w, stem: stem(w), i });
  });
  return { raw, content };
}

function phraseStems(phrase: string, norm: (s: string) => string): string[] {
  return tokenize(norm(phrase)).content.map((t) => t.stem);
}

/** True when the word just before raw index `i` (or the one before it) is a negation. */
function negatedAt(raw: string[], i: number): boolean {
  for (let k = i - 1; k >= Math.max(0, i - 2); k--) {
    const w = raw[k];
    if (NEG.has(w) || (w.startsWith('و') && NEG.has(w.slice(1)))) return true;
  }
  return false;
}

interface Hit {
  /** Raw index of the first token of the match. */
  at: number;
  negated: boolean;
}

/**
 * Find the phrase (by stems, in order, at most 2 content words between neighbours) in the answer.
 * Returns the first non-negated hit, else the first negated one, else null.
 */
function findPhrase(stems: string[], ans: { raw: string[]; content: Tok[] }): Hit | null {
  if (!stems.length) return null;
  const c = ans.content;
  let negHit: Hit | null = null;
  for (let s = 0; s < c.length; s++) {
    if (c[s].stem !== stems[0]) continue;
    let pos = s;
    let ok = true;
    for (let k = 1; k < stems.length; k++) {
      let found = -1;
      for (let j = pos + 1; j <= Math.min(c.length - 1, pos + 3); j++) {
        if (c[j].stem === stems[k]) {
          found = j;
          break;
        }
      }
      if (found < 0) {
        ok = false;
        break;
      }
      pos = found;
    }
    if (!ok) continue;
    // A phrase that itself starts with a negation (e.g. «ما أقرب») is never "negated".
    const negated = NEG.has(stems[0]) ? false : negatedAt(ans.raw, c[s].i);
    const hit = { at: c[s].i, negated };
    if (!negated) return hit;
    negHit ??= hit;
  }
  return negHit;
}

/** Search a phrase under every normalization; returns the earliest non-negated hit. */
function search(phrase: string, text: string): Hit | null {
  let best: Hit | null = null;
  const norms = normalizations(text);
  for (let k = 0; k < norms.length; k++) {
    const normFn = (s: string) => {
      const v = normalizations(s);
      return v[Math.min(k, v.length - 1)];
    };
    const hit = findPhrase(phraseStems(phrase, normFn), tokenize(norms[k]));
    if (!hit) continue;
    if (!best || (best.negated && !hit.negated) || (best.negated === hit.negated && hit.at < best.at)) best = hit;
  }
  return best;
}

/* --------------------------------------------------------------------------- don't know */

const DONT_KNOW = ['ما ادري', 'مدري', 'ما اعرف', 'لا اعرف', 'لا ادري', 'ما عرفت', 'ما اعرفه', 'مااعرف', 'مادري'];

export function saysDontKnow(text: string): boolean {
  const n = ` ${basicNormalize(text)} `;
  return DONT_KNOW.some((p) => n.includes(` ${p} `));
}

/* ------------------------------------------------------------------------------ yes / no */

const YES = new Set(['نعم', 'ايه', 'ايوه', 'ايوا', 'ايوة', 'اي', 'صح', 'صحيح', 'اكيد', 'امن', 'يس']);
const NO = new Set(['لا', 'لاء', 'لااا', 'لاا', 'ابد', 'ابدا', 'مو', 'مب', 'غلط', 'خطا', 'كلا', 'مستحيل', 'خطر', 'خطير', 'نو']);

/** The plan's yes/no rule: the first yes or no word wins. «ما» counts as no only at the start. */
export function readYesNo(text: string): 'yes' | 'no' | null {
  const raw = basicNormalize(text).split(' ').filter(Boolean);
  for (let i = 0; i < raw.length; i++) {
    let w = raw[i];
    if (w.length > 2 && w.startsWith('و') && (YES.has(w.slice(1)) || NO.has(w.slice(1)))) w = w.slice(1);
    // «اكيد لا» / «اكيد ما» = no: an intensifier followed by a negation.
    if ((w === 'اكيد' || w === 'طبعا') && i + 1 < raw.length && (NO.has(raw[i + 1]) || raw[i + 1] === 'ما')) return 'no';
    if (YES.has(w)) return 'yes';
    if (NO.has(w)) return 'no';
    if (w === 'ما' && (i === 0 || raw[i - 1] === 'لا')) return 'no';
    if (w.startsWith('لا') && w.length >= 3 && /^ل?ا+$/.test(w)) return 'no';
  }
  return null;
}

/* -------------------------------------------------------------------------------- choice */

const LETTERS: Record<ChoiceLetter, { names: string[]; ordinals: string[] }> = {
  أ: { names: ['ا', 'الف', 'الالف', 'اليف'], ordinals: ['الاول', 'الاولي', 'اول', 'واحد', '1'] },
  ب: { names: ['ب', 'باء', 'با', 'الباء', 'البا'], ordinals: ['الثاني', 'الثانيه', 'ثاني', 'ثانيه', 'اثنين', 'اثنان', '2'] },
  ج: { names: ['ج', 'جيم', 'الجيم', 'جيمم'], ordinals: ['الثالث', 'الثالثه', 'ثالث', 'ثالثه', 'ثلاثه', 'ثلاث', '3'] },
};
const LETTER_ORDER: ChoiceLetter[] = ['أ', 'ب', 'ج'];

function firstToken(raw: string[], set: string[]): number {
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    if (set.includes(w)) return i;
    if (w.length > 1 && (w.startsWith('و') || w.startsWith('ف')) && set.includes(w.slice(1))) return i;
  }
  return -1;
}

function earliestLetter(raw: string[], field: 'names' | 'ordinals'): ChoiceLetter | null {
  let best: { l: ChoiceLetter; at: number } | null = null;
  for (const l of LETTER_ORDER) {
    const at = firstToken(raw, LETTERS[l][field]);
    if (at >= 0 && (!best || at < best.at)) best = { l, at };
  }
  return best?.l ?? null;
}

/** Content words of each option that the other options do not share. */
/** Words of an option that follow a negation in the option itself («لا أنظر»): they count less. */
function weakWords(text: string): Set<string> {
  const raw = basicNormalize(text).split(' ').filter(Boolean);
  const weak = new Set<string>();
  raw.forEach((w, i) => {
    if (i > 0 && NEG.has(raw[i - 1])) weak.add(w);
  });
  return weak;
}

function optionKeywords(q: ExamQuestion): Record<ChoiceLetter, string[]> {
  const opts = q.options ?? [];
  const words = opts.map((o) => new Set(tokenize(basicNormalize(o.text)).content.map((t) => t.raw).filter((w) => !NEG.has(w) && w.length >= 2)));
  const stems = words.map((set) => new Set([...set].map(stem)));
  const out = { أ: [], ب: [], ج: [] } as Record<ChoiceLetter, string[]>;
  opts.forEach((o, i) => {
    out[o.letter] = [...words[i]].filter((w) => !stems.some((other, j) => j !== i && other.has(stem(w))));
  });
  return out;
}

/** Which option the answer points to (or null). */
export function readChoice(q: ExamQuestion, text: string): ChoiceLetter | null {
  const raw = basicNormalize(text).split(' ').filter(Boolean);
  if (!raw.length) return null;
  // 1. A letter name said on its own.
  const named = earliestLetter(raw, 'names');
  if (named) return named;
  // 2. Option keywords (a spoken variant of the correct option counts when no keyword hit). Ties: the earliest mention.
  const kw = optionKeywords(q);
  let best: { l: ChoiceLetter; score: number; at: number } | null = null;
  let tie = false;
  for (const l of LETTER_ORDER) {
    let score = 0;
    let at = Infinity;
    const weak = weakWords(q.options?.find((o) => o.letter === l)?.text ?? '');
    for (const w of kw[l]) {
      const h = search(w, text);
      if (h && !h.negated) {
        score += weak.has(w) ? 0.5 : 1;
        at = Math.min(at, h.at);
      }
    }
    if (l === q.answer && score === 0)
      for (const v of q.spoken ?? []) {
        const h = search(v, text);
        if (h && !h.negated) {
          score += 1;
          at = Math.min(at, h.at);
        }
      }
    if (score <= 0) continue;
    if (!best || score > best.score || (score === best.score && at < best.at)) {
      tie = !!best && score === best.score && at === best.at;
      best = { l, score, at };
    } else if (score === best.score && at === best.at) tie = true;
  }
  if (best && !tie) return best.l;
  // 3. Ordinals (الأول / الثاني / الثالث), last because «أول» also means "first" in answers.
  return earliestLetter(raw, 'ordinals');
}

/* ---------------------------------------------------------------------------------- open */

export function readOpen(q: ExamQuestion, text: string): { concepts: string[]; wrongHits: string[] } {
  const concepts: string[] = [];
  for (const c of q.concepts ?? []) {
    if (c.words.some((w) => {
      const h = search(w, text);
      return !!h && !h.negated;
    }))
      concepts.push(c.id);
  }
  const wrongHits = (q.wrongWords ?? []).filter((w) => {
    const h = search(w, text);
    return !!h && !h.negated;
  });
  return { concepts, wrongHits };
}

/** The pass rule of an open question. */
export function openPasses(q: ExamQuestion, concepts: string[], wrongHits: string[]): boolean {
  if (wrongHits.length) return false;
  const min = q.pass?.minConcepts ?? 1;
  if (concepts.length < min) return false;
  const any = q.pass?.requireAnyOf;
  if (any && any.length && !any.some((id) => concepts.includes(id))) return false;
  return true;
}

/* --------------------------------------------------------------------------------- judge */

/** Judge a spoken (or typed) answer offline. 'unclear' means: ask again / show the buttons. */
export function judgeAnswer(q: ExamQuestion, text: string): Judgement {
  const t = (text ?? '').trim();
  if (!basicNormalize(t)) return { verdict: 'unclear', reason: 'empty' };
  if (q.kind === 'yesno') {
    const yn = readYesNo(t);
    if (yn) return { verdict: yn === q.answer ? 'correct' : 'wrong', picked: yn, reason: `said ${yn}` };
    if (saysDontKnow(t)) return { verdict: 'wrong', reason: "doesn't know" };
    return { verdict: 'unclear', reason: 'no yes/no word' };
  }
  if (q.kind === 'choice') {
    const l = readChoice(q, t);
    if (l) return { verdict: l === q.answer ? 'correct' : 'wrong', picked: l, reason: `picked ${l}` };
    if (saysDontKnow(t)) return { verdict: 'wrong', reason: "doesn't know" };
    return { verdict: 'unclear', reason: 'no option recognised' };
  }
  const { concepts, wrongHits } = readOpen(q, t);
  if (concepts.length || wrongHits.length) {
    const pass = openPasses(q, concepts, wrongHits);
    return { verdict: pass ? 'correct' : 'wrong', concepts, wrongHits, reason: pass ? 'concepts ok' : wrongHits.length ? 'wrong words' : 'not enough concepts' };
  }
  if (saysDontKnow(t)) return { verdict: 'wrong', concepts, wrongHits, reason: "doesn't know" };
  return { verdict: 'unclear', concepts, wrongHits, reason: 'no concept found' };
}

/** Judge a tapped answer: a choice letter, 'yes'/'no', or an open-question card index. */
export function judgeTap(q: ExamQuestion, pick: ChoiceLetter | 'yes' | 'no' | number): boolean {
  if (q.kind === 'open') return typeof pick === 'number' && !!q.cards?.[pick]?.correct;
  return pick === q.answer;
}

/** The phase question: «قبل» / «بعد» (first one wins). */
export function readPhase(text: string): 'pre' | 'post' | null {
  const raw = basicNormalize(text).split(' ').filter(Boolean);
  for (const w of raw) {
    const s = stem(w);
    if (s === 'قبل' || w === 'قبل' || w === 'قبله') return 'pre';
    if (s === 'بعد' || w === 'بعد' || w === 'بعده' || w === 'بعدين') return 'post';
  }
  return null;
}
