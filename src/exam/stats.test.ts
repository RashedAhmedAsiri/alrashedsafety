import { describe, expect, it } from 'vitest';
import type { ExamRow } from '../backend/api';
import { bandIndex, certificateDates, tierOf } from './certificate';
import { buildRow, validRow } from './results';
import { DEFAULT_FILTERS, computeStats, filterRows, toCsv } from './stats';

const row = (o: Partial<ExamRow>): ExamRow => ({
  id: Math.random().toString(36).slice(2), device_id: 'd1', phase: 'pre', score: 5, answers: '1111100000', input: 'vvvvvtttvv',
  gender: 'boy', created_at: '2026-10-01T08:00:00.000Z', app_version: '0.1.0', exam_version: 1, ...o,
});

describe('results rows', () => {
  it('buildRow follows the plan shape', () => {
    const r = buildRow({ phase: 'post', answers: [true, true, false, true, true, true, true, false, true, true], input: Array(10).fill('v'), gender: 'girl' });
    expect(r.score).toBe(8);
    expect(r.answers).toBe('1101111011');
    expect(r.input).toBe('vvvvvvvvvv');
    expect(validRow(r)).toBe(true);
    expect(validRow({ ...r, answers: '12' })).toBe(false);
  });
});

describe('stats', () => {
  const rows = [
    row({ phase: 'pre', score: 4, answers: '1111000000', created_at: '2026-10-01T08:00:00Z' }),
    row({ phase: 'pre', score: 6, answers: '1111110000', created_at: '2026-10-02T08:00:00Z' }),
    row({ phase: 'post', score: 9, answers: '1111111110', created_at: '2026-10-03T08:00:00Z' }),
    row({ device_id: 'd2', phase: 'pre', score: 2, answers: '1100000000', gender: 'girl' }),
    row({ device_id: 'd3', phase: 'post', score: 10, answers: '1111111111', exam_version: 0 }),
  ];
  it('uses the latest attempt per device and phase and drops other exam versions', () => {
    const shown = filterRows(rows, DEFAULT_FILTERS(1));
    expect(shown.length).toBe(3);
    const s = computeStats(shown);
    expect(s.avgPre).toBe(4);
    expect(s.avgPost).toBe(9);
    expect(s.paired).toEqual([{ device: 'd1', pre: 6, post: 9 }]);
    expect(s.perQuestionPre[0]).toBe(1);
    expect(s.histPost[9]).toBe(1);
  });
  it('all attempts and gender filter', () => {
    expect(filterRows(rows, { ...DEFAULT_FILTERS(1), latestOnly: false }).length).toBe(4);
    expect(filterRows(rows, { ...DEFAULT_FILTERS(1), gender: 'girl' }).length).toBe(1);
  });
  it('csv has a header and one line per row', () => {
    const csv = toCsv(rows.slice(0, 2));
    expect(csv.trim().split('\n').length).toBe(3);
    expect(csv.startsWith('id,device_id,phase,score')).toBe(true);
  });
});

describe('certificate', () => {
  it('bands and tiers', () => {
    expect([10, 9, 8, 6, 5, 0].map(bandIndex)).toEqual([0, 0, 1, 1, 2, 2]);
    expect([10, 7, 3].map(tierOf)).toEqual(['gold', 'silver', 'bronze']);
  });
  it('formats Hijri and Gregorian dates', () => {
    const d = certificateDates(new Date('2026-10-14T12:00:00Z'));
    expect(d.hijri).toMatch(/١٤٤٨/);
    expect(d.gregorian).toMatch(/٢٠٢٦/);
  });
});
