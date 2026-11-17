import type { SpeechPart } from '../core/types';
import { hasGenderMarkup } from '../core/gender';
import {
  AVOID_LEAD,
  EXAM_LINES,
  EXAM_QUESTIONS,
  INSIDE_SCENARIOS,
  INTRO,
  MUST_LEAD,
  OUTSIDE_SCENARIOS,
  SHORT_ANSWERS,
  SYSTEM_LINES,
} from './index';
import type { Scenario } from './types';

// OWNER: voice worker.
// Every spoken line of the app with its recording key (docs/ARCHITECTURE.md "Voice keys and files").
// Works while content arrays are empty or partial: missing pieces are skipped, never thrown on.

export interface VoiceLine {
  key: string;
  /** Text with `{boy/girl}` markup (render with renderGender before speaking). */
  text: string;
  /** True when the text has gender markup, so it is recorded twice (b and g). */
  gendered: boolean;
}

export interface SpokenLine {
  key: string;
  text: string;
  part: SpeechPart;
  /** Silence after this line before the next one (400 ms between items, 600 ms between parts). */
  pauseAfterMs: number;
}

/** Pauses from the plan ("Text for the voice"). */
/** Loading-screen name clip: «الراشد». Stable key, recorded by tools/generate_voice_edge.py. */
export const NAME_CLIP = { key: 'ui.name', text: 'الراشد' } as const;

export const PAUSE_ITEM_MS = 400;
export const PAUSE_PART_MS = 600;

/** Key builders. Use these instead of writing key strings by hand. */
export const voiceKey = {
  scenario: (scenarioId: string, part: 'opening' | 'slogan' | 'body') => `${scenarioId}.${part}`,
  must: (scenarioId: string, i: number) => `${scenarioId}.must.${i}`,
  avoid: (scenarioId: string, i: number) => `${scenarioId}.avoid.${i}`,
  leadMust: 'lead.must',
  leadAvoid: 'lead.avoid',
  short: (id: string) => `short.${id}`,
  sys: (id: string) => `sys.${id}`,
  examQuestion: (questionId: string) => `exam.${questionId}.question`,
  examCorrect: (questionId: string) => `exam.${questionId}.correct`,
  examWrong: (questionId: string) => `exam.${questionId}.wrong`,
  examPhaseQuestion: 'exam.phase_question',
  examStart: 'exam.start',
  /** Score line «حَصَلْتَ عَلَى X مِنْ عَشْرٍ», n = 0..10. */
  examScore: (n: number) => `exam.score.${n}`,
  /** Band message, i = index into EXAM_LINES.bands. */
  examBand: (i: number) => `exam.band.${i}`,
} as const;

const nonEmpty = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;

/**
 * The ordered spoken sequence of a scenario: opening; lead.must; must items; lead.avoid; avoid
 * items; slogan. The intro (or any scenario with only `body`) is a single `body` line.
 */
export function scenarioLines(scenario: Scenario): SpokenLine[] {
  const out: SpokenLine[] = [];
  if (!scenario) return out;
  const t = scenario.text;
  if (!t) {
    if (nonEmpty(scenario.body)) out.push({ key: voiceKey.scenario(scenario.id, 'body'), text: scenario.body, part: 'body', pauseAfterMs: 0 });
    return out;
  }
  if (nonEmpty(t.opening)) out.push({ key: voiceKey.scenario(scenario.id, 'opening'), text: t.opening, part: 'opening', pauseAfterMs: PAUSE_PART_MS });
  const list = (items: string[] | undefined, lead: string, leadKey: string, part: 'must' | 'avoid', keyOf: (i: number) => string) => {
    const idx = (items ?? []).map((x, i) => [x, i] as const).filter(([x]) => nonEmpty(x));
    if (!idx.length) return;
    out.push({ key: leadKey, text: lead, part, pauseAfterMs: PAUSE_ITEM_MS });
    idx.forEach(([text, i], j) =>
      out.push({ key: keyOf(i), text, part, pauseAfterMs: j === idx.length - 1 ? PAUSE_PART_MS : PAUSE_ITEM_MS }),
    );
  };
  list(t.must, MUST_LEAD, voiceKey.leadMust, 'must', (i) => voiceKey.must(scenario.id, i));
  list(t.avoid, AVOID_LEAD, voiceKey.leadAvoid, 'avoid', (i) => voiceKey.avoid(scenario.id, i));
  if (nonEmpty(t.slogan)) out.push({ key: voiceKey.scenario(scenario.id, 'slogan'), text: t.slogan, part: 'slogan', pauseAfterMs: 0 });
  if (out.length) out[out.length - 1].pauseAfterMs = 0;
  return out;
}

/** Every line that has a recording, in a stable order. Duplicate keys keep the first (and warn). */
export function allVoiceLines(): VoiceLine[] {
  const out: VoiceLine[] = [];
  const seen = new Set<string>();
  const add = (key: string, text: unknown) => {
    if (!nonEmpty(text)) return;
    if (seen.has(key)) {
      console.warn(`[voiceLines] duplicate key ${key} skipped`);
      return;
    }
    seen.add(key);
    out.push({ key, text, gendered: hasGenderMarkup(text) });
  };

  add(NAME_CLIP.key, NAME_CLIP.text);
  add(voiceKey.leadMust, MUST_LEAD);
  add(voiceKey.leadAvoid, AVOID_LEAD);

  const scenarios = [INTRO, ...(OUTSIDE_SCENARIOS ?? []), ...(INSIDE_SCENARIOS ?? [])].filter(Boolean);
  for (const sc of scenarios) {
    for (const l of scenarioLines(sc)) {
      if (l.key === voiceKey.leadMust || l.key === voiceKey.leadAvoid) continue;
      add(l.key, l.text);
    }
  }

  for (const s of SHORT_ANSWERS ?? []) if (s) add(voiceKey.short(s.id), s.answer);
  for (const s of SYSTEM_LINES ?? []) if (s) add(voiceKey.sys(s.id), s.text);

  for (const q of EXAM_QUESTIONS ?? []) {
    if (!q) continue;
    add(voiceKey.examQuestion(q.id), q.question);
    add(voiceKey.examCorrect(q.id), q.correct);
    add(voiceKey.examWrong(q.id), q.wrong);
  }
  if (EXAM_LINES) {
    add(voiceKey.examPhaseQuestion, EXAM_LINES.phaseQuestion);
    add(voiceKey.examStart, EXAM_LINES.start);
    (EXAM_LINES.score ?? []).forEach((t, n) => add(voiceKey.examScore(n), t));
    (EXAM_LINES.bands ?? []).forEach((b, i) => add(voiceKey.examBand(i), b?.text));
  }
  return out;
}

/** Lookup of the text for a key (null when the key is not in content yet). */
export function voiceLineText(key: string): string | null {
  return allVoiceLines().find((l) => l.key === key)?.text ?? null;
}
