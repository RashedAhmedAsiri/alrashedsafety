import type { Expression, LocationId, ModeId, RobotClip, SpeechPart, Status, TimeOfDay, Weather } from '../core/types';
import { PART_EXPRESSION } from '../core/types';
import { LOCATIONS } from '../core/locations';
import { groundHeight } from '../core/ground';
import { renderGender } from '../core/gender';
import { useStage, type ActorState } from '../core/stage';
import { useApp, type PlayingKind } from '../core/store';
import { AVOID_LEAD, MUST_LEAD, SCENARIO_BY_ID, SHORT_BY_ID, SYSTEM_BY_ID } from '../content';
import type { Scenario } from '../content/types';
import type { CutscenePart } from '../cutscenes/api';
import { getCutscene } from '../cutscenes/registry';
import { runCutscene, setBaseStatus, setSpeechActive, stopCutsceneSounds } from '../cutscenes/engine';
import { speak, stopSpeech } from '../voice/speech';
import { canListen, listenOnce, type Heard, type ListenResult } from '../voice/listen';
import { applyGenderDetection, detectGender } from '../voice/gender';
import { matchQuestionAsync, type MatchResult } from '../match';
import { askCreative, backendAvailable, isOnline, type CreativeAnswer } from '../backend/api';
import * as examFlow from '../exam/flow';
import { playSfx, stopAllSfx } from '../audio/sfx';
import { abortError, childController, isAbort, sleep } from './abort';
import { clock } from './clock';
import { clearTurns, isTurning, turnActor, wrapAngle } from './driver';
import { isTalkingPose, turnToViewer } from './viewer';
import { rig, scheduleHome } from './rig';
import { doTravel, placeRobotAt } from './travel';
import { warmMatcher } from './warm';

// OWNER: engine worker. The app's brain: modes, calls, travel, playing scenarios/short answers/system lines.
// UI and exam code call ONLY these functions. Keep exports and signatures exactly.
//
// One "presentation" runs at a time. Each public action that makes Alrashed do something starts a new
// presentation: the previous one is aborted (its AbortSignal fires, speech stops, cutscene waits
// reject), the scene is cleared, and the new flow runs under a fresh signal (currentSignal()).
// When a flow ends normally: non-persistent actors/props are cleared, status 'ready', face 'smile',
// and the camera goes back to free look around Alrashed wherever he ended.

/* ------------------------------------------------------------------------------ state */

type FlowKind = PlayingKind | 'listen' | 'travel' | 'stop' | 'menu';

let ctrl = new AbortController();
let curKind: FlowKind | null = null;
/** Creative mode memory: the last 6 turns of the current call (memory only, never stored). */
const history: { q: string; a: string }[] = [];
const FIRST_CALL_KEY = 'alrashed.firstCallDone.v1';
const ROBOT = 'alrashed';

const app = () => useApp.getState();
const robot = (): ActorState | undefined => useStage.getState().actors[ROBOT];

/** Faces for system lines (the plan's expression table). */
const SYSTEM_FACE: Record<string, Expression> = {
  greet_first: 'happy',
  greet_call: 'happy',
  not_heard: 'gentle',
  off_topic: 'confused',
  mic_denied: 'gentle',
  offline_creative: 'gentle',
  thinking: 'thinking',
  need_internet_listen: 'gentle',
  mode_outside: 'happy',
  mode_inside: 'happy',
  mode_short: 'happy',
  mode_creative: 'happy',
};

const EXPRESSIONS: Record<Expression, true> = {
  idle: true, smile: true, happy: true, listening: true, thinking: true, talking: true, explaining: true,
  warning: true, surprised: true, worried: true, proud: true, gentle: true, hearts: true, laughing: true,
  confused: true, lookLRL: true, lightbulb: true, timer: true, counting: true, sunDrop: true,
  celebration: true, sleepy: true, glow: true, relieved: true, focused: true,
};
const WEATHERS: Weather[] = ['sunny', 'rain', 'wet', 'dust'];

/* --------------------------------------------------------- optional modules (may not exist yet) */

