// Walks the real UI: loading, menu, each mode, panels, settings, map, typed questions, exam. Logs state at each step.
export default async (page, shot) => {
  const st = () => page.evaluate(() => { const a = window.__alrashed.app.getState(); return JSON.stringify({ phase: a.phase, mode: a.mode, loc: a.location, status: a.status, playing: a.playing, weather: a.weather, time: a.time }); });
  const log = async (l) => console.log('     ·', l, await st());
  await page.waitForFunction(() => window.__alrashed?.app.getState().phase === 'menu', null, { timeout: 180000 });
  await page.waitForTimeout(2500); await shot('01_menu'); await log('menu');
  for (const mode of ['outside', 'inside', 'short', 'creative']) {
    await page.click(`[data-mode="${mode}"]`);
    await page.waitForFunction((m) => window.__alrashed.app.getState().mode === m, mode, { timeout: 30000 });
    await page.evaluate(() => window.__alrashed.idle()); await page.waitForTimeout(1200);
    await shot(`02_${mode}`); await log(mode);
    await page.click('[data-ui="scenarios"]'); await page.waitForTimeout(1200); await shot(`03_${mode}_panel`);
    const n = await page.evaluate(() => document.querySelectorAll('.ar-ui button').length); console.log('     · buttons', n);
    await page.click('[data-ui="close"]').catch((e) => console.log('     · close fail', String(e).split('\n')[0])); await page.waitForTimeout(600);
    if (mode === 'outside') {
      await page.click('[data-ui="settings"]'); await page.waitForTimeout(1000); await shot('04_settings');
      await page.click('[data-ui="close"]').catch((e) => console.log('     · close fail', String(e).split('\n')[0])); await page.waitForTimeout(500);
    }
    if (mode === 'short') {
      await page.fill('.qbox-in', 'كيف أقطع الشارع'); await page.press('.qbox-in', 'Enter');
      await page.waitForTimeout(6000); await shot('05_short_answer'); await log('short asked');
      await page.evaluate(() => window.__alrashed.idle()); await log('short done');
      await page.fill('.qbox-in', 'وش أحسن لعبة بلايستيشن'); await page.press('.qbox-in', 'Enter');
      await page.waitForTimeout(5000); await shot('06_offtopic'); await log('offtopic');
      await page.evaluate(() => window.__alrashed.idle());
    }
    await page.click('[data-ui="back"]');
    await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu', null, { timeout: 30000 });
    await page.waitForTimeout(1500);
  }
  await page.click('[data-mode="exam"]'); await page.waitForTimeout(4000); await shot('07_exam_start'); await log('exam');
  console.log('     · exam html', (await page.evaluate(() => document.querySelector('.ar-ui')?.innerText.slice(0, 400))) );
};
