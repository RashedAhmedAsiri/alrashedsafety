export default async (page, shot) => {
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.evaluate(() => window.__alrashed.app.getState().set({ expression: 'explaining' }));
  await page.waitForTimeout(2500);
  console.log('     ·', await page.evaluate(() => { const f = window.__faces[0]; const px = (x = 256, y = 60) => f.ctx.getImageData(x, y, 1, 1).data[3]; const out = {};
    const d = () => { f.draw(performance.now() / 1000, 1, 0, {}); return [px(), px(50, 112), px(256, 200), px(180, 100)]; };
    out.base = d();
    const keep = { ...f.cur };
    for (const [k, v] of [['a_browA', 0], ['b_browA', 0], ['a_h', 66], ['b_h', 66], ['mOpen', 0], ['mA', 0]]) { f.cur[k] = v; out[k] = d(); }
    Object.assign(f.cur, keep);
    return JSON.stringify(out); }));
};
