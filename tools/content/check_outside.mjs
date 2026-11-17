#!/usr/bin/env node
// Verifies src/content/data/outside.ts against docs/plan/Outside_scenarios.md. Plain Node (22+, which
// imports .ts files directly), no dependencies.
//
//   node tools/content/check_outside.mjs
//
// Checks: intro + 17 scenarios in plan order; ids unique and as in the plan; every Arabic text field is
// the plan's line with only the markdown stripped; {boy/girl} groups have exactly one slash; location,
// weather, time and order are valid and match the plan; icons exist in lucide-react; colors are distinct
// (also between grid neighbours) and readable under a white icon; examples and keywords are well formed;
// the GENERATED block in outside.ts is up to date with the plan.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parsePlan, emitGenerated, BEGIN, END, PLAN_FILE, OUT_FILE } from './outside.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

// ---------- load the data ----------
// `--data=<file>` checks another copy of outside.ts (used to test this checker on broken copies).
const DATA_FILE = resolve(process.argv.find((a) => a.startsWith('--data='))?.slice(7) ?? OUT_FILE);
let data;
try {
  data = await import(pathToFileURL(DATA_FILE).href);
} catch (e) {
  console.error(`Could not import ${DATA_FILE} (needs Node 22.18+ for .ts imports): ${e.message}`);
  process.exit(2);
}
const { INTRO, OUTSIDE_SCENARIOS } = data;
const ALL = [INTRO, ...(OUTSIDE_SCENARIOS ?? [])];

// ---------- read the plan independently of the parser ----------
const planText = readFileSync(PLAN_FILE, 'utf8');
const planLines = planText.split(/\r?\n/);
const HEADING = /^## (\d+)\. (.+) · `([a-z_]+)`$/;
const sections = [];
for (const line of planLines) {
  const h = line.match(HEADING);
  if (h) sections.push({ n: +h[1], title: h[2], id: h[3], lines: [] });
  else if (line.startsWith('## ')) sections.push({ skip: true, lines: [] });
  else if (sections.length) sections[sections.length - 1].lines.push(line);
}
const planSections = sections.filter((s) => !s.skip);
const sectionById = Object.fromEntries(planSections.map((s) => [s.id, s]));

