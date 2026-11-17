// OWNER: exam worker. Exam screens (phase question, progress dots, answer buttons, result, certificate)
// and the teacher dashboard. Keep exports exactly (ExamOverlay, TeacherDashboard).
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Check, LogOut, Mic, Printer, Download, RotateCcw, School, Sprout, TreeDeciduous, X } from 'lucide-react';
import { useApp } from '../core/store';
import { COLORS } from '../core/theme';
import { renderGender } from '../core/gender';
import { fontsReady } from '../core/fonts';
import { EXAM_LABELS, EXAM_QUESTIONS } from '../content/data/exam';
import { ToyButton } from '../ui/ToyButton';
import '../ui/ui.css';
import { answerTap, confirmLeave, startExam } from './flow';
import { backToMenu } from '../engine/conversation';
import { Picture } from './pictures';
import { certificateToDataUrl, downloadImage, drawCertificate, printImage } from './certificate';
import { useExam, type Pick } from './store';
import { TeacherDashboard } from './TeacherDashboard';

export { TeacherDashboard };

const LETTERS = ['أ', 'ب', 'ج'] as const;
const LETTER_COLORS = [COLORS.outside, COLORS.short, COLORS.creative];
const GOOD = '#22B573';
const SOFT_AMBER = '#FFC857';

