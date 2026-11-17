// Shared helper: run cutscene parts directly (no speech) and take shots at wall-clock offsets.
// usage in a steps file: export default (page, shot) => runScenario(page, shot, {...})
export async function runScenario(page, shot, o) {
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.evaluate(
    ({ loc, weather, time }) => window.__alrashed.travelTo(loc, { weather, time }),
    { loc: o.loc, weather: o.weather ?? 'sunny', time: o.time ?? 'afternoon' },
  );
  await page.addStyleTag({ content: '.ar-ui{display:none!important}' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__errs = [];
    window.__ac = new AbortController();
    window.__run = async (id, part) => {
      const reg = await import('/src/cutscenes/registry.ts');
      const eng = await import('/src/cutscenes/engine.ts');
      const c = reg.getCutscene(id, part);
      if (!c) return 'missing';
      eng.setBaseStatus('explaining');
      const t0 = performance.now();
      await eng.runCutscene(c, window.__alrashed.app.getState().location, window.__ac.signal);
      return ((performance.now() - t0) / 1000).toFixed(1);
    };
  });
  for (const step of o.steps) {
    await page.evaluate(({ id, part }) => { window.__len = null; window.__p = window.__run(id, part).then((r) => { window.__len = r; }).catch((e) => { window.__len = 'ERR ' + e; console.error('cut error', String(e && e.stack || e)); }); }, { id: o.id, part: step.part });
    // one shot ~0.9 s after every new camera shot (a beat), plus a final one
    const tStart = Date.now();
    let last = null, n = 0, since = 0, tn = 0, lastT = Date.now();
    const TICK = Number(process.env.TICK || 0); // ms: extra shots every TICK ms (name _tNN)
    for (let i = 0; i < 4000; i++) {
      const st = await page.evaluate(() => ({ shot: window.__alrashed.stage.getState().shot, done: window.__len !== null }));
      const sig = st.shot ? JSON.stringify([st.shot.pos, st.shot.look]) : null;
      if (sig && sig !== last) {
        last = sig;
        await page.waitForTimeout(900);
        await shot(`${o.id}_${step.part}_${String(++n).padStart(2, '0')}c`);
      }
      if (TICK && Date.now() - lastT > TICK) { lastT = Date.now(); await shot(`${o.id}_${step.part}_${String(++n).padStart(2, '0')}t`); }
      if (step.part === 'during' && Date.now() - tStart > Number(process.env.DURING || 10) * 1000) { await page.evaluate(() => { window.__ac.abort(); window.__ac = new AbortController(); }); break; }
      if (st.done) break;
      await page.waitForTimeout(150);
    }
    console.log('part', step.part, 'shots', n, 'took', await page.evaluate(() => window.__len), 's');
  }
}
