// OWNER: exam worker. The exam flow (docs/plan/Exam.md "Flow"); see docs/exam.md.
//
// The engine calls startExam() after entering exam mode; stopAll()/backToMenu() call abortExam().
// UI state lives in ./store.ts (useExam); the overlay (ExamOverlay.tsx) only reads it and calls
// answerTap() / confirmLeave() / startExam() from its buttons.
import { renderGender } from '../core/gender';
import { useApp } from '../core/store';
import { useStage } from '../core/stage';
import type { Expression, LocationId, RobotClip, Weather } from '../core/types';
import { EXAM_FEEDBACK_FACES, EXAM_LINES, EXAM_QUESTIONS } from '../content/data/exam';
import type { ExamQuestion } from '../content/types';
import { voiceKey } from '../content/voiceLines';
import { backToMenu, currentSignal, stopAll, travelTo, playSystem } from '../engine/conversation';
import { abortError, childController, isAbort, sleep } from '../engine/abort';
import { clock } from '../engine/clock';
import { playSfx, stopAllSfx } from '../audio/sfx';
import { speak, stopSpeech } from '../voice/speech';
import { canListen, listenOnce } from '../voice/listen';
import { applyGenderDetection, detectGender } from '../voice/gender';
import { backendAvailable, isOnline, judgeOpen } from '../backend/api';
import { bandIndex } from './certificate';
import { judgeAnswer, judgeTap, openPasses, readPhase } from './judge';
import { buildRow, saveResult, startResultSync } from './results';
import { useExam, type Pick } from './store';

const ROBOT = 'alrashed';
const MAX_LISTEN_MS = 8000;
const SILENCE_MS = 1500;
/** Listening tries before the tap buttons appear. */
const MAX_TRIES = 2;

const app = () => useApp.getState();
const ex = () => useExam.getState();

type Answer = { kind: 'text'; text: string } | { kind: 'tap'; pick: Pick } | { kind: 'none' } | { kind: 'unavailable' };

let ac: AbortController | null = null;
/** Resolves the answer the flow currently waits for (voice text injected by the engine, or a tap). */
let waiter: ((a: Answer) => void) | null = null;
/** Asks the flow to open the mic now (the engine's mic button). */
let nudge: (() => void) | null = null;

/* ------------------------------------------------------------------------------ helpers */

function robotClip(clip: RobotClip, dur: number) {
  useStage.getState().patchActor(ROBOT, { clip, clipStart: clock.now(), clipDuration: dur, clipSpeed: 1 });
}

function setFace(expression: Expression, status: 'speaking' | 'listening' | 'walking' | 'ready' | 'explaining' | 'thinking' = 'speaking') {
  app().set({ expression, status });
}

async function say(key: string, text: string, signal: AbortSignal, face: Expression) {
  if (signal.aborted) throw abortError();
  setFace(face, 'speaking');
  await speak({ key, text: renderGender(text, app().gender), signal });
}

/** Waits while the leave-early card is open (the test is paused at step boundaries). */
async function gate(signal: AbortSignal) {
  while (ex().confirm && !signal.aborted) await sleep(120, signal);
  if (signal.aborted) throw abortError();
}

function listeningPossible(): boolean {
  try {
    const c = canListen();
    return c.available && (!c.needsInternet || isOnline());
  } catch {
    return false;
  }
}

function setListening(on: boolean) {
  useExam.getState().patch({ listening: on });
  app().set({ listening: on });
}

