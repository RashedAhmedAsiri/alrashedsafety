import { INTRO, OUTSIDE_SCENARIOS } from './data/outside';
import { INSIDE_SCENARIOS } from './data/inside';
import { SYSTEM_LINES } from './data/systemLines';
import { SHORT_ANSWERS } from './data/shortAnswers';
import { EXAM_QUESTIONS, EXAM_LINES } from './data/exam';
import { CREATIVE_CHIPS } from './data/creativeChips';
import type { Scenario, ShortAnswer, SystemLine } from './types';

export { INTRO, OUTSIDE_SCENARIOS, INSIDE_SCENARIOS, SYSTEM_LINES, SHORT_ANSWERS, EXAM_QUESTIONS, EXAM_LINES, CREATIVE_CHIPS };

export const ALL_SCENARIOS: Scenario[] = [INTRO, ...OUTSIDE_SCENARIOS, ...INSIDE_SCENARIOS];

const byId = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x])) as Record<string, T>;
export const SCENARIO_BY_ID: Record<string, Scenario> = byId(ALL_SCENARIOS);
export const SHORT_BY_ID: Record<string, ShortAnswer> = byId(SHORT_ANSWERS);
export const SYSTEM_BY_ID: Record<string, SystemLine> = byId(SYSTEM_LINES);

/** Fixed spoken leads for the scenario lists. */
export const MUST_LEAD = 'يَجِبُ عَلَيَّ أَنْ';
export const AVOID_LEAD = 'وَأَتَذَكَّرُ دَوْمًا';
