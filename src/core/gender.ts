import type { Gender } from './types';

/**
 * Expand `{boy/girl}` markup. Text outside braces is shared. Arabic never contains '/',
 * so the markup is unambiguous. Examples:
 *   renderGender('يَا {بَطَلُ/بَطَلَةُ}', 'girl') -> 'يَا بَطَلَةُ'
 *   renderGender('أَنْ{تَ/تِ}', 'boy') -> 'أَنْتَ'
 */
export function renderGender(text: string, gender: Gender): string {
  return text.replace(/\{([^{}/]*)\/([^{}]*)\}/g, (_m, boy: string, girl: string) => (gender === 'boy' ? boy : girl));
}

/** True when the text has any gender markup (needs two recordings). */
export const hasGenderMarkup = (text: string) => /\{[^{}/]*\/[^{}]*\}/.test(text);
