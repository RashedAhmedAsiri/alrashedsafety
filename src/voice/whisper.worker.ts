/// <reference lib="webworker" />
// OWNER: voice worker. Offline / Firefox speech recognition with Whisper (transformers.js), lazy-loaded.
// Messages in:  { type: 'load' } | { type: 'transcribe', id, audio: Float32Array (16 kHz mono) }
// Messages out: { type: 'progress', loaded, total } | { type: 'ready' } | { type: 'result', id, text } | { type: 'error', id?, message }

import { env, pipeline } from '@huggingface/transformers';

export const WHISPER_MODEL = 'onnx-community/whisper-base';

type Asr = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string } | { text: string }[]>;
let asrP: Promise<Asr> | null = null;

env.allowLocalModels = false;
env.useBrowserCache = true;

function load(): Promise<Asr> {
  if (!asrP) {
    asrP = (pipeline as unknown as (task: string, model: string, opts: Record<string, unknown>) => Promise<Asr>)(
      'automatic-speech-recognition',
      WHISPER_MODEL,
      {
        dtype: { encoder_model: 'fp32', decoder_model_merged: 'q8' },
        device: 'wasm',
        progress_callback: (p: { status?: string; loaded?: number; total?: number }) => {
          if (p?.status === 'progress') postMessage({ type: 'progress', loaded: p.loaded ?? 0, total: p.total ?? 0 });
        },
      },
    );
    asrP.catch(() => {
      asrP = null;
    });
  }
  return asrP;
}

self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data as { type: string; id?: number; audio?: Float32Array };
  try {
    if (msg.type === 'load') {
      await load();
      postMessage({ type: 'ready' });
    } else if (msg.type === 'transcribe' && msg.audio) {
      const asr = await load();
      const out = await asr(msg.audio, { language: 'arabic', task: 'transcribe', chunk_length_s: 30, return_timestamps: false });
      const text = (Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text) ?? '';
      postMessage({ type: 'result', id: msg.id, text: text.trim() });
    }
  } catch (e) {
    postMessage({ type: 'error', id: msg.id, message: String((e as Error)?.message ?? e) });
  }
};
