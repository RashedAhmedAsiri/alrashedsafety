// Arabic normalisation for matching. Pure functions, no browser APIs (also runs in node tests and tools).
import { SYNONYMS } from './synonyms';

const DIACRITICS = /[ً-ٰٟۖ-ۭ࣓-ࣿ]/g;
const MAP: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ة': 'ه', 'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي',
  'ک': 'ك', 'ی': 'ي', 'ە': 'ه', 'ڤ': 'ف', 'پ': 'ب', 'چ': 'ج', 'گ': 'ك', 'ھ': 'ه', 'ہ': 'ه', 'ۃ': 'ه',
};
const DIGITS: Record<string, string> = {};
'٠١٢٣٤٥٦٧٨٩'.split('').forEach((d, i) => (DIGITS[d] = String(i)));
'۰۱۲۳۴۵۶۷۸۹'.split('').forEach((d, i) => (DIGITS[d] = String(i)));

/** Character-level normalisation only (no dialect mapping, no stemming). */
export function normalizeChars(text: string): string {
  let s = (text ?? '').normalize('NFKC').toLowerCase();
  s = s.replace(DIACRITICS, '').replace(/ـ/g, '');
  s = s.replace(/[أإآٱةىؤئکیەڤپچگھہۃ]/g, (c) => MAP[c] ?? c);
  s = s.replace(/[٠-٩۰-۹]/g, (c) => DIGITS[c] ?? c);
  s = s.replace(/ء/g, '');
  s = s.replace(/[^ء-غف-ي a-z0-9]/g, ' ');
  // «لييييش» -> «ليش»: three or more of the same letter collapse to one.
  s = s.replace(/([ء-ي])\1{2,}/g, '$1');
  return s.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- synonyms
const WORD_MAP = new Map<string, string>();
const PHRASE_MAPS: Map<string, string>[] = [new Map(), new Map(), new Map(), new Map(), new Map()]; // index = word count
for (const e of SYNONYMS) {
  const to = normalizeChars(e.to);
  for (const f of e.from) {
    const key = normalizeChars(f);
    if (!key) continue;
    const n = key.split(' ').length;
    if (n === 1) {
      if (!WORD_MAP.has(key)) WORD_MAP.set(key, to);
    } else if (n <= 4) {
      if (!PHRASE_MAPS[n].has(key)) PHRASE_MAPS[n].set(key, to);
    }
  }
}

const LONG_PREFIXES = ['وال', 'بال', 'كال', 'فال', 'لل', 'ال'];
const ONE_PREFIXES = ['و', 'ف', 'ب', 'ل', 'ك'];
// Not «ه»: it is mostly the ta marbuta (مدرسه), and stripping it would turn nouns into other words (مدرس).
const PRONOUN_SUFFIXES = ['ها', 'هم', 'هن', 'كم', 'نا', 'ني', 'ي', 'ك'];

function prefixVariants(w: string): string[] {
  const out: string[] = [];
  for (const p of [...LONG_PREFIXES, ...ONE_PREFIXES]) {
    if (w.startsWith(p) && w.length - p.length >= 2) {
      const rest = w.slice(p.length);
      out.push(rest);
      if (p !== 'ال' && p !== 'لل') for (const q of ['ال', 'ل', 'ب']) if (rest.startsWith(q) && rest.length - q.length >= 2) out.push(rest.slice(q.length));
    }
  }
  return out;
}

function lookupWord(w: string): string | undefined {
  const direct = WORD_MAP.get(w);
  if (direct !== undefined) return direct;
  const variants = [w, ...prefixVariants(w)];
  for (const v of variants) {
    if (v !== w && v.length >= 3) {
      const r = WORD_MAP.get(v);
      if (r !== undefined) return r;
    }
    for (const s of PRONOUN_SUFFIXES) {
      if (v.endsWith(s) && v.length - s.length >= 3) {
        const r = WORD_MAP.get(v.slice(0, -s.length));
        if (r !== undefined) return r;
      }
    }
  }
  return undefined;
}

/** Map dialect words and phrases to standard words; returns the new token list. */
export function applySynonyms(tokens: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let done = false;
    for (let n = Math.min(4, tokens.length - i); n >= 2 && !done; n--) {
      const hit = PHRASE_MAPS[n].get(tokens.slice(i, i + n).join(' '));
      if (hit !== undefined) {
        if (hit) out.push(...hit.split(' '));
        i += n;
        done = true;
      }
    }
    if (done) continue;
    const r = lookupWord(tokens[i]);
    if (r !== undefined) {
      if (r) out.push(...r.split(' '));
    } else out.push(tokens[i]);
    i++;
  }
  return out;
}

