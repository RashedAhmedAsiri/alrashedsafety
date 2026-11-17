/**
 * Small helpers for abortable async steps. Every wait in the engine and in cutscenes rejects with a
 * DOMException named 'AbortError' when its signal aborts.
 */

export function abortError(): Error {
  if (typeof DOMException !== 'undefined') return new DOMException('Aborted', 'AbortError');
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

export const isAbort = (e: unknown): boolean => !!e && typeof e === 'object' && (e as { name?: unknown }).name === 'AbortError';

/** Throws an AbortError when the signal is already aborted. */
export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

/**
 * A promise settled by `register(resolve, reject)` that also rejects with an AbortError when the
 * signal aborts. `register` may return a cleanup function, called once the promise settles.
 */
export function abortable<T = void>(
  signal: AbortSignal | undefined,
  register: (resolve: (v: T) => void, reject: (e: unknown) => void) => (() => void) | void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    let done = false;
    let cleanup: (() => void) | void;
    const finish = () => {
      done = true;
      signal?.removeEventListener('abort', onAbort);
      if (cleanup) {
        try {
          cleanup();
        } catch {
          /* ignore */
        }
      }
    };
    const onAbort = () => {
      if (done) return;
      finish();
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    cleanup = register(
      (v) => {
        if (done) return;
        finish();
        resolve(v);
      },
      (e) => {
        if (done) return;
        finish();
        reject(e);
      },
    );
    if (done && cleanup) cleanup();
  });
}

/** setTimeout as an abortable promise. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return abortable<void>(signal, (resolve) => {
    const t = setTimeout(() => resolve(), Math.max(0, ms));
    return () => clearTimeout(t);
  });
}

/** A controller that aborts when `parent` aborts (and can be aborted on its own). */
export function childController(parent: AbortSignal): AbortController {
  const c = new AbortController();
  if (parent.aborted) c.abort();
  else {
    const on = () => c.abort();
    parent.addEventListener('abort', on, { once: true });
    c.signal.addEventListener('abort', () => parent.removeEventListener('abort', on), { once: true });
  }
  return c;
}

/** Next animation tick: requestAnimationFrame when the page is visible, else a timer (hidden tabs). */
export function tick(cb: () => void): () => void {
  const visible = typeof document === 'undefined' ? false : document.visibilityState === 'visible';
  if (visible && typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(() => cb());
    return () => cancelAnimationFrame(id);
  }
  const t = setTimeout(cb, 16);
  return () => clearTimeout(t);
}

/**
 * Run `fn(t)` with t going 0 → 1 over `ms` (time based, so slow frames do not stretch it).
 * Resolves after calling fn(1). Rejects with AbortError on abort (fn is not called again).
 */
export function animate(ms: number, fn: (t: number) => void, signal?: AbortSignal, now: () => number = defaultNow): Promise<void> {
  return abortable<void>(signal, (resolve) => {
    const t0 = now();
    let cancel: () => void = () => {};
    const step = () => {
      const t = ms <= 0 ? 1 : Math.min(1, (now() - t0) / ms);
      fn(t);
      if (t >= 1) resolve();
      else cancel = tick(step);
    };
    step();
    return () => cancel();
  });
}

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export type EaseName = 'linear' | 'inOut' | 'in' | 'out';

export function ease(kind: EaseName | undefined, t: number): number {
  const x = Math.min(1, Math.max(0, t));
  switch (kind) {
    case 'linear':
      return x;
    case 'in':
      return x * x * x;
    case 'out':
      return 1 - (1 - x) ** 3;
    case 'inOut':
    default:
      return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  }
}
