// Decision rules (docs/plan/Voice_and_AI.md, docs/ARCHITECTURE.md "Matching"). Pure: scores in, result out.
import type { ModeId } from '../core/types';
import type { CorpusItem, ItemList } from './corpus';

export const BAND_MATCH = 0.55;
export const BAND_CLOSE = 0.4;
export const CROSS_MIN = 0.65;
export const CROSS_GAP = 0.15;
export const TIE_GAP = 0.05;

export interface Ranked {
  item: CorpusItem;
  score: number;
}

export interface Decision {
  winner: Ranked | null;
  runnerUp: Ranked | null;
  band: 'match' | 'close' | 'low';
  /** True when the winner came from another mode's list (cross-mode rule). */
  cross: boolean;
}

/** Lists each mode searches as its own (primary) lists. Exam and creative do not use this matcher. */
export function primaryLists(mode: ModeId): ItemList[] | null {
  switch (mode) {
    case 'outside':
      return ['outside', 'intro'];
    case 'inside':
      return ['inside', 'intro'];
    case 'short':
      return ['short', 'intro'];
    default:
      return null;
  }
}

export function bandOf(score: number): 'match' | 'close' | 'low' {
  return score >= BAND_MATCH ? 'match' : score >= BAND_CLOSE ? 'close' : 'low';
}

/**
 * Rank the mode's own lists. An item from another list (inside <-> outside, short <-> scenarios) wins only when it
 * scores at least 0.65 and 0.15 above the best of the current mode; any closer contest, including the
 * short-answer vs scenario tie, goes to the current mode's own list (short answer in short mode, scenario elsewhere).
 */
export function decide(all: Ranked[], mode: ModeId): Decision {
  const lists = primaryLists(mode);
  if (!lists || all.length === 0) return { winner: null, runnerUp: null, band: 'low', cross: false };
  const byScore = (a: Ranked, b: Ranked) => b.score - a.score;
  const own = all.filter((r) => lists.includes(r.item.list)).sort(byScore);
  const other = all.filter((r) => !lists.includes(r.item.list)).sort(byScore);
  const bestOwn = own[0] ?? null;
  let bestOther = other[0] ?? null;
  // Short answer vs scenario within 0.05: the scenario wins outside short mode (the short answer wins in short mode, where
  // the short answers are the mode's own list and are never in `other`).
  if (bestOther && mode !== 'short' && bestOther.item.kind === 'short') {
    const sc = other.find((r) => r.item.kind === 'scenario' && bestOther!.score - r.score <= TIE_GAP);
    if (sc) bestOther = sc;
  }
  let winner = bestOwn;
  let runnerUp = own[1] ?? null;
  let cross = false;
  if (bestOther && (!bestOwn || (bestOther.score >= CROSS_MIN && bestOther.score >= bestOwn.score + CROSS_GAP))) {
    winner = bestOther;
    runnerUp = bestOwn;
    cross = true;
  }
  if (!winner) return { winner: null, runnerUp: null, band: 'low', cross: false };
  return { winner, runnerUp, band: bandOf(winner.score), cross };
}
