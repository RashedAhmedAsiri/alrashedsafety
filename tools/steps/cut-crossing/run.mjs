// node tools/shot.mjs --size=640x400 --out=shots/cut-crossing --wait=6000 --script=tools/steps/cut-crossing/run.mjs "name=x"
// env: SCEN=<scenario id>  LOC=<location>  SCHED='{"setup":[0.3],"before":[0.5,1.5],"during":[2],"after":[1,3]}'
// Runs the cutscene parts directly (no speech) in order setup, before, during(first N s), after, taking shots at the given seconds.
export default async (page, shot) => {
  const SCEN = process.env.SCEN, LOC = process.env.LOC;
  const sched = JSON.parse(process.env.SCHED || '{}');
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.evaluate(([loc]) => window.__alrashed.travelTo(loc, { weather: 'sunny', time: 'afternoon' }), [LOC]);
  await page.evaluate(() => { const a = window.__alrashed.app; a.setState({ phase: 'mode', mode: 'outside' }); });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__ctl = null;
    window.__runPart = async (id, part, loc, maxSec) => {
      const { getCutscene } = await import('/src/cutscenes/registry.ts');
      const { runCutscene } = await import('/src/cutscenes/engine.ts');
      const c = getCutscene(id, part);
      if (!c) return 'none';
      const ac = new AbortController();
      window.__ctl = ac;
      if (maxSec) setTimeout(() => ac.abort(), maxSec * 1000);
      const t0 = performance.now();
      window.__partDone = false;
      window.__partStart = t0;
      try { await runCutscene(c, loc, ac.signal); } catch (e) { console.error('[part]', e?.stack || e); }
      window.__partDone = true;
      return ((performance.now() - t0) / 1000).toFixed(2);
    };
  });
  for (const part of ['setup', 'before', 'during', 'after']) {
    const times = sched[part];
    if (!times) continue;
    const last = Math.max(...times);
    const maxSec = part === 'during' ? last + 0.5 : 0;
    const p = page.evaluate(([a, b, c, d]) => window.__runPart(a, b, c, d), [SCEN, part, LOC, maxSec]);
    const t0 = Date.now();
    for (const t of times) {
      const wait = t * 1000 - (Date.now() - t0);
      if (wait > 0) await page.waitForTimeout(wait);
      await shot(`${SCEN}_${part}_${String(t).replace('.', 'p')}`);
    }
    const dur = await p;
    console.log(`PART ${SCEN}:${part} took ${dur}s (wall)`);
  }
};
