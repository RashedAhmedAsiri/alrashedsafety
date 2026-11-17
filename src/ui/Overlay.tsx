// OWNER: ui worker. All 2D screens over the canvas (intro/loading, menu, buttons, panels, settings, map). Keep export.
import { useEffect, useRef } from 'react';
import { useApp } from '../core/store';
import { setMusic, unlockAudio } from '../audio/sfx';
import * as speech from '../voice/speech';
import { LoadingScreen } from './LoadingScreen';
import { ModeMenu } from './ModeMenu';
import { Hud } from './Hud';
import { ScenariosPanel } from './ScenariosPanel';
import { SettingsPanel } from './SettingsPanel';
import { MapPanel } from './MapView';
import { preloadIcons } from './ContentIcon';
import { useUiLocal } from './uiStore';
import './ui.css';

/** Travel fade (paper color) driven by useApp.fade without re-rendering React every frame. */
function FadeOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const apply = (f: number) => {
      if (ref.current) ref.current.style.opacity = String(Math.max(0, Math.min(1, f)));
    };
    apply(useApp.getState().fade);
    return useApp.subscribe((s, p) => {
      if (s.fade !== p.fade) apply(s.fade);
    });
  }, []);
  return <div ref={ref} className="fade" />;
}

/** First touch/click anywhere unlocks Web Audio (and the voice, if the voice module offers it). */
function useAudioUnlock() {
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      const v = (speech as unknown as { unlockVoice?: () => void }).unlockVoice;
      try {
        v?.();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);
}

export function Overlay() {
  const phase = useApp((s) => s.phase);
  useAudioUnlock();

  // Menu tune plays on the menu (only when settings.music is on; sfx.ts checks that).
  useEffect(() => {
    setMusic(phase === 'menu');
    if (phase === 'menu') void preloadIcons();
    if (phase !== 'mode') useUiLocal.getState().set({ mapOpen: false });
  }, [phase]);

  return (
    <div className="ar-ui" lang="ar" dir="rtl">
      <FadeOverlay />
      {phase === 'mode' ? <Hud /> : null}
      {phase === 'menu' ? <ModeMenu /> : null}
      <ScenariosPanel />
      <SettingsPanel />
      <MapPanel />
      <LoadingScreen />
    </div>
  );
}
