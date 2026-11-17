#!/usr/bin/env node
/**
 * Headless screenshots of the dev viewer (or the main app) for checking 3D work.
 *
 *   node tools/shot.mjs [--out=shots] [--size=1280x720] [--wait=400] [--timeout=90000] "<query>" ...
 *
 * Each <query> is a URL query without '?', e.g.
 *   "view=classroom"  "view=crosswalk_main&weather=rain&time=afternoon"  "view=characters&clip=walk"
 *   "view=classroom&lcam=0,1.6,4&llook=0,1,-2"   "name=menu"  (no view = the main app)
 * Add name=<file> to choose the PNG name; otherwise it is derived from the query.
 *
 * Starts its own Vite dev server on a free port, renders with SwiftShader WebGL, waits until the
 * page sets window.__ready (the viewer does after 30 frames; for the main app pass --wait), and
 * prints console errors and page errors for every shot so broken code is visible.
 * Exit code 1 if any page threw an error or never became ready.
 *
 *   ?dev=<Name>  preview pages (src/dev/<Name>.tsx) are waited on like the viewer (they set window.__ready).
 *   --script=path/to/steps.mjs  runs `export default async (page, shot) => {...}` after the page is ready,
 *       for clicking through UI states; call `await shot('name')` to save extra PNGs
 *       (e.g. await page.click('text=السلامة خارج المدرسة'); await page.waitForTimeout(1500); await shot('outside')).
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const opts = { out: 'shots', size: '1280x720', wait: '400', timeout: '90000', script: '' };
const queries = [];
for (const a of process.argv.slice(2)) {
  const m = /^--([a-z]+)=(.*)$/.exec(a);
  if (m) opts[m[1]] = m[2];
  else queries.push(a.replace(/^\?/, ''));
}
if (!queries.length) {
  console.error('usage: node tools/shot.mjs [--out=dir] "view=classroom" ...');
  process.exit(2);
}
const [W, H] = opts.size.split('x').map(Number);
const outDir = resolve(process.cwd(), opts.out);
mkdirSync(outDir, { recursive: true });

const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  logLevel: 'error',
  server: { port: 0, host: '127.0.0.1', strictPort: false, hmr: false },
  clearScreen: false,
});
await server.listen();
const addr = server.httpServer.address();
const base = `http://127.0.0.1:${addr.port}/`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'],
});

let failed = false;
const nameOf = (q) => {
  const p = new URLSearchParams(q);
  const n = p.get('name') ?? (q.replace(/[^a-zA-Z0-9_,.-]+/g, '_').replace(/^view_/, '') || 'app');
  return n.slice(0, 120);
};

for (const q of queries) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'ar-SA' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      const t = m.text();
      if (/THREE\.WebGLRenderer: Context Lost|GPU stall|Automatic fallback to software WebGL|WebGL-|DevTools/.test(t)) return;
      errors.push(`[console.${m.type()}] ${t.slice(0, 400)}`);
    }
  });
  page.on('pageerror', (e) => {
    errors.push(`[pageerror] ${String(e?.stack ?? e).slice(0, 800)}`);
    failed = true;
  });
  const url = base + (q ? `?${q}` : '');
  const t0 = Date.now();
  let ready = true;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: Number(opts.timeout) });
    const qp = new URLSearchParams(q);
    if (qp.get('view') || qp.get('dev')) {
      await page.waitForFunction(() => window.__ready === true, null, { timeout: Number(opts.timeout), polling: 200 });
    }
  } catch (e) {
    ready = false;
    failed = true;
    errors.push(`[timeout] not ready: ${String(e).split('\n')[0]}`);
  }
  await page.waitForTimeout(Number(opts.wait));
  const file = resolve(outDir, `${nameOf(q)}.png`);
  try {
    await page.screenshot({ path: file });
  } catch (e) {
    failed = true;
    errors.push(`[screenshot] ${String(e).split('\n')[0]}`);
  }
  if (opts.script && ready) {
    try {
      const mod = await import(resolve(process.cwd(), opts.script));
      await mod.default(page, async (name) => {
        const f = resolve(outDir, `${name}.png`);
        await page.screenshot({ path: f });
        console.log(`     shot ${f}`);
      });
    } catch (e) {
      failed = true;
      errors.push(`[script] ${String(e?.stack ?? e).slice(0, 600)}`);
    }
  }
  console.log(`${ready ? 'OK  ' : 'FAIL'} ${file}  (${((Date.now() - t0) / 1000).toFixed(1)}s)  ?${q}`);
  for (const e of errors.slice(0, 15)) console.log('     ' + e);
  if (errors.length > 15) console.log(`     ... ${errors.length - 15} more`);
  await ctx.close();
}

await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
