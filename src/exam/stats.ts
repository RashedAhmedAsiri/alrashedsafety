// OWNER: exam worker. Pure aggregation for the teacher dashboard (no DOM, tested in stats.test.ts).
import type { ExamRow } from '../backend/api';

/** One-word topic of each question, in order (shown when a bar is tapped). */
export const TOPICS = ['الحريق', 'الحافلة', 'العبور', 'النزيف', 'البركة', 'الكهرباء', 'البالوعة', 'الغريب', 'السيارة', 'الإغماء'];

export interface Filters {
  /** yyyy-mm-dd, inclusive (local day). */
  from?: string;
  to?: string;
  gender: 'all' | 'boy' | 'girl';
  /** Default true: only the latest attempt of each device and phase. */
  latestOnly: boolean;
  examVersion: number;
}

export const DEFAULT_FILTERS = (examVersion: number): Filters => ({ gender: 'all', latestOnly: true, examVersion });

const dayStart = (s: string) => new Date(`${s}T00:00:00`).getTime();
const dayEnd = (s: string) => new Date(`${s}T23:59:59.999`).getTime();

export function filterRows(rows: ExamRow[], f: Filters): ExamRow[] {
  let out = rows.filter((r) => r.exam_version === f.examVersion);
  if (f.from) out = out.filter((r) => Date.parse(r.created_at) >= dayStart(f.from!));
  if (f.to) out = out.filter((r) => Date.parse(r.created_at) <= dayEnd(f.to!));
  if (f.gender !== 'all') out = out.filter((r) => r.gender === f.gender);
  if (f.latestOnly) {
    const latest = new Map<string, ExamRow>();
    for (const r of out) {
      const k = `${r.device_id}|${r.phase}`;
      const cur = latest.get(k);
      if (!cur || Date.parse(r.created_at) >= Date.parse(cur.created_at)) latest.set(k, r);
    }
    out = [...latest.values()];
  }
  return out.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface Stats {
  countPre: number;
  countPost: number;
  avgPre: number | null;
  avgPost: number | null;
  /** Per question (10): share of correct answers 0..1, null when no rows. */
  perQuestionPre: (number | null)[];
  perQuestionPost: (number | null)[];
  /** Histogram of scores 0..10. */
  histPre: number[];
  histPost: number[];
  /** Devices with both phases: latest pre and latest post. */
  paired: { device: string; pre: number; post: number }[];
  /** Share of answers given by tapping (0..1), null when no rows. */
  tapShare: number | null;
}

export function computeStats(rows: ExamRow[]): Stats {
  const pre = rows.filter((r) => r.phase === 'pre');
  const post = rows.filter((r) => r.phase === 'post');
  const perQ = (rs: ExamRow[]) =>
    Array.from({ length: 10 }, (_, i) => (rs.length ? rs.filter((r) => r.answers[i] === '1').length / rs.length : null));
  const hist = (rs: ExamRow[]) => {
    const h = new Array<number>(11).fill(0);
    for (const r of rs) h[Math.max(0, Math.min(10, Math.round(r.score)))]++;
    return h;
  };
  const lastBy = (rs: ExamRow[]) => {
    const m = new Map<string, ExamRow>();
    for (const r of rs) {
      const c = m.get(r.device_id);
      if (!c || Date.parse(r.created_at) >= Date.parse(c.created_at)) m.set(r.device_id, r);
    }
    return m;
  };
  const lp = lastBy(pre);
  const lq = lastBy(post);
  const paired = [...lp.entries()]
    .filter(([d]) => lq.has(d))
    .map(([d, r]) => ({ device: d, pre: r.score, post: lq.get(d)!.score }));
  const inputs = rows.map((r) => r.input).join('');
  return {
    countPre: pre.length,
    countPost: post.length,
    avgPre: mean(pre.map((r) => r.score)),
    avgPost: mean(post.map((r) => r.score)),
    perQuestionPre: perQ(pre),
    perQuestionPost: perQ(post),
    histPre: hist(pre),
    histPost: hist(post),
    paired,
    tapShare: inputs.length ? [...inputs].filter((c) => c === 't').length / inputs.length : null,
  };
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of the given rows (header + one line per row), with a BOM-less UTF-8 string. */
export function toCsv(rows: ExamRow[]): string {
  const head = ['id', 'device_id', 'phase', 'score', 'answers', 'input', 'gender', 'created_at', 'app_version', 'exam_version'] as const;
  const lines = [head.join(',')];
  for (const r of rows) lines.push(head.map((h) => csvCell(r[h])).join(','));
  return lines.join('\n') + '\n';
}