interface SpokenLine {
  key: string;
  text: string;
  part: SpeechPart;
  pauseAfterMs: number;
}
type VoiceLinesModule = { scenarioLines?: (s: Scenario) => SpokenLine[] };
const voiceLinesMods = import.meta.glob<VoiceLinesModule>('../content/voiceLines.ts', { eager: true });
const voiceLines: VoiceLinesModule = Object.values(voiceLinesMods)[0] ?? {};

/** Optional exam hooks for the mic in exam mode (see docs/engine.md). */
const examHook = (name: string): ((...a: unknown[]) => unknown) | undefined => {
  const f = (examFlow as unknown as Record<string, unknown>)[name];
  return typeof f === 'function' ? (f as (...a: unknown[]) => unknown) : undefined;
};

function safe(fn: () => void) {
  try {
    fn();
  } catch (e) {
    console.error('[engine]', e);
  }
}

function storageGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function storageSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------- presentations */

function isCurrent(signal: AbortSignal) {
  return signal === ctrl.signal && !signal.aborted;
}

/** Abort whatever plays, clear the scene, start a new presentation. */
function begin(kind: FlowKind): AbortSignal {
  ctrl.abort();
  safe(stopSpeech);
  ctrl = new AbortController();
  curKind = kind;
  resetScene();
  app().set({ listening: false, playing: null });
  return ctrl.signal;
}

/** Normal end of a presentation (no-op when another one already took over). */
function finish(signal: AbortSignal) {
  if (!isCurrent(signal)) return;
  curKind = null;
  resetScene();
  app().set({ status: 'ready', expression: 'smile', playing: null, listening: false, mouth: 0, viseme: 0 });
  scheduleHome(1400);
}

async function run(kind: FlowKind, body: (signal: AbortSignal) => Promise<void>): Promise<void> {
  const signal = begin(kind);
  try {
    await body(signal);
  } catch (e) {
    if (!isAbort(e)) console.error('[engine]', e);
  } finally {
    finish(signal);
  }
}

function setPlaying(kind: PlayingKind, id: string) {
  app().set({ playing: { kind, id } });
}

function offGround(a: ActorState): boolean {
  const loc = LOCATIONS[app().location];
  const [x, y, z] = a.pos;
  if (loc.kind === 'inside') {
    const [ox, oy, oz] = loc.origin;
    return Math.abs(y - oy) > 0.12 || Math.abs(x - ox) > loc.size[0] / 2 || Math.abs(z - oz) > loc.size[1] / 2;
  }
  return Math.abs(y - groundHeight(x, z)) > 0.12;
}

const isSeated = (a: ActorState | undefined) => !!a && (!!a.flags?.seated || !!a.flags?.inBus || a.clip === 'sitDrive');

/**
 * Clear non-persistent actors/props, shot and set flags; reset Alrashed's pose (idle, empty hands,
 * no flags). He stays where he is unless he was seated, off the walkable ground or outside the room,
 * then he goes back to the location's robot spot.
 */
function resetScene() {
  stopCutsceneSounds();
  setSpeechActive(false);
  setBaseStatus('explaining');
  clearTurns();
  const st = useStage.getState();
  const r = st.actors[ROBOT];
  const misplaced = !r || isSeated(r) || offGround(r);
  st.clearScene();
  if (misplaced) placeRobotAt(app().location);
  else
    st.patchActor(ROBOT, {
      clip: 'idle',
      clipStart: clock.now(),
      clipDuration: 0,
      clipSpeed: 1,
      hold: null,
      holdLeft: null,
      lookAt: null,
      flags: {},
      visible: true,
      move: undefined,
    });
  app().set({ mouth: 0, viseme: 0 });
}

/* --------------------------------------------------------------------------- robot helpers */

function robotClip(clip: RobotClip, dur: number) {
  useStage.getState().patchActor(ROBOT, { clip, clipStart: clock.now(), clipDuration: dur, clipSpeed: 1 });
}

/** Alrashed turns (smoothly) to face the camera. */
async function faceCamera(signal: AbortSignal, ms = 450) {
  const r = robot();
  if (!r) return;
  const target = Math.atan2(rig.pos.x - r.pos[0], rig.pos.z - r.pos[2]);
  if (Math.abs(wrapAngle(target - r.rotY)) < 0.06) return;
  turnActor(ROBOT, target, 9);
  await sleep(ms, signal);
}

