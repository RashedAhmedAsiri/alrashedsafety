// OWNER: ui worker. Preview of the 2D overlay over a plain classroom-colored backdrop.
//   ?dev=Ui&state=loading|done|menu|mode|panel|settings|map|call|listening
//      &mode=outside|inside|short|creative|exam   (default outside)
//      &status=ready|listening|thinking|speaking|explaining|waving|walking
//      &progress=0..1  (loading)   &sheet=outside|ground|first  (map)   &loc=<locationId>
import { useEffect, useState } from 'react';
import { useApp } from '../core/store';
import type { LocationId, ModeId, Status } from '../core/types';
import { CREATIVE_CHIPS, INSIDE_SCENARIOS, OUTSIDE_SCENARIOS, SHORT_ANSWERS } from '../content';
import type { ShortAnswer } from '../content/types';
import { Overlay } from '../ui/Overlay';
import { useUiLocal, type MapSheet } from '../ui/uiStore';

const q = new URLSearchParams(location.search);

// &fake=1: fill still-empty short-answer / creative lists with stand-in chips (scenario titles) so the
// chip layout can be judged before the content builders finish. Preview only.
if (q.get('fake') === '1') {
  const titles = [...OUTSIDE_SCENARIOS, ...INSIDE_SCENARIOS].map((s) => s.title.replace(/[\u064B-\u0652]/g, ''));
  const groups: ShortAnswer['group'][] = ['fire_first_aid', 'corridors_labs', 'heat_canteen', 'bus_street', 'car_park', 'general'];
  if (!SHORT_ANSWERS.length)
    for (let i = 0; i < 45; i++)
      SHORT_ANSWERS.push({ id: `fake${i}`, n: i + 1, group: groups[Math.floor(i / 8) % 6], chip: titles[i % titles.length] ?? '', asks: [], answer: '', location: 'classroom', face: 'smile', keywords: [] });
  if (!CREATIVE_CHIPS.length) CREATIVE_CHIPS.push(...titles.slice(0, 8));
}

/** A flat classroom-ish backdrop: wall, board, window, floor (no 3D). */
function Backdrop() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F3E6CF', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%', background: '#D9B98C' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '30%', height: 14, background: '#B8956A' }} />
      <div style={{ position: 'absolute', left: '28%', width: '44%', top: '14%', height: '34%', background: '#2F4B45', borderRadius: 10, border: '10px solid #C9A47A' }} />
      <div style={{ position: 'absolute', right: '5%', width: '16%', top: '16%', height: '30%', background: '#BFE6FF', borderRadius: 8, border: '8px solid #FFFFFF' }} />
      <div style={{ position: 'absolute', left: '46%', width: '8%', bottom: '22%', height: '30%', background: '#E9EEF4', borderRadius: '40px 40px 16px 16px' }}>
        <div style={{ margin: '18% auto 0', width: '70%', height: '34%', background: '#1E2A3B', borderRadius: 12 }} />
      </div>
    </div>
  );
}

export default function UiPreview() {
  const state = q.get('state') ?? 'menu';
  const mode = (q.get('mode') ?? 'outside') as ModeId;
  const status = (q.get('status') ?? (state === 'listening' ? 'listening' : 'ready')) as Status;

  useState(() => {
    const a = useApp.getState();
    const loc = q.get('loc') as LocationId | null;
    a.set({
      phase: state === 'loading' ? 'loading' : state === 'menu' || state === 'done' ? 'menu' : 'mode',
      loadProgress: Number(q.get('progress') ?? 0.55),
      mode: state === 'loading' || state === 'menu' || state === 'done' ? null : mode,
      status,
      inCall: state === 'call' || state === 'listening',
      listening: state === 'listening',
      ...(loc ? { location: loc } : {}),
    });
    a.setUi({
      scenariosOpen: state === 'panel',
      settingsOpen: state === 'settings',
      examRunning: q.get('exam') === '1',
    });
    if (state === 'map') useUiLocal.getState().set({ mapOpen: true, mapSheet: (q.get('sheet') as MapSheet | null) ?? null });
  });

  useEffect(() => {
    // Let entrance animations (cards, panels, word bounce) settle before the screenshot.
    const t = window.setTimeout(() => ((window as unknown as { __ready: boolean }).__ready = true), state === 'loading' ? 1600 : 1400);
    return () => window.clearTimeout(t);
  }, [state]);

  return (
    <>
      <Backdrop />
      <Overlay />
    </>
  );
}
