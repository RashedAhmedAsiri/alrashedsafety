#!/usr/bin/env node
/**
 * content-inside generator (plain Node, no dependencies).
 *
 * Parses docs/plan/Inside_scenarios.md (14 inside scenarios) and the "Pre-recorded system lines"
 * table of docs/plan/Voice_and_AI.md, and writes the generated parts of
 *   src/content/data/inside.ts        (the block between `// <generated:plan>` and `// </generated:plan>`;
 *                                       the hand-written EXTRA block below it is kept as is)
 *   src/content/data/systemLines.ts   (fully generated)
 *
 * No Arabic is typed here: every Arabic string is cut out of the plan files, stripping only the
 * markdown around it (bold labels, list numbers and bullets). Diacritics, `{boy/girl}` braces and
 * the `..` between slogan words are kept exactly.
 *
 *   node tools/content/inside.mjs           regenerate both files
 *   node tools/content/inside.mjs --json    print the parsed plan data as JSON (writes nothing)
 *   node tools/content/inside.mjs --dry     parse and report, write nothing
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PLAN_FILE = resolve(root, 'docs/plan/Inside_scenarios.md');
export const VOICE_FILE = resolve(root, 'docs/plan/Voice_and_AI.md');
const INSIDE_TS = resolve(root, 'src/content/data/inside.ts');
const SYSTEM_TS = resolve(root, 'src/content/data/systemLines.ts');

const WEATHERS = ['sunny', 'rain', 'wet', 'dust'];
const TIMES = ['morning', 'afternoon'];
const STEPS = ['before', 'speak', 'after'];

/**
 * Defaults for inside scenarios whose plan entry does not state weather or time. Inside lessons
 * happen during the school day, so: clear sky (`sunny`, the plan's "Default and most scenarios"
 * weather, 3D_world.md) and `morning` (Overview_and_tech.md: morning for the school day, early
 * afternoon only for dismissal). The plan never says "current" for an inside scenario, so no inside
 * scenario gets null.
 */
const DEFAULT_WEATHER = 'sunny';
const DEFAULT_TIME = 'morning';

const fail = (msg) => {
  throw new Error(`inside.mjs: ${msg}`);
};

