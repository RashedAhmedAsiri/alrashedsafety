import type { ModeId, Status } from './types';

/** UI and brand colors from docs/plan/Screens_and_UI.md. Robot antenna, UI pills and map share these. */
export const COLORS = {
  ink: '#1E2A3B',
  paper: '#FFF8EC',
  outside: '#2D8CFF',
  inside: '#22B573',
  short: '#FFAA1F',
  creative: '#8B5CF6',
  exam: '#F0476B',
  teal: '#14B8A6',
  grey: '#8A94A6',
} as const;

export const MODE_COLORS: Record<ModeId, string> = {
  outside: COLORS.outside,
  inside: COLORS.inside,
  short: COLORS.short,
  creative: COLORS.creative,
  exam: COLORS.exam,
};

export const STATUS_COLORS: Record<Status, string> = {
  ready: COLORS.grey,
  listening: COLORS.inside,
  thinking: COLORS.creative,
  speaking: COLORS.outside,
  explaining: COLORS.short,
  waving: COLORS.short,
  walking: COLORS.teal,
};

/** Status pill labels (fully diacritized, from the plan). */
export const STATUS_LABELS: Record<Status, string> = {
  ready: 'جَاهِزٌ',
  listening: 'يَسْتَمِعُ',
  thinking: 'يُفَكِّرُ',
  speaking: 'يَتَحَدَّثُ',
  explaining: 'يَشْرَحُ',
  waving: 'يُلَوِّحُ',
  walking: 'يَمْشِي',
};