// ---------- vocab from src/core/types.ts ----------
const typesSrc = readFileSync(resolve(ROOT, 'src/core/types.ts'), 'utf8');
function unionMembers(name) {
  const m = typesSrc.match(new RegExp(`export type ${name} =([^;]+);`));
  if (!m) throw new Error(`type ${name} not found in src/core/types.ts`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
const LOCATIONS = new Set([...unionMembers('InsideLocationId'), ...unionMembers('GroundsLocationId'), ...unionMembers('OutsideLocationId')]);
const WEATHERS = new Set(unionMembers('Weather'));
const TIMES = new Set(unionMembers('TimeOfDay'));
const STEPS = ['before', 'speak', 'after'];

// ---------- lucide-react ----------
const lucideDts = readFileSync(resolve(ROOT, 'node_modules/lucide-react/dist/lucide-react.d.ts'), 'utf8');
const LUCIDE = new Set([...lucideDts.matchAll(/declare const ([A-Z][A-Za-z0-9]*): /g)].map((m) => m[1]));
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').replace(/([a-zA-Z])([0-9])/g, '$1-$2').toLowerCase();

// ---------- text helpers ----------
const HARAKAT = /[ً-ْٰـ]/; // tanween, harakat, shadda, sukun, dagger alif, tatweel
const LATIN = /[A-Za-z]/;
const norm = (s) => s.replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[؟?!.,،]/g, ' ').replace(/\s+/g, ' ').trim();
/** norm + drops the article prefixes the matcher strips (ال وال بال لل فال كال), per token. */
const stem = (s) => norm(s).split(' ').map((t) => t.replace(/^(وال|بال|فال|كال|لل|ال)(?=..)/, '')).join(' ');

function checkMarkup(where, s) {
  let depth = 0;
  let group = '';
  for (const ch of s) {
    if (ch === '{') {
      if (depth) return fail(where, `nested brace in «${s}»`);
      depth = 1;
      group = '';
    } else if (ch === '}') {
      if (!depth) return fail(where, `unmatched } in «${s}»`);
      const parts = group.split('/');
      if (parts.length !== 2) return fail(where, `{${group}} must have exactly one slash`);
      if (!parts[0] || !parts[1]) return fail(where, `{${group}} has an empty side`);
      depth = 0;
    } else if (depth) group += ch;
    else if (ch === '/') return fail(where, `slash outside braces in «${s}»`);
  }
  if (depth) fail(where, `unclosed { in «${s}»`);
}

function checkStripped(where, s) {
  if (typeof s !== 'string' || !s) return fail(where, 'empty');
  if (s !== s.trim()) fail(where, 'leading/trailing whitespace');
  if (/\*\*|^«|»$|^\d+\. |^- /.test(s)) fail(where, `markdown left in «${s}»`);
}

/** The plan section must contain exactly this line. */
function expectLine(where, sec, line) {
  if (!sec.lines.some((l) => l.trim() === line)) fail(where, `not found verbatim in the plan: ${line.slice(0, 80)}`);
}

// ---------- colors ----------
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const whiteContrast = (h) => 1.05 / (lum(h) + 0.05);
const lab = (h) => {
  const [r, g, b] = rgb(h).map(lin);
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047);
  const y = f(r * 0.2126 + g * 0.7152 + b * 0.0722);
  const z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const deltaE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const MIN_CONTRAST = 2.6; // white icon (stroke 2.5) on the button; intro keeps the brand teal
const MIN_NEIGHBOUR_DE = 30; // buttons next to each other in a 3- or 4-column grid, or in plan order
const MIN_ANY_DE = 12;

// ======================================================================
// 1. Counts, order, ids
if (!INTRO) fail('INTRO', 'missing');
if (!Array.isArray(OUTSIDE_SCENARIOS) || OUTSIDE_SCENARIOS.length !== 17) fail('OUTSIDE_SCENARIOS', `expected 17, got ${OUTSIDE_SCENARIOS?.length}`);
if (planSections.length !== 18) fail('plan', `expected intro + 17 sections, found ${planSections.length}`);
const planIds = planSections.map((s) => s.id);
const ids = ALL.map((s) => s?.id);
if (JSON.stringify(ids) !== JSON.stringify(planIds)) fail('ids', `not the plan's ids in order:\n  got  ${ids.join(',')}\n  plan ${planIds.join(',')}`);
if (new Set(ids).size !== ids.length) fail('ids', 'duplicate id');
if (INTRO && (INTRO.id !== 'intro' || INTRO.mode !== 'intro' || INTRO.n !== 0)) fail('intro', 'id/mode/n must be intro/intro/0');

// The parser must agree with what is in the file.
const parsed = parsePlan(planText);
const src = readFileSync(DATA_FILE, 'utf8');
const a = src.indexOf(BEGIN), b = src.indexOf(END);
if (a < 0 || b < a) fail('outside.ts', 'GENERATED markers missing');
else if (src.slice(a, b + END.length) !== emitGenerated(parsed)) fail('outside.ts', 'GENERATED block is stale: run `node tools/content/outside.mjs --write`');

// 2. Per scenario
const allExamples = new Map();
ALL.forEach((s, idx) => {
  if (!s) return;
  const W = `${s.id}`;
  const sec = sectionById[s.id];
  if (!sec) return fail(W, 'no such section in the plan');
  if (s.n !== sec.n || s.n !== idx) fail(W, `n=${s.n}, plan says ${sec.n}, position ${idx}`);
  if (idx > 0 && s.mode !== 'outside') fail(W, `mode ${s.mode}`);

  // title
  checkStripped(`${W}.title`, s.title);
  if (s.title !== sec.title) fail(`${W}.title`, `«${s.title}» != plan «${sec.title}»`);
  checkMarkup(`${W}.title`, s.title);

  // meta line
  const metaLine = sec.lines.find((l) => l.startsWith('- **Location:**')) ?? '';
  const meta = Object.fromEntries(metaLine.replace(/^- /, '').split(' · ').map((p) => p.match(/^\*\*([^*]+):\*\* (.*)$/)?.slice(1) ?? [p, '']));
  const planLoc = (meta.Location ?? '').match(/`([a-z_]+)`/)?.[1];
  if (!LOCATIONS.has(s.location)) fail(W, `location ${s.location} is not a LocationId`);
  if (s.location !== planLoc) fail(W, `location ${s.location}, plan ${planLoc}`);
  const planWeather = (meta.Weather ?? '').split(/[\s,(]+/)[0];
  if (s.weather !== null && !WEATHERS.has(s.weather)) fail(W, `weather ${s.weather} invalid`);
  if ((planWeather === 'current' ? null : planWeather) !== s.weather) fail(W, `weather ${s.weather}, plan «${meta.Weather}»`);
  const planTime = meta.Time ? meta.Time.split(/[\s,(]+/)[0] : null;
  if (s.time !== null && !TIMES.has(s.time)) fail(W, `time ${s.time} invalid`);
  if (planTime !== s.time) fail(W, `time ${s.time}, plan «${meta.Time}»`);
  const order = s.order ?? [];
  if (!order.length || !order.includes('speak')) fail(W, 'order must include speak');
  if (order.some((x) => !STEPS.includes(x))) fail(W, `order has invalid steps ${order}`);
  if (new Set(order).size !== order.length) fail(W, 'order repeats a step');
  if (order.map((x) => STEPS.indexOf(x)).some((v, i, arr) => i && v < arr[i - 1])) fail(W, 'order not before→speak→after');
  if (order.join(', ') !== meta.Order) fail(W, `order ${order}, plan «${meta.Order}»`);

  // Arabic texts
  const arabic = [];
  if (idx === 0) {
    if (s.text) fail(W, 'intro must not have text');
    checkStripped(`${W}.body`, s.body);
    expectLine(`${W}.body`, sec, `«${s.body}»`);
    arabic.push(['body', s.body]);
  } else {
    if (s.body !== undefined) fail(W, 'scenario must not have body');
    const t = s.text;
    if (!t) return fail(W, 'text missing');
    expectLine(`${W}.opening`, sec, `**Opening:** ${t.opening}`);
    expectLine(`${W}.slogan`, sec, `**Slogan:** ${t.slogan}`);
    const planMust = sec.lines.filter((l, i) => /^\d+\. /.test(l) && sec.lines.slice(0, i).reverse().find((x) => /^\*\*(Must|Remember):\*\*$/.test(x)) === '**Must:**');
    const planAvoid = sec.lines.filter((l, i) => l.startsWith('- ') && !l.startsWith('- **') && sec.lines.slice(0, i).reverse().find((x) => /^\*\*(Must|Remember):\*\*$/.test(x)) === '**Remember:**');
    if (t.must.length !== planMust.length) fail(`${W}.must`, `${t.must.length} items, plan has ${planMust.length}`);
    if (t.avoid.length !== planAvoid.length) fail(`${W}.avoid`, `${t.avoid.length} items, plan has ${planAvoid.length}`);
    t.must.forEach((m, i) => { if (planMust[i] !== `${i + 1}. ${m}`) fail(`${W}.must.${i}`, `not the plan's item ${i + 1}: «${m}»`); });
    t.avoid.forEach((m, i) => {
      if (planAvoid[i] !== `- ${m}`) fail(`${W}.avoid.${i}`, `not the plan's Remember item ${i + 1}: «${m}»`);
      if (!m.startsWith('لَا ')) fail(`${W}.avoid.${i}`, 'does not start with لَا');
    });
    arabic.push(['opening', t.opening], ['slogan', t.slogan], ...t.must.map((m, i) => [`must.${i}`, m]), ...t.avoid.map((m, i) => [`avoid.${i}`, m]));
  }
  for (const [k, v] of arabic) {
    checkStripped(`${W}.${k}`, v);
    checkMarkup(`${W}.${k}`, v);
    if (!planText.includes(v)) fail(`${W}.${k}`, 'not a verbatim substring of the plan');
    if (!HARAKAT.test(v)) fail(`${W}.${k}`, 'has no diacritics');
    if (LATIN.test(v)) fail(`${W}.${k}`, 'contains Latin letters');
  }

  // speaking setup
  const planSetup = sec.lines.find((l) => l.startsWith('**Speaking setup:** '));
  if (planSetup && s.speakingSetup === undefined) fail(W, 'speakingSetup missing');
  if (!planSetup && s.speakingSetup !== undefined) fail(W, 'speakingSetup not in plan');
  if (planSetup && `**Speaking setup:** ${s.speakingSetup}` !== planSetup) fail(W, 'speakingSetup differs from plan');

  // icon
  if (!LUCIDE.has(s.icon)) fail(W, `icon ${s.icon} is not a lucide-react icon`);
  else if (!existsSync(resolve(ROOT, `node_modules/lucide-react/dist/esm/icons/${kebab(s.icon)}.mjs`))) fail(W, `icon file for ${s.icon} not found`);

  // color
  if (!/^#[0-9A-F]{6}$/.test(s.color)) fail(W, `color ${s.color} must be #RRGGBB (upper case)`);
  else if (idx > 0 && whiteContrast(s.color) < MIN_CONTRAST) fail(W, `color ${s.color} too light for a white icon (${whiteContrast(s.color).toFixed(2)} < ${MIN_CONTRAST})`);

  // examples
  const planExLine = sec.lines.find((l) => l.startsWith('- **Example questions:** '));
  const planEx = planExLine ? planExLine.slice('- **Example questions:** '.length).split(' • ') : [];
  const ex = s.examples ?? [];
  if (JSON.stringify(ex.slice(0, planEx.length)) !== JSON.stringify(planEx)) fail(`${W}.examples`, "must start with the plan's example questions, verbatim");
  const extra = ex.length - planEx.length;
  if (extra < 6 || extra > 8) fail(`${W}.examples`, `${extra} added examples (want 6-8)`);
  const seen = new Set();
  for (const e of ex) {
    if (HARAKAT.test(e)) fail(`${W}.examples`, `diacritics in «${e}»`);
    if (LATIN.test(e) || /[{}/]/.test(e)) fail(`${W}.examples`, `bad characters in «${e}»`);
    const k = norm(e);
    if (seen.has(k)) fail(`${W}.examples`, `duplicate «${e}»`);
    seen.add(k);
    if (allExamples.has(k)) fail(`${W}.examples`, `«${e}» also in ${allExamples.get(k)}`);
    allExamples.set(k, s.id);
  }

  // keywords
  const kw = s.keywords ?? [];
  if (kw.length < 8 || kw.length > 15) fail(`${W}.keywords`, `${kw.length} keywords (want 8-15)`);
  if (!kw.some((k) => k.weight === 3)) fail(`${W}.keywords`, 'no weight-3 keyword');
  const kseen = new Set();
  for (const { word, weight } of kw) {
    if (![1, 2, 3].includes(weight)) fail(`${W}.keywords`, `weight ${weight} for «${word}»`);
    if (!word || word !== word.trim() || HARAKAT.test(word) || LATIN.test(word)) fail(`${W}.keywords`, `bad keyword «${word}»`);
    if (word.split(' ').length > 3) fail(`${W}.keywords`, `«${word}» is longer than a short phrase`);
    const k = stem(word);
    if (kseen.has(k)) fail(`${W}.keywords`, `duplicate «${word}» (same word once the matcher strips ال and normalizes)`);
    kseen.add(k);
  }
});

// 3. Colors across the panel (intro first, then the 17 in plan order; 3- or 4-column grid).
const colors = ALL.map((s) => s?.color ?? '#000000');
if (new Set(colors).size !== colors.length) fail('colors', 'two scenarios share a color');
for (let i = 0; i < colors.length; i++) {
  for (let j = i + 1; j < colors.length; j++) {
    const d = deltaE(colors[i], colors[j]);
    const gap = j - i;
    const neighbour = gap === 1 || gap === 3 || gap === 4; // row neighbours, or same column in 3/4 columns
    if (neighbour && d < MIN_NEIGHBOUR_DE) fail('colors', `${ids[i]} ${colors[i]} and ${ids[j]} ${colors[j]} sit next to each other and look alike (ΔE ${d.toFixed(1)})`);
    else if (d < MIN_ANY_DE) fail('colors', `${ids[i]} ${colors[i]} and ${ids[j]} ${colors[j]} look alike (ΔE ${d.toFixed(1)})`);
  }
}

// 4. Keyword routing self-test (warnings only; the real matcher adds BM25 over examples and a meaning
//    model). Scores each example by the weighted keywords it contains (whole words, article prefixes
//    stripped) and warns when another scenario's keywords outscore the example's own.
const warnings = [];
const tokens = (s) => ` ${stem(s)} `;
const hits = (q, word) => q.includes(` ${stem(word)} `);
for (const s of ALL) {
  for (const ex of s?.examples ?? []) {
    const q = tokens(ex);
    const score = (t) => t.keywords.reduce((a, k) => a + (hits(q, k.word) ? k.weight : 0), 0);
    const own = score(s);
    const rival = ALL.filter((t) => t !== s).map((t) => [t.id, score(t)]).sort((x, y) => y[1] - x[1])[0];
    if (own === 0 && rival[1] === 0) warnings.push(`${s.id}: no keyword in «${ex}»`);
    else if (rival[1] > own) warnings.push(`${s.id}: «${ex}» scores ${own} on its own keywords but ${rival[1]} on ${rival[0]}`);
  }
}

// ---------- report ----------
for (const w of warnings) console.warn(' (warning) ' + w);
if (errors.length) {
  console.error(`check_outside: ${errors.length} problem(s)`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
const lines = ALL.reduce((n, s) => n + (s.text ? 2 + s.text.must.length + s.text.avoid.length : 1), 0);
const exN = ALL.reduce((n, s) => n + s.examples.length, 0);
const kwN = ALL.reduce((n, s) => n + s.keywords.length, 0);
console.log(`check_outside: OK. intro + ${OUTSIDE_SCENARIOS.length} scenarios, ${lines} spoken lines verbatim from the plan, ${exN} examples, ${kwN} keywords, ${new Set(ALL.map((s) => s.icon)).size} icons, ${colors.length} colors.`);
