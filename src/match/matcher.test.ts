import { describe, expect, test, afterEach } from 'vitest';
import { getCorpus } from './corpus';
import { matchQuestion, rankQuestion, matchQuestionAsync, normalizeArabic, setEmbedder, whenMatcherReady } from './index';
import { matchTokens, stem } from './normalize';
import { SCENARIO_HELDOUT, SHORT_HELDOUT, OFF_TOPIC } from './heldout';
import { decide, type Ranked } from './decide';
import { packVector, unpackVector, type Embedder } from './embedder';
import type { ModeId } from '../core/types';

const modeOf = (list: string): ModeId => (list === 'inside' ? 'inside' : list === 'short' ? 'short' : 'outside');
const items = getCorpus();

describe('normalizer', () => {
  test('characters', () => {
    expect(normalizeArabic('أَعْبُرُ الشَّارِعَ')).toBe('اعبر الشارع');
    expect(normalizeArabic('لييييش')).toBe('لماذا');
    expect(normalizeArabic('حقيبة ١٢٣')).toBe('حقيبه 123');
    expect(normalizeArabic('مــــلعب!!!؟')).toBe('ملعب');
    expect(normalizeArabic('  شيء   ')).toBe('شي');
  });
  test('dialect to standard', () => {
    expect(normalizeArabic('أبي أنزل من الباص')).toBe('اريد انزل من الحافله');
    expect(normalizeArabic('وش أسوي إذا طاح')).toContain('ماذا');
    expect(normalizeArabic('انجرحت خشمي')).toBe('جرحت انفي');
    expect(normalizeArabic('وين الطفاية')).toBe('اين طفايه الحريق');
  });
  test('stemming is consistent', () => {
    expect(matchTokens('الحافلات')).toEqual(matchTokens('حافلة'));
    expect(stem('بالباص')).toBe(stem('الباص'));
    expect(matchTokens('كم عمرك')).toBeTruthy();
  });
});

describe('own examples', () => {
  test('every example/ask matches its own item', () => {
    let ok = 0, total = 0;
    const bad: string[] = [];
    for (const it of items) {
      for (const t of it.texts) {
        total++;
        const r = matchQuestion(t, modeOf(it.list));
        if (r.kind === it.kind && r.id === it.id) ok++;
        else bad.push(`${it.key} «${t}» -> ${r.kind}:${r.id} ${r.score.toFixed(2)}`);
        if (r.kind === it.kind && r.id === it.id) expect(r.score).toBeGreaterThanOrEqual(0.85);
      }
    }
    const rate = ok / total;
    console.log(`self top-1 ${ok}/${total} = ${(rate * 100).toFixed(1)}%\n${bad.join('\n')}`);
    expect(rate).toBeGreaterThanOrEqual(0.97);
  });
});

describe('held-out paraphrases', () => {
  test('scenarios', () => {
    let ok = 0, total = 0;
    const bad: string[] = [];
    for (const it of items.filter((i) => i.kind === 'scenario')) {
      const qs = SCENARIO_HELDOUT[it.id];
      expect(qs?.length, it.id).toBeGreaterThanOrEqual(3);
      for (const q of qs) {
        total++;
        const r = rankQuestion(q, modeOf(it.list))[0];
        if (r.kind === 'scenario' && r.id === it.id) ok++;
        else bad.push(`${it.id} «${q}» -> ${r.kind}:${r.id} ${r.score.toFixed(2)}`);
      }
    }
    console.log(`held-out scenarios ${ok}/${total} = ${((ok / total) * 100).toFixed(1)}%\n${bad.join('\n')}`);
    expect(ok / total).toBeGreaterThanOrEqual(0.85);
  });
  test('short answers', () => {
    let ok = 0, total = 0;
    const bad: string[] = [];
    expect(Object.keys(SHORT_HELDOUT).length).toBeGreaterThanOrEqual(15);
    for (const [id, qs] of Object.entries(SHORT_HELDOUT)) {
      expect(qs.length).toBeGreaterThanOrEqual(3);
      for (const q of qs) {
        total++;
        const r = rankQuestion(q, 'short')[0];
        if (r.kind === 'short' && r.id === id) ok++;
        else bad.push(`${id} «${q}» -> ${r.kind}:${r.id} ${r.score.toFixed(2)}`);
      }
    }
    console.log(`held-out short ${ok}/${total} = ${((ok / total) * 100).toFixed(1)}%\n${bad.join('\n')}`);
    expect(ok / total).toBeGreaterThanOrEqual(0.85);
  });
});

