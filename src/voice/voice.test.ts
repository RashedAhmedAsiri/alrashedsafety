import { describe, it, expect, beforeEach } from 'vitest';
import { detectGender, applyGenderDetection, setManualGender } from './gender';
import { toSsml, cleanForVoice, ssmlBody, plainForVoice } from './ssml';
import { estimateDuration, pickVariant } from './speech';
import { chunkText, netTtsUrl } from './netTts';
import { allVoiceLines, scenarioLines, voiceKey } from '../content/voiceLines';
import { renderGender } from '../core/gender';
import { useApp } from '../core/store';

function voiced(f0: number, sr = 16000, sec = 1.2, seed = 1): Float32Array {
  const n = Math.floor(sr * sec);
  const x = new Float32Array(n);
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) - 0.5;
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let h = 1; h * f0 < 3500; h++) v += Math.sin((2 * Math.PI * h * f0 * i) / sr) / h;
    x[i] = 0.3 * v + 0.01 * rnd();
  }
  return x;
}

describe('gender detection', () => {
  it('low voice is boy, high voice is girl', () => {
    const b = detectGender(voiced(210), 16000)!;
    const g = detectGender(voiced(320), 16000)!;
    expect(b.gender).toBe('boy');
    expect(g.gender).toBe('girl');
    expect(b.confidence).toBeGreaterThan(0.75);
    expect(g.confidence).toBeGreaterThan(0.75);
  });
  it('returns null for silence and very short audio', () => {
    expect(detectGender(new Float32Array(16000), 16000)).toBeNull();
    expect(detectGender(voiced(300, 16000, 0.03), 16000)).toBeNull();
  });
  it('store rules: threshold and manual override', () => {
    useApp.getState().set({ gender: 'boy', genderManualUntil: 0, genderSource: 'default' as never });
    applyGenderDetection({ gender: 'girl', confidence: 0.6 });
    expect(useApp.getState().gender).toBe('boy');
    applyGenderDetection({ gender: 'girl', confidence: 0.9 });
    expect(useApp.getState().gender).toBe('girl');
    setManualGender('boy');
    applyGenderDetection({ gender: 'girl', confidence: 0.99 });
    expect(useApp.getState().gender).toBe('boy');
    expect(useApp.getState().genderSource).toBe('manual');
  });
});

describe('ssml', () => {
  it('strips ! and list numbers, converts .. to breaks', () => {
    expect(cleanForVoice('1. انتبه!')).toBe('انتبه');
    expect(ssmlBody('أ .. ب')).toContain('<break time="250ms"/>');
    expect(plainForVoice('أ .. ب')).toBe('أ، ب');
  });
  it('escapes xml and sets voice, rate, pitch', () => {
    const s = toSsml('a & b');
    expect(s).toContain('a &amp; b');
    expect(s).toContain('ar-SA-HamedNeural');
    expect(s).toContain('rate="0.92"');
    expect(s).toContain('pitch="+6%"');
  });
});

describe('estimateDuration', () => {
  it('ignores diacritics and grows with length', () => {
    const plain = estimateDuration('انتبه للطريق جيدا');
    const dia = estimateDuration('اِنْتَبِهْ لِلطَّرِيقِ جَيِّدًا');
    expect(Math.abs(plain - dia)).toBeLessThan(0.3);
    expect(estimateDuration('انتبه للطريق جيدا. ' + 'كلمة '.repeat(30))).toBeGreaterThan(plain * 3);
    expect(estimateDuration('')).toBeGreaterThan(0);
  });
});

describe('voice lines', () => {
  it('keys are unique and non-empty', () => {
    const lines = allVoiceLines();
    const keys = lines.map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const l of lines) expect(l.text.trim().length).toBeGreaterThan(0);
  });
  it('gendered flag matches markup and both renders differ', () => {
    for (const l of allVoiceLines().filter((x) => x.gendered)) {
      expect(renderGender(l.text, 'boy')).not.toBe(renderGender(l.text, 'girl'));
    }
  });
  it('scenarioLines order and pauses', () => {
    const sc = { id: 'x', text: { opening: 'a', must: ['b', 'c'], avoid: ['d'], slogan: 'e' } } as never;
    const l = scenarioLines(sc);
    expect(l.map((x) => x.key)).toEqual(['x.opening', 'lead.must', 'x.must.0', 'x.must.1', 'lead.avoid', 'x.avoid.0', 'x.slogan']);
    expect(l[0].pauseAfterMs).toBe(600);
    expect(l[2].pauseAfterMs).toBe(400);
    expect(l[3].pauseAfterMs).toBe(600);
    expect(l[l.length - 1].pauseAfterMs).toBe(0);
    expect(voiceKey.examScore(7)).toBe('exam.score.7');
  });
  it('pickVariant', () => {
    expect(pickVariant(['b'], 'girl')).toBe('b');
    expect(pickVariant(['b', 'g'], 'girl')).toBe('g');
    expect(pickVariant(undefined, 'boy')).toBeNull();
  });
});

describe('net tts chunking', () => {
  it('empty and tiny', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('  ... ')).toEqual([]);
    expect(chunkText('مرحبا')).toEqual(['مرحبا']);
  });
  it('merges short sentences under the limit', () => {
    expect(chunkText('أهلا. كيف حالك؟ أنا بخير!')).toEqual(['أهلا. كيف حالك؟ أنا بخير!']);
  });
  it('splits long text at sentence boundaries, in order, under 180', () => {
    const sentence = 'هذه جملة طويلة نوعا ما للاختبار ' .repeat(2).trim() + '.';
    const text = Array(8).fill(sentence).join(' ');
    const out = chunkText(text);
    expect(out.length).toBeGreaterThan(1);
    for (const c of out) expect(c.length).toBeLessThanOrEqual(180);
    expect(out.join(' ')).toBe(text);
  });
  it('splits one huge sentence at commas, spaces, then hard', () => {
    const commas = Array(30).fill('كلمات كثيرة هنا').join('، ');
    for (const c of chunkText(commas)) expect(c.length).toBeLessThanOrEqual(180);
    const word = 'ا'.repeat(500);
    const out = chunkText(word);
    expect(out.every((c) => c.length <= 180)).toBe(true);
    expect(out.join('')).toBe(word);
  });
  it('builds an encoded url', () => {
    expect(netTtsUrl('a b')).toContain('tl=ar&q=a%20b');
  });
});
