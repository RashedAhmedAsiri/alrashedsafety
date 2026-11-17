// OWNER: ui worker. Scenarios panel: slides up from the bottom left over a light fog. The first button in
// every mode is the intro «مَنْ هُوَ الرَّاشِدُ؟», then the current mode's items. Empty-content safe.
import { useEffect, useMemo, type CSSProperties } from 'react';
import { Bus, Car, Flame, FlaskConical, Lightbulb, Star, Sun, X, type LucideIcon } from 'lucide-react';
import { useApp } from '../core/store';
import { COLORS, MODE_COLORS } from '../core/theme';
import type { ModeId } from '../core/types';
import { CREATIVE_CHIPS, INSIDE_SCENARIOS, INTRO, OUTSIDE_SCENARIOS, SHORT_ANSWERS } from '../content';
import type { Scenario, ShortAnswer } from '../content/types';
import { askText, playScenario, playShort } from '../engine/conversation';
import { playSfx } from '../audio/sfx';
import { ContentIcon } from './ContentIcon';
import { ToyButton } from './ToyButton';
import { MODE_ICONS } from './ModeMenu';
import { MODE_TEXT, UI_TEXT } from './labels';
import { edgeOf } from './color';
import { usePresence } from './usePresence';

const SHORT_GROUPS: Record<ShortAnswer['group'], { color: string; icon: LucideIcon }> = {
  fire_first_aid: { color: '#F0476B', icon: Flame },
  corridors_labs: { color: '#2D8CFF', icon: FlaskConical },
  heat_canteen: { color: '#FF8A3D', icon: Sun },
  bus_street: { color: '#E8A200', icon: Bus },
  car_park: { color: '#14B8A6', icon: Car },
  general: { color: '#8B5CF6', icon: Star },
};

const CHIP_COLORS = ['#8B5CF6', '#2D8CFF', '#22B573', '#FF8A3D', '#F0476B', '#14B8A6', '#E2559B', '#E8A200'];

export interface PanelItem {
  key: string;
  label: string;
  color: string;
  icon: { name?: string; component?: LucideIcon };
  run: () => void;
  first?: boolean;
  chip?: boolean;
}

const asList = <T,>(x: T[] | undefined | null): T[] => (Array.isArray(x) ? x : []);

function scenarioItem(s: Scenario, first = false): PanelItem {
  return {
    key: s.id,
    label: s.title,
    color: s.color || COLORS.teal,
    icon: { name: s.icon },
    run: () => void playScenario(s.id),
    first,
  };
}

/** The panel's items for a mode (exported for the preview page). */
export function itemsFor(mode: ModeId | null): { title?: string; items: PanelItem[] }[] {
  const intro = INTRO && INTRO.id ? [scenarioItem(INTRO, true)] : [];
  switch (mode) {
    case 'outside':
      return [{ items: [...intro, ...asList(OUTSIDE_SCENARIOS).map((s) => scenarioItem(s))] }];
    case 'inside':
      return [{ items: [...intro, ...asList(INSIDE_SCENARIOS).map((s) => scenarioItem(s))] }];
    case 'short':
      return [
        {
          items: [
            ...intro,
            ...asList(SHORT_ANSWERS).map((a) => {
              const g = SHORT_GROUPS[a.group] ?? SHORT_GROUPS.general;
              return { key: a.id, label: a.chip || a.id, color: g.color, icon: { component: g.icon }, run: () => void playShort(a.id), chip: true };
            }),
          ],
        },
      ];
    case 'creative':
      return [
        {
          items: [
            ...intro,
            ...asList(CREATIVE_CHIPS).map((c, i) => ({
              key: `chip${i}`,
              label: c,
              color: CHIP_COLORS[i % CHIP_COLORS.length],
              icon: { component: Lightbulb },
              run: () => void askText(c),
              chip: true,
            })),
          ],
        },
      ];
    case 'exam':
    default: {
      // Outside a running exam: the intro, then both scenario lists for review.
      const groups: { title?: string; items: PanelItem[] }[] = [{ items: intro }];
      const out = asList(OUTSIDE_SCENARIOS).map((s) => scenarioItem(s));
      const ins = asList(INSIDE_SCENARIOS).map((s) => scenarioItem(s));
      if (out.length) groups.push({ title: MODE_TEXT.outside.title, items: out });
      if (ins.length) groups.push({ title: MODE_TEXT.inside.title, items: ins });
      return groups;
    }
  }
}

function Tile({ item, i, onPick }: { item: PanelItem; i: number; onPick: (it: PanelItem) => void }) {
  const Comp = item.icon.component;
  const cls = item.first ? 'tile tile--first' : item.chip ? 'chip' : 'tile';
  return (
    <ToyButton color={item.color} className={cls} style={{ '--i': i } as CSSProperties} onPress={() => onPick(item)} data={{ item: item.key }}>
      <span className="tile-ico">{Comp ? <Comp size={item.chip ? 22 : 26} strokeWidth={2.5} /> : <ContentIcon name={item.icon.name} size={item.first ? 26 : 26} />}</span>
      <span>{item.label}</span>
    </ToyButton>
  );
}

export function ScenariosPanel() {
  const open = useApp((s) => s.ui.scenariosOpen && s.phase === 'mode' && !s.ui.examRunning);
  const mode = useApp((s) => s.mode);
  const setUi = useApp((s) => s.setUi);
  const { mounted, closing } = usePresence(open);
  const groups = useMemo(() => itemsFor(mode), [mode]);
  useEffect(() => {
    if (open) playSfx('slide', { volume: 0.7 });
  }, [open]);

  if (!mounted) return null;
  const color = mode ? MODE_COLORS[mode] : COLORS.teal;
  const ModeIcon = mode ? MODE_ICONS[mode] : Star;
  const close = () => setUi({ scenariosOpen: false });
  const pick = (it: PanelItem) => {
    setUi({ scenariosOpen: false });
    it.run();
  };
  const chips = mode === 'short' || mode === 'creative';
  let n = 0;

  return (
    <>
      <div className={`veil${closing ? ' is-closing' : ''}`} onPointerDown={close} />
      <section className={`panel scn${closing ? ' is-closing' : ''}`} role="dialog" aria-label={mode ? MODE_TEXT[mode].title : UI_TEXT.scenarios}>
        <header className="panel-head">
          <span className="panel-badge" style={{ '--c': color, '--edge': edgeOf(color) } as CSSProperties}>
            <ModeIcon size={28} strokeWidth={2.5} />
          </span>
          <div className="panel-title">{mode ? MODE_TEXT[mode].title : ''}</div>
          <ToyButton color="#FFFFFF" fg="#1E2A3B" className="panel-close" label={UI_TEXT.close} onPress={close} sound="click" data={{ ui: 'close' }}>
            <X size={28} strokeWidth={3} />
          </ToyButton>
        </header>
        <div className="panel-body">
          {groups.map((g, gi) =>
            g.items.length ? (
              <div key={gi} style={{ marginTop: gi ? 16 : 0 }}>
                {g.title ? <h3 className="group-title">{g.title}</h3> : null}
                <div className={`grid${chips ? ' grid--chips' : ''}`}>
                  {g.items.map((it) => (
                    <Tile key={it.key} item={it} i={n++} onPick={pick} />
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      </section>
    </>
  );
}
