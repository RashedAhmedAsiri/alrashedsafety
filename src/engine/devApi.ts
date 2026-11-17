import { useApp } from '../core/store';
import { useStage } from '../core/stage';
import * as conv from './conversation';
import { rig } from './rig';
import { playFlyIn } from './travel';

/**
 * Dev builds only: window.__alrashed lets builders script the real app from tools/shot.mjs --script.
 *
 *   await page.waitForFunction(() => window.__alrashed?.app.getState().phase === 'menu')
 *   await page.evaluate(() => window.__alrashed.enterMode('outside'))
 *   await page.evaluate(() => window.__alrashed.playScenario('crossing_road'))
 */
export function installDevApi() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  (window as unknown as { __alrashed: unknown }).__alrashed = {
    ...conv,
    app: useApp,
    stage: useStage,
    rig,
    /** Jump from loading/fly-in straight to the menu. */
    skipIntro: () => {
      if (useApp.getState().phase === 'menu' || useApp.getState().phase === 'mode') return Promise.resolve();
      useApp.setState({ loadProgress: 1, phase: 'flyin' });
      return playFlyIn({ skip: true });
    },
    /** Resolves when nothing plays and no travel runs. */
    idle: () =>
      new Promise<void>((resolve) => {
        const check = () => {
          const a = useApp.getState();
          if (!a.playing && !a.traveling && !a.listening && a.status === 'ready') resolve();
          else setTimeout(check, 100);
        };
        check();
      }),
  };
}