/**
 * Full normalisation used everywhere: characters, then dialect -> standard mapping. Not stemmed (use
 * `matchTokens` for matching tokens), so the result is still readable Arabic.
 */
export function normalize(text: string): string {
  const t = normalizeChars(text);
  return t ? applySynonyms(t.split(' ')).join(' ') : '';
}

// ---------------------------------------------------------------- stemming
const LONG_P = ['وال', 'بال', 'كال', 'فال', 'لل', 'ال'];
const SUF_A = ['كم', 'هم', 'هن', 'ها', 'نا', 'ني', 'تي'];
const SUF_B = ['ات', 'ان', 'ين', 'ون', 'وا', 'تم'];
const SUF_C = ['ه', 'ي', 'ك', 'ت', 'ا'];

/** Light stem: one prefix (و ف ب ل ال وال بال لل ...), verb prefix (ي ت ن ا) and up to two suffixes. */
export function stem(word: string): string {
  let w = word;
  if (w.length <= 3 || !/^[ء-ي]+$/.test(w)) return w;
  let cut = false;
  for (const p of LONG_P) {
    if (w.startsWith(p) && w.length - p.length >= 3) {
      w = w.slice(p.length);
      cut = true;
      break;
    }
  }
  if (!cut) {
    for (const p of ['و', 'ف', 'ب', 'ل', 'ك']) {
      if (w.startsWith(p) && w.length - 1 >= 4) {
        w = w.slice(1);
        break;
      }
    }
  }
  if (w.length >= 5 && 'يتنا'.includes(w[0])) w = w.slice(1);
  for (let pass = 0; pass < 2; pass++) {
    let stripped = false;
    for (const list of [SUF_A, SUF_B, SUF_C]) {
      for (const s of list) {
        if (w.endsWith(s) && w.length - s.length >= 3) {
          w = w.slice(0, -s.length);
          stripped = true;
          break;
        }
      }
      if (stripped) break;
    }
    if (!stripped) break;
  }
  return w;
}

const STOP = new Set(
  [
    'ماذا', 'لماذا', 'كيف', 'اين', 'متى', 'من', 'هل', 'في', 'على', 'الي', 'عن', 'مع', 'ان', 'اذا', 'ما', 'يا', 'انا',
    'انت', 'انتي', 'هو', 'هي', 'هذا', 'هذه', 'ذلك', 'او', 'ثم', 'اريد', 'ممكن', 'يمكن', 'قد', 'هنا', 'هناك', 'ايضا', 'كان',
    'الان', 'طيب', 'لو', 'يعني', 'الي', 'اللي', 'الذي', 'التي', 'بس', 'ب', 'و', 'ف', 'ل', 'اي', 'ده', 'هاد', 'هذي', 'ذي',
    'عندي', 'عند', 'لي', 'لنا', 'نحن', 'ايش', 'وش', 'يلا', 'والله', 'لكن', 'تقدر', 'اقدر', 'نقدر', 'يقدر', 'اسوي', 'نسوي', 'تسوي', 'يسوي', 'افعل', 'نفعل', 'تفعل',
  ].map((w) => normalizeChars(w)),
);

/** Tokens used for matching: normalised, dialect-mapped, stop words removed, stemmed. */
export function matchTokens(text: string): string[] {
  const t = normalize(text);
  if (!t) return [];
  const all = t.split(' ').filter(Boolean);
  const kept = all.filter((w) => !STOP.has(w));
  // «من أنت» is all stop words but is a real question: keep them when nothing else is left.
  const out: string[] = [];
  for (const w of kept.length ? kept : all) {
    const s = stem(w);
    if (s.length >= 2 || /^[0-9a-z]+$/.test(s)) out.push(s);
  }
  return out;
}

/** Token equality with a small typo tolerance (speech recognition errors, spelling). */
export function tokensMatch(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (la < 5 || lb < 5 || Math.abs(la - lb) > 1 || a[0] !== b[0]) return 0;
  const max = la >= 9 ? 2 : 1;
  return editDistanceWithin(a, b, max) ? 0.8 : 0;
}

function editDistanceWithin(a: string, b: string, max: number): boolean {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[n] <= max;
}
