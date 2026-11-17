// OWNER: voice worker. Text -> SSML for Azure Neural TTS (used by tools/generate_voice.mjs and,
// later, the creative-mode Worker). Pure functions, no DOM; covered by ssml.test.ts.

export const VOICE_NAME = 'ar-SA-HamedNeural';
export const VOICE_RATE = 0.92;
export const VOICE_PITCH = '+6%';
/** Pause between slogan words written as `..` in the text. */
export const SLOGAN_BREAK_MS = 250;

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * Clean a rendered (no `{boy/girl}` markup) line for the voice: drop `!`, leading list numbers
 * («1.», «٢-», «3)») and stray whitespace. `..` is kept as a marker for slogan pauses.
 */
export function cleanForVoice(text: string): string {
  return text
    .replace(/[!！]/g, '')
    .replace(/(^|\n)\s*[0-9٠-٩]+\s*[.)\-–]\s+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The inner text of the prosody element: escaped, with `..` turned into SSML breaks. */
export function ssmlBody(text: string): string {
  const parts = cleanForVoice(text)
    .split(/\s*\.\.+\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(escapeXml);
  return parts.join(` <break time="${SLOGAN_BREAK_MS}ms"/> `);
}

/** Full SSML document for one line (text already rendered for one gender). */
export function toSsml(text: string, o: { voice?: string; rate?: number; pitch?: string } = {}): string {
  const voice = o.voice ?? VOICE_NAME;
  const rate = o.rate ?? VOICE_RATE;
  const pitch = o.pitch ?? VOICE_PITCH;
  return (
    `<speak version="1.0" xml:lang="ar-SA" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts">` +
    `<voice name="${voice}"><prosody rate="${rate}" pitch="${pitch}">${ssmlBody(text)}</prosody></voice></speak>`
  );
}

/** Plain text a browser voice should read (no `..`, no `!`). */
export function plainForVoice(text: string): string {
  return cleanForVoice(text).replace(/\s*\.\.+\s*/g, '، ').replace(/،\s*$/, '').trim();
}
