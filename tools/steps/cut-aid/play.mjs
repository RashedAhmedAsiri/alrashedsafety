// usage: SCEN=small_cut TIMES=1,3,5 node tools/shot.mjs --out=shots/cut-aid --wait=6000 --size=640x400 --script=tools/steps/cut-aid/play.mjs "name=x"
export default async (page, shot) => {
  const scen = process.env.SCEN;
  const times = (process.env.TIMES || '1,3,5').split(',').map(Number);
  const tag = process.env.TAG || scen;
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu', null, { timeout: 60000 });
  await page.evaluate(() => { window.__alrashed.enterMode('inside'); });
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.__alrashed.stopAll());
  await page.waitForTimeout(2500);
  page.on('console', (m) => { if (m.type() === 'error') console.log('   [page]', m.text().slice(0, 300)); });
  await page.evaluate((s) => { window.__alrashed.playScenario(s); }, scen);
  const probe = process.env.PROBE || 's1';
  await page.waitForFunction((id) => { if (id.startsWith('expr:')) return window.__alrashed.app.getState().expression === id.slice(5); const s = window.__alrashed.stage.getState(); return !!(s.actors?.[id] || s.props?.[id]); }, probe, { timeout: 240000, polling: 200 });
  await page.waitForTimeout(Number(process.env.LAG || 0));
  const t0 = Date.now();
  let n = 0;
  for (const t of times) {
    const wait = t * 1000 - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    await shot(`${tag}_${String(n++).padStart(2, '0')}`);
  }
  const st = await page.evaluate(() => JSON.stringify(window.__alrashed.app.getState().playing));
  console.log('   playing at end:', st, 'elapsed', (Date.now() - t0) / 1000);
};
