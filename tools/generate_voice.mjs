#!/usr/bin/env node
// Records every spoken line with Azure Neural TTS (ar-SA-HamedNeural). See docs/voice.md.
//   node tools/generate_voice.mjs --dry          counts, characters, sample SSML (no network)
//   node tools/generate_voice.mjs --dump=lines.json   writes the job list for tools/generate_voice_edge.py (no network)
//   AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=... node tools/generate_voice.mjs [--force] [--only=prefix]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/audio/voice');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const dry = flag('dry');
const force = flag('force');
const only = opt('only');

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  plugins: [],
});
let lines, renderGender, toSsml, plainForVoice;
try {
  ({ allVoiceLines: lines } = await server.ssrLoadModule('/src/content/voiceLines.ts'));
  ({ renderGender } = await server.ssrLoadModule('/src/core/gender.ts'));
  ({ toSsml, plainForVoice } = await server.ssrLoadModule('/src/voice/ssml.ts'));
} catch (e) {
  console.error('Could not load content:', e);
  await server.close();
  process.exit(1);
}
await server.close();

const jobs = [];
for (const l of lines()) {
  if (only && !l.key.startsWith(only)) continue;
  const variants = l.gendered ? [['b', 'boy'], ['g', 'girl']] : [['b', 'boy']];
  for (const [v, g] of variants) {
    const text = renderGender(l.text, g);
    jobs.push({ key: l.key, v, text, spoken: plainForVoice(text), ssml: toSsml(text) });
  }
}
const chars = jobs.reduce((n, j) => n + j.text.length, 0);
console.log(`lines: ${new Set(jobs.map((j) => j.key)).size}, files: ${jobs.length}, characters: ${chars} (Azure free tier: 500,000 per month)`);

const dump = opt('dump');
if (dump) {
  fs.writeFileSync(dump, JSON.stringify(jobs.map(({ key, v, text, spoken }) => ({ key, v, text, spoken })), null, 1));
  console.log(`wrote ${jobs.length} jobs to ${dump}`);
  process.exit(0);
}

if (dry) {
  for (const j of jobs.slice(0, 3)) console.log(`\n# ${j.key}.${j.v}\n${j.ssml}`);
  if (!jobs.length) console.log('(content is empty so far)');
  process.exit(0);
}

const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
if (!key || !region) {
  console.error('Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first (see docs/voice.md).');
  process.exit(1);
}
const sdk = await import('microsoft-cognitiveservices-speech-sdk');
fs.mkdirSync(outDir, { recursive: true });

function synth(ssml) {
  return new Promise((resolve, reject) => {
    const cfg = sdk.SpeechConfig.fromSubscription(key, region);
    cfg.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
    const synthesizer = new sdk.SpeechSynthesizer(cfg, null);
    const visemes = [];
    synthesizer.visemeReceived = (_s, e) => visemes.push([Math.round(e.audioOffset / 10000), e.visemeId]);
    synthesizer.speakSsmlAsync(
      ssml,
      (r) => {
        synthesizer.close();
        if (r.reason === sdk.ResultReason.SynthesizingAudioCompleted) resolve({ audio: Buffer.from(r.audioData), visemes });
        else reject(new Error(r.errorDetails || 'synthesis failed'));
      },
      (err) => {
        synthesizer.close();
        reject(new Error(String(err)));
      },
    );
  });
}

const manifestPath = path.join(outDir, 'manifest.json');
const manifest = { version: 1, keys: {} };
let made = 0, skipped = 0, failed = 0;
for (const j of jobs) {
  const mp3 = path.join(outDir, `${j.key}.${j.v}.mp3`);
  const json = path.join(outDir, `${j.key}.${j.v}.json`);
  if (!force && fs.existsSync(mp3) && fs.existsSync(json)) {
    skipped++;
  } else {
    try {
      const { audio, visemes } = await synth(j.ssml);
      fs.writeFileSync(mp3, audio);
      fs.writeFileSync(json, JSON.stringify(visemes));
      made++;
      console.log(`ok ${j.key}.${j.v}`);
    } catch (e) {
      failed++;
      console.error(`FAILED ${j.key}.${j.v}: ${e.message}`);
      continue;
    }
  }
  (manifest.keys[j.key] ||= []).push(j.v);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log(`done: ${made} made, ${skipped} skipped, ${failed} failed; manifest lists ${Object.keys(manifest.keys).length} keys`);
process.exit(failed ? 2 : 0);
