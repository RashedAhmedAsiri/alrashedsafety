// node tools/shot.mjs --out=shots/cut-halls --size=640x400 --wait=6000 --script=tools/steps/cut-halls/play.mjs "name=<scenarioId>"
// Plays the scenario named by name=. Shots every second during 'before' (until speech starts), 3 shots mid-speech,
// then every second once the speech has ended ('after'), until playing is null.
export default async (page, shot) => {
  const id = new URL(page.url()).searchParams.get('name');
  await page.waitForFunction(() => !!window.__alrashed);
  await page.evaluate(() => window.__alrashed.skipIntro());
  await page.waitForFunction(() => window.__alrashed.app.getState().phase === 'menu');
  await page.evaluate(() => { window.__alrashed.enterMode('inside'); });
  await page.evaluate(() => window.__alrashed.idle());
  await page.evaluate((s) => { window.__alrashed.playScenario(s); }, id);
  const t0 = Date.now();
  let n = 0, speechSeen = false, lastMouth = 0, speechShots = 0, lastSpeechShot = 0, lastShot = 0;
  while (Date.now() - t0 < 240000) {
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => ({ m: window.__alrashed.app.getState().mouth, p: window.__alrashed.app.getState().playing }));
    const now = Date.now();
    if (s.m > 0) { speechSeen = true; lastMouth = now; }
    if (!s.p && n > 2) break;
    const speaking = speechSeen && now - lastMouth < 2200;
    if (speaking) {
      if (speechShots < 3 && now - lastSpeechShot > 5000) { await shot(`${id}_${String(n++).padStart(2, '0')}_speech`); speechShots++; lastSpeechShot = now; }
    } else if (now - lastShot > 900) {
      await shot(`${id}_${String(n++).padStart(2, '0')}${speechSeen ? '_after' : '_before'}`);
      lastShot = Date.now();
    }
  }
};
