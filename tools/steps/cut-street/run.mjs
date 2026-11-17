// node tools/shot.mjs --out=shots/cut-street --size=640x400 --wait=6000 --script=tools/steps/cut-street/run.mjs "name=cs"
// env: SCN=open_sewer,heavy_rain  T_<id>=0.5,3,6  (shot times in seconds from the start of `before`)
//      SPEECH=4 (seconds the speech phase is simulated, `during` runs in it)
const META = {
  open_sewer: { loc: 'roadworks', weather: 'wet', time: 'morning' },
  heavy_rain: { loc: 'gate', weather: 'rain', time: 'afternoon' },
  parked_cars: { loc: 'parking', weather: 'sunny', time: 'afternoon' },
  flood_safety: { loc: 'flood_dip', weather: 'wet', time: 'afternoon' },
};
export default async (page, shot) => {
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.evaluate(() => { window.__alrashed.enterMode('outside'); });
  await page.evaluate(() => window.__alrashed.idle());
  const ids = (process.env.SCN || 'open_sewer').split(',');
  for (const id of ids) {
    const m = META[id];
    const times = (process.env['T_' + id] || 'b1,b3,b5,b7,a1,a3,a5').split(',');
    const speech = Number(process.env.SPEECH || 3);
    await page.evaluate(() => window.__alrashed.stopAll());
    await page.waitForTimeout(800);
    // one shot DELAY ms after every camera change (each cam() call = a new beat), until the scenario ends
    await page.evaluate(() => {
      window.__camN = 0;
      let last = null;
      window.__unsub?.();
      window.__caps = [];
      const cap = (kind) => requestAnimationFrame(() => {
        const cv = document.querySelector('canvas');
        if (cv) window.__caps.push({ kind, t: Math.round(performance.now()), data: cv.toDataURL('image/jpeg', 0.72) });
      });
      window.__unsub?.();
      window.__tick && clearInterval(window.__tick);
      window.__tick = setInterval(() => cap('t'), Number(1500));
      window.__unsub = window.__alrashed.stage.subscribe((st) => {
        if (st.shot && st.shot !== last) { last = st.shot; window.__camN++; setTimeout(() => cap('c'), 400); }
      });
    });
    await page.evaluate(([id, m, speech]) => {
      window.__done = false;
      window.__marks = [];
      import('/src/cutscenes/registry.ts').then(({ getCutscene }) => {
        window.__alrashed
          .playCutsceneScript(m.loc, async (c) => {
            c.weather(m.weather);
            c.time(m.time);
            const mark = (n) => window.__marks.push(n + '@' + Math.round(performance.now()) + ' ' + JSON.stringify(Object.entries(window.__alrashed.stage.getState().actors).map(([k, a]) => [k, a.pos.map((v) => +v.toFixed(1)), a.clip, a.flags])));
            const setup = getCutscene(id, 'setup');
            if (setup) await setup.run(c);
            mark('before');
            await getCutscene(id, 'before')?.run(c);
            mark('speech');
            const d = getCutscene(id, 'during');
            if (d) void d.run(c).catch(() => {});
            await c.wait(speech);
            mark('after');
            await getCutscene(id, 'after')?.run(c);
            mark('end');
          })
          .then(() => (window.__done = true));
      });
    }, [id, m, speech]);
    await page.waitForFunction(() => window.__done === true, null, { timeout: 240000 }).catch(async () => console.log('NOT DONE', id, JSON.stringify(await page.evaluate(() => { const st = window.__alrashed.stage.getState(); return { loc: window.__alrashed.app.getState().location, actors: Object.fromEntries(Object.entries(st.actors).map(([k, a]) => [k, [a.pos.map((v) => +v.toFixed(1)), a.move ? JSON.stringify(a.move) : 'idle', a.clip]])) , shot: st.shot && st.shot.pos }; }))));
    await page.waitForTimeout(500);
    await page.evaluate(() => clearInterval(window.__tick));
    const caps = await page.evaluate(() => window.__caps);
    const { writeFileSync } = await import('node:fs');
    let ci = 0, ti = 0;
    for (const cp of caps) {
      const name = cp.kind === 'c' ? `c${String(++ci).padStart(2, '0')}` : `t${String(++ti).padStart(2, '0')}`;
      writeFileSync(`${process.cwd()}/shots/cut-street/${id}_${name}.jpg`, Buffer.from(cp.data.split(',')[1], 'base64'));
    }
    console.log(id, 'caps', ci, 'cam', ti, 'tick');
    console.log(id, 'marks', JSON.stringify(await page.evaluate(() => window.__marks)));
  }
};