const GESTURES: RobotClip[] = ['explain1', 'talk', 'explain2', 'talk', 'explain3', 'talk'];

/** Gestures only while he stands idle (not seated, not walking, not holding a pose a cutscene set). */
const canGesture = (r: ActorState | undefined) =>
  !!r && !r.move && !isSeated(r) && (r.clip === 'idle' || (GESTURES as string[]).includes(r.clip));

/** Default talking gestures while he speaks without a 'during' cutscene. */
async function gestureLoop(signal: AbortSignal) {
  let i = 0;
  try {
    await sleep(350, signal);
    for (;;) {
      const clip = GESTURES[i++ % GESTURES.length];
      const dur = clip === 'talk' ? 2.4 : 2.8;
      if (canGesture(robot())) robotClip(clip, dur);
      await sleep(dur * 1000 + 250, signal);
    }
  } catch (e) {
    if (!isAbort(e)) console.error('[engine] gestures', e);
  } finally {
    const r = robot();
    if (r && (GESTURES as string[]).includes(r.clip)) robotClip('idle', 0);
  }
}

/* ------------------------------------------------------------------------------- speech */

async function speakText(
  key: string,
  text: string,
  signal: AbortSignal,
  part?: SpeechPart,
  live?: { audioUrl: string; visemes: [number, number][] },
) {
  const t = renderGender(text ?? '', app().gender).trim();
  if (!t && !live) return;
  try {
    await speak({ key, text: t, part, signal, live });
  } catch (e) {
    if (isAbort(e) || signal.aborted) throw abortError();
    console.error(`[engine] speak failed for ${key}`, e);
  }
  if (signal.aborted) throw abortError();
}

/** Speak with the default gestures (short answers, creative). */
async function speakWithGestures(
  o: { key: string; text: string; part?: SpeechPart; live?: { audioUrl: string; visemes: [number, number][] } },
  signal: AbortSignal,
) {
  setSpeechActive(true);
  const child = childController(signal);
  const g = canGesture(robot()) ? gestureLoop(child.signal) : Promise.resolve();
  try {
    await speakText(o.key, o.text, signal, o.part, o.live);
  } finally {
    child.abort();
    await g;
    setSpeechActive(false);
    app().set({ mouth: 0 });
  }
}

/** A system line by id (content SYSTEM_LINES), key `sys.<id>`. */
async function systemLine(id: string, signal: AbortSignal, o: { face?: Expression; status?: Status } = {}) {
  const line = SYSTEM_BY_ID[id];
  app().set({ status: o.status ?? 'speaking', expression: o.face ?? SYSTEM_FACE[id] ?? 'talking' });
  if (!line) {
    console.info(`[engine] system line "${id}" is not in content yet`);
    return;
  }
  await speakText(`sys.${id}`, line.text, signal);
}

/** The ordered spoken lines of a scenario (voiceLines.scenarioLines when present). */
export function scenarioSpeech(sc: Scenario): SpokenLine[] {
  if (voiceLines.scenarioLines) {
    try {
      const l = voiceLines.scenarioLines(sc);
      if (Array.isArray(l) && l.length) return l;
    } catch (e) {
      console.error('[engine] scenarioLines failed', e);
    }
  }
  if (!sc.text) return sc.body ? [{ key: `${sc.id}.body`, text: sc.body, part: 'body', pauseAfterMs: 0 }] : [];
  const t = sc.text;
  const out: SpokenLine[] = [{ key: `${sc.id}.opening`, text: t.opening, part: 'opening', pauseAfterMs: 600 }];
  if (t.must.length) {
    out.push({ key: 'lead.must', text: MUST_LEAD, part: 'must', pauseAfterMs: 400 });
    t.must.forEach((m, i) => out.push({ key: `${sc.id}.must.${i}`, text: m, part: 'must', pauseAfterMs: i === t.must.length - 1 ? 600 : 400 }));
  }
  if (t.avoid.length) {
    out.push({ key: 'lead.avoid', text: AVOID_LEAD, part: 'avoid', pauseAfterMs: 400 });
    t.avoid.forEach((m, i) => out.push({ key: `${sc.id}.avoid.${i}`, text: m, part: 'avoid', pauseAfterMs: i === t.avoid.length - 1 ? 600 : 400 }));
  }
  out.push({ key: `${sc.id}.slogan`, text: t.slogan, part: 'slogan', pauseAfterMs: 0 });
  return out;
}

