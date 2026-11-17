import type { ModeId } from '../core/types';
import { tieBreak, isOnline } from '../backend/api';
import { getCorpus } from './corpus';
import { keywordScores } from './keyword';
import { normalize } from './normalize';
import { decide, primaryLists, TIE_GAP, type Ranked, type Decision } from './decide';
import { meaningScores, startMeaning, isMeaningReady, WEIGHT_KEYWORD, WEIGHT_MEANING } from './embedder';

export type MatchKind = 'scenario' | 'short' | 'intro';
export interface MatchCandidate {
  kind: MatchKind;
  id: string;
  score: number;
}
export interface MatchResult extends MatchCandidate {
  /** 'match' >= 0.55, 'close' 0.40..0.55 (tie-break may apply), 'low' < 0.40 or off-topic -> intro. */
  band: 'match' | 'close' | 'low';
  runnerUp?: MatchCandidate;
}

/** Characters (diacritics, hamza, ta marbuta, digits, repeats, punctuation) plus dialect -> standard words. */
export function normalizeArabic(text: string): string {
  return normalize(text);
}

const LOW: MatchResult = { kind: 'intro', id: 'intro', score: 0, band: 'low' };

function cand(r: Ranked): MatchCandidate {
  return { kind: r.item.kind, id: r.item.id, score: r.score };
}

function toResult(d: Decision): MatchResult {
  if (!d.winner) return { ...LOW };
  const w = cand(d.winner);
  if (d.band === 'low') return { kind: 'intro', id: 'intro', score: w.score, band: 'low' };
  return { ...w, band: d.band, ...(d.runnerUp ? { runnerUp: cand(d.runnerUp) } : {}) };
}

function rank(text: string, meaning: Map<string, number> | null): Ranked[] | null {
  const { scores, tokenCount } = keywordScores(text);
  if (tokenCount === 0) return null;
  return getCorpus().map((item) => {
    const kw = scores.get(item.key) ?? 0;
    const m = meaning?.get(item.key);
    return { item, score: m === undefined ? kw : WEIGHT_KEYWORD * kw + WEIGHT_MEANING * m };
  });
}

/** Ranking of the mode's own lists only, best first (diagnostics and tests; no cross-mode rule). */
export function rankQuestion(text: string, mode: ModeId): MatchCandidate[] {
  const lists = primaryLists(mode);
  const ranked = lists ? rank(text, null) : null;
  if (!ranked || !lists) return [];
  return ranked.filter((r) => lists.includes(r.item.list)).sort((a, b) => b.score - a.score).map(cand);
}

/** Synchronous keyword match (always available, offline). */
export function matchQuestion(text: string, mode: ModeId): MatchResult {
  if (mode !== 'outside' && mode !== 'inside' && mode !== 'short') return { ...LOW };
  const ranked = rank(text, null);
  return ranked ? toResult(decide(ranked, mode)) : { ...LOW };
}

/** Full match: keyword + meaning model when loaded, Gemini tie-break when online. */
export async function matchQuestionAsync(text: string, mode: ModeId, opts?: { online?: boolean; signal?: AbortSignal }): Promise<MatchResult> {
  if (mode !== 'outside' && mode !== 'inside' && mode !== 'short') return { ...LOW };
  const meaning = isMeaningReady() ? await meaningScores(text) : null;
  const ranked = rank(text, meaning);
  if (!ranked) return { ...LOW };
  const result = toResult(decide(ranked, mode));
  const online = opts?.online ?? isOnline();
  const ru = result.runnerUp;
  if (result.band === 'close' && online && ru && result.score - ru.score <= TIE_GAP && ru.id !== result.id && !opts?.signal?.aborted) {
    try {
      const pick = await tieBreak(text, [result.id, ru.id], opts?.signal);
      if (pick === ru.id) {
        return { kind: ru.kind, id: ru.id, score: ru.score, band: 'close', runnerUp: { kind: result.kind, id: result.id, score: result.score } };
      }
    } catch {
      /* keep the keyword/meaning winner */
    }
  }
  return result;
}

/** Start loading the meaning model in the background (no-op if unsupported). */
export function warmUpMatcher(): void {
  void startMeaning();
}

/** Resolves true once the meaning model and example vectors are ready (false if unsupported). */
export function whenMatcherReady(): Promise<boolean> {
  return startMeaning();
}

export { setEmbedder } from './embedder';
