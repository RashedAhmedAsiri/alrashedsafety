// Plays a scenario through the real app (travel, setup, before, speech) and shoots twice while Alrashed speaks.
//   ID=stairs_safety node tools/shot.mjs --out=shots/speak --size=640x400 --wait=4000 --script=tools/steps/review/speak.mjs "name=s_<id>"
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
  const t0 = Date.now();
  await page.waitForFunction(() => window.__alrashed.app.getState().mouth > 0.02, null, { timeout: 240000, polling: 100 });
  const info = () => page.evaluate(async () => { const v = await import('/src/engine/viewer.ts'); const a = window.__alrashed; const r = a.stage.getState().actors.alrashed; return JSON.stringify({ off: +(v.angleFromViewer('alrashed') ?? 9).toFixed(2), clip: r.clip, flags: r.flags, expr: a.app.getState().expression }); });
  console.log('     · speech after', ((Date.now() - t0) / 1000).toFixed(0), 's');
  await page.waitForTimeout(3500); console.log('     ·', await info()); await shot(`${id}_speak1`);
  await page.waitForTimeout(5000); console.log('     ·', await info()); await shot(`${id}_speak2`);
  await page.evaluate(() => window.__alrashed.stopAll());
  await page.waitForTimeout(1500);
  console.log('     · after stop', await page.evaluate(() => JSON.stringify({ st: window.__alrashed.app.getState().status, loc: window.__alrashed.app.getState().location, playing: window.__alrashed.app.getState().playing })));
};
