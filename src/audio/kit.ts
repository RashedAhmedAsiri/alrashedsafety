// OWNER: ui worker. Small Web Audio toolkit used by the sound recipes (src/audio/recipes.ts).
// Everything is synthesized at runtime: no sound files.

export interface Voice {
  /** Every scheduled source of this voice, so it can be stopped early. */
  sources: AudioScheduledSourceNode[];
  /** Extra cleanup (timers of periodic loops). */
  timers: number[];
}

let noiseWhite: AudioBuffer | null = null;
let noiseBrown: AudioBuffer | null = null;

function makeNoise(ctx: AudioContext, brown: boolean): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 2.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  // Crossfade the loop seam so looping noise never clicks.
  const fade = Math.floor(ctx.sampleRate * 0.02);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
  }
  return buf;
}

/** Synth helpers bound to one voice (all times are seconds relative to `t0`). */
export class Kit {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
  readonly t0: number;
  readonly voice: Voice;

  constructor(ctx: AudioContext, out: AudioNode, t0: number, voice: Voice) {
    this.ctx = ctx;
    this.out = out;
    this.t0 = t0;
    this.voice = voice;
    if (!noiseWhite) noiseWhite = makeNoise(ctx, false);
    if (!noiseBrown) noiseBrown = makeNoise(ctx, true);
  }

  /** A new Kit for the same voice starting at another time (periodic loops). */
  at(t0: number): Kit {
    return new Kit(this.ctx, this.out, t0, this.voice);
  }

  track<T extends AudioScheduledSourceNode>(n: T): T {
    this.voice.sources.push(n);
    // Drop finished sources so long loops do not accumulate references.
    n.onended = () => {
      const i = this.voice.sources.indexOf(n);
      if (i >= 0) this.voice.sources.splice(i, 1);
    };
    return n;
  }

  gain(v = 1, dest: AudioNode = this.out): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = v;
    g.connect(dest);
    return g;
  }

  pan(p: number, dest: AudioNode = this.out): AudioNode {
    if (!this.ctx.createStereoPanner) return dest;
    const s = this.ctx.createStereoPanner();
    s.pan.value = Math.max(-1, Math.min(1, p));
    s.connect(dest);
    return s;
  }

  filter(type: BiquadFilterType, f: number, q = 0.7, dest: AudioNode = this.out): BiquadFilterNode {
    const b = this.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    b.connect(dest);
    return b;
  }

  /**
   * Percussive envelope on a fresh gain node: 0 → peak in `a` s, exponential decay to silence at `dur`.
   */
  env(t: number, dur: number, peak: number, a = 0.005, dest: AudioNode = this.out): GainNode {
    const g = this.ctx.createGain();
    const T = this.t0 + t;
    g.gain.setValueAtTime(0, T);
    g.gain.linearRampToValueAtTime(peak, T + a);
    g.gain.exponentialRampToValueAtTime(0.0001, T + Math.max(a + 0.01, dur));
    g.connect(dest);
    return g;
  }

  /** Attack / hold / release envelope (linear). */
  ahr(t: number, a: number, hold: number, r: number, peak: number, dest: AudioNode = this.out): GainNode {
    const g = this.ctx.createGain();
    const T = this.t0 + t;
    g.gain.setValueAtTime(0, T);
    g.gain.linearRampToValueAtTime(peak, T + a);
    g.gain.setValueAtTime(peak, T + a + hold);
    g.gain.linearRampToValueAtTime(0, T + a + hold + r);
    g.connect(dest);
    return g;
  }

  osc(
    type: OscillatorType,
    f: number,
    t: number,
    dur: number,
    dest: AudioNode,
    opts: { f2?: number; glide?: number; detune?: number; lin?: boolean } = {},
  ): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    const T = this.t0 + t;
    o.frequency.setValueAtTime(f, T);
    if (opts.f2 != null) {
      const end = T + (opts.glide ?? dur);
      if (opts.lin) o.frequency.linearRampToValueAtTime(opts.f2, end);
      else o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.f2), end);
    }
    if (opts.detune) o.detune.value = opts.detune;
    o.connect(dest);
    o.start(T);
    if (Number.isFinite(dur)) o.stop(T + dur + 0.05);
    return this.track(o);
  }

  /** Simple tone with a percussive envelope. */
  tone(f: number, t: number, dur: number, peak: number, type: OscillatorType = 'sine', opts: { f2?: number; glide?: number; a?: number; dest?: AudioNode } = {}) {
    const g = this.env(t, dur, peak, opts.a ?? 0.005, opts.dest ?? this.out);
    return this.osc(type, f, t, dur, g, { f2: opts.f2, glide: opts.glide });
  }

  /** Bell / marimba-like note: fundamental plus soft inharmonic partials. */
  bell(f: number, t: number, dur: number, peak: number, dest: AudioNode = this.out, bright = 1) {
    this.tone(f, t, dur, peak, 'sine', { dest });
    this.tone(f * 2.0, t, dur * 0.55, peak * 0.32 * bright, 'sine', { dest });
    this.tone(f * 3.01, t, dur * 0.3, peak * 0.14 * bright, 'sine', { dest });
    this.tone(f * 4.17, t, dur * 0.18, peak * 0.07 * bright, 'sine', { dest });
  }

  /** Noise source (white or brown) running from t for dur seconds into dest. */
  noise(t: number, dur: number, dest: AudioNode, brown = false, rate = 1): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = brown ? noiseBrown : noiseWhite;
    s.loop = true;
    s.playbackRate.value = rate;
    const T = this.t0 + t;
    s.connect(dest);
    s.start(T, Math.random() * 2);
    if (Number.isFinite(dur)) s.stop(T + dur + 0.05);
    return this.track(s);
  }

  /** Filtered noise burst with a percussive envelope. */
  burst(t: number, dur: number, peak: number, type: BiquadFilterType, f: number, q = 1, opts: { f2?: number; a?: number; brown?: boolean; dest?: AudioNode } = {}) {
    const g = this.env(t, dur, peak, opts.a ?? 0.003, opts.dest ?? this.out);
    const b = this.filter(type, f, q, g);
    if (opts.f2 != null) b.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f2), this.t0 + t + dur);
    this.noise(t, dur, b, opts.brown);
    return b;
  }

  /** Low-frequency oscillator modulating an AudioParam: param += depth * sin(2π rate t). Runs until stopped. */
  lfo(param: AudioParam, rate: number, depth: number, t = 0, type: OscillatorType = 'sine', dur = Infinity) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(param);
    const T = this.t0 + t;
    o.start(T);
    if (Number.isFinite(dur)) o.stop(T + dur + 0.05);
    return this.track(o);
  }

  /** Repeats `fn(kitAtTime)` forever with a gap from `gap()` seconds (lookahead scheduler). */
  repeat(fn: (k: Kit, i: number) => void, gap: () => number, firstAt = 0) {
    let next = this.t0 + firstAt;
    let i = 0;
    const tick = () => {
      const now = this.ctx.currentTime;
      // Never pile up a backlog after the tab was hidden.
      if (next < now - 0.5) next = now + 0.05;
      while (next < now + 0.6) {
        fn(this.at(next), i++);
        next += Math.max(0.05, gap());
      }
    };
    tick();
    this.voice.timers.push(window.setInterval(tick, 200));
  }
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