/* ------------------------------------------------------------------------------ scenarios */

async function cutscenePart(sc: Scenario, part: CutscenePart, signal: AbortSignal) {
  const c = getCutscene(sc.id, part);
  if (!c) return;
  try {
    await runCutscene(c, app().location, signal);
  } catch (e) {
    if (isAbort(e)) throw e;
    console.error(`[engine] cutscene ${sc.id}:${part} failed`, e);
  }
  if (signal.aborted) throw abortError();
}

/**
 * While he explains a scenario he must not talk with his back to the student. Whenever he stands in a
 * plain talking pose facing away from the camera (a script left him looking at the scene, or pointed
 * him at something and went on to an explain gesture), turn him to a three-quarter view.
 */
async function keepFacingViewer(signal: AbortSignal) {
  try {
    await sleep(500, signal);
    for (;;) {
      if (isTalkingPose(ROBOT) && !isTurning(ROBOT)) turnToViewer(ROBOT);
      await sleep(400, signal);
    }
  } catch {
    /* speech ended */
  }
}

async function speakScenario(sc: Scenario, signal: AbortSignal) {
  setSpeechActive(true);
  app().set({ status: 'explaining' });
  const child = childController(signal);
  const during = getCutscene(sc.id, 'during');
  let side: Promise<void> = Promise.resolve();
  if (during)
    side = runCutscene(during, app().location, child.signal).catch((e) => console.error(`[engine] cutscene ${sc.id}:during failed`, e));
  else if (canGesture(robot())) side = gestureLoop(child.signal);
  const watch = keepFacingViewer(child.signal);
  try {
    for (const line of scenarioSpeech(sc)) {
      app().set({ expression: PART_EXPRESSION[line.part] ?? 'talking', status: 'explaining' });
      await speakText(line.key, line.text, signal, line.part);
      if (line.pauseAfterMs > 0) await sleep(line.pauseAfterMs, signal);
    }
  } finally {
    child.abort();
    await side;
    await watch;
    setSpeechActive(false);
    app().set({ mouth: 0 });
    if (!signal.aborted) app().set({ status: 'explaining' });
  }
}

async function scenarioFlow(id: string, signal: AbortSignal) {
  const sc = SCENARIO_BY_ID[id];
  if (!sc) {
    console.warn(`[engine] unknown scenario "${id}"`);
    return;
  }
  curKind = 'scenario';
  setPlaying('scenario', id);
  setBaseStatus('explaining');
  app().set({ status: 'walking', expression: 'smile' });
  await doTravel(sc.location, { weather: sc.weather, time: sc.time, signal });
  app().set({ status: 'explaining' });
  await cutscenePart(sc, 'setup', signal);
  for (const step of sc.order) {
    if (step === 'speak') await speakScenario(sc, signal);
    else await cutscenePart(sc, step, signal);
  }
}

async function shortFlow(id: string, signal: AbortSignal) {
  const sh = SHORT_BY_ID[id];
  if (!sh) {
    console.warn(`[engine] unknown short answer "${id}"`);
    return;
  }
  curKind = 'short';
  setPlaying('short', id);
  app().set({ status: 'walking', expression: 'smile' });
  await doTravel(sh.location, { signal });
  await faceCamera(signal);
  app().set({ status: 'speaking', expression: sh.face });
  await speakWithGestures({ key: `short.${id}`, text: sh.answer }, signal);
}

/** Off-topic: confused face + off-topic line, then the intro scenario. */
async function offTopic(signal: AbortSignal) {
  setPlaying('system', 'off_topic');
  await systemLine('off_topic', signal, { face: 'confused' });
  await scenarioFlow('intro', signal);
}

