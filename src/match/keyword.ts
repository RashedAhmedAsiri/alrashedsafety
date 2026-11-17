// Keyword score: BM25-style weighting over the example questions plus weighted keyword hits, calibrated to 0..1.
import { getCorpus, type CorpusItem } from './corpus';
import { matchTokens, tokensMatch } from './normalize';

/** Tunables (see docs/matcher.md). */
export const KW = {
  k1: 1.2,
  b: 0.5,
  /** Share of the query's term weight a example must cover vs the share of the example's weight the query covers. */
  queryShare: 0.72,
  /** Weight of the example-similarity part vs the keyword-hit part. */
  exampleMix: 0.62,
  /** Keyword weight sum that saturates the hit part (1 - exp(-H / hitScale)). */
  hitScale: 2.6,
  /** Output curve: score = raw ^ curve. Pushes weak partial overlaps down, keeps near copies near 1. */
  curve: 1.35,
  /** Minimum factor for the question-coverage term (0 = unexplained questions score 0). */
  coverFloor: 0.15,
};

interface ExampleDoc {
  tokens: string[];
  set: Set<string>;
}
interface IndexedItem {
  item: CorpusItem;
  /** Every token of the item's examples and keywords. */
  vocab: Set<string>;
  examples: ExampleDoc[];
  keywords: { tokens: string[]; weight: number }[];
}
interface Index {
  items: IndexedItem[];
  df: Map<string, number>;
  nDocs: number;
  avgLen: number;
  maxIdf: number;
  vocab: string[];
}

let index: Index | null = null;

function build(): Index {
  const items: IndexedItem[] = [];
  const df = new Map<string, number>();
  let nDocs = 0;
  let totalLen = 0;
  for (const item of getCorpus()) {
    const examples: ExampleDoc[] = [];
    for (const text of item.texts) {
      const tokens = matchTokens(text);
      if (!tokens.length) continue;
      const set = new Set(tokens);
      examples.push({ tokens, set });
      nDocs++;
      totalLen += tokens.length;
      for (const t of set) df.set(t, (df.get(t) ?? 0) + 1);
    }
    const keywords = item.keywords
      .map((k) => ({ tokens: matchTokens(k.word), weight: k.weight }))
      .filter((k) => k.tokens.length > 0);
    const vocab = new Set<string>();
    for (const ex of examples) for (const t of ex.set) vocab.add(t);
    for (const k of keywords) for (const t of k.tokens) vocab.add(t);
    items.push({ item, vocab, examples, keywords });
  }
  const maxIdf = idfOf(0, nDocs);
  return { items, df, nDocs, avgLen: totalLen / Math.max(1, nDocs), maxIdf, vocab: [...df.keys()] };
}

function idfOf(n: number, N: number): number {
  return Math.log(1 + (N - n + 0.5) / (n + 0.5));
}

function getIndex(): Index {
  return (index ??= build());
}

export function resetKeywordIndex(): void {
  index = null;
}

function termIdf(ix: Index, t: string): number {
  // Typo-tolerant document frequency: a term unseen exactly but close to a vocabulary word borrows its frequency.
  let n = ix.df.get(t);
  if (n === undefined) {
    if (t.length >= 5) for (const v of ix.vocab) if (tokensMatch(t, v) > 0) n = Math.max(n ?? 0, ix.df.get(v) ?? 0);
  }
  return idfOf(n ?? 0, ix.nDocs);
}

function hasToken(set: Set<string>, tokens: string[], t: string): number {
  if (set.has(t)) return 1;
  if (t.length < 5) return 0;
  let best = 0;
  for (const d of tokens) {
    const m = tokensMatch(t, d);
    if (m > best) best = m;
  }
  return best;
}

export interface KeywordScores {
  /** Calibrated 0..1 per corpus item key. */
  scores: Map<string, number>;
  /** Number of query tokens (after stop-word removal). 0 means nothing to match. */
  tokenCount: number;
}

export function keywordScores(text: string): KeywordScores {
  const ix = getIndex();
  const q = [...new Set(matchTokens(text))];
  const scores = new Map<string, number>();
  if (!q.length) {
    for (const it of ix.items) scores.set(it.item.key, 0);
    return { scores, tokenCount: 0 };
  }
  const qIdf = q.map((t) => termIdf(ix, t));
  const qSum = qIdf.reduce((a, b) => a + b, 0);
  const qSet = new Set(q);

  for (const it of ix.items) {
    // ---- example similarity: best example document, BM25 term weights, both directions
    let bestEx = 0;
    for (const ex of it.examples) {
      const norm = 1 - KW.b + (KW.b * ex.tokens.length) / ix.avgLen;
      const dl = KW.k1 * norm;
      let matched = 0;
      for (let i = 0; i < q.length; i++) {
        const m = hasToken(ex.set, ex.tokens, q[i]);
        if (m > 0) matched += qIdf[i] * m * ((KW.k1 + 1) / (1 + dl));
      }
      const qFull = qSum * ((KW.k1 + 1) / (1 + dl));
      // the example's own weight, under the same length normalisation
      let dSum = 0;
      for (const t of ex.set) dSum += termIdf(ix, t);
      dSum *= (KW.k1 + 1) / (1 + dl);
      const simQ = qFull > 0 ? matched / qFull : 0;
      const simD = dSum > 0 ? matched / dSum : 0;
      const s = KW.queryShare * simQ + (1 - KW.queryShare) * Math.min(1, simD * 1.6);
      if (s > bestEx) bestEx = s;
    }
    // ---- weighted keyword hits
    let hits = 0;
    for (const k of it.keywords) {
      let ok = true;
      for (const t of k.tokens) {
        if (!qSet.has(t) && !q.some((x) => tokensMatch(x, t) > 0)) {
          ok = false;
          break;
        }
      }
      if (ok) hits += k.weight;
    }
    const hitScore = 1 - Math.exp(-hits / KW.hitScale);
    // Share of the question's weight that this item's vocabulary explains. Unknown words (a question about
    // something else) pull it down, so one shared word like «الجو» or «اسم» cannot carry an off-topic question.
    let covered = 0;
    for (let i = 0; i < q.length; i++) if (hasToken(it.vocab, [...it.vocab], q[i]) > 0) covered += qIdf[i];
    const cover = qSum > 0 ? covered / qSum : 0;
    const raw = (KW.coverFloor + (1 - KW.coverFloor) * cover) * (KW.exampleMix * Math.min(1, bestEx) + (1 - KW.exampleMix) * hitScore);
    // A query that matches an example nearly exactly should not be dragged down by missing keyword hits.
    const lifted = Math.max(raw, Math.min(1, bestEx) * cover * 0.97);
    scores.set(it.item.key, Math.min(1, Math.pow(Math.max(0, lifted), KW.curve)));
  }
  return { scores, tokenCount: q.length };
}
