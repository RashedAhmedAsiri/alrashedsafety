export default async (page, shot) => {
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.evaluate(() => { window.__alrashed.enterMode('short'); });
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.__alrashed.idle());
  page.evaluate((id) => window.__alrashed.playShort(id), process.env.ID || 'crossing_how');
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(1000);
    console.log('     ·', await page.evaluate(() => { const a = window.__alrashed; const r = a.stage.getState().actors.alrashed; const s = a.app.getState(); return JSON.stringify({ st: s.status, loc: s.location, fade: +s.fade.toFixed(2), rot: +r.rotY.toFixed(2), pos: r.pos.map((n) => +n.toFixed(1)), clip: r.clip, cam: a.rig.pos.toArray().map((n) => +n.toFixed(1)) }); }));
    if (i % 3 === 2) await shot('probe_' + i);
  }
};
