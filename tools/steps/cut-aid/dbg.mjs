export default async (page, shot) => {
  const scen = process.env.SCEN;
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu', null, { timeout: 60000 });
  await page.evaluate(() => { window.__alrashed.enterMode('inside'); });
  await page.waitForTimeout(4000);
  await page.evaluate((s) => { window.__alrashed.playScenario(s); }, scen);
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => { const s = window.__alrashed.stage.getState(); return JSON.stringify({ loc: s.location ?? null, shot: s.shot && { pos: s.shot.pos, look: s.shot.look, dur: s.shot.dur }, s1: s.actors.s1?.pos, rob: s.actors.alrashed?.pos, clip: s.actors.s1?.clip }); });
    console.log(i, r);
  }
};