/* -------------------------------------------------------------------------------- questions */

const usable = (t: string | undefined) => !!t && t.replace(/[\s\p{P}]/gu, '').length >= 2;

/** Listen once (+ one retry after the not-heard line). Speaks the error lines itself. */
async function listen(signal: AbortSignal): Promise<Heard | null> {
  let can = { available: false, needsInternet: true };
  try {
    can = canListen();
  } catch (e) {
    console.error('[engine] canListen', e);
  }
  if (!can.available) {
    setPlaying('system', 'need_internet_listen');
    await systemLine('need_internet_listen', signal);
    return null;
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    app().set({ status: 'listening', expression: 'listening', listening: true, playing: null });
    safe(() => playSfx('listenStart'));
    let res: ListenResult;
    try {
      res = await listenOnce({ signal, maxMs: 12000, silenceMs: 1500 });
    } catch (e) {
      if (isAbort(e) || signal.aborted) throw abortError();
      console.error('[engine] listenOnce', e);
      res = { ok: false, error: 'error' };
    } finally {
      app().set({ listening: false });
      safe(() => playSfx('listenStop'));
    }
    if (signal.aborted) throw abortError();
    if (res.ok && usable(res.heard.text)) return res.heard;
    if (!res.ok && (res.error === 'denied' || res.error === 'no-mic')) {
      setPlaying('system', 'mic_denied');
      await systemLine('mic_denied', signal);
      return null;
    }
    if (!res.ok && (res.error === 'offline' || res.error === 'unsupported')) {
      setPlaying('system', 'need_internet_listen');
      await systemLine('need_internet_listen', signal);
      return null;
    }
    if (attempt === 0) {
      setPlaying('system', 'not_heard');
      await systemLine('not_heard', signal);
    }
  }
  return null;
}

async function creativeFlow(text: string, signal: AbortSignal) {
  curKind = 'creative';
  if (!isOnline() || !backendAvailable()) {
    setPlaying('system', 'offline_creative');
    await systemLine('offline_creative', signal);
    return;
  }
  app().set({ status: 'thinking', expression: 'thinking' });
  const req: Promise<CreativeAnswer | null> = askCreative(text, app().gender, history.slice(-6), signal).catch((e) => {
    if (isAbort(e)) throw e;
    console.error('[engine] askCreative', e);
    return null;
  });
  req.catch(() => {});
  setPlaying('creative', 'thinking');
  await systemLine('thinking', signal, { face: 'thinking', status: 'thinking' });
  app().set({ status: 'thinking', expression: 'thinking' });
  const ans = await req;
  if (signal.aborted) throw abortError();
  if (!ans || !ans.on_topic || !ans.answer?.trim()) {
    await offTopic(signal);
    return;
  }
  const loc: LocationId = ans.location && ans.location in LOCATIONS ? ans.location : app().location;
  const weather = ans.weather && WEATHERS.includes(ans.weather) ? ans.weather : null;
  const face: Expression = ans.expression && ans.expression in EXPRESSIONS ? ans.expression : 'lightbulb';
  setPlaying('creative', 'answer');
  app().set({ status: 'walking', expression: 'smile' });
  await doTravel(loc, { weather, signal });
  await faceCamera(signal);
  app().set({ status: 'speaking', expression: face });
  await speakWithGestures(
    {
      key: 'creative.live',
      text: ans.answer,
      live: ans.audioUrl ? { audioUrl: ans.audioUrl, visemes: ans.visemes ?? [] } : undefined,
    },
    signal,
  );
  history.push({ q: text, a: ans.answer });
  if (history.length > 6) history.splice(0, history.length - 6);
}

