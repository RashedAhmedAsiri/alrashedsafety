#!/usr/bin/env node
/**
 * Verifies src/content/data/inside.ts and src/content/data/systemLines.ts against the plan.
 *
 *   node tools/content/check_inside.mjs
 *
 * Imports the real TypeScript modules (Node strips the types) and re-reads the plan files on its own
 * (independently of tools/content/inside.mjs), then checks:
 *   - 14 inside scenarios, ids unique and identical to the plan headings, in plan order, n and title exact
 *   - every Arabic field (title, opening, each must item, each Remember item, slogan, the plan's example
 *     questions) is exactly the plan's text with only the markdown removed, and nothing was dropped
 *   - every `{boy/girl}` brace is well formed (one slash, both sides non-empty, no nesting, no stray
 *     slash or brace outside braces)
 *   - location / every visited location is a valid LocationId and matches the plan; weather and time are
 *     valid and agree with the plan where it states them (null weather only for "current"); order matches
 *   - speakingSetup equals the plan's paragraph when present
 *   - icon is a canonical lucide-react name; color is a unique #RRGGBB, white icons read on it (contrast >= 2.6),
 *     and panel neighbours in a 3- or 4-column grid (intro first) differ (CIE dE >= 30; any two >= 12)
 *   - examples: the plan's examples first, then 6-8 added ones; no duplicates; Arabic only
 *   - keywords: 8-15, weight 1-3, plain Arabic without diacritics, no duplicates
 *   - the generated parts of inside.ts and systemLines.ts equal what tools/content/inside.mjs writes now
 *   - system lines: exactly the 12 ids of the plan table, text verbatim, braces well formed, and each has
 *     a SYSTEM_LINE_WHEN note
 * Exit code 1 on any error.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// CHECK_INSIDE_TS / CHECK_SYSTEM_TS let the check run against a modified copy (used to test the check).
const insidePath = process.env.CHECK_INSIDE_TS ?? resolve(root, 'src/content/data/inside.ts');
const systemPath = process.env.CHECK_SYSTEM_TS ?? resolve(root, 'src/content/data/systemLines.ts');
const { INSIDE_SCENARIOS, INSIDE_LOCATIONS } = await import(pathToFileURL(insidePath).href);
const { SYSTEM_LINES, SYSTEM_LINE_WHEN } = await import(pathToFileURL(systemPath).href);

// ---------------------------------------------------------------- vocabularies from the code
const typesTs = read('src/core/types.ts');
const unionOf = (name) => {
  const m = new RegExp(`export type ${name} =([^;]+);`).exec(typesTs);
  if (!m) throw new Error(`types.ts: no ${name}`);
  return [...m[1].matchAll(/'([a-zA-Z_]+)'/g)].map((x) => x[1]);
};
const LOCATIONS = new Set([...unionOf('InsideLocationId'), ...unionOf('GroundsLocationId'), ...unionOf('OutsideLocationId')]);
const WEATHERS = new Set(unionOf('Weather'));
const TIMES = new Set(unionOf('TimeOfDay'));
const STEPS = new Set(['before', 'speak', 'after']);

const lucideDts = read('node_modules/lucide-react/dist/lucide-react.d.ts');
const exportBlock = lucideDts.slice(lucideDts.lastIndexOf('export {'));
const LUCIDE = new Set(
  exportBlock
    .slice('export {'.length, exportBlock.indexOf('}'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.includes(' as ') ? s.split(' as ')[1].trim() : s)),
);
if (LUCIDE.size < 1000) err(`lucide export list looks wrong (${LUCIDE.size} names)`);
// The UI's ContentIcon looks names up in lucide's `icons` map, which holds canonical names only.
const ICON_MAP = new Set(Object.keys((await import(pathToFileURL(resolve(root, 'node_modules/lucide-react/dist/esm/lucide-react.mjs')).href)).icons ?? {}));
if (ICON_MAP.size < 1000) err(`lucide icons map looks wrong (${ICON_MAP.size} names)`);

// ---------------------------------------------------------------- independent plan reading
const planMd = read('docs/plan/Inside_scenarios.md');
const sections = [];
{
  let cur = null;
  for (const line of planMd.split('\n')) {
    const h = /^## (\d+)\. (.+?) · `([a-z0-9_]+)`$/.exec(line);
    if (h) sections.push((cur = { n: +h[1], title: h[2], id: h[3], lines: [] }));
    else if (line.startsWith('## ')) cur = null;
    else if (cur) cur.lines.push(line);
  }
}

const AR = /[؀-ۿ]/;
const DIACRITICS = /[ً-ْٰ]/;
const LATIN = /[A-Za-z]/;

function checkBraces(where, s) {
  let depth = 0;
  let inner = '';
  for (const ch of s) {
    if (ch === '{') {
      if (depth) return err(`${where}: nested «{» in «${s}»`);
      depth = 1;
      inner = '';
    } else if (ch === '}') {
      if (!depth) return err(`${where}: stray «}» in «${s}»`);
      depth = 0;
      const parts = inner.split('/');
      if (parts.length !== 2) return err(`${where}: brace «{${inner}}» needs exactly one slash`);
      if (!parts[0].trim() || !parts[1].trim()) return err(`${where}: empty side in «{${inner}}»`);
      if (parts[0] === parts[1]) warn(`${where}: identical boy/girl sides in «{${inner}}»`);
    } else if (depth) inner += ch;
    else if (ch === '/') return err(`${where}: slash outside braces in «${s}»`);
  }
  if (depth) err(`${where}: unclosed «{» in «${s}»`);
}

function checkSpokenText(where, s) {
  if (typeof s !== 'string' || !s.trim()) return err(`${where}: empty`);
  if (s !== s.trim()) err(`${where}: leading/trailing whitespace`);
  if (LATIN.test(s)) err(`${where}: Latin letters in «${s}»`);
  if (/[*_`#|]|^\d+\.\s|^- /.test(s)) err(`${where}: markdown left in «${s}»`);
  if (!AR.test(s)) err(`${where}: no Arabic in «${s}»`);
  checkBraces(where, s);
}

/** Lines of a list that follows `**Label:**`. */
function listAfter(lines, label, re) {
  const i = lines.findIndex((l) => l === `**${label}:**`);
  if (i < 0) return null;
  const out = [];
  let j = i + 1;
  while (j < lines.length && lines[j] === '') j++;
  for (; j < lines.length && re.test(lines[j]); j++) out.push(lines[j].replace(re, ''));
  return out;
}
const labelled = (lines, label) => {
  const l = lines.find((x) => x.startsWith(`**${label}:** `));
  return l === undefined ? undefined : l.slice(`**${label}:** `.length);
};

