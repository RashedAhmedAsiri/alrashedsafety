import type { Expression, LocationId, TimeOfDay, Weather } from '../core/types';

/**
 * Content shapes. All Arabic text keeps the plan's `{boy/girl}` markup and full diacritics,
 * copied exactly from docs/plan/*.md (render with renderGender at speak time).
 */

export type ScenarioStep = 'before' | 'speak' | 'after';

export interface ScenarioText {
  /** Opening line (vocative + situation), ends with تَذَكَّرْ-style verb and a colon. */
  opening: string;
  /** Must list items, spoken after the fixed lead «يَجِبُ عَلَيَّ أَنْ». */
  must: string[];
  /** Remember list items, spoken after the fixed lead «وَأَتَذَكَّرُ دَوْمًا». Each starts with لَا. */
  avoid: string[];
  slogan: string;
}

export interface Scenario {
  id: string;
  /** 'intro' is shown first in every mode. */
  mode: 'outside' | 'inside' | 'intro';
  /** Number from the plan (0 for intro). */
  n: number;
  /** Fully diacritized title as in the plan heading, e.g. «طَرِيقَةُ الْعُبُورِ». */
  title: string;
  /** Lucide icon name (PascalCase as exported by lucide-react), e.g. 'Footprints'. */
  icon: string;
  /** Button color (hex) for the scenarios panel. */
  color: string;
  location: LocationId;
  /** null = keep the current weather (the intro). */
  weather: Weather | null;
  time: TimeOfDay | null;
  order: ScenarioStep[];
  /** 4-part text. The intro has `body` instead. */
  text?: ScenarioText;
  /** Single paragraph (intro only). */
  body?: string;
  /** The plan's "Speaking setup" note (English, for builders only; never shown or spoken). */
  speakingSetup?: string;
  /** Example student questions in Saudi dialect (from the plan, plus 4-8 more you add in the same style). */
  examples: string[];
  /** Weighted keywords for matching (normalized Arabic is fine; the matcher normalizes again). */
  keywords: { word: string; weight: number }[];
}

export interface ShortAnswer {
  id: string;
  n: number;
  /** Group heading from the plan, e.g. 'fire_first_aid'. */
  group: 'fire_first_aid' | 'corridors_labs' | 'heat_canteen' | 'bus_street' | 'car_park' | 'general';
  /** Short chip label (plain Arabic, 2-4 words, no diacritics needed) for the scenarios panel. */
  chip: string;
  asks: string[];
  answer: string;
  location: LocationId;
  face: Expression;
  keywords: { word: string; weight: number }[];
}

export interface SystemLine {
  id: string;
  text: string;
}

export type ExamKind = 'choice' | 'yesno' | 'open';
export type ChoiceLetter = 'أ' | 'ب' | 'ج';

export interface ExamConcept {
  id: string;
  /** What it means, in English, for teachers/devs. */
  label: string;
  /** Spoken words (dialect included) that show this concept. */
  words: string[];
}

export interface ExamQuestion {
  id: string;
  n: number;
  kind: ExamKind;
  location: LocationId;
  /** Spoken question including the options for choice questions. */
  question: string;
  /** Choice questions: the three options (text spoken inside `question`; `picture` describes the button picture). */
  options?: { letter: ChoiceLetter; text: string; picture: string }[];
  /** Choice letter, or 'yes'/'no'. Open questions: undefined. */
  answer?: ChoiceLetter | 'yes' | 'no';
  /** Extra accepted spoken variants for the correct answer (choice). */
  spoken?: string[];
  /** Open questions. */
  concepts?: ExamConcept[];
  wrongWords?: string[];
  /** Open questions: pass rule. */
  pass?: { minConcepts?: number; requireAnyOf?: string[] };
  /** Open questions: three fallback picture cards; exactly one is correct. */
  cards?: { picture: string; correct: boolean }[];
  correct: string;
  wrong: string;
}

export interface ExamScoreLines {
  /** Index = score 0..10. Each is the full line to speak, with markup. */
  score: string[];
  bands: { min: number; max: number; text: string; face: Expression }[];
  phaseQuestion: string;
  start: string;
}