/** Route a question (heard or typed) by mode. */
async function answer(text: string, signal: AbortSignal) {
  const mode: ModeId = app().mode ?? 'outside';
  if (mode === 'creative') return creativeFlow(text, signal);
  app().set({ status: 'thinking', expression: 'thinking' });
  let r: MatchResult;
  try {
    r = await matchQuestionAsync(text, mode, { online: isOnline(), signal });
  } catch (e) {
    if (isAbort(e) || signal.aborted) throw abortError();
    console.error('[engine] matcher failed', e);
    r = { kind: 'intro', id: 'intro', score: 0, band: 'low' };
  }
  if (signal.aborted) throw abortError();
  if (r.band === 'low') return offTopic(signal);
  if (r.kind === 'short' && SHORT_BY_ID[r.id]) return shortFlow(r.id, signal);
  if (r.kind === 'intro' || SCENARIO_BY_ID[r.id]) return scenarioFlow(r.kind === 'intro' ? 'intro' : r.id, signal);
  return offTopic(signal);
}

/* ------------------------------------------------------------------------------ public API */

/** Alrashed in the classroom turns to the camera, waves with a big smile. */
async function greetWave(signal: AbortSignal) {
  const r = robot();
  const home = LOCATIONS.classroom;
  const spot: [number, number] = [home.origin[0] + home.robot[0], home.origin[2] + home.robot[1]];
  if (app().location !== 'classroom' || !r || Math.hypot(r.pos[0] - spot[0], r.pos[2] - spot[1]) > 1.5) {
    app().set({ status: 'walking' });
    await doTravel('classroom', { signal });
  }
  await faceCamera(signal, 400);
  robotClip('wave', 2.0);
  app().set({ expression: 'happy', status: 'waving' });
  await sleep(900, signal);
}

export async function enterMode(mode: ModeId): Promise<void> {
  app().set({ mode, phase: 'mode' });
  app().setUi({ scenariosOpen: false });
  warmMatcher();
  if (mode === 'exam') {
    const signal = begin('exam');
    try {
      setPlaying('exam', 'exam');
      await greetWave(signal);
      await examFlow.startExam();
    } catch (e) {
      if (!isAbort(e)) console.error('[engine] exam', e);
    } finally {
      // startExam may keep running in the background (ui.examRunning): then the exam owns the stage.
      if (isCurrent(signal) && !app().ui.examRunning) finish(signal);
    }
    return;
  }
  await run('system', async (s) => {
    setPlaying('system', `mode_${mode}`);
    await greetWave(s);
    await systemLine(`mode_${mode}`, s, { face: 'happy' });
  });
}

export function backToMenu(): void {
  if (app().mode === 'exam' || app().ui.examRunning) safe(examFlow.abortExam);
  const signal = begin('menu');
  history.length = 0;
  app().set({ phase: 'menu', mode: null, inCall: false, listening: false, playing: null, status: 'ready', expression: 'smile' });
  app().setUi({ scenariosOpen: false, examRunning: false });
  void (async () => {
    try {
      await doTravel('classroom', { weather: 'sunny', time: 'morning', signal });
    } catch (e) {
      if (!isAbort(e)) console.error('[engine]', e);
    } finally {
      finish(signal);
    }
  })();
}

/** Status button: stop speech + cutscene immediately and return Alrashed to the classroom. */
export function stopAll(): void {
  if (app().mode === 'exam' || app().ui.examRunning) {
    safe(examFlow.abortExam);
    app().setUi({ examRunning: false });
  }
  const signal = begin('stop');
  safe(stopAllSfx);
  app().set({ status: 'ready', expression: 'smile', playing: null, listening: false });
  void (async () => {
    try {
      await doTravel('classroom', { weather: 'sunny', time: 'morning', signal });
    } catch (e) {
      if (!isAbort(e)) console.error('[engine]', e);
    } finally {
      finish(signal);
    }
  })();
}

export function startCall(): void {
  if (app().inCall) return;
  history.length = 0;
  app().set({ inCall: true });
  void run('system', async (s) => {
    setPlaying('system', 'greet');
    safe(() => playSfx('ring'));
    await sleep(650, s);
    await faceCamera(s, 450);
    robotClip('wave', 1.8);
    app().set({ expression: 'happy', status: 'waving' });
    await sleep(700, s);
    // The very first call on this device greets neutrally (gender not known yet).
    const first = !storageGet(FIRST_CALL_KEY);
    await systemLine(first ? 'greet_first' : 'greet_call', s, { face: 'happy' });
    if (first) storageSet(FIRST_CALL_KEY, '1');
  });
}

