import type { Cutscene, CutscenePart } from './api';

/** Cutscene files: src/cutscenes/{outside,inside}/<scenarioId>.cut.ts and intro.cut.ts, each `export default` an array of cutscene(...). */
const mods = import.meta.glob<{ default: Cutscene[] }>(['./outside/*.cut.ts', './inside/*.cut.ts', './intro.cut.ts'], { eager: true });

const table = new Map<string, Cutscene>();
for (const m of Object.values(mods)) for (const c of m.default ?? []) table.set(`${c.scenario}:${c.part}`, c);

export function getCutscene(scenario: string, part: CutscenePart): Cutscene | undefined {
  return table.get(`${scenario}:${part}`);
}
export const ALL_CUTSCENES = [...table.values()];
