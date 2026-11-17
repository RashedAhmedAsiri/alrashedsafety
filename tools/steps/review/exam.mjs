// Walks the exam by tapping (phase, 10 questions, certificate), then the map and the teacher dashboard.
export default async (page, shot) => {
  const st = () => page.evaluate(() => { const a = window.__alrashed.app.getState(); return JSON.stringify({ phase: a.phase, mode: a.mode, loc: a.location, status: a.status, playing: a.playing }); });
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.waitForTimeout(1500);
  await page.click('[data-mode="exam"]');
  await page.waitForSelector('[data-exam="pre"]', { timeout: 60000 });
  await shot('e01_phase'); await page.click('[data-exam="pre"]');
  let answered = 0;
  for (let i = 0; i < 400 && answered < 10; i++) {
    const sel = await page.evaluate(() => { const c = document.querySelector('.ex-card:not([disabled])') || document.querySelector('[data-exam="yes"]:not([disabled])'); if (!c) return null; c.setAttribute('data-pick', '1'); return true; });
    if (sel) {
      if (answered === 0 || answered === 4 || answered === 9) await shot(`e02_q${answered + 1}`);
      await page.click('[data-pick="1"]').catch(() => {});
      await page.evaluate(() => document.querySelectorAll('[data-pick]').forEach((e) => e.removeAttribute('data-pick')));
      answered++; console.log('     · answered', answered, await st());
      await page.waitForTimeout(2500);
    } else await page.waitForTimeout(700);
    if (await page.$('[data-exam="retake"]')) break;
  }
  await page.waitForSelector('[data-exam="retake"]', { timeout: 120000 }).catch(() => console.log('     · NO CERTIFICATE'));
  await page.waitForTimeout(1500); await shot('e03_cert'); console.log('     · cert', await st());
  console.log('     · saved rows', await page.evaluate(() => (JSON.parse(localStorage.getItem('alrashed.exam.results.v1') || '[]')).length));
  await page.click('[data-exam="classroom"]');
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu', null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  // leave-early confirm
  await page.click('[data-mode="exam"]'); await page.waitForSelector('[data-exam="pre"]', { timeout: 60000 });
  await page.click('[data-ui="back"]'); await page.waitForSelector('[data-exam="confirm"]', { timeout: 10000 }).catch(() => console.log('     · NO CONFIRM'));
  await shot('e04_confirm'); await page.click('[data-exam="leave-yes"]').catch(() => {});
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu', null, { timeout: 30000 }).catch(() => console.log('     · leave failed'));
  await page.waitForTimeout(1500);
  // map + teacher dashboard from settings
  await page.click('[data-mode="outside"]'); await page.waitForTimeout(3000); await page.evaluate(() => window.__alrashed.idle());
  await page.click('[data-ui="settings"]'); await page.waitForTimeout(800);
  await page.click('[data-ui="teacher"]').catch((e) => console.log('     · teacher', String(e).split('\n')[0])); await page.waitForTimeout(2500); await shot('e05_teacher');
  console.log('     · teacher text', (await page.evaluate(() => document.querySelector('.ar-ui')?.innerText.replace(/\s+/g, ' ').slice(0, 300))));
};