export function endCall(): void {
  history.length = 0;
  app().set({ inCall: false, listening: false });
  // Stop listening / the greeting; a scenario or answer that already plays keeps going.
  if (curKind === 'listen' || curKind === 'system') finish(begin('system'));
}

/** Mic button: listen once, detect gender, match, then play the answer. */
export async function askByVoice(): Promise<void> {
  if (app().mode === 'exam') {
    const hook = examHook('examAskByVoice');
    if (hook) await Promise.resolve(hook()).catch((e) => console.error('[engine] exam mic', e));
    return;
  }
  if (app().listening) return;
  await run('listen', async (s) => {
    const heard = await listen(s);
    if (!heard) return;
    if (heard.samples && heard.samples.length) {
      try {
        applyGenderDetection(detectGender(heard.samples, heard.sampleRate));
      } catch (e) {
        console.error('[engine] gender', e);
      }
    }
    await answer(heard.text, s);
  });
}

/** Same as askByVoice but with known text (creative chips, debugging). */
export async function askText(text: string): Promise<void> {
  if (app().mode === 'exam') {
    const hook = examHook('examAnswerText');
    if (hook) await Promise.resolve(hook(text)).catch((e) => console.error('[engine] exam text', e));
    return;
  }
  await run('listen', (s) => answer(text, s));
}

export async function playScenario(id: string): Promise<void> {
  await run('scenario', (s) => scenarioFlow(id, s));
}

export async function playShort(id: string): Promise<void> {
  await run('short', (s) => shortFlow(id, s));
}

/**
 * Speak a system line by id (sys lines from content). Without a signal it is its own presentation
 * (aborts what plays, ends with status ready); with a signal it is one step of the caller's flow and
 * rejects with an AbortError when that signal aborts.
 */
export async function playSystem(id: string, signal?: AbortSignal): Promise<void> {
  if (signal) {
    if (signal.aborted) throw abortError();
    await systemLine(id, signal);
    return;
  }
  await run('system', async (s) => {
    setPlaying('system', id);
    await systemLine(id, s);
  });
}

/**
 * Move Alrashed + camera to a location (fly when near, fade when far). Sets weather/time if given.
 * With a signal it is a step of the caller's flow (rejects with AbortError when aborted). Without one
 * (e.g. a map pin) it is its own presentation; during the exam it joins the exam's signal.
 */
export async function travelTo(
  loc: LocationId,
  opts?: { weather?: Weather | null; time?: TimeOfDay | null; signal?: AbortSignal },
): Promise<void> {
  const o = { weather: opts?.weather ?? null, time: opts?.time ?? null };
  if (opts?.signal) return doTravel(loc, { ...o, signal: opts.signal });
  const a = app();
  if (a.playing?.kind === 'exam' || a.ui.examRunning) {
    try {
      await doTravel(loc, { ...o, signal: ctrl.signal });
    } catch (e) {
      if (!isAbort(e)) console.error('[engine]', e);
    }
    return;
  }
  await run('travel', async (s) => {
    app().set({ status: 'walking' });
    await doTravel(loc, { ...o, signal: s });
    // some places stand him looking at the street or the school (away from the default view): after a
    // visit from the map he turns round to the student instead of showing his back
    await faceCamera(s);
  });
}

/**
 * Dev/testing: play an ad-hoc cutscene script as its own presentation (travel to `loc`, run it as an
 * 'after' part, then the normal end-of-presentation cleanup). Used from window.__alrashed.
 */
export async function playCutsceneScript(loc: LocationId, script: (ctx: import('../cutscenes/api').CutsceneCtx) => Promise<void>): Promise<void> {
  await run('scenario', async (s) => {
    setPlaying('scenario', 'dev');
    setBaseStatus('explaining');
    await doTravel(loc, { signal: s });
    app().set({ status: 'explaining' });
    await runCutscene({ scenario: 'dev', part: 'after', run: script }, app().location, s);
  });
}

/** Abort signal of the current presentation (exam code uses it to chain its own steps). */
export function currentSignal(): AbortSignal {
  return ctrl.signal;
}