/** One listening try. Resolves with what was heard, an injected answer, or why nothing came. */
async function listenAttempt(signal: AbortSignal): Promise<Answer> {
  const lc = childController(signal);
  let injected: Answer | null = null;
  waiter = (a) => {
    injected = a;
    lc.abort();
  };
  setListening(true);
  setFace('listening', 'listening');
  playSfx('listenStart');
  let res: Awaited<ReturnType<typeof listenOnce>>;
  try {
    res = await listenOnce({ signal: lc.signal, maxMs: MAX_LISTEN_MS, silenceMs: SILENCE_MS });
  } catch {
    res = { ok: false, error: 'error' };
  } finally {
    waiter = null;
    setListening(false);
    playSfx('listenStop');
  }
  if (signal.aborted) throw abortError();
  if (injected) return injected;
  if (res.ok) {
    const h = res.heard;
    if (h.samples && h.samples.length) {
      try {
        applyGenderDetection(detectGender(h.samples, h.sampleRate));
      } catch {
        /* gender stays as it was */
      }
    }
    return { kind: 'text', text: h.text };
  }
  if (res.error === 'denied' || res.error === 'no-mic' || res.error === 'unsupported' || res.error === 'offline') return { kind: 'unavailable' };
  return { kind: 'none' };
}

/** Wait for a tap, injected text or a mic nudge (resolves 'nudge'). */
function waitAnswer(signal: AbortSignal): Promise<Answer | 'nudge'> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const done = (v: Answer | 'nudge') => {
      cleanup();
      resolve(v);
    };
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    const cleanup = () => {
      waiter = null;
      nudge = null;
      signal.removeEventListener('abort', onAbort);
    };
    waiter = (a) => done(a);
    nudge = () => done('nudge');
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/* ---------------------------------------------------------------------------- judging */

/** true / false, or null when the answer could not be judged. */
async function judgeText(q: ExamQuestion, text: string, signal: AbortSignal): Promise<boolean | null> {
  const j = judgeAnswer(q, text);
  if (j.verdict !== 'unclear') return j.verdict === 'correct';
  if (q.kind === 'open' && backendAvailable()) {
    setFace('thinking', 'thinking');
    const o = await judgeOpen(q.id, (q.concepts ?? []).map((c) => c.id), text, signal);
    if (signal.aborted) throw abortError();
    if (o && (o.unsafe || o.concepts.length)) return !o.unsafe && o.pass && openPasses(q, o.concepts, []);
  }
  return null;
}

/** Collect one answer for a question: voice (two tries), then the tap fallback. */
async function collect(q: ExamQuestion, signal: AbortSignal): Promise<{ ok: boolean; input: 'v' | 't' }> {
  let can = listeningPossible();
  let tries = 0;
  const handle = async (a: Answer): Promise<{ ok: boolean; input: 'v' | 't' } | null> => {
    if (a.kind === 'tap') {
      if (typeof a.pick === 'string' && (a.pick === 'pre' || a.pick === 'post')) return null;
      return { ok: judgeTap(q, a.pick), input: 't' };
    }
    if (a.kind === 'text') {
      const r = await judgeText(q, a.text, signal);
      return r === null ? null : { ok: r, input: 'v' };
    }
    return null;
  };

  while (can && tries < MAX_TRIES) {
    const a = await listenAttempt(signal);
    tries++;
    if (a.kind === 'unavailable') {
      can = false;
      break;
    }
    const r = await handle(a);
    if (r) return r;
    if (tries < MAX_TRIES) await playSystem('not_heard', signal).catch((e) => {
      if (isAbort(e)) throw e;
    });
  }

  // Tap fallback: the mic stays off for this question unless the mic button is pressed.
  setFace('listening', 'ready');
  useExam.getState().patch({ showTap: true });
  try {
    for (;;) {
      await gate(signal);
      const a = await waitAnswer(signal);
      if (a === 'nudge') {
        if (!listeningPossible()) continue;
        const heard = await listenAttempt(signal);
        const r = await handle(heard);
        if (r) return r;
        setFace('listening', 'ready');
        continue;
      }
      const r = await handle(a);
      if (r) return r;
    }
  } finally {
    useExam.getState().patch({ showTap: false });
  }
}

