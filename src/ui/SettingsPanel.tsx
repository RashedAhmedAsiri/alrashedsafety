// OWNER: ui worker. Settings: slides in from the top right on a paper card. Voice and effects volume,
// music, the student switch (بَطَلٌ / بَطَلَةٌ), the map, graphics quality, and the teacher results button.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BellRing, ChartColumn, Gauge, MapPinned, Music, UserRound, Volume2, X, type LucideIcon } from 'lucide-react';
import { useApp } from '../core/store';
import { COLORS } from '../core/theme';
import type { Gender, Quality } from '../core/types';
import { setManualGender } from '../voice/gender';
import { playSfx } from '../audio/sfx';
import { edgeOf } from './color';
import { GENDER_LABELS, QUALITY_LABELS, TEACHER_LABEL, UI_TEXT } from './labels';
import { ToyButton } from './ToyButton';
import { usePresence } from './usePresence';
import { useUiLocal } from './uiStore';
import { MiniMap } from './MapView';

function RowIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <span className="row-ico" style={{ '--c': color, '--edge': edgeOf(color) } as CSSProperties}>
      <Icon size={26} strokeWidth={2.5} />
    </span>
  );
}

export function Slider({ value, onChange, onCommit, color, label }: { value: number; onChange: (v: number) => void; onCommit?: (v: number) => void; color: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const last = useRef(value);
  const fromEvent = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const pad = 18;
    // RTL: 0 at the right edge, 1 at the left.
    const v = (r.right - pad - e.clientX) / Math.max(1, r.width - pad * 2);
    return Math.round(Math.max(0, Math.min(1, v)) * 20) / 20;
  };
  const set = (v: number) => {
    last.current = v;
    onChange(v);
  };
  return (
    <div
      ref={ref}
      className={`slider${drag ? ' is-drag' : ''}`}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      style={{ '--c': color } as CSSProperties}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        setDrag(true);
        set(fromEvent(e));
      }}
      onPointerMove={(e) => drag && set(fromEvent(e))}
      onPointerUp={() => {
        setDrag(false);
        onCommit?.(last.current);
      }}
      onPointerCancel={() => setDrag(false)}
      onKeyDown={(e) => {
        const step = e.key === 'ArrowLeft' ? 0.1 : e.key === 'ArrowRight' ? -0.1 : 0;
        if (step) {
          const v = Math.max(0, Math.min(1, Math.round((value + step) * 10) / 10));
          set(v);
          onCommit?.(v);
        }
      }}
    >
      <div className="slider-track">
        <div className="slider-fill" style={{ width: `${value * 100}%` }} />
        <div className="slider-thumb" style={{ right: `${value * 100}%` }} />
      </div>
    </div>
  );
}

