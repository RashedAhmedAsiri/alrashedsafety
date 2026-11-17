// usage: --script=tools/steps/cut-bus/run.mjs  with env CUT=id LOC=bus_stop TIMES=0.5,2,4 PARTS=setup,before,after
export default async (page, shot) => {
  const id = process.env.CUT, loc = process.env.LOC;
  const parts = (process.env.PARTS || 'setup,before,after').split(',');
  const times = (process.env.TIMES || '1,3,5,8').split(',').map(Number);
  const tag = process.env.TAG || id;
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.evaluate(() => { window.__alrashed.enterMode('outside'); });
  await page.evaluate(() => window.__alrashed.idle());
  await page.evaluate(([l]) => window.__alrashed.travelTo(l, { weather: 'sunny', time: 'morning' }), [loc]);
  await page.waitForTimeout(1500);
  await page.evaluate(async ([id, loc, parts]) => {
    const reg = await import('/src/cutscenes/registry.ts');
    const eng = await import('/src/cutscenes/engine.ts');
    const ac = new AbortController(); window.__ac = ac; window.__log = [];
    window.__alrashed.app.setState({ playing: { kind: 'scenario', id } });
    (async () => {
      for (const p of parts) {
        const c = reg.getCutscene(id, p);
        if (!c) continue;
        window.__log.push('start ' + p + ' ' + performance.now());
        try { await eng.runCutscene(c, loc, ac.signal); } catch (e) { window.__log.push('ERR ' + e); console.error(e); }
        window.__log.push('end ' + p + ' ' + performance.now());
      }
    })();
  }, [id, loc, parts]);
  let t0 = Date.now();
  for (const t of times) {
    const w = t * 1000 - (Date.now() - t0);
    if (w > 0) await page.waitForTimeout(w);
    await shot(`${tag}_${String(t).replace('.', 'p')}`);
  }
  console.log(await page.evaluate(() => window.__log.join('\n')));
};
