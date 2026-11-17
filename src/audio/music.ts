// OWNER: ui worker. The gentle looping menu tune: a marimba melody over a soft bass and plucked chords,
// scheduled with a small lookahead sequencer (no audio files).
import { midi } from './kit';

const BPM = 92;
const STEP = 60 / BPM / 2; // eighth note
const BAR_STEPS = 8;

// 8 bars, I–vi–IV–V twice (C, Am, F, G). 0 = rest. MIDI note numbers.
const MELODY: number[][] = [
  [76, 0, 79, 0, 76, 74, 72, 0],
  [69, 0, 72, 0, 76, 0, 74, 0],
  [77, 0, 81, 0, 79, 77, 76, 0],
  [74, 0, 79, 0, 77, 0, 74, 0],
  [76, 79, 84, 0, 83, 0, 79, 0],
  [81, 0, 79, 76, 72, 0, 76, 0],
  [77, 0, 76, 0, 74, 0, 72, 0],
  [74, 0, 0, 0, 67, 0, 71, 0],
];
const CHORDS: number[][] = [
  [60, 64, 67],
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
];
const BASS = [36, 33, 29, 31];

export class MenuMusic {
  private ctx: AudioContext;
  private out: GainNode;
  private timer = 0;
  private step = 0;
  private next = 0;
  private sources = new Set<AudioScheduledSourceNode>();

  constructor(ctx: AudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 1;
    // Soften everything a little.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    this.out.connect(lp).connect(dest);
  }

  get running() {
    return this.timer !== 0;
  }

  start() {
    if (this.timer) return;
    this.step = 0;
    this.next = this.ctx.currentTime + 0.12;
    this.timer = window.setInterval(() => this.tick(), 100);
    this.tick();
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
    const now = this.ctx.currentTime;
    for (const s of this.sources) {
      try {
        s.stop(now + 0.6);
      } catch {
        /* already stopped */
      }
    }
  }

  private tick() {
    const now = this.ctx.currentTime;
    if (this.next < now - 0.3) this.next = now + 0.05;
    while (this.next < now + 0.35) {
      this.schedule(this.step, this.next);
      this.step = (this.step + 1) % (MELODY.length * BAR_STEPS);
      this.next += STEP;
    }
  }

  private note(type: OscillatorType, f: number, t: number, dur: number, peak: number, attack = 0.006) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.05);
    this.sources.add(o);
    o.onended = () => this.sources.delete(o);
  }

  private schedule(step: number, t: number) {
    const bar = Math.floor(step / BAR_STEPS);
    const s = step % BAR_STEPS;
    const n = MELODY[bar][s];
    if (n) {
      // Marimba: sine + quick 4th harmonic.
      this.note('sine', midi(n), t, 0.55, 0.16);
      this.note('sine', midi(n) * 4, t, 0.08, 0.025);
    }
    const chord = CHORDS[bar % 4];
    if (s === 0 || s === 4) this.note('triangle', midi(BASS[bar % 4]), t, STEP * 3.6, 0.2, 0.02);
    if (s === 2 || s === 6) for (const c of chord) this.note('triangle', midi(c), t, 0.32, 0.035, 0.01);
  }
}
