// Like speak.mjs but logs Alrashed's angle from the viewer every 0.7 s for N samples (and shoots every 3rd).
export default async (page, shot) => {
  const id = process.env.ID;
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  const mode = await page.evaluate(async (id) => (await import('/src/content/index.ts')).SCENARIO_BY_ID[id].mode, id);
  await page.evaluate((m) => { window.__alrashed.enterMode(m); }, mode);
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.__alrashed.idle());
  await page.addStyleTag({ content: '.ar-ui{display:none!important}' });
  page.evaluate((id) => window.__alrashed.playScenario(id), id);
  await page.waitForFunction(() => window.__alrashed.app.getState().mouth > 0.02, null, { timeout: 240000, polling: 100 });
  for (let i = 0; i < Number(process.env.N || 14); i++) {
    await page.waitForTimeout(700);
    console.log('     ·', i, await page.evaluate(async () => { const v = await import('/src/engine/viewer.ts'); const d = await import('/src/engine/driver.ts'); const r = window.__alrashed.stage.getState().actors.alrashed; return JSON.stringify({ off: +(v.angleFromViewer('alrashed') ?? 9).toFixed(2), rot: +r.rotY.toFixed(2), clip: r.clip, turning: d.isTurning('alrashed'), talk: v.isTalkingPose('alrashed') }); }));
    if (i % 3 === 2) await shot(`${id}_m${i}`);
  }
  await page.evaluate(() => window.__alrashed.stopAll());
};
