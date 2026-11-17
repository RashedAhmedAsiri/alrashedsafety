#!/usr/bin/env node
// Builds public/match/embeddings.json (meaning-model vectors for every example question).
// Needs network once (downloads Xenova/multilingual-e5-small from Hugging Face). Without it the app still works:
// it falls back to the keyword score, or the browser computes the vectors itself and caches them in IndexedDB.
//   node tools/build_index.mjs           build the file
//   node tools/build_index.mjs --check   print corpus stats and the content hash only (offline)
import { build } from 'esbuild';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'match-'));
const entry = join(tmp, 'entry.ts');
writeFileSync(
  entry,
  `export { getCorpus, corpusHash } from ${JSON.stringify(join(root, 'src/match/corpus.ts'))};
export { embedText, packVector } from ${JSON.stringify(join(root, 'src/match/embedder.ts'))};`,
);
const out = join(tmp, 'entry.mjs');
await build({ entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', define: { 'import.meta.env': '{}' } });
const { getCorpus, corpusHash, embedText, packVector } = await import(pathToFileURL(out).href);

const items = getCorpus();
const hash = corpusHash(items, embedText);
const nTexts = items.reduce((n, i) => n + i.texts.length, 0);
console.log(`corpus: ${items.length} items, ${nTexts} texts, hash ${hash}`);
if (process.argv.includes('--check')) process.exit(0);

let pipeline;
try {
  ({ pipeline } = await import('@huggingface/transformers'));
} catch (e) {
  console.error('Cannot load @huggingface/transformers:', e.message);
  process.exit(1);
}
let extractor;
try {
  extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8' });
} catch (e) {
  console.error('Could not download the model (no network or Hugging Face blocked). Nothing written; the app uses the keyword score.\n', e.message);
  process.exit(1);
}
const flat = [];
for (const it of items) for (const t of it.texts) flat.push({ key: it.key, text: embedText(t) });
const file = { version: 1, hash, model: 'multilingual-e5-small', items: {} };
const all = [];
for (let i = 0; i < flat.length; i += 32) {
  const part = flat.slice(i, i + 32);
  const res = await extractor(part.map((p) => `query: ${p.text}`), { pooling: 'mean', normalize: true });
  const rows = res.tolist();
  part.forEach((p, j) => {
    const v = Float32Array.from(rows[j]);
    (file.items[p.key] ??= []).push(packVector(v));
    all.push({ key: p.key, v });
  });
  process.stdout.write(`\r${Math.min(i + 32, flat.length)}/${flat.length}`);
}
console.log();
// Calibration hint: how similar are texts of different items (should sit below MEANING_LO in src/match/embedder.ts).
let max = 0, sum = 0, n = 0;
for (let i = 0; i < all.length; i += 7) for (let j = i + 1; j < all.length; j += 11) {
  if (all[i].key === all[j].key) continue;
  let d = 0;
  for (let k = 0; k < all[i].v.length; k++) d += all[i].v[k] * all[j].v[k];
  sum += d; n++; if (d > max) max = d;
}
console.log(`cross-item cosine: mean ${(sum / n).toFixed(3)}, max ${max.toFixed(3)} (MEANING_LO is 0.80, MEANING_HI 0.94)`);
mkdirSync(join(root, 'public/match'), { recursive: true });
writeFileSync(join(root, 'public/match/embeddings.json'), JSON.stringify(file));
console.log('wrote public/match/embeddings.json');
