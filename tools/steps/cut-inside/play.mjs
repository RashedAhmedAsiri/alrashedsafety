// usage: SCN=fire_extinguisher STEP=1200 N=30 DURING=6 node tools/shot.mjs --out=shots/cut-inside --size=640x400 --wait=6000 --script=tools/steps/cut-inside/play.mjs "name=x"
// Runs setup, before, DURING seconds of during, after of one scenario (speech skipped) and shoots every STEP ms (-> montage with tools/steps/cut-inside/sheet.sh).
export default async (page, shot) => {
  const id = process.env.SCN;
  const step = Number(process.env.STEP || 1200);
  const n = Number(process.env.N || 30);
  const during = Number(process.env.DURING || 6);
  const skip = Number(process.env.SKIP || 0);
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu', null, { timeout: 60000 });
  await page.evaluate(() => window.__alrashed.app.setState({ phase: 'mode', mode: 'inside' }));
  const slow = Number(process.env.SLOW || 0.35); // time scale (slow motion) so frames are dense in scene time
  await page.evaluate((k) => {
    const pn = performance.now.bind(performance), dn = Date.now, st = window.setTimeout.bind(window), p0 = pn(), d0 = dn();
    performance.now = () => p0 + (pn() - p0) * k;
    Date.now = () => d0 + (dn() - d0) * k;
    window.setTimeout = (f, d, ...a) => st(f, (d || 0) / k, ...a);
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (f) => raf(() => f(performance.now()));
  }, slow);
  const err = [];
  page.on('console', (m) => { if (m.type() === 'error') err.push(m.text().slice(0, 300)); });
  await page.evaluate(([id, duringS]) => {
    (async () => {
      const file = id === 'intro' ? '/src/cutscenes/intro.cut.ts' : `/src/cutscenes/inside/${id}.cut.ts`;
      const m = (await import(file)).default;
      const data = (await import('/src/content/data/inside.ts'));
      const list = data.INSIDE_SCENARIOS ?? data.default ?? Object.values(data).find(Array.isArray);
      const loc = id === 'intro' ? 'classroom' : (list.find((s) => s.id === id)?.location ?? 'classroom');
      const get = (p) => m.find((x) => x.part === p);
      window.__t0 = performance.now();
      window.__loc = (await import('/src/core/locations.ts')).LOCATIONS[loc];
      window.__locs = (await import('/src/core/locations.ts')).LOCATIONS;
      const { runCutscene } = await import('/src/cutscenes/engine.ts');
      const here = () => window.__alrashed.app.getState().location;
      window.__alrashed.playCutsceneScript(loc, async (c) => {
        const run = async (p) => { const x = get(p); if (x) { window.__part = p; await runCutscene(x, here(), c.signal); } };
        await run('setup');
        await run('before');
        const d = get('during');
        if (d) {
          window.__part = 'during';
          const ac = new AbortController();
          c.signal.addEventListener('abort', () => ac.abort());
          const p = runCutscene(d, here(), ac.signal).catch(() => {});
          await c.wait(duringS);
          ac.abort();
          await p;
        }
        await run('after');
        window.__done = true;
      });
    })();
  }, [id, during]);
  await page.waitForFunction(() => window.__part, null, { timeout: 60000 }).catch(() => {});
  for (let i = 0; i < n; i++) {
    const t = await page.evaluate(() => { const st = window.__alrashed.stage.getState(); const lc = window.__locs[window.__alrashed.app.getState().location] ?? window.__loc; const o = lc.origin; const r = (v) => v ? [v[0] - o[0], v[1] - o[1], v[2] - o[2]].map((x) => +x.toFixed(2)).join(',') : '-'; return ((performance.now() - window.__t0) / 1000).toFixed(1) + ' ' + window.__part + ' robot ' + r(st.actors.alrashed?.pos) + ' cam ' + r(st.shot?.pos) + ' actors ' + Object.entries(st.actors).filter(([k]) => k !== 'alrashed').map(([k, a]) => k + ':' + r(a.pos)).join(' '); });
    console.log(i, t);
    await shot(`${id}_${String(i).padStart(2, '0')}`);
    if (await page.evaluate(() => !!window.__done)) break;
    await page.waitForTimeout(step);
  }
  if (err.length) console.log('ERRORS', err.slice(0, 8).join('\n'));
};