describe('off-topic', () => {
  test('at least 20 dialect questions are band low in every mode', () => {
    expect(OFF_TOPIC.length).toBeGreaterThanOrEqual(20);
    const bad: string[] = [];
    for (const q of OFF_TOPIC) for (const m of ['outside', 'inside', 'short'] as ModeId[]) {
      const r = matchQuestion(q, m);
      if (r.band !== 'low' || r.kind !== 'intro') bad.push(`${m} «${q}» -> ${r.kind}:${r.id} ${r.score.toFixed(2)} ${r.band}`);
    }
    console.log(`off-topic failures: ${bad.length}\n${bad.join('\n')}`);
    expect(bad).toEqual([]);
  });
  test('empty and non-matcher modes', () => {
    expect(matchQuestion('', 'outside').band).toBe('low');
    expect(matchQuestion('؟؟', 'short').band).toBe('low');
    expect(matchQuestion('كيف أنزل من الباص', 'exam').band).toBe('low');
    expect(matchQuestion('كيف أنزل من الباص', 'creative').kind).toBe('intro');
  });
  test('intro question matches the intro', () => {
    const r = matchQuestion('من أنت', 'inside');
    expect(r.kind).toBe('intro');
    expect(r.band).toBe('match');
  });
});

describe('mode and tie rules (decide)', () => {
  const mk = (list: 'outside' | 'inside' | 'short' | 'intro', id: string, score: number): Ranked => ({
    item: { key: `${list}:${id}`, kind: list === 'short' ? 'short' : list === 'intro' ? 'intro' : 'scenario', id, list, texts: [], keywords: [] },
    score,
  });
  test('cross wins when clear', () => {
    const d = decide([mk('outside', 'a', 0.5), mk('inside', 'x', 0.7)], 'outside');
    expect(d.winner?.item.id).toBe('x');
    expect(d.cross).toBe(true);
  });
  test('cross loses below 0.65 or without the gap', () => {
    expect(decide([mk('outside', 'a', 0.4), mk('inside', 'x', 0.6)], 'outside').winner?.item.id).toBe('a');
    expect(decide([mk('outside', 'a', 0.62), mk('inside', 'x', 0.7)], 'outside').winner?.item.id).toBe('a');
  });
  test('short vs scenario ties go to the current mode list', () => {
    const all = [mk('short', 's', 0.8), mk('outside', 'o', 0.82)];
    expect(decide(all, 'short').winner?.item.id).toBe('s');
    expect(decide(all, 'outside').winner?.item.id).toBe('o');
  });
  test('bands and low -> intro', () => {
    expect(decide([mk('outside', 'a', 0.56)], 'outside').band).toBe('match');
    expect(decide([mk('outside', 'a', 0.45)], 'outside').band).toBe('close');
    expect(decide([mk('outside', 'a', 0.39)], 'outside').band).toBe('low');
  });
  test('real content: inside question asked in outside mode', () => {
    const r = matchQuestion('كيف أستخدم طفاية الحريق', 'outside');
    expect(r.id).toBe('fire_extinguisher');
    const s = matchQuestion('انجرحت يدي وش أسوي', 'short');
    expect(s.kind).toBe('short');
  });
});

describe('meaning model (mocked) and tie-break', () => {
  afterEach(() => setEmbedder(null));
  // Deterministic fake: a bag of character trigrams hashed to 64 dims. Same text -> cosine 1.
  const fake: Embedder = {
    async embed(texts) {
      return texts.map((t) => {
        const v = new Float32Array(64);
        const s = ` ${t} `;
        for (let i = 0; i + 3 <= s.length; i++) {
          let h = 0;
          for (let j = i; j < i + 3; j++) h = (h * 31 + s.charCodeAt(j)) >>> 0;
          v[h % 64] += 1;
        }
        const n = Math.hypot(...v) || 1;
        return v.map((x) => x / n) as Float32Array;
      });
    },
  };
  test('final = 0.4 keyword + 0.6 meaning once ready', async () => {
    const q = 'كيف أنزل من الباص';
    setEmbedder(null);
    const kw = await matchQuestionAsync(q, 'outside', { online: false });
    setEmbedder(fake);
    expect(await whenMatcherReady()).toBe(true);
    const both = await matchQuestionAsync(q, 'outside', { online: false });
    expect(both.id).toBe('getting_out_of_bus');
    // identical text exists as an example -> meaning ~1 -> final ~ 0.4*kw + 0.6
    expect(both.score).toBeGreaterThan(0.4 * kw.score + 0.6 * 0.9);
    expect(both.score).toBeLessThanOrEqual(1);
  });
  test('model that fails degrades to keyword only', async () => {
    setEmbedder({ embed: async () => { throw new Error('no model'); } });
    expect(await whenMatcherReady()).toBe(false);
    const r = await matchQuestionAsync('كيف أنزل من الباص', 'outside', { online: false });
    expect(r.id).toBe('getting_out_of_bus');
  });
  test('vector packing round trip', () => {
    const v = new Float32Array([0.6, -0.8, 0]);
    const u = unpackVector(packVector(v));
    expect(u[0]).toBeCloseTo(0.6, 1);
    expect(u[1]).toBeCloseTo(-0.8, 1);
  });
});