// ---------------------------------------------------------------- scenarios
if (!Array.isArray(INSIDE_SCENARIOS)) err('INSIDE_SCENARIOS is not an array');
if (sections.length !== 14) err(`plan has ${sections.length} scenario headings, expected 14`);
if (INSIDE_SCENARIOS.length !== 14) err(`INSIDE_SCENARIOS has ${INSIDE_SCENARIOS.length} entries, expected 14`);
const ids = INSIDE_SCENARIOS.map((s) => s.id);
if (new Set(ids).size !== ids.length) err(`duplicate ids: ${ids.join(', ')}`);
const colors = new Map();

INSIDE_SCENARIOS.forEach((s, idx) => {
  const sec = sections[idx];
  const W = `#${idx + 1} ${s.id}`;
  if (!sec) return err(`${W}: no matching plan section`);
  const L = sec.lines;
  const secText = L.join('\n');

  if (s.id !== sec.id) err(`${W}: id differs from plan «${sec.id}»`);
  if (s.mode !== 'inside') err(`${W}: mode «${s.mode}»`);
  if (s.n !== sec.n) err(`${W}: n ${s.n} vs plan ${sec.n}`);
  if (s.title !== sec.title) err(`${W}: title «${s.title}» vs plan «${sec.title}»`);
  checkSpokenText(`${W} title`, s.title);

  // meta line
  const meta = L.find((l) => l.startsWith('- **Location:**')) ?? '';
  const field = (name) => {
    const m = new RegExp(`\\*\\*${name}:\\*\\* ([^·]+)`).exec(meta);
    return m ? m[1].trim() : null;
  };
  const locNote = field('Location') ?? '';
  const planLocs = [...locNote.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]);
  if (!LOCATIONS.has(s.location)) err(`${W}: invalid location «${s.location}»`);
  if (s.location !== planLocs[0]) err(`${W}: location «${s.location}» vs plan «${planLocs[0]}»`);
  const visited = INSIDE_LOCATIONS?.[s.id];
  if (!visited || visited.join() !== planLocs.join()) err(`${W}: INSIDE_LOCATIONS «${visited}» vs plan «${planLocs}»`);
  for (const l of planLocs) if (!LOCATIONS.has(l)) err(`${W}: plan location «${l}» is not a LocationId`);

  const wNote = field('Weather');
  const statedW = wNote && /\b(sunny|rain|wet|dust)\b/.exec(wNote)?.[1];
  if (s.weather === null) {
    if (!(wNote && /^current\b/i.test(wNote))) err(`${W}: weather null but the plan does not say current`);
  } else {
    if (!WEATHERS.has(s.weather)) err(`${W}: invalid weather «${s.weather}»`);
    if (statedW && statedW !== s.weather) err(`${W}: weather «${s.weather}» vs plan «${wNote}»`);
    if (wNote && /^current\b/i.test(wNote)) err(`${W}: plan says current weather but data has «${s.weather}»`);
  }
  const tNote = field('Time');
  const statedT = (tNote && /\b(morning|afternoon)\b/.exec(tNote)?.[1]) || /\b(morning|afternoon)\b/.exec(locNote)?.[1];
  if (s.time !== null && !TIMES.has(s.time)) err(`${W}: invalid time «${s.time}»`);
  if (statedT && statedT !== s.time) err(`${W}: time «${s.time}» vs plan «${tNote ?? locNote}»`);

  const planOrder = (field('Order') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!Array.isArray(s.order) || !s.order.length || s.order.some((o) => !STEPS.has(o))) err(`${W}: invalid order ${JSON.stringify(s.order)}`);
  if (s.order.join() !== planOrder.join()) err(`${W}: order ${s.order} vs plan ${planOrder}`);

  // texts
  const t = s.text;
  if (!t) return err(`${W}: no text`);
  if (s.body !== undefined) err(`${W}: inside scenarios must not have body`);
  const pOpening = labelled(L, 'Opening');
  const pSlogan = labelled(L, 'Slogan');
  const pMust = listAfter(L, 'Must', /^\d+\. /) ?? [];
  const pAvoid = listAfter(L, 'Remember', /^- /) ?? [];
  if (t.opening !== pOpening) err(`${W}: opening differs from plan\n   data «${t.opening}»\n   plan «${pOpening}»`);
  if (t.slogan !== pSlogan) err(`${W}: slogan differs from plan\n   data «${t.slogan}»\n   plan «${pSlogan}»`);
  if (t.must.length !== pMust.length) err(`${W}: ${t.must.length} must items vs plan ${pMust.length}`);
  t.must.forEach((m, i) => m !== pMust[i] && err(`${W}: must[${i}] differs\n   data «${m}»\n   plan «${pMust[i]}»`));
  if (t.avoid.length !== pAvoid.length) err(`${W}: ${t.avoid.length} avoid items vs plan ${pAvoid.length}`);
  t.avoid.forEach((m, i) => m !== pAvoid[i] && err(`${W}: avoid[${i}] differs\n   data «${m}»\n   plan «${pAvoid[i]}»`));
  for (const [k, v] of [['opening', t.opening], ['slogan', t.slogan], ...t.must.map((m, i) => [`must[${i}]`, m]), ...t.avoid.map((m, i) => [`avoid[${i}]`, m])]) {
    checkSpokenText(`${W} ${k}`, v);
    if (typeof v === 'string' && !secText.includes(v)) err(`${W} ${k}: not found verbatim in its plan section`);
  }
  t.avoid.forEach((a, i) => {
    if (!/^(\{)?لَا /.test(a)) warn(`${W}: avoid[${i}] does not start with «لَا»`);
  });
  if (!/\.\.|!$/.test(t.slogan)) warn(`${W}: slogan has no «..»`);
  // nothing spoken left behind: every Opening/Slogan line and every list item of the section is in the data
  const used = new Set([pOpening, pSlogan, ...pMust, ...pAvoid]);
  for (const l of L) {
    if (!/^\*\*(Opening|Slogan):\*\* |^\d+\. |^- (?!\*\*)/.test(l)) continue;
    const bare = l.replace(/^\*\*(Opening|Slogan):\*\* /, '').replace(/^\d+\. /, '').replace(/^- /, '');
    if (!used.has(bare)) err(`${W}: plan line not in data: «${l}»`);
  }
  if (L.filter((l) => l.startsWith('**Opening:**')).length !== 1) err(`${W}: plan section must have exactly one Opening`);
  if (L.filter((l) => l.startsWith('**Slogan:**')).length !== 1) err(`${W}: plan section must have exactly one Slogan`);

  // speaking setup
  const pSetup = labelled(L, 'Speaking setup');
  if (pSetup !== undefined && s.speakingSetup !== pSetup) err(`${W}: speakingSetup differs from plan`);
  if (pSetup === undefined && s.speakingSetup !== undefined) err(`${W}: speakingSetup not in plan`);

  // icon & color
  if (!LUCIDE.has(s.icon)) err(`${W}: icon «${s.icon}» is not exported by lucide-react`);
  else if (!ICON_MAP.has(s.icon)) err(`${W}: icon «${s.icon}» is an alias, not a canonical name in lucide's \`icons\` map (ContentIcon would not resolve it)`);
  if (!/^#[0-9A-F]{6}$/i.test(s.color)) err(`${W}: color «${s.color}» is not #RRGGBB`);
  else {
    const key = s.color.toUpperCase();
    if (colors.has(key)) err(`${W}: color ${s.color} also used by ${colors.get(key)}`);
    colors.set(key, s.id);
  }

  // examples
  const exLine = L.find((l) => l.startsWith('- **Example questions:** ')) ?? '';
  const pEx = exLine.slice('- **Example questions:** '.length).split(' • ').map((x) => x.trim()).filter(Boolean);
  if (!pEx.length) err(`${W}: no plan examples found`);
  pEx.forEach((e, i) => s.examples[i] !== e && err(`${W}: example[${i}] «${s.examples[i]}» is not the plan's «${e}»`));
  const added = s.examples.length - pEx.length;
  if (added < 6 || added > 8) err(`${W}: ${added} added examples (need 6-8)`);
  const normEx = s.examples.map((e) => e.replace(/[؟?!.،]/g, '').replace(/\s+/g, ' ').trim());
  if (new Set(normEx).size !== normEx.length) err(`${W}: duplicate examples`);
  s.examples.forEach((e, i) => {
    if (LATIN.test(e) || !AR.test(e)) err(`${W}: example[${i}] must be Arabic only: «${e}»`);
    if (i >= pEx.length && DIACRITICS.test(e)) warn(`${W}: example[${i}] has diacritics`);
  });

  // keywords
  const kws = s.keywords;
  if (!Array.isArray(kws) || kws.length < 8 || kws.length > 15) err(`${W}: ${kws?.length} keywords (need 8-15)`);
  const seen = new Set();
  for (const k of kws ?? []) {
    if (!Number.isInteger(k.weight) || k.weight < 1 || k.weight > 3) err(`${W}: keyword «${k.word}» weight ${k.weight} (need 1-3)`);
    if (!/^[ء-ي ]+$/.test(k.word) || k.word !== k.word.trim()) err(`${W}: keyword «${k.word}» must be plain Arabic letters (no diacritics)`);
    const n = k.word.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    if (seen.has(n)) err(`${W}: duplicate keyword «${k.word}»`);
    seen.add(n);
  }
  if (!(kws ?? []).some((k) => k.weight === 3)) err(`${W}: no weight-3 keyword`);
});

// ---------------------------------------------------------------- colors: white icons readable, buttons distinct
{
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).map(lin);
  const lum = (h) => { const [r, g, b] = rgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const lab = (h) => {
    const [r, g, b] = rgb(h);
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047), y = f(r * 0.2126 + g * 0.7152 + b * 0.0722), z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
  // Panel order: the intro button (brand teal) first, then the 14 scenarios.
  const panel = [{ id: 'intro', color: '#14B8A6' }, ...INSIDE_SCENARIOS].filter((s) => /^#[0-9A-F]{6}$/i.test(s.color));
  for (const s of panel.slice(1)) if (1.05 / (lum(s.color) + 0.05) < 2.6) err(`${s.id}: color ${s.color} too light for a white icon (contrast < 2.6)`);
  for (let i = 0; i < panel.length; i++)
    for (let j = i + 1; j < panel.length; j++) {
      const d = dE(panel[i].color, panel[j].color);
      if (d < 12) err(`colors of ${panel[i].id} and ${panel[j].id} look alike (dE ${d.toFixed(1)})`);
      const near = [3, 4].some((c) => j === i + c || (j === i + 1 && j % c !== 0));
      if (near && d < 30) err(`neighbouring buttons ${panel[i].id} / ${panel[j].id} look alike (dE ${d.toFixed(1)})`);
    }
}

// ---------------------------------------------------------------- system lines
const voiceMd = read('docs/plan/Voice_and_AI.md');
const sysStart = voiceMd.indexOf('## Pre-recorded system lines');
const sysSection = voiceMd.slice(sysStart, voiceMd.indexOf('\n## ', sysStart + 5));
const planRows = [...sysSection.matchAll(/^\| `([a-z_]+)` \| (.+?) \|$/gm)].map((m) => ({ id: m[1], text: m[2] }));
const BRIEF_IDS = ['greet_first', 'greet_call', 'not_heard', 'off_topic', 'mic_denied', 'offline_creative', 'thinking', 'mode_outside', 'mode_inside', 'mode_short', 'mode_creative', 'need_internet_listen'];
if (planRows.map((r) => r.id).join() !== BRIEF_IDS.join()) err(`plan system line ids changed: ${planRows.map((r) => r.id)}`);
if (!Array.isArray(SYSTEM_LINES)) err('SYSTEM_LINES is not an array');
const sysIds = SYSTEM_LINES.map((r) => r.id);
if (new Set(sysIds).size !== sysIds.length) err('duplicate system line ids');
for (const row of planRows) {
  const got = SYSTEM_LINES.find((r) => r.id === row.id);
  if (!got) {
    err(`system line «${row.id}» missing`);
    continue;
  }
  if (got.text !== row.text) err(`system line ${row.id} differs\n   data «${got.text}»\n   plan «${row.text}»`);
  checkSpokenText(`sys.${row.id}`, got.text);
  if (!SYSTEM_LINE_WHEN?.[row.id]) err(`SYSTEM_LINE_WHEN has no note for ${row.id}`);
}
for (const id of sysIds) if (!planRows.some((r) => r.id === id)) err(`system line «${id}» is not in the plan table`);
for (const id of ['greet_first', 'mic_denied']) {
  const t = SYSTEM_LINES.find((r) => r.id === id)?.text ?? '';
  if (t.includes('{')) err(`sys.${id} must be gender-neutral (plural)`);
}

// ---------------------------------------------------------------- generated parts up to date
{
  const gen = await import(pathToFileURL(resolve(root, 'tools/content/inside.mjs')).href);
  const insideSrc = readFileSync(insidePath, 'utf8');
  const a = insideSrc.indexOf('// <generated:plan>');
  const endTag = '// </generated:plan>';
  const b = insideSrc.indexOf(endTag);
  if (a < 0 || b < a) err('inside.ts: generated:plan markers missing');
  else if (insideSrc.slice(a, b + endTag.length) !== gen.genPlanBlock(gen.parseInside()))
    err('inside.ts: generated:plan block is stale; run `node tools/content/inside.mjs`');
  if (readFileSync(systemPath, 'utf8') !== gen.genSystemFile(gen.parseSystemLines()))
    err('systemLines.ts is stale or edited by hand; run `node tools/content/inside.mjs`');
}

// ---------------------------------------------------------------- cross-content checks (best effort)
try {
  const outside = await import(pathToFileURL(resolve(root, 'src/content/data/outside.ts')).href);
  const OUT = outside.OUTSIDE_SCENARIOS ?? [];
  const other = new Set([outside.INTRO?.id, ...OUT.map((s) => s.id)]);
  for (const id of ids) if (other.has(id)) err(`id «${id}» also used by an outside scenario`);

  // Same normalisation as check_outside.mjs: no diacritics, unified alef/ta marbuta/ya, no punctuation,
  // article prefixes dropped per token.
  const norm = (x) => x.replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[؟?!.,،]/g, ' ').replace(/\s+/g, ' ').trim();
  const stem = (x) => norm(x).split(' ').map((t) => t.replace(/^(وال|بال|فال|كال|لل|ال)(?=..)/, '')).join(' ');

  // Examples: none shared between scenarios (inside: error; with outside: error unless both are the plan's own).
  const owner = new Map();
  for (const s of [...OUT, ...INSIDE_SCENARIOS]) {
    const planEx = new Set(s.mode === 'inside' ? sections.find((x) => x.id === s.id)?.lines.find((l) => l.startsWith('- **Example questions:** '))?.slice(25).split(' • ') ?? [] : []);
    for (const e of s.examples ?? []) {
      const k = stem(e);
      const prev = owner.get(k);
      if (prev && prev.id !== s.id) {
        if (s.mode === 'inside' && planEx.has(e) && prev.mode === 'outside') warn(`plan example «${e}» of ${s.id} is also an example of ${prev.id} (both from the plan)`);
        else if (s.mode === 'inside') err(`example «${e}» of ${s.id} is also an example of ${prev.id}`);
      }
      owner.set(k, s);
    }
  }

  // Keyword routing self-test (warnings only; the real matcher adds BM25 over examples and a meaning model):
  // each inside example scored by the weighted keywords it contains as whole words, against every scenario.
  const ALL = [...OUT, ...INSIDE_SCENARIOS];
  const hits = (q, w) => q.includes(` ${stem(w)} `);
  for (const s of INSIDE_SCENARIOS) {
    for (const ex of s.examples) {
      const q = ` ${stem(ex)} `;
      const score = (t) => t.keywords.reduce((a, k) => a + (hits(q, k.word) ? k.weight : 0), 0);
      const own = score(s);
      const rival = ALL.filter((t) => t !== s).map((t) => [t.id, score(t)]).sort((a, b) => b[1] - a[1])[0];
      if (own === 0 && rival[1] === 0) warn(`${s.id}: no keyword in «${ex}»`);
      else if (rival[1] >= own) warn(`${s.id}: «${ex}» scores ${own} on its own keywords but ${rival[1]} on ${rival[0]}`);
    }
  }
} catch (e) {
  warn(`could not load outside.ts for the id clash check (${e.message.split('\n')[0]})`);
}

// ---------------------------------------------------------------- report
for (const w of warnings) console.log(`warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.log(`ERROR: ${e}`);
  console.log(`\n${errors.length} error(s)`);
  process.exit(1);
}
const exCount = INSIDE_SCENARIOS.reduce((a, s) => a + s.examples.length, 0);
const kwCount = INSIDE_SCENARIOS.reduce((a, s) => a + s.keywords.length, 0);
console.log(
  `OK: ${INSIDE_SCENARIOS.length} inside scenarios (${exCount} examples, ${kwCount} keywords, ${colors.size} colors, icons ${INSIDE_SCENARIOS.map((s) => s.icon).join(' ')}), ${SYSTEM_LINES.length} system lines`,
);