const CSS = `
.ex-root{z-index:12}
.ex-root *{box-sizing:border-box}
.ex-dots{position:absolute;top:var(--safe-t);left:50%;transform:translateX(-50%);display:flex;gap:10px;padding:10px 16px;max-width:calc(100vw - 2 * (var(--safe-l) + var(--b-sq) + 8px));background:var(--paper);border-radius:999px;box-shadow:0 5px 0 var(--paper-edge),var(--drop);pointer-events:none;direction:rtl}
.ex-dot{width:22px;height:22px;border-radius:50%;background:#E8DDC8;box-shadow:inset 0 -3px 0 rgba(30,42,59,.12);transition:background .25s,transform .35s var(--spring)}
.ex-dot.is-now{transform:scale(1.25);background:#fff;box-shadow:0 0 0 4px var(--teal)}
.ex-dot.is-ok{background:${GOOD};transform:scale(1.1)}
.ex-dot.is-no{background:${SOFT_AMBER};transform:scale(1.1)}
@media (max-width:760px){.ex-dots{left:var(--safe-l);right:calc(var(--safe-r) + var(--b-sq) + 10px);width:fit-content;max-width:none;margin:0 auto;transform:none;top:calc(var(--safe-t) + 6px + var(--b-sq) + var(--hud-gap));gap:clamp(3px,1.4vw,6px);padding:8px 12px}.ex-dot{width:clamp(12px,4vw,18px);height:clamp(12px,4vw,18px)}}
@media (max-width:600px){.ex-dots{left:calc(var(--safe-l) + var(--b-sq) + 8px);right:calc(var(--safe-r) + var(--b-sq) + 8px);top:calc(var(--safe-t) + 6px + (var(--b-sq) - 32px) / 2)}}
.ex-tray{position:absolute;left:0;right:0;bottom:max(28px,var(--safe-b));display:flex;justify-content:center;align-items:flex-end;gap:clamp(10px,2vw,22px);padding:0 16px;direction:rtl}
.ex-pop{animation:exPop .5s var(--spring) both}
@keyframes exPop{from{opacity:0;transform:translateY(40px) scale(.9)}to{opacity:1;transform:none}}
.toy.ex-phase{min-width:min(clamp(190px,26vw,300px),calc((100vw - 56px) / 2));min-height:clamp(110px,18vh,150px);flex-direction:column;gap:6px;font-size:clamp(20px,2.6vw,28px);padding:10px 20px}
.toy.ex-card{padding:0;min-width:0;width:clamp(104px,19vw,200px);flex-direction:column;align-items:stretch;overflow:visible;border-radius:26px}
.ex-card-in{margin:8px 8px 4px;background:#FFFDF7;border-radius:18px;padding:6px;display:flex;justify-content:center}
.ex-card-in svg{width:100%;height:auto;max-width:150px}
.ex-letter{font:700 clamp(26px,3.4vw,38px)/1 'IBM Plex Sans Arabic',sans-serif;padding:2px 0 8px;color:#fff;text-align:center}
.toy.ex-yn{min-width:clamp(150px,22vw,230px);min-height:clamp(96px,16vh,128px);flex-direction:column;gap:2px;font-size:clamp(26px,3vw,36px)}
.ex-yn svg{width:44px;height:44px}
.ex-listen{position:absolute;left:50%;bottom:max(40px,var(--safe-b));transform:translateX(-50%);width:84px;height:84px;display:grid;place-items:center;pointer-events:none}
.ex-listen b{position:relative;z-index:2;width:84px;height:84px;border-radius:50%;background:var(--green);display:grid;place-items:center;box-shadow:0 6px 0 #178555,var(--drop)}
.ex-listen i{position:absolute;inset:0;border-radius:50%;border:4px solid var(--green);opacity:0;animation:exRing 1.6s ease-out infinite}
.ex-listen i:nth-child(2){animation-delay:.5s}.ex-listen i:nth-child(3){animation-delay:1s}
@keyframes exRing{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.3);opacity:0}}
.ex-stars{position:absolute;top:18%;left:50%;transform:translateX(-50%);display:flex;gap:clamp(4px,1vw,12px);padding:14px 22px;background:var(--paper);border-radius:30px;box-shadow:0 6px 0 var(--paper-edge),var(--drop);direction:rtl;pointer-events:none}
.ex-stars svg{width:clamp(22px,5vw,58px);height:auto;transition:transform .45s var(--spring)}
.ex-stars svg.on{transform:scale(1.12)}
.ex-cert{position:absolute;left:0;right:0;margin:0 auto;top:calc(var(--safe-t) + 74px);display:flex;flex-direction:column;align-items:center;gap:14px;max-width:96vw;direction:rtl}
.ex-cert canvas{display:block;height:auto;width:min(92vw,566px,calc(52vh * 1.4147));aspect-ratio:1600/1131;border-radius:14px;box-shadow:0 8px 0 rgba(30,42,59,.18),var(--drop);background:#fff;pointer-events:none}
.ex-row{display:flex;gap:clamp(8px,1.5vw,16px);flex-wrap:wrap;justify-content:center}
.toy.ex-sm{min-height:64px;font-size:19px;padding:0 20px}
@media (orientation:portrait) and (max-width:600px){
.ex-tray{bottom:calc(var(--safe-b) + var(--b-call) + 22px)}
.ex-listen{bottom:calc(var(--safe-b) + var(--b-call) + 28px)}
.ex-cert{top:calc(var(--safe-t) + 6px + 2 * var(--b-sq) + var(--hud-gap) + 14px)}
.toy.ex-sm{font-size:17px;padding:0 14px}}
@media (max-height:520px) and (orientation:landscape){
.ex-cert{flex-direction:row;justify-content:center;top:calc(var(--safe-t) + 60px);bottom:var(--safe-b);left:var(--safe-l);right:calc(var(--safe-r) + var(--b-call) + 12px);max-width:none}
.ex-cert canvas{width:auto;height:min(100%,calc((100vw - 380px) / 1.4147));max-width:none}
.ex-cert .ex-row{flex-direction:column;flex-wrap:nowrap;gap:6px}
.toy.ex-sm{min-height:54px;font-size:17px;padding:0 14px;justify-content:flex-start}
.toy.ex-phase,.toy.ex-yn{min-height:clamp(84px,24vh,110px)}
.ex-confirm{padding:18px 26px 16px;gap:12px}}
.ex-modal{position:absolute;inset:0;background:rgba(255,248,236,.55);display:grid;place-items:center;pointer-events:auto;z-index:5}
.ex-confirm{background:var(--paper);border-radius:30px;padding:26px 34px 22px;box-shadow:0 8px 0 var(--paper-edge),var(--drop);display:flex;flex-direction:column;align-items:center;gap:18px;animation:exPop .4s var(--spring) both}
.ex-confirm .ex-door{width:78px;height:78px;border-radius:50%;background:${COLORS.exam};display:grid;place-items:center}
.ex-confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.ex-confetti span{position:absolute;top:-6vh;width:var(--w);height:var(--h);background:var(--c);border-radius:2px;opacity:0;animation:exFall var(--d) linear var(--dl) both}
.ex-confetti span.st{clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);border-radius:0}
@keyframes exFall{0%{opacity:1;transform:translate3d(0,0,0) rotate(0)}100%{opacity:1;transform:translate3d(var(--dx),112vh,0) rotate(var(--r))}}
`;

/* ------------------------------------------------------------------------- pieces */

function Dots() {
  const marks = useExam((s) => s.marks);
  const q = useExam((s) => s.q);
  const stage = useExam((s) => s.stage);
  return (
    <div className="ex-dots" aria-hidden="true">
      {marks.map((m, i) => (
        <i key={i} className={`ex-dot${m === true ? ' is-ok' : m === false ? ' is-no' : stage === 'question' && i === q ? ' is-now' : ''}`} />
      ))}
    </div>
  );
}

