// Web Worker: multilingual-e5-small feature extraction (quantized). Loaded lazily; the model downloads on first use.
const ctx = self as unknown as {
  onmessage: ((ev: MessageEvent) => void) | null;
  postMessage: (m: unknown) => void;
};

let extractor: Promise<(texts: string[], opts: Record<string, unknown>) => Promise<{ tolist(): number[][] }>> | null = null;

function load() {
  extractor ??= import('@huggingface/transformers').then(async (tf) => {
    tf.env.allowLocalModels = false;
    const p = await tf.pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8' } as never);
    return p as never;
  });
  return extractor;
}

ctx.onmessage = async (ev: MessageEvent) => {
  const { id, texts } = ev.data as { id: number; texts: string[] };
  try {
    const run = await load();
    // e5 needs the `query: ` prefix on every text (symmetric similarity).
    const out = await run(texts.map((t) => `query: ${t}`), { pooling: 'mean', normalize: true });
    ctx.postMessage({ id, vectors: out.tolist() });
  } catch (e) {
    extractor = null;
    ctx.postMessage({ id, error: String(e) });
  }
};
