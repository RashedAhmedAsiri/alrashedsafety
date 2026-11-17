// Online tier: Arabic speech from the free Google Translate TTS web endpoint (unofficial, needs internet).
// Pure helpers only (chunking, url); playback lives in speech.ts.

export const NET_TTS_MAX_CHARS = 180;
export const NET_TTS_ENDPOINT = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q=';

/**
 * Edge neural voice (Microsoft Edge read-aloud, free): served by the Vercel function api/tts.py as MP3.
 * VITE_TTS_URL points a build elsewhere (e.g. a preview hosted off Vercel) at a deployed /api/tts.
 */
export const EDGE_TTS_ENDPOINT: string = (import.meta.env?.VITE_TTS_URL as string | undefined) || '/api/tts';
export const EDGE_TTS_MAX_CHARS = 1400;

export function edgeTtsUrl(text: string): string {
  return `${EDGE_TTS_ENDPOINT}?voice=ar-SA-HamedNeural&text=${encodeURIComponent(text)}`;
}

/** Last online fallback: Amazon Polly's Arabic voice through the free StreamElements endpoint (no key, plain MP3). */
export const SE_TTS_ENDPOINT = 'https://api.streamelements.com/kappa/v2/speech?voice=Zeina&text=';
export const seTtsUrl = (chunk: string): string => SE_TTS_ENDPOINT + encodeURIComponent(chunk);

export function netTtsUrl(chunk: string): string {
  return NET_TTS_ENDPOINT + encodeURIComponent(chunk);
}

/** Split a too-long piece at the last space inside the limit (hard cut when there is none). */
function splitLong(piece: string, max: number): string[] {
  const out: string[] = [];
  let rest = piece.trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.4) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * Split text at sentence boundaries into chunks of at most `max` characters, in order. Short sentences are
 * merged; sentences over the limit are split at commas, then spaces, then hard.
 */
export function chunkText(text: string, max = NET_TTS_MAX_CHARS): string[] {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const sentences = t.match(/[^.!?؟…\n]+[.!?؟…]*/g) ?? [t];
  const pieces: string[] = [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length <= max) {
      pieces.push(s);
      continue;
    }
    const parts = s.match(/[^,،;؛:]+[,،;؛:]*/g) ?? [s];
    let cur = '';
    for (const p of parts) {
      const q = p.trim();
      if (!q) continue;
      if (q.length > max) {
        if (cur) pieces.push(cur);
        cur = '';
        pieces.push(...splitLong(q, max));
      } else if (cur && (cur + ' ' + q).length > max) {
        pieces.push(cur);
        cur = q;
      } else cur = cur ? cur + ' ' + q : q;
    }
    if (cur) pieces.push(cur);
  }
  const out: string[] = [];
  for (const p of pieces) {
    const last = out[out.length - 1];
    if (last !== undefined && (last + ' ' + p).length <= max) out[out.length - 1] = last + ' ' + p;
    else out.push(p);
  }
  return out.filter((c) => /[\p{L}\p{N}]/u.test(c));
}
