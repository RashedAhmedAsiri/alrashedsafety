// OWNER: exam worker. Preview of the exam screens over a flat backdrop (no 3D, no flow).
//   ?dev=Exam&state=phase|ask|listen|tap|drum|stars|cert|confirm|stopped|teacher
//      &q=1..10 (question)  &marks=1101110000 (dots)  &gender=boy|girl  &score=0..10  &phase=pre|post
import { useEffect, useState } from 'react';
import { useApp } from '../core/store';
import { EXAM_QUESTIONS } from '../content/data/exam';
import { ExamOverlay } from '../exam/ExamOverlay';
import { bandIndex } from '../exam/certificate';
import { EXAM_VERSION, uuid } from '../exam/results';
import { useExam } from '../exam/store';
import { Hud } from '../ui/Hud';
import '../ui/ui.css';

const q = new URLSearchParams(location.search);

function seedRows() {
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const rows = [];
  for (let d = 0; d < 24; d++) {
    const dev = uuid();
    const skill = 0.35 + rnd() * 0.3;
    for (const phase of ['pre', 'post'] as const) {
      if (phase === 'post' && rnd() < 0.25) continue;
      const p = phase === 'pre' ? skill : Math.min(0.97, skill + 0.25);
      const answers = Array.from({ length: 10 }, () => (rnd() < p ? '1' : '0')).join('');
      rows.push({
        id: uuid(), device_id: dev, phase, score: [...answers].filter((c) => c === '1').length, answers,
        input: Array.from({ length: 10 }, () => (rnd() < 0.3 ? 't' : 'v')).join(''),
        gender: rnd() < 0.5 ? 'boy' : 'girl', created_at: new Date(Date.now() - rnd() * 6e8).toISOString(), app_version: '0.1.0', exam_version: EXAM_VERSION,
      });
    }
  }
  try { localStorage.setItem('alrashed.exam.results.v1', JSON.stringify(rows)); } catch { /* ignore */ }
}

function Backdrop() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F3E6CF', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%', background: '#D9B98C' }} />
      <div style={{ position: 'absolute', left: '28%', width: '44%', top: '14%', height: '34%', background: '#2F4B45', borderRadius: 10, border: '10px solid #C9A47A' }} />
      <div style={{ position: 'absolute', left: '46%', width: '8%', bottom: '22%', height: '30%', background: '#E9EEF4', borderRadius: '40px 40px 16px 16px' }}>
        <div style={{ margin: '18% auto 0', width: '70%', height: '34%', background: '#1E2A3B', borderRadius: 12 }} />
      </div>
    </div>
  );
}

export default function ExamPreview() {
  const state = q.get('state') ?? 'phase';
  const [ready, setReady] = useState(false);
  useState(() => {
    const gender = (q.get('gender') ?? 'boy') as 'boy' | 'girl';
    useApp.getState().set({ phase: 'mode', mode: 'exam', gender, genderSource: 'manual', status: 'ready', expression: 'smile' });
    useApp.getState().setUi({ examRunning: state !== 'teacher' && state !== 'stopped', teacherOpen: state === 'teacher' });
    const n = Math.max(1, Math.min(10, Number(q.get('q') ?? 3)));
    const marksStr = q.get('marks') ?? '1101110000'.slice(0, n - 1);
    const marks = Array.from({ length: 10 }, (_, i) => (i < marksStr.length ? marksStr[i] === '1' : null));
    const score = Math.max(0, Math.min(10, Number(q.get('score') ?? 8)));
    const e = useExam.getState();
    e.reset();
    const base = { phase: (q.get('phase') ?? 'pre') as 'pre' | 'post' };
    if (state === 'phase') e.patch({ stage: 'phase', ...base });
    else if (['ask', 'listen', 'tap'].includes(state)) e.patch({ stage: 'question', q: n - 1, marks, asking: state === 'ask', listening: state === 'listen', showTap: state === 'tap', ...base });
    else if (state === 'drum') e.patch({ stage: 'result', marks: Array.from({ length: 10 }, (_, i) => i < score), score, band: bandIndex(score), stars: 0, ...base });
    else if (state === 'stars' || state === 'cert')
      e.patch({ stage: 'result', marks: Array.from({ length: 10 }, (_, i) => i < score), score, band: bandIndex(score), stars: score, confetti: state === 'cert' ? (score >= 9 ? 'big' : score >= 6 ? 'normal' : 'stars') : 'none', showCertificate: state === 'cert', ...base });
    else if (state === 'confirm') e.patch({ stage: 'question', q: n - 1, marks, confirm: 'status', ...base });
    else if (state === 'stopped') e.patch({ stage: 'stopped' });
    if (state === 'teacher' && q.get('seed') !== '0') seedRows();
  });
  void EXAM_QUESTIONS;
  useEffect(() => {
    const t = window.setTimeout(() => { setReady(true); (window as unknown as { __ready: boolean }).__ready = true; }, 1800);
    return () => window.clearTimeout(t);
  }, []);
  void ready;
  return (
    <>
      <Backdrop />
      <div className="ar-ui"><Hud /></div>
      <ExamOverlay />
    </>
  );
}