export function Switch({ on, onToggle, color, label }: { on: boolean; onToggle: () => void; color: string; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch${on ? ' is-on' : ''}`}
      style={{ '--c': color } as CSSProperties}
      onPointerDown={() => playSfx('click')}
      onClick={onToggle}
    >
      <span className="switch-knob" />
    </button>
  );
}

function Seg<T extends string>({ options, value, onPick, color }: { options: { id: T; label: string }[]; value: T; onPick: (v: T) => void; color: string }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <ToyButton key={o.id} color={color} className={o.id === value ? 'is-on' : 'is-off'} onPress={() => onPick(o.id)} label={o.label} data={{ opt: o.id }}>
          {o.label}
        </ToyButton>
      ))}
    </div>
  );
}

function MapTile() {
  const [pressed, setPressed] = useState(false);
  const location = useApp((s) => s.location);
  return (
    <button
      type="button"
      className={`map-tile${pressed ? ' is-pressed' : ''}`}
      aria-label={UI_TEXT.map}
      data-ui="map"
      onPointerDown={() => {
        setPressed(true);
        playSfx('pop');
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={() => {
        useUiLocal.getState().set({ mapOpen: true, mapSheet: null });
        useApp.getState().setUi({ settingsOpen: false });
      }}
    >
      <MiniMap here={location} />
      <span className="map-tile-label">
        <MapPinned size={22} strokeWidth={2.5} />
        {UI_TEXT.map}
      </span>
    </button>
  );
}

export function SettingsPanel() {
  const open = useApp((s) => s.ui.settingsOpen && (s.phase === 'mode' || s.phase === 'menu'));
  const settings = useApp((s) => s.settings);
  const gender = useApp((s) => s.gender);
  const setSettings = useApp((s) => s.setSettings);
  const setUi = useApp((s) => s.setUi);
  const { mounted, closing } = usePresence(open);

  useEffect(() => {
    if (open) playSfx('slide', { volume: 0.7 });
  }, [open]);

  if (!mounted) return null;
  const close = () => setUi({ settingsOpen: false });
  const pickGender = (g: Gender) => {
    setManualGender(g);
    // The voice module owns the rule; mirror it here if it has not updated the store (stub or no-op).
    if (useApp.getState().gender !== g) useApp.getState().set({ gender: g, genderSource: 'manual', genderManualUntil: Date.now() + 30 * 60 * 1000 });
  };

  return (
    <>
      <div className={`veil${closing ? ' is-closing' : ''}`} onPointerDown={close} />
      <section className={`panel set${closing ? ' is-closing' : ''}`} role="dialog" aria-label={UI_TEXT.settings}>
        <header className="panel-head">
          <div className="panel-title">{UI_TEXT.settings}</div>
          <ToyButton color="#FFFFFF" fg="#1E2A3B" className="panel-close" label={UI_TEXT.close} onPress={close} sound="click" data={{ ui: 'close' }}>
            <X size={28} strokeWidth={3} />
          </ToyButton>
        </header>
        <div className="panel-body set-body">
          <div className="set-col">
            <div className="row">
              <RowIcon icon={Volume2} color={COLORS.teal} />
              <div className="row-col">
                <span className="row-label">{UI_TEXT.voiceVolume}</span>
                <Slider label={UI_TEXT.voiceVolume} color={COLORS.teal} value={settings.voiceVolume} onChange={(v) => setSettings({ voiceVolume: v })} />
              </div>
            </div>
            <div className="row">
              <RowIcon icon={BellRing} color={COLORS.short} />
              <div className="row-col">
                <span className="row-label">{UI_TEXT.sfxVolume}</span>
                <Slider label={UI_TEXT.sfxVolume} color={COLORS.short} value={settings.sfxVolume} onChange={(v) => setSettings({ sfxVolume: v })} onCommit={() => playSfx('ding', { volume: 0.8 })} />
              </div>
            </div>
            <div className="row">
              <RowIcon icon={Music} color={COLORS.creative} />
              <span className="row-label">{UI_TEXT.music}</span>
              <Switch label={UI_TEXT.music} color={COLORS.creative} on={settings.music} onToggle={() => setSettings({ music: !settings.music })} />
            </div>
            <div className="row">
              <RowIcon icon={UserRound} color={COLORS.inside} />
              <div className="row-col">
                <span className="row-label">{UI_TEXT.student}</span>
                <Seg<Gender>
                  color={COLORS.inside}
                  value={gender}
                  onPick={pickGender}
                  options={[
                    { id: 'boy', label: GENDER_LABELS.boy },
                    { id: 'girl', label: GENDER_LABELS.girl },
                  ]}
                />
              </div>
            </div>
          </div>
          <div className="set-col">
            <div className="row">
              <MapTile />
            </div>
            <div className="row">
              <RowIcon icon={Gauge} color={COLORS.outside} />
              <div className="row-col">
                <span className="row-label">{UI_TEXT.quality}</span>
                <Seg<Quality>
                  color={COLORS.outside}
                  value={settings.quality}
                  onPick={(q) => setSettings({ quality: q })}
                  options={(['low', 'medium', 'high'] as Quality[]).map((q) => ({ id: q, label: QUALITY_LABELS[q] }))}
                />
              </div>
            </div>
            <div className="row">
              <ToyButton
                color={COLORS.exam}
                className="wide"
                onPress={() => {
                  setUi({ teacherOpen: true, settingsOpen: false });
                }}
                data={{ ui: 'teacher' }}
              >
                <ChartColumn size={26} strokeWidth={2.5} />
                {TEACHER_LABEL}
              </ToyButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}


