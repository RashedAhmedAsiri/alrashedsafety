import { describe, expect, test, vi } from 'vitest';

const tb = vi.hoisted(() => ({ calls: [] as unknown[], pick: null as string | null }));
vi.mock('../backend/api', () => ({
  tieBreak: async (_q: string, ids: [string, string]) => {
    tb.calls.push(ids);
    return tb.pick;
  },
  isOnline: () => true,
}));
vi.mock('./keyword', async () => {
  const { getCorpus } = await import('./corpus');
  return {
    keywordScores: () => {
      const scores = new Map<string, number>();
      for (const it of getCorpus()) scores.set(it.key, 0);
      scores.set('scenario:heavy_rain', 0.47);
      scores.set('scenario:dust_storm', 0.45);
      return { scores, tokenCount: 2 };
    },
  };
});

import { matchQuestionAsync } from './index';

describe('Gemini tie-break', () => {
  test('asked only when online, close band and top two within 0.05', async () => {
    tb.calls.length = 0;
    tb.pick = 'dust_storm';
    const r = await matchQuestionAsync('سؤال', 'outside', { online: true });
    expect(tb.calls).toEqual([['heavy_rain', 'dust_storm']]);
    expect(r.id).toBe('dust_storm');
    expect(r.band).toBe('close');
  });
  test('offline or null answer keeps the best match', async () => {
    tb.calls.length = 0;
    const off = await matchQuestionAsync('سؤال', 'outside', { online: false });
    expect(tb.calls.length).toBe(0);
    expect(off.id).toBe('heavy_rain');
    tb.pick = null;
    const nul = await matchQuestionAsync('سؤال', 'outside', { online: true });
    expect(nul.id).toBe('heavy_rain');
  });
});
