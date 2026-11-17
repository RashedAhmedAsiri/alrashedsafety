// usage: SCN=intro TIMES=1,3,5 node tools/shot.mjs --out=shots/cut-fire --size=640x400 --wait=6000 --script=tools/steps/cut-fire/play.mjs "name=x"
export default async (page, shot) => {
  const id = process.env.SCN;
  const times = (process.env.TIMES || '2,5,8').split(',').map(Number);
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu', null, { timeout: 60000 });
  await page.evaluate(() => { window.__alrashed.enterMode('inside'); });
  await page.evaluate(() => window.__alrashed.idle());
  await page.evaluate((i) => { window.__alrashed.playScenario(i); }, id);
  let t0 = Date.now();
  for (const t of times) {
    const d = t * 1000 - (Date.now() - t0);
    if (d > 0) await page.waitForTimeout(d);
    await shot(`${id}_${String(t).padStart(3, '0')}`);
  }
  await page.evaluate(() => window.__alrashed.stopAll());
};
