// Probe: ID=inside_bus PARTS=setup,before TIMES=0.5,1,2 [LOC TIME] node tools/shot.mjs --size=640x400 --script=tools/steps/cut-qa/probe.mjs "name=p"
// Plays the parts, shoots at wall-clock TIMES (s after the LAST part starts) and logs actor/prop positions at each shot.
const T = { getting_out_of_bus: ['bus_stop', 'morning'], bus_stop_waiting: ['bus_stop', 'morning'], inside_bus: ['bus_stop', 'morning'], family_car: ['gate', 'afternoon'], dismissal: ['gate', 'afternoon'], stranger_at_gate: ['gate', 'afternoon'] };
export default async (page, shot) => {
  const id = process.env.ID;
  const loc = process.env.LOC || T[id][0];
  const time = process.env.TIME || T[id][1];
  const times = (process.env.TIMES || '1,2,3').split(',').map(Number);
  const parts = (process.env.PARTS || 'setup,before').split(',');
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.evaluate(({ loc, time }) => window.__alrashed.travelTo(loc, { weather: 'sunny', time }), { loc, time });
  await page.addStyleTag({ content: '.ar-ui{display:none!important}' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__ac = new AbortController();
    window.__run = async (id, part) => {
      const reg = await import('/src/cutscenes/registry.ts');
      const eng = await import('/src/cutscenes/engine.ts');
      const c = reg.getCutscene(id, part);
      if (!c) return;
      eng.setBaseStatus('explaining');
      await eng.runCutscene(c, window.__alrashed.app.getState().location, window.__ac.signal);
    };
  });
  for (let i = 0; i < parts.length; i++) {
    const last = i === parts.length - 1;
    const p = page.evaluate(({ id, part }) => window.__run(id, part), { id, part: parts[i] }).catch((e) => console.log('ERR', String(e)));
    if (!last) { await p; continue; }
    const t0 = Date.now();
    for (const t of times) {
      const w = t * 1000 - (Date.now() - t0);
      if (w > 0) await page.waitForTimeout(w);
      const st = await page.evaluate(() => {
        const s = window.__alrashed.stage.getState();
        const f = (v) => v && v.map((n) => +n.toFixed(2)).join(',');
        const o = {};
        for (const [k, a] of Object.entries(s.actors)) o[k] = f(a.pos) + ' c=' + a.clip;
        for (const [k, a] of Object.entries(s.props)) o['P:' + k] = f(a.pos);
        return o;
      });
      console.log('t=' + t, JSON.stringify(st));
      await shot(`${id}_p_${String(t).replace('.', 'p')}`);
    }
    await p;
  }
};
