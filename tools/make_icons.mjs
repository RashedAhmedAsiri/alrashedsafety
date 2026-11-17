#!/usr/bin/env node
/**
 * Renders the app icon (Alrashed's face in a teal circle) to PNGs in public/icons/ with Playwright.
 *   node tools/make_icons.mjs
 * Outputs: icon.svg, icon-192.png, icon-512.png (round, transparent corners), icon-maskable-512.png
 * (full-bleed teal, face inside the 80% safe zone), apple-touch-icon.png (180, full-bleed).
 * OWNER: ui worker.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/icons');
mkdirSync(out, { recursive: true });

// The face, drawn in a 512 box centred at 256,256 (safe area radius ~200).
const face = `
  <g>
    <!-- antenna -->
    <rect x="248" y="92" width="16" height="64" rx="8" fill="#E6EBF2"/>
    <circle cx="256" cy="92" r="34" fill="#FFC93C" opacity="0.35"/>
    <circle cx="256" cy="92" r="24" fill="#FFC93C" stroke="#E59A00" stroke-width="6"/>
    <circle cx="248" cy="84" r="7" fill="#fff" opacity="0.9"/>
    <!-- ears -->
    <rect x="86" y="236" width="40" height="92" rx="20" fill="#C9D2DE"/>
    <rect x="386" y="236" width="40" height="92" rx="20" fill="#C9D2DE"/>
    <!-- head with toy edge -->
    <rect x="112" y="160" width="288" height="236" rx="92" fill="#C9D2DE"/>
    <rect x="112" y="148" width="288" height="232" rx="92" fill="#FFFFFF"/>
    <!-- screen -->
    <rect x="146" y="188" width="220" height="156" rx="64" fill="#1E2A3B"/>
    <!-- happy eyes -->
    <path d="M190 262 q22 -30 44 0" stroke="#5EF0D8" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="M278 262 q22 -30 44 0" stroke="#5EF0D8" stroke-width="16" fill="none" stroke-linecap="round"/>
    <!-- smile -->
    <path d="M228 296 q28 24 56 0" stroke="#5EF0D8" stroke-width="13" fill="none" stroke-linecap="round"/>
    <!-- cheeks -->
    <circle cx="182" cy="298" r="11" fill="#FF7FA0" opacity="0.75"/>
    <circle cx="330" cy="298" r="11" fill="#FF7FA0" opacity="0.75"/>
  </g>`;

const round = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="262" r="240" fill="#0E9384"/>
  <circle cx="256" cy="252" r="240" fill="#14B8A6"/>
  <g transform="translate(256 262) scale(0.9) translate(-256 -256)">${face}</g>
</svg>`;

const full = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#14B8A6"/>
  <g transform="translate(256 262) scale(${scale}) translate(-256 -256)">${face}</g>
</svg>`;

writeFileSync(resolve(out, 'icon.svg'), round);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage();
async function render(svg, size, file, transparent) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${size}" height="${size}" style="display:block"></body></html>`,
  );
  await page.waitForTimeout(50);
  await page.screenshot({ path: resolve(out, file), omitBackground: transparent });
  console.log('wrote', file);
}
await render(round, 192, 'icon-192.png', true);
await render(round, 512, 'icon-512.png', true);
await render(full(0.74), 512, 'icon-maskable-512.png', false);
await render(full(0.86), 180, 'apple-touch-icon.png', false);
await browser.close();
