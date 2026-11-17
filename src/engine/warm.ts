import { warmUpMatcher } from '../match';

let warmed = false;

/** Start loading the matcher's meaning model in the background, once (after the menu appears). */
export function warmMatcher() {
  if (warmed) return;
  warmed = true;
  try {
    warmUpMatcher();
  } catch (e) {
    console.error('[engine] warmUpMatcher', e);
  }
}