/** Split the plan into `## N. title · \`id\`` sections. */
export function splitSections(md) {
  const lines = md.split('\n');
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = /^## (\d+)\. (.+?) · `([a-z0-9_]+)`\s*$/.exec(line);
    if (h) {
      cur = { n: Number(h[1]), title: h[2], id: h[3], lines: [] };
      sections.push(cur);
    } else if (/^## /.test(line)) {
      cur = null;
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  return sections;
}

/** `- **Location:** ... · **Weather:** ... · **Order:** ...` → { Location: '...', ... } */
function parseMeta(line) {
  const out = {};
  const body = line.replace(/^- /, '');
  for (const part of body.split(' · ')) {
    const m = /^\*\*([A-Za-z ]+):\*\*\s*(.*)$/.exec(part.trim());
    if (!m) fail(`bad meta part «${part}» in line: ${line}`);
    out[m[1]] = m[2].trim();
  }
  return out;
}

function firstWord(note, allowed) {
  if (!note) return null;
  const m = new RegExp(`\\b(${allowed.join('|')})\\b`).exec(note);
  return m ? m[1] : null;
}

/** Parse one scenario section into plan fields. */
export function parseScenario(sec) {
  const L = sec.lines;
  const metaLine = L.find((l) => l.startsWith('- **Location:**'));
  if (!metaLine) fail(`${sec.id}: no Location line`);
  const meta = parseMeta(metaLine);
  const exLine = L.find((l) => l.startsWith('- **Example questions:**'));
  if (!exLine) fail(`${sec.id}: no Example questions line`);
  const planExamples = exLine
    .replace('- **Example questions:**', '')
    .split('•')
    .map((s) => s.trim())
    .filter(Boolean);

  const locNote = meta.Location;
  const locations = [...locNote.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]);
  if (!locations.length) fail(`${sec.id}: no location id in «${locNote}»`);

  const weatherNote = meta.Weather ?? null;
  const timeNote = meta.Time ?? null;
  let weather = null;
  const statedWeather = firstWord(weatherNote, WEATHERS);
  const statedTime = firstWord(timeNote, TIMES) ?? firstWord(locNote, TIMES);
  if (!(weatherNote && /^current\b/i.test(weatherNote))) weather = statedWeather ?? DEFAULT_WEATHER;
  const time = statedTime ?? DEFAULT_TIME;
  const defaulted = { weather: weather !== null && !statedWeather, time: !statedTime };

  const order = (meta.Order ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!order.length || order.some((s) => !STEPS.includes(s))) fail(`${sec.id}: bad order «${meta.Order}»`);

  // Labelled paragraphs and lists.
  const label = (name) => {
    const prefix = `**${name}:** `;
    const l = L.find((x) => x.startsWith(prefix));
    return l ? l.slice(prefix.length).trim() : undefined;
  };
  const listAfter = (name, re) => {
    const i = L.findIndex((x) => x.trim() === `**${name}:**`);
    if (i < 0) fail(`${sec.id}: no **${name}:** list`);
    const items = [];
    let j = i + 1;
    while (j < L.length && L[j].trim() === '') j++;
    for (; j < L.length; j++) {
      const m = re.exec(L[j]);
      if (!m) break;
      items.push(m[1].trim());
    }
    if (!items.length) fail(`${sec.id}: empty ${name} list`);
    return items;
  };

  const opening = label('Opening');
  const slogan = label('Slogan');
  if (!opening) fail(`${sec.id}: no opening`);
  if (!slogan) fail(`${sec.id}: no slogan`);
  const must = listAfter('Must', /^\d+\. (.+)$/);
  const avoid = listAfter('Remember', /^- (.+)$/);
  const speakingSetup = label('Speaking setup');

  // Other English paragraphs (scene safety, lighting, teaching notes) for cutscene writers.
  const notes = [];
  for (const l of L) {
    const t = l.trim();
    if (!t || t.startsWith('|') || t.startsWith('- **') || /^\d+\. /.test(t) || /^- /.test(t)) continue;
    if (/^\*\*(Opening|Must|Remember|Slogan|Speaking setup):\*\*/.test(t)) continue;
    notes.push(t.replace(/^\*\*([^*]+):\*\*\s*/, '$1: '));
  }

  return {
    id: sec.id,
    n: sec.n,
    title: sec.title,
    location: locations[0],
    locations,
    weather,
    time,
    order,
    text: { opening, must, avoid, slogan },
    ...(speakingSetup ? { speakingSetup } : {}),
    planExamples,
    plan: { location: locNote, weather: weatherNote, time: timeNote },
    notes,
    defaulted,
  };
}

export function parseInside(md = readFileSync(PLAN_FILE, 'utf8')) {
  return splitSections(md).map(parseScenario);
}