/** The «قبل / بعد» question: buttons are visible while Alrashed asks; voice or a tap answers. */
async function askPhase(signal: AbortSignal): Promise<'pre' | 'post'> {
  useExam.getState().patch({ stage: 'phase', phase: null });
  let got = null as Answer | null;
  const pc = childController(signal);
  waiter = (a) => {
    got = a;
    pc.abort();
  };
  try {
    await say(voiceKey.examPhaseQuestion, EXAM_LINES.phaseQuestion, pc.signal, 'talking');
  } catch (e) {
    if (signal.aborted || !isAbort(e)) throw e;
  } finally {
    waiter = null;
  }
  stopSpeech();
  let tries = 0;
  let can = listeningPossible();
  for (;;) {
    await gate(signal);
    let a = got as Answer | 'nudge' | null;
    got = null;
    if (!a) {
      if (can && tries < MAX_TRIES) {
        a = await listenAttempt(signal);
        tries++;
        if (a.kind === 'unavailable') can = false;
      } else {
        setFace('listening', 'ready');
        a = await waitAnswer(signal);
        if (a === 'nudge') {
          tries = 0;
          can = listeningPossible();
          continue;
        }
      }
    }
    if (a === 'nudge') continue;
    if (a.kind === 'tap' && (a.pick === 'pre' || a.pick === 'post')) return a.pick;
    if (a.kind === 'text') {
      const p = readPhase(a.text);
      if (p) return p;
    }
  }
}

/* -------------------------------------------------------------------------------- run */

function cleanupStage() {
  const st = useStage.getState();
  try {
    st.setFlag('lights', 'on');
    st.patchActor(ROBOT, { hold: null });
  } catch {
    /* ignore */
  }
  setListening(false);
}

async function runExam(signal: AbortSignal) {
  const st = useStage.getState();
  const e = useExam.getState();
  e.reset();
  startResultSync();
  app().set({ playing: { kind: 'exam', id: 'exam' } });
  app().setUi({ examRunning: true });
  st.patchActor(ROBOT, { hold: 'clipboard' });

  if (app().location !== 'classroom') await travelTo('classroom', { signal });
  const phase = await askPhase(signal);
  useExam.getState().patch({ phase });

  await gate(signal);
  await say('exam.start', EXAM_LINES.start, signal, 'happy');

  const marks: boolean[] = [];
  const inputs: ('v' | 't')[] = [];
  for (let i = 0; i < EXAM_QUESTIONS.length; i++) {
    const q = EXAM_QUESTIONS[i];
    await gate(signal);
    useExam.getState().patch({ stage: 'question', q: i, showTap: false, asking: false });
    const weather: Weather = q.id === 'q5_puddle' ? 'wet' : 'sunny';
    app().set({ status: 'walking' });
    await travelTo(q.location as LocationId, { signal, weather, time: 'morning' });
    if (q.id === 'q6_power_outage') useStage.getState().setFlag('lights', 'off');
    robotClip('idle', 0);

    useExam.getState().patch({ asking: true });
    await say(voiceKey.examQuestion(q.id), q.question, signal, 'talking');
    useExam.getState().patch({ asking: false });

    const { ok, input } = await collect(q, signal);
    marks.push(ok);
    inputs.push(input);
    useExam.getState().mark(i, ok);

    await gate(signal);
    if (ok) {
      playSfx('chime');
      robotClip('thumbsUp', 1.6);
      await say(voiceKey.examCorrect(q.id), q.correct, signal, EXAM_FEEDBACK_FACES.correct);
    } else {
      robotClip('nod', 1.2);
      await say(voiceKey.examWrong(q.id), q.wrong, signal, EXAM_FEEDBACK_FACES.wrong);
    }
    if (q.id === 'q6_power_outage') useStage.getState().setFlag('lights', 'on');
    await sleep(350, signal);
  }

  /* ----- result ----- */
  const score = marks.filter(Boolean).length;
  const band = bandIndex(score);
  const g = app().genderSource === 'default' ? 'unknown' : app().gender;
  void saveResult(buildRow({ phase, answers: marks, input: inputs, gender: g }));

  useExam.getState().patch({ stage: 'result', score, band, stars: 0, confetti: 'none', showCertificate: false, showTap: false });
  app().set({ status: 'walking' });
  await travelTo('classroom', { signal, weather: 'sunny', time: 'morning' });
  useStage.getState().patchActor(ROBOT, { hold: null });
  await gate(signal);

  setFace('counting', 'speaking');
  playSfx('drumroll');
  await sleep(2400, signal);

  const fill = async () => {
    for (let s = 1; s <= score; s++) {
      useExam.getState().patch({ stars: s });
      playSfx('ding', { volume: 0.5 });
      await sleep(330, signal);
    }
  };
  await Promise.all([say(voiceKey.examScore(score), EXAM_LINES.score[score], signal, 'celebration'), fill()]);

  const b = EXAM_LINES.bands[band];
  useExam.getState().patch({ confetti: band === 0 ? 'big' : band === 1 ? 'normal' : 'stars', showCertificate: true });
  playSfx(band === 2 ? 'chime' : 'confetti');
  if (band < 2) playSfx('cheer', { volume: 0.7 });
  robotClip(band === 0 ? 'celebrate' : band === 1 ? 'clap' : 'thumbsUp', band === 0 ? 3.2 : 2.6);
  await say(voiceKey.examBand(band), b.text, signal, b.face);
  setFace('smile', 'ready');
}

