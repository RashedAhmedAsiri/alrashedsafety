import { create } from 'zustand';
import type { Expression, Gender, LocationId, ModeId, Quality, Status, TimeOfDay, Weather } from './types';

/**
 * Global app state (UI + world conditions + Alrashed's face). Positions of characters,
 * props and the camera live in the stage store (./stage.ts), not here.
 */

export type AppPhase = 'loading' | 'flyin' | 'menu' | 'mode';

export type PlayingKind = 'scenario' | 'short' | 'system' | 'creative' | 'exam';

export interface Settings {
  voiceVolume: number; // 0..1
  sfxVolume: number; // 0..1
  music: boolean;
  quality: Quality;
}

export interface AppState {
  phase: AppPhase;
  /** 0..1 loading progress shown by the bus on the road. */
  loadProgress: number;
  mode: ModeId | null;

  location: LocationId;
  weather: Weather;
  time: TimeOfDay;

  status: Status;
  expression: Expression;
  /** Mouth openness 0..1 driven by speech (visemes or the fallback). Read every frame by the face. */
  mouth: number;
  /** Current Azure viseme id 0..21 (0 = silence). */
  viseme: number;

  gender: Gender;
  genderSource: 'default' | 'detected' | 'manual';
  /** Epoch ms until which a manual gender choice overrides detection. */
  genderManualUntil: number;

  inCall: boolean;
  listening: boolean;
  /** What Alrashed is currently presenting, if anything. */
  playing: { kind: PlayingKind; id: string } | null;

  /** True while a travel fade/fly between locations runs. */
  traveling: boolean;
  /** 0..1 opacity of the travel fade overlay. */
  fade: number;

  settings: Settings;

  ui: {
    scenariosOpen: boolean;
    settingsOpen: boolean;
    teacherOpen: boolean;
    /** Exam test in progress: hides the scenarios button. */
    examRunning: boolean;
  };

  set: (patch: Partial<AppState>) => void;
  setUi: (patch: Partial<AppState['ui']>) => void;
  setSettings: (patch: Partial<Settings>) => void;
}

const SETTINGS_KEY = 'alrashed.settings.v1';

function loadSettings(): Settings {
  const fallback: Settings = { voiceVolume: 1, sfxVolume: 0.7, music: true, quality: 'medium' };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch {
    /* private mode or blocked storage: defaults */
  }
  return fallback;
}

export const useApp = create<AppState>((set, get) => ({
  phase: 'loading',
  loadProgress: 0,
  mode: null,
  location: 'classroom',
  weather: 'sunny',
  time: 'morning',
  status: 'ready',
  expression: 'idle',
  mouth: 0,
  viseme: 0,
  gender: 'boy',
  genderSource: 'default',
  genderManualUntil: 0,
  inCall: false,
  listening: false,
  playing: null,
  traveling: false,
  fade: 0,
  settings: loadSettings(),
  ui: { scenariosOpen: false, settingsOpen: false, teacherOpen: false, examRunning: false },
  set: (patch) => set(patch),
  setUi: (patch) => set({ ui: { ...get().ui, ...patch } }),
  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  },
}));

/** Non-react access, e.g. inside cutscenes and audio code. */
export const app = () => useApp.getState();
