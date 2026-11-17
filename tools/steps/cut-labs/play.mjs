// usage: SCEN=electricity_lab node tools/shot.mjs --out=shots/cut-labs --size=640x400 --wait=6000 --script=tools/steps/cut-labs/play.mjs "name=x"
const LOC = { electricity_lab: 'computer_lab', biology_lab: 'biology_lab', sharp_tools: 'art_room' };
export default async (page, shot) => {
  const id = process.env.SCEN;
  const step = Number(process.env.STEP || 1500);
  const n = Number(process.env.N || 24);
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.evaluate(() => window.__alrashed.app.setState({ phase: 'mode', mode: 'inside' }));
  await page.evaluate(([id, loc, duringMs]) => {
    (async () => {
      const m = (await import(`/src/cutscenes/inside/${id}.cut.ts`)).default;
      const get = (p) => m.find((x) => x.part === p);
      window.__alrashed.playCutsceneScript(loc, async (c) => {
        const run = async (p) => { const x = get(p); if (x) await x.run(c); };
        await run('setup');
        await run('before');
        const d = get('during');
        if (d) await Promise.race([d.run(c).catch(() => {}), c.wait(duringMs / 1000)]);
        await run('after');
        window.__done = true;
      });
    })();
  }, [id, LOC[id], 6000]);
  await page.waitForFunction(() => window.__alrashed.app.getState().location !== 'classroom', null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await shot(`${id}_${String(i).padStart(2, '0')}`);
    if (await page.evaluate(() => !!window.__done)) { await shot(`${id}_end`); break; }
    await page.waitForTimeout(step);
  }
  console.log('elapsed', (Date.now() - t0) / 1000);
};