function PhaseButtons() {
  return (
    <div className="ex-tray ex-pop">
      <ToyButton color={COLORS.short} className="ex-phase" label={EXAM_LABELS.phaseBefore} onPress={() => answerTap('pre')} data={{ exam: 'pre' }}>
        <Sprout size={52} strokeWidth={2.5} />
        {EXAM_LABELS.phaseBefore}
      </ToyButton>
      <ToyButton color={GOOD} className="ex-phase" label={EXAM_LABELS.phaseAfter} onPress={() => answerTap('post')} data={{ exam: 'post' }}>
        <TreeDeciduous size={52} strokeWidth={2.5} />
        {EXAM_LABELS.phaseAfter}
      </ToyButton>
    </div>
  );
}

function AnswerTray() {
  const q = useExam((s) => s.q);
  const question = EXAM_QUESTIONS[q];
  if (!question) return null;
  const tap = (p: Pick) => answerTap(p);
  if (question.kind === 'yesno') {
    return (
      <div className="ex-tray ex-pop">
        <ToyButton color={GOOD} className="ex-yn" label={EXAM_LABELS.yes} onPress={() => tap('yes')} data={{ exam: 'yes' }}>
          <Check size={44} strokeWidth={3.5} />
          {EXAM_LABELS.yes}
        </ToyButton>
        <ToyButton color={COLORS.exam} className="ex-yn" label={EXAM_LABELS.no} onPress={() => tap('no')} data={{ exam: 'no' }}>
          <X size={44} strokeWidth={3.5} />
          {EXAM_LABELS.no}
        </ToyButton>
      </div>
    );
  }
  const open = question.kind === 'open';
  return (
    <div className="ex-tray ex-pop">
      {[0, 1, 2].map((i) => (
        <ToyButton
          key={i}
          color={open ? '#EFE3CB' : LETTER_COLORS[i]}
          fg={COLORS.ink}
          className="ex-card"
          label={open ? undefined : LETTERS[i]}
          onPress={() => tap(open ? i : LETTERS[i])}
          data={{ exam: open ? `card${i}` : LETTERS[i] }}
        >
          <span className="ex-card-in">
            <Picture qid={question.id} index={i} size={150} />
          </span>
          {open ? <span style={{ height: 8 }} /> : <span className="ex-letter">{LETTERS[i]}</span>}
        </ToyButton>
      ))}
    </div>
  );
}

function ListenRing() {
  return (
    <div className="ex-listen" aria-hidden="true">
      <i />
      <i />
      <i />
      <b>
        <Mic size={40} color="#fff" strokeWidth={2.5} />
      </b>
    </div>
  );
}

const STAR = 'M12 1.8l2.9 6.5 7.1.7-5.3 4.8 1.5 7-6.2-3.6L5.8 20.8l1.5-7L2 9l7.1-.7z';

function StarsRow({ lit }: { lit: number }) {
  return (
    <div className="ex-stars" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={i < lit ? 'on' : ''}>
          <path d={STAR} fill={i < lit ? '#FFC62B' : '#EFE6D3'} stroke={i < lit ? '#D99100' : '#CDBF9F'} strokeWidth={1.6} strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

function Confetti({ kind }: { kind: 'big' | 'normal' | 'stars' }) {
  const pieces = useMemo(() => {
    const n = kind === 'big' ? 110 : kind === 'normal' ? 64 : 26;
    const cols = ['#F0476B', '#FFAA1F', '#22B573', '#2D8CFF', '#8B5CF6', '#14B8A6', '#FFD93D'];
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: n }, (_, i) => ({
      left: rnd() * 100,
      dl: rnd() * (kind === 'stars' ? 2.2 : 1.4),
      d: (kind === 'stars' ? 3.8 : 2.6) + rnd() * 1.6,
      w: kind === 'stars' ? 22 + rnd() * 14 : 7 + rnd() * 8,
      h: kind === 'stars' ? 0 : 10 + rnd() * 10,
      dx: (rnd() - 0.5) * 160,
      r: (rnd() - 0.5) * 900,
      c: kind === 'stars' ? (i % 2 ? '#FFC62B' : '#FFE08A') : cols[i % cols.length],
    }));
  }, [kind]);
  return (
    <div className="ex-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={kind === 'stars' ? 'st' : ''}
          style={{ left: `${p.left}%`, '--dl': `${p.dl}s`, '--d': `${p.d}s`, '--w': `${p.w}px`, '--h': `${p.h || p.w}px`, '--dx': `${p.dx}px`, '--r': `${p.r}deg`, '--c': p.c } as CSSProperties}
        />
      ))}
    </div>
  );
}

