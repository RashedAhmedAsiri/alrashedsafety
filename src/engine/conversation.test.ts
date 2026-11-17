import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Mocks for every module the controller talks to, so this test only checks the engine's sequencing. */
vi.mock('../audio/sfx', () => ({ unlockAudio: vi.fn(), playSfx: vi.fn(), stopSfx: vi.fn(), stopAllSfx: vi.fn(), setMusic: vi.fn() }));

const spoken: { key: string; text: string; part?: string; expression: string; status: string }[] = [];
vi.mock('../voice/speech', async () => {
  const { useApp } = await import('../core/store');
  return {
    speak: vi.fn(
      (o: { key: string; text: string; part?: string; signal?: AbortSignal }) =>
        new Promise<void>((resolve, reject) => {
          const a = useApp.getState();
          spoken.push({ key: o.key, text: o.text, part: o.part, expression: a.expression, status: a.status });
          if (o.signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
          const t = setTimeout(resolve, 300);
          o.signal?.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    ),
    stopSpeech: vi.fn(),
    estimateDuration: (t: string) => Math.max(1, t.length / 11),
  };
});
vi.mock('../voice/listen', () => ({
  canListen: () => ({ available: true, needsInternet: false }),
  listenOnce: vi.fn(async () => ({ ok: true, heard: { text: 'كيف اقطع الشارع', samples: null, sampleRate: 16000 } })),
}));
vi.mock('../voice/gender', () => ({ detectGender: vi.fn(() => null), applyGenderDetection: vi.fn(), setManualGender: vi.fn() }));
const matchResult = { current: { kind: 'scenario', id: 'demo', score: 0.8, band: 'match' } as Record<string, unknown> };
vi.mock('../match', () => ({
  normalizeArabic: (t: string) => t,
  matchQuestion: () => matchResult.current,
  matchQuestionAsync: vi.fn(async () => matchResult.current),
  warmUpMatcher: vi.fn(),
}));
vi.mock('../backend/api', () => ({ API_BASE: '', askCreative: vi.fn(async () => null), tieBreak: vi.fn(async () => null), isOnline: () => false }));
vi.mock('../exam/flow', () => ({ startExam: vi.fn(async () => {}), abortExam: vi.fn() }));
vi.mock('../content', () => {
  const demo = {
    id: 'demo', mode: 'outside', n: 1, title: 't', icon: 'Bot', color: '#000', location: 'yard', weather: 'rain', time: 'afternoon',
    order: ['speak', 'after'],
    text: { opening: 'يَا {بَطَلُ/بَطَلَةُ}', must: ['m0', 'm1'], avoid: ['a0'], slogan: 's' },
    examples: [], keywords: [],
  };
  const intro = { id: 'intro', mode: 'intro', n: 0, title: 'i', icon: 'Bot', color: '#000', location: 'classroom', weather: null, time: null, order: ['before', 'speak', 'after'], body: 'body', examples: [], keywords: [] };
  const cut = { id: 'cut', n: 6, group: 'fire_first_aid', chip: 'c', asks: [], answer: 'جواب', location: 'clinic', face: 'gentle', keywords: [] };
  const sys = ['greet_first', 'greet_call', 'not_heard', 'off_topic', 'mic_denied', 'offline_creative', 'thinking', 'mode_outside', 'mode_inside', 'mode_short', 'mode_creative', 'need_internet_listen'];
  const SYSTEM_LINES = sys.map((id) => ({ id, text: `line ${id}` }));
  return {
    INTRO: intro, OUTSIDE_SCENARIOS: [demo], INSIDE_SCENARIOS: [], SYSTEM_LINES, SHORT_ANSWERS: [cut], EXAM_QUESTIONS: [],
    EXAM_LINES: { score: [], bands: [], phaseQuestion: '', start: '' }, CREATIVE_CHIPS: [], ALL_SCENARIOS: [intro, demo],
    SCENARIO_BY_ID: { demo, intro }, SHORT_BY_ID: { cut }, SYSTEM_BY_ID: Object.fromEntries(SYSTEM_LINES.map((l) => [l.id, l])),
    MUST_LEAD: 'MUST', AVOID_LEAD: 'AVOID',
  };
});
vi.mock('../cutscenes/registry', async () => {
  const { cutscene } = await import('../cutscenes/api');
  const after = cutscene('demo', 'after', async (c) => {
    const s1 = c.spawn('s1', 'boy', { pos: c.at(1, 0) });
    await Promise.all([c.robot.walkTo(c.at(0, 1.2)), s1.walkTo(c.at(1, 2))]);
    c.expr('hearts');
    await c.wait(0.3);
  });
  const table: Record<string, unknown> = { 'demo:after': after };
  return { getCutscene: (s: string, p: string) => table[`${s}:${p}`], ALL_CUTSCENES: [after] };
});

import { useApp } from '../core/store';
import { useStage } from '../core/stage';
import { robotSpot } from '../core/locations';
import { clock } from './clock';
import { advanceStage } from './driver';
import { rig } from './rig';
import { askText, enterMode, playScenario, playShort, startCall, endCall, stopAll, currentSignal } from './conversation';

let now = 0;
const realNow = clock.now;

/** Advance fake timers and the stage together (30 fps). */
async function frames(seconds: number) {
  const dt = 1 / 30;
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    await vi.advanceTimersByTimeAsync(dt * 1000);
    now += dt * 1000;
    rig.frame++;
    advanceStage(dt, now);
  }
}
async function until(p: Promise<unknown>, maxSeconds = 60) {
  let done = false;
  void p.then(() => (done = true));
  for (let t = 0; t < maxSeconds && !done; t += 0.5) await frames(0.5);
  expect(done).toBe(true);
}

beforeEach(() => {
  vi.useFakeTimers();
  now = 1000;
  clock.now = () => now;
  spoken.length = 0;
  const r = robotSpot('classroom');
  useStage.getState().clearScene();
  useStage.getState().patchActor('alrashed', { pos: r.pos, rotY: r.rotY, clip: 'idle', clipDuration: 0, move: undefined });
  useApp.setState({ phase: 'mode', mode: 'outside', location: 'classroom', weather: 'sunny', time: 'morning', fade: 0, traveling: false, playing: null, status: 'ready', expression: 'smile', inCall: false, gender: 'boy' });
});
afterEach(() => {
  vi.useRealTimers();
  clock.now = realNow;
});

describe('conversation controller', () => {
  it('plays a scenario: travel, lines in order with the part faces, after cutscene, then clean up', async () => {
    const p = playScenario('demo');
    await frames(0.1);
    expect(useApp.getState().playing).toEqual({ kind: 'scenario', id: 'demo' });
    expect(useApp.getState().traveling).toBe(true);
    await until(p);
    expect(spoken.map((s) => s.key)).toEqual(['demo.opening', 'lead.must', 'demo.must.0', 'demo.must.1', 'lead.avoid', 'demo.avoid.0', 'demo.slogan']);
    expect(spoken.map((s) => s.expression)).toEqual(['happy', 'explaining', 'explaining', 'explaining', 'warning', 'warning', 'proud']);
    expect(spoken.every((s) => s.status === 'explaining')).toBe(true);
    expect(spoken[0].text).toBe('يَا بَطَلُ'); // gender markup rendered
    expect(spoken[1].text).toBe('MUST');
    const a = useApp.getState();
    expect(a.location).toBe('yard');
    expect(a.weather).toBe('rain');
    expect(a.time).toBe('afternoon');
    expect(a.status).toBe('ready');
    expect(a.expression).toBe('smile');
    expect(a.playing).toBeNull();
    expect(a.traveling).toBe(false);
    expect(a.fade).toBe(0);
    // non-persistent actors cleared; Alrashed stays where the cutscene left him
    expect(Object.keys(useStage.getState().actors)).toEqual(['alrashed']);
    const yardSpot = robotSpot('yard').pos;
    expect(useStage.getState().actors.alrashed.pos[2]).toBeCloseTo(yardSpot[2] - 2.8, 1);
  });

  it('stopAll aborts the scenario, stops speech and returns to the classroom', async () => {
    const p = playScenario('demo');
    await frames(3);
    expect(spoken.length).toBeGreaterThan(0);
    const sig = currentSignal();
    stopAll();
    expect(sig.aborted).toBe(true);
    await until(p);
    await frames(3);
    const a = useApp.getState();
    expect(a.location).toBe('classroom');
    expect(a.weather).toBe('sunny');
    expect(a.status).toBe('ready');
    expect(a.playing).toBeNull();
    expect(a.fade).toBe(0);
    const n = spoken.length;
    await frames(3);
    expect(spoken.length).toBe(n); // nothing else is spoken
  });

  it('a low match plays the off-topic line with a confused face, then the intro', async () => {
    matchResult.current = { kind: 'intro', id: 'intro', score: 0.1, band: 'low' };
    await until(askText('وش أحسن لعبة'));
    expect(spoken.map((s) => s.key)).toEqual(['sys.off_topic', 'intro.body']);
    expect(spoken[0].expression).toBe('confused');
    expect(spoken[1].expression).toBe('talking');
    matchResult.current = { kind: 'scenario', id: 'demo', score: 0.8, band: 'match' };
  });

  it('a short answer travels, faces the camera and speaks with its face', async () => {
    await until(playShort('cut'));
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toMatchObject({ key: 'short.cut', expression: 'gentle', status: 'speaking' });
    expect(useApp.getState().location).toBe('clinic');
  });

  it('entering a mode waves and speaks the mode line; calls greet first neutrally, then by gender', async () => {
    useApp.setState({ phase: 'menu', mode: null });
    await until(enterMode('outside'));
    expect(useApp.getState().phase).toBe('mode');
    expect(useApp.getState().mode).toBe('outside');
    expect(spoken.map((s) => s.key)).toEqual(['sys.mode_outside']);
    expect(spoken[0].expression).toBe('happy');
    spoken.length = 0;
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
    startCall();
    expect(useApp.getState().inCall).toBe(true);
    await frames(4);
    expect(spoken.map((s) => s.key)).toEqual(['sys.greet_first']);
    expect(mem.get('alrashed.firstCallDone.v1')).toBe('1');
    endCall();
    startCall();
    await frames(4);
    const keys = spoken.map((s) => s.key);
    expect(keys[keys.length - 1]).toBe('sys.greet_call');
    endCall();
    expect(useApp.getState().inCall).toBe(false);
    vi.unstubAllGlobals();
  });
});