/** Rows of the "Pre-recorded system lines" table: `| \`id\` | text |`. */
export function parseSystemLines(md = readFileSync(VOICE_FILE, 'utf8')) {
  const start = md.indexOf('## Pre-recorded system lines');
  if (start < 0) fail('no "Pre-recorded system lines" section in Voice_and_AI.md');
  const after = md.slice(start + 1);
  const end = after.search(/\n## /);
  const section = end < 0 ? after : after.slice(0, end);
  const rows = [];
  for (const line of section.split('\n')) {
    const m = /^\| `([a-z_]+)` \| (.+?) \|\s*$/.exec(line);
    if (m) rows.push({ id: m[1], text: m[2].trim() });
  }
  return rows;
}

// ---------------------------------------------------------------- code generation

/** Single-quoted TS string literal. */
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function genScenario(s) {
  const I = '    ';
  const out = [];
  out.push('  {');
  out.push(`${I}id: ${q(s.id)},`);
  out.push(`${I}mode: 'inside',`);
  out.push(`${I}n: ${s.n},`);
  out.push(`${I}title: ${q(s.title)},`);
  out.push(`${I}location: ${q(s.location)},`);
  out.push(`${I}locations: [${s.locations.map(q).join(', ')}],`);
  out.push(`${I}weather: ${s.weather === null ? 'null' : q(s.weather)},${s.defaulted.weather ? ' // no weather in the plan: default' : ''}`);
  out.push(`${I}time: ${q(s.time)},${s.defaulted.time ? ' // no time in the plan: default' : ''}`);
  out.push(`${I}order: [${s.order.map(q).join(', ')}],`);
  out.push(`${I}text: {`);
  out.push(`${I}  opening: ${q(s.text.opening)},`);
  out.push(`${I}  must: [`);
  for (const m of s.text.must) out.push(`${I}    ${q(m)},`);
  out.push(`${I}  ],`);
  out.push(`${I}  avoid: [`);
  for (const a of s.text.avoid) out.push(`${I}    ${q(a)},`);
  out.push(`${I}  ],`);
  out.push(`${I}  slogan: ${q(s.text.slogan)},`);
  out.push(`${I}},`);
  if (s.speakingSetup) out.push(`${I}speakingSetup: ${q(s.speakingSetup)},`);
  out.push(`${I}planExamples: [${s.planExamples.map(q).join(', ')}],`);
  out.push(`${I}plan: { location: ${q(s.plan.location)}, weather: ${s.plan.weather ? q(s.plan.weather) : 'null'}, time: ${s.plan.time ? q(s.plan.time) : 'null'} },`);
  if (s.notes.length) {
    out.push(`${I}notes: [`);
    for (const n of s.notes) out.push(`${I}  ${q(n)},`);
    out.push(`${I}],`);
  } else out.push(`${I}notes: [],`);
  out.push('  },');
  return out.join('\n');
}

export function genPlanBlock(scenarios) {
  return [
    '// <generated:plan> by `node tools/content/inside.mjs` from docs/plan/Inside_scenarios.md. Do not edit by hand.',
    `export type InsideScenarioId =\n${scenarios.map((s) => `  | ${q(s.id)}`).join('\n')};`,
    '',
    'const PLAN: PlanEntry[] = [',
    ...scenarios.map(genScenario),
    '];',
    '// </generated:plan>',
  ].join('\n');
}

const INSIDE_TEMPLATE = (block) => `import type { LocationId } from '../../core/types';
import type { Scenario } from '../types';
// OWNER: content-inside worker. 14 inside scenarios from docs/plan/Inside_scenarios.md.
//
// The PLAN block is generated by \`node tools/content/inside.mjs\` (every Arabic string is cut out of
// the plan programmatically; never edit it by hand). EXTRA below it is hand-written: icon, color,
// extra example questions and matcher keywords per scenario. \`node tools/content/check_inside.mjs\`
// verifies both.

interface PlanEntry extends Omit<Scenario, 'icon' | 'color' | 'examples' | 'keywords' | 'id'> {
  id: InsideScenarioId;
  /** Every location the scenario visits, in order; the first one is \`location\`. */
  locations: LocationId[];
  /** Example questions exactly as the plan lists them. */
  planExamples: string[];
  /** The plan's raw Location / Weather / Time notes (English). */
  plan: { location: string; weather: string | null; time: string | null };
  /** Other English notes from the plan (scene safety, lighting) for cutscene writers. */
  notes: string[];
}

${block}

interface Extra {
  icon: string;
  color: string;
  examples: string[];
  keywords: { word: string; weight: number }[];
}

const EXTRA: Record<InsideScenarioId, Extra> = {} as Record<InsideScenarioId, Extra>; // TODO: icon, color, examples, keywords per id

export const INSIDE_SCENARIOS: Scenario[] = PLAN.map(({ locations: _l, planExamples, plan: _p, notes: _n, ...p }) => {
  const x = EXTRA[p.id];
  return { ...p, icon: x.icon, color: x.color, examples: [...planExamples, ...x.examples], keywords: x.keywords };
});

export const INSIDE_LOCATIONS: Record<InsideScenarioId, LocationId[]> = Object.fromEntries(
  PLAN.map((p) => [p.id, p.locations]),
) as Record<InsideScenarioId, LocationId[]>;

export const INSIDE_PLAN_NOTES: Record<InsideScenarioId, { plan: PlanEntry['plan']; notes: string[] }> = Object.fromEntries(
  PLAN.map((p) => [p.id, { plan: p.plan, notes: p.notes }]),
) as Record<InsideScenarioId, { plan: PlanEntry['plan']; notes: string[] }>;
`;

/**
 * When each system line plays (English, for builders; taken from Voice_and_AI.md, Overview_and_tech.md
 * and Screens_and_UI.md). Not Arabic, so it is written here rather than copied.
 */
export const SYSTEM_WHEN = {
  greet_first: 'First call ever on this device: gender is unknown, so it is plural; gives speech to analyze before any gendered answer.',
  greet_call: 'Start of every later call (call button tapped), once a gender is known.',
  not_heard: 'Nothing usable was heard; say it and listen again once.',
  off_topic: 'Match score below 0.40, a question not about safety or school, or any creative-mode failure; then the intro scenario plays.',
  mic_denied: 'Microphone permission refused or unavailable (plural, gender unknown).',
  offline_creative: 'Creative mode chosen or asked while offline.',
  thinking: 'Creative mode, while waiting for Gemini.',
  mode_outside: 'Outside mode card tapped.',
  mode_inside: 'Inside mode card tapped.',
  mode_short: 'Short answers mode card tapped.',
  mode_creative: 'Creative mode card tapped (online).',
  need_internet_listen: 'Call or mic used on a device that cannot listen offline (iPad without Whisper); points to the scenarios button.',
};

export function genSystemFile(rows) {
  const missing = rows.filter((r) => !SYSTEM_WHEN[r.id]).map((r) => r.id);
  if (missing.length) fail(`SYSTEM_WHEN has no entry for: ${missing.join(', ')}`);
  return `import type { SystemLine } from '../types';
// OWNER: content-inside worker. System lines from docs/plan/Voice_and_AI.md ("Pre-recorded system lines").
// Generated by \`node tools/content/inside.mjs\` (text copied programmatically). Do not edit by hand.
// Voice key for each line: \`sys.<id>\`.
//
// These 12 rows are every line in docs/plan that Alrashed says outside scenarios, short answers and the
// exam. The other plan files were searched: Exam.md's phase question (Flow step 2) and start
// line (Flow step 3) are exam lines (EXAM_LINES.phaseQuestion / .start, voice keys
// \`exam.phase_question\` / \`exam.start\`), and there is no mode line for the exam card (the phase question
// plays instead). Overview_and_tech.md's offline-creative and microphone lines are \`offline_creative\` and
// \`mic_denied\` here.

export type SystemLineId =
${rows.map((r) => `  | ${q(r.id)}`).join('\n')};

export const SYSTEM_LINES: (SystemLine & { id: SystemLineId })[] = [
${rows.map((r) => `  { id: ${q(r.id)}, text: ${q(r.text)} },`).join('\n')}
];

/** When each line plays (English, builders only; never shown or spoken). */
export const SYSTEM_LINE_WHEN: Record<SystemLineId, string> = {
${rows.map((r) => `  ${r.id}: ${q(SYSTEM_WHEN[r.id])},`).join('\n')}
};
`;
}

function main() {
  const args = process.argv.slice(2);
  const scenarios = parseInside();
  const sys = parseSystemLines();
  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify({ scenarios, systemLines: sys }, null, 2) + '\n');
    return;
  }
  for (const s of scenarios) {
    console.log(
      `${String(s.n).padStart(2)} ${s.id.padEnd(18)} ${s.locations.join('>').padEnd(44)} ${String(s.weather).padEnd(6)} ${s.time.padEnd(9)} ${s.order.join(',').padEnd(19)} must ${s.text.must.length} avoid ${s.text.avoid.length} ex ${s.planExamples.length}${s.speakingSetup ? ' setup' : ''}`,
    );
  }
  console.log(`${scenarios.length} scenarios, ${sys.length} system lines: ${sys.map((r) => r.id).join(', ')}`);
  if (args.includes('--dry')) return;

  const block = genPlanBlock(scenarios);
  let ts;
  if (existsSync(INSIDE_TS) && readFileSync(INSIDE_TS, 'utf8').includes('// <generated:plan>')) {
    const cur = readFileSync(INSIDE_TS, 'utf8');
    const a = cur.indexOf('// <generated:plan>');
    const endTag = '// </generated:plan>';
    const b = cur.indexOf(endTag);
    if (b < a) fail('inside.ts: generated markers out of order');
    ts = cur.slice(0, a) + block + cur.slice(b + endTag.length);
  } else {
    ts = INSIDE_TEMPLATE(block);
  }
  writeFileSync(INSIDE_TS, ts);
  writeFileSync(SYSTEM_TS, genSystemFile(sys));
  console.log(`wrote ${INSIDE_TS}\nwrote ${SYSTEM_TS}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