function Certificate() {
  const score = useExam((s) => s.score);
  const phase = useExam((s) => s.phase) ?? 'pre';
  const gender = useApp((s) => s.gender);
  const ref = useRef<HTMLCanvasElement>(null);
  const date = useMemo(() => new Date(), []);
  useEffect(() => {
    let live = true;
    void fontsReady.then(() => {
      if (live && ref.current) drawCertificate(ref.current, { score, phase, gender, date });
    });
    return () => {
      live = false;
    };
  }, [score, phase, gender, date]);
  const data = () => certificateToDataUrl({ score, phase, gender, date });
  return (
    <div className="ex-cert ex-pop">
      <canvas ref={ref} width={1600} height={1131} aria-label={renderGender(EXAM_LABELS.certTitle, gender)} />
      <div className="ex-row">
        <ToyButton color={COLORS.outside} className="ex-sm" label="طِبَاعَةٌ" onPress={() => { const u = data(); if (u) printImage(u); }} data={{ exam: 'print' }}>
          <Printer size={26} />
          طِبَاعَةٌ
        </ToyButton>
        <ToyButton color={COLORS.creative} className="ex-sm" label="حِفْظٌ كَصُورَةٍ" onPress={() => { const u = data(); if (u) downloadImage(u); }} data={{ exam: 'save' }}>
          <Download size={26} />
          حِفْظٌ كَصُورَةٍ
        </ToyButton>
        <ToyButton color={COLORS.short} className="ex-sm" label={EXAM_LABELS.retake} onPress={() => void startExam()} data={{ exam: 'retake' }}>
          <RotateCcw size={26} />
          {EXAM_LABELS.retake}
        </ToyButton>
        <ToyButton color={COLORS.teal} className="ex-sm" label={EXAM_LABELS.classroom} onPress={() => backToMenu()} data={{ exam: 'classroom' }}>
          <School size={26} />
          {EXAM_LABELS.classroom}
        </ToyButton>
      </div>
    </div>
  );
}

function ConfirmCard() {
  return (
    <div className="ex-modal" data-exam="confirm">
      <div className="ex-confirm">
        <div className="ex-door">
          <LogOut size={42} color="#fff" strokeWidth={2.5} />
        </div>
        <div className="ex-row">
          <ToyButton color={GOOD} className="ex-sm" label={EXAM_LABELS.yes} onPress={() => confirmLeave(true)} data={{ exam: 'leave-yes' }}>
            <Check size={30} strokeWidth={3.5} />
            {EXAM_LABELS.yes}
          </ToyButton>
          <ToyButton color={COLORS.exam} className="ex-sm" label={EXAM_LABELS.no} onPress={() => confirmLeave(false)} data={{ exam: 'leave-no' }}>
            <X size={30} strokeWidth={3.5} />
            {EXAM_LABELS.no}
          </ToyButton>
        </div>
      </div>
    </div>
  );
}

/** Taps on the status pill / back button during an unfinished test open the confirm card first. */
function useLeaveGuard() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = (e.target as Element | null)?.closest?.('[data-ui="status"],[data-ui="back"]');
      if (!t) return;
      const ex = useExam.getState();
      if (!useApp.getState().ui.examRunning || (ex.stage !== 'phase' && ex.stage !== 'question')) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (!ex.confirm) ex.patch({ confirm: t.getAttribute('data-ui') === 'back' ? 'back' : 'status' });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
}

/* ------------------------------------------------------------------------ overlay */

export function ExamOverlay() {
  const inExam = useApp((s) => s.phase === 'mode' && s.mode === 'exam');
  const teacherOpen = useApp((s) => s.ui.teacherOpen);
  const setUi = useApp((s) => s.setUi);
  const { q, stage, listening, showTap, confetti, showCertificate, stars, confirm } = useExam();
  useLeaveGuard();

  return (
    <div className="ar-ui ex-root" lang="ar" dir="rtl">
      <style>{CSS}</style>
      {inExam && stage !== 'idle' ? (
        <>
          {stage !== 'stopped' ? <Dots /> : null}
          {stage === 'phase' ? <PhaseButtons /> : null}
          {stage === 'question' && showTap ? <AnswerTray key={`tap-${q}`} /> : null}
          {stage === 'question' && listening ? <ListenRing /> : null}
          {stage === 'result' && confetti !== 'none' ? <Confetti kind={confetti} /> : null}
          {stage === 'result' && !showCertificate ? <StarsRow lit={stars} /> : null}
          {stage === 'result' && showCertificate ? <Certificate /> : null}
          {stage === 'stopped' ? (
            <div className="ex-tray ex-pop">
              <ToyButton color={COLORS.short} className="ex-sm" label={EXAM_LABELS.retake} onPress={() => void startExam()} data={{ exam: 'restart' }}>
                <RotateCcw size={26} />
                {EXAM_LABELS.retake}
              </ToyButton>
            </div>
          ) : null}
          {confirm ? <ConfirmCard /> : null}
        </>
      ) : null}
      {teacherOpen ? <TeacherDashboard onClose={() => setUi({ teacherOpen: false })} /> : null}
    </div>
  );
}