/* ---------------------------------------------------------------------------- public API */

/** Called by the engine when exam mode is entered. Returns at once; the test runs in the background. */
export async function startExam(): Promise<void> {
  abortRun();
  const parent = currentSignal();
  const mine = parent.aborted ? new AbortController() : childController(parent);
  ac = mine;
  app().setUi({ examRunning: true, scenariosOpen: false });
  void (async () => {
    try {
      await runExam(mine.signal);
    } catch (err) {
      if (!isAbort(err)) console.error('[exam]', err);
    } finally {
      if (ac === mine) {
        cleanupStage();
        if (mine.signal.aborted) {
          const s = useExam.getState().stage;
          if (s === 'phase' || s === 'question') useExam.getState().patch({ stage: 'stopped', listening: false, showTap: false, confirm: null });
        }
      }
    }
  })();
}

function abortRun() {
  const was = ac;
  ac = null;
  waiter = null;
  nudge = null;
  if (was && !was.signal.aborted) was.abort();
}

/** Stops everything cleanly. A test that was not finished is not saved. */
export function abortExam(): void {
  const stage = useExam.getState().stage;
  abortRun();
  stopSpeech();
  cleanupStage();
  try {
    stopAllSfx();
  } catch {
    /* ignore */
  }
  if (stage === 'phase' || stage === 'question') useExam.getState().patch({ stage: 'stopped', listening: false, showTap: false, confirm: null, asking: false });
  else useExam.getState().reset();
  app().setUi({ examRunning: false });
  app().set({ listening: false });
}

/** The engine's mic button in exam mode: open the mic now (tap fallback or after a failed try). */
export function examAskByVoice(): void {
  nudge?.();
}

/** Text instead of voice (dev tools, tests): judged like a spoken answer. */
export function examAnswerText(text: string): void {
  waiter?.({ kind: 'text', text });
}

/** A tapped answer button (letter, yes/no, open-question card, or the phase buttons). */
export function answerTap(pick: Pick): void {
  const s = useExam.getState();
  if (s.stage === 'phase' || s.showTap) waiter?.({ kind: 'tap', pick });
}

/** The leave-early card: «نعم» runs the status/back action that was intercepted, «لا» resumes. */
export function confirmLeave(yes: boolean): void {
  const what = useExam.getState().confirm;
  useExam.getState().patch({ confirm: null });
  if (!yes || !what) return;
  if (what === 'back') backToMenu();
  else stopAll();
}
