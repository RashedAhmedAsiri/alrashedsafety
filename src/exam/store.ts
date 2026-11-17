// OWNER: exam worker. UI state of the exam (what ExamOverlay draws). The flow writes it, the overlay reads it.
import { create } from 'zustand';
import type { ChoiceLetter } from '../content/types';

export type ExamStage =
  | 'idle' // nothing drawn
  | 'phase' // «قبل / بعد» buttons
  | 'question' // a question is asked / listened to / tap fallback
  | 'result' // drum roll, stars, band message, certificate
  | 'stopped'; // left early (not saved): offers to start again

export type Pick = ChoiceLetter | 'yes' | 'no' | number | 'pre' | 'post';

export interface ExamUi {
  stage: ExamStage;
  phase: 'pre' | 'post' | null;
  /** 0..9, index of the current question. */
  q: number;
  /** One entry per finished question: true right, false wrong, null not yet. */
  marks: (boolean | null)[];
  /** The mic is open (sound-wave ring). */
  listening: boolean;
  /** The question is being spoken. */
  asking: boolean;
  /** Tap fallback buttons visible. */
  showTap: boolean;
  /** Final score and band (result stage). */
  score: number;
  band: number;
  /** Stars lit so far (result stage). */
  stars: number;
  confetti: 'none' | 'big' | 'normal' | 'stars';
  showCertificate: boolean;
  /** The leave-early confirm card, with what to do on «نعم». */
  confirm: null | 'status' | 'back';
  /** Bumped by every new run so dots/animations restart. */
  run: number;

  patch: (p: Partial<ExamUi>) => void;
  mark: (i: number, ok: boolean) => void;
  reset: () => void;
}

const blank = () => ({
  stage: 'idle' as ExamStage,
  phase: null,
  q: 0,
  marks: new Array<boolean | null>(10).fill(null),
  listening: false,
  asking: false,
  showTap: false,
  score: 0,
  band: 2,
  stars: 0,
  confetti: 'none' as const,
  showCertificate: false,
  confirm: null,
});

export const useExam = create<ExamUi>((set, get) => ({
  ...blank(),
  run: 0,
  patch: (p) => set(p),
  mark: (i, ok) => {
    const marks = get().marks.slice();
    marks[i] = ok;
    set({ marks });
  },
  reset: () => set({ ...blank(), run: get().run + 1 }),
}));
