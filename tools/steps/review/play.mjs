// Plays every part of one scenario (inside or outside, speech skipped) and shoots after every camera change.
//   ID=fire_evacuation node tools/shot.mjs --out=shots/review/<id> --size=640x400 --wait=6000 --script=tools/steps/review/play.mjs "name=x"
import { runScenario } from '../cut-outdoor/_lib.mjs';
export default async (page, shot) => {
  const id = process.env.ID;
  await page.waitForFunction(() => !!window.__alrashed);
  const s = await page.evaluate(async (id) => {
    const c = await import('/src/content/index.ts');
    const all = Object.values(c).filter(Array.isArray).flat();
    const x = all.find((s) => s && s.id === id && s.location);
    return x && { loc: x.location, weather: x.weather, time: x.time };
  }, id);
  if (!s) throw new Error('unknown scenario ' + id);
  await runScenario(page, shot, { id, loc: process.env.LOC || s.loc, weather: s.weather ?? 'sunny', time: s.time ?? 'morning',
    steps: (process.env.PARTS || 'setup,before,during,after').split(',').map((part) => ({ part })) });
};
