// The searchable corpus, built from src/content. Shared by the matcher, the tests and tools/build_index.mjs.
import { ALL_SCENARIOS, SHORT_ANSWERS } from '../content';

export type ItemKind = 'scenario' | 'short' | 'intro';
export type ItemList = 'outside' | 'inside' | 'short' | 'intro';

export interface CorpusItem {
  /** Unique key `${kind}:${id}` (a few ids exist both as scenario and short answer). */
  key: string;
  kind: ItemKind;
  id: string;
  list: ItemList;
  /** Example questions, asks, and the title or chip (raw text, not normalised). */
  texts: string[];
  keywords: { word: string; weight: number }[];
}

let cached: CorpusItem[] | null = null;

export function getCorpus(): CorpusItem[] {
  if (cached) return cached;
  const items: CorpusItem[] = [];
  for (const s of ALL_SCENARIOS) {
    const kind: ItemKind = s.id === 'intro' ? 'intro' : 'scenario';
    items.push({
      key: `${kind}:${s.id}`,
      kind,
      id: s.id,
      list: s.id === 'intro' ? 'intro' : s.mode === 'inside' ? 'inside' : 'outside',
      texts: [...s.examples, s.title],
      keywords: s.keywords,
    });
  }
  for (const a of SHORT_ANSWERS) {
    items.push({ key: `short:${a.id}`, kind: 'short', id: a.id, list: 'short', texts: [...a.asks, a.chip], keywords: a.keywords });
  }
  cached = items;
  return items;
}

/** Drop the cached corpus (tests). */
export function resetCorpus(): void {
  cached = null;
}

/** Version of the embedding text recipe. Bump when the way texts are prepared changes. */
export const EMBED_RECIPE = 'v1';
export const EMBED_MODEL = 'Xenova/multilingual-e5-small';

/** FNV-1a hash (hex) of every text that gets embedded, so a cached embedding file or IndexedDB entry is only used for the same content. */
export function corpusHash(items: CorpusItem[] = getCorpus(), prepare: (t: string) => string = (t) => t): string {
  let h = 0x811c9dc5;
  const feed = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= 0x7c;
    h = Math.imul(h, 0x01000193) >>> 0;
  };
  feed(`${EMBED_MODEL}|${EMBED_RECIPE}`);
  for (const it of items) {
    feed(it.key);
    for (const t of it.texts) feed(prepare(t));
  }
  return h.toString(16).padStart(8, '0');
}
