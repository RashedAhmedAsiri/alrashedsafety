// OWNER: ui worker. One synthesized recipe per SfxName (except menuMusic, see music.ts).
// Soft, short and friendly: everything is low-passed, nothing harsh, peaks stay well under 1.
import type { SfxName } from '../core/types';
import { Kit, midi, rand } from './kit';

export interface Recipe {
  /** Plays once and returns its length in seconds. */
  once?: (k: Kit) => number;
  /** Continuous sound that runs until stopped (rain, wind, engines...). */
  loop?: (k: Kit) => void;
  /** For `once` recipes played with loop: seconds between repeats (default: length + 0.15). */
  period?: () => number;
  /** When a `loop`-only recipe is played without loop: how long it sounds (s). */
  onceFor?: number;
}

const R: Partial<Record<SfxName, Recipe>> = {};

// ---------------------------------------------------------------- UI
R.pop = {
  once: (k) => {
    k.tone(720, 0, 0.11, 0.42, 'sine', { f2: 260, glide: 0.09, a: 0.002 });
    k.tone(1440, 0, 0.05, 0.08, 'triangle', { f2: 600, glide: 0.04, a: 0.001 });
    return 0.13;
  },
};

R.click = {
  once: (k) => {
    k.burst(0, 0.03, 0.18, 'bandpass', 3200, 2);
    k.tone(1900, 0, 0.025, 0.08, 'triangle');
    return 0.05;
  },
};

R.slide = {
  once: (k) => {
    k.burst(0, 0.28, 0.16, 'bandpass', 500, 1.4, { f2: 2400, a: 0.06 });
    k.tone(320, 0, 0.26, 0.07, 'sine', { f2: 640, a: 0.05 });
    return 0.3;
  },
};

R.whoosh = {
  once: (k) => {
    const g = k.ahr(0, 0.18, 0.04, 0.3, 0.3);
    const b = k.filter('bandpass', 300, 1.1, g);
    b.frequency.setValueAtTime(300, k.t0);
    b.frequency.exponentialRampToValueAtTime(2600, k.t0 + 0.22);
    b.frequency.exponentialRampToValueAtTime(700, k.t0 + 0.52);
    k.noise(0, 0.55, b);
    return 0.55;
  },
};

R.ring = {
  // A soft "ding-ding … ding-ding" phone chime.
  once: (k) => {
    const out = k.filter('lowpass', 5000, 0.7);
    for (const base of [0, 0.62]) {
      k.bell(midi(84), base, 0.5, 0.2, out);
      k.bell(midi(88), base + 0.16, 0.6, 0.2, out);
    }
    return 1.35;
  },
  period: () => 2.2,
};

R.listenStart = {
  once: (k) => {
    k.bell(midi(79), 0, 0.35, 0.18);
    k.bell(midi(86), 0.09, 0.45, 0.2);
    return 0.55;
  },
};

R.listenStop = {
  once: (k) => {
    k.bell(midi(86), 0, 0.3, 0.16);
    k.bell(midi(79), 0.09, 0.45, 0.17);
    return 0.55;
  },
};

R.chime = {
  once: (k) => {
    [72, 76, 79, 84].forEach((n, i) => k.bell(midi(n + 12), i * 0.07, 0.7, 0.13));
    return 1.0;
  },
};

R.ding = {
  once: (k) => {
    k.bell(midi(88), 0, 1.1, 0.24);
    return 1.1;
  },
};

R.beep = {
  once: (k) => {
    k.tone(880, 0, 0.18, 0.16, 'sine', { a: 0.01 });
    return 0.2;
  },
  period: () => 0.6,
};

R.confetti = {
  once: (k) => {
    k.burst(0, 0.12, 0.35, 'bandpass', 1400, 0.9);
    k.tone(220, 0, 0.12, 0.25, 'sine', { f2: 90 });
    for (let i = 0; i < 14; i++) k.tone(rand(2400, 5200), 0.06 + i * rand(0.025, 0.05), 0.09, 0.05, 'sine');
    return 0.8;
  },
};

R.drumroll = {
  once: (k) => {
    const n = 44;
    for (let i = 0; i < n; i++) {
      const t = i * 0.045;
      const v = 0.05 + 0.17 * (i / n);
      k.burst(t, 0.06, v, 'bandpass', 2200, 0.8);
      k.tone(190, t, 0.05, v * 0.5, 'triangle', { f2: 150 });
    }
    const end = n * 0.045 + 0.02;
    k.burst(end, 1.2, 0.2, 'highpass', 5000, 0.5);
    k.tone(110, end, 0.4, 0.4, 'sine', { f2: 60 });
    return end + 1.2;
  },
};

R.powerDown = {
  once: (k) => {
    const lp = k.filter('lowpass', 2400, 1);
    lp.frequency.exponentialRampToValueAtTime(120, k.t0 + 0.9);
    const g = k.ahr(0, 0.02, 0.6, 0.35, 0.22, lp);
    const o = k.osc('sawtooth', 560, 0, 0.95, g, { f2: 50 });
    k.lfo(o.frequency, 14, 18, 0, 'sine', 0.95);
    return 1.0;
  },
};

R.powerUp = {
  once: (k) => {
    const lp = k.filter('lowpass', 300, 1);
    lp.frequency.exponentialRampToValueAtTime(3500, k.t0 + 0.7);
    const g = k.ahr(0, 0.05, 0.5, 0.2, 0.16, lp);
    k.osc('sawtooth', 90, 0, 0.75, g, { f2: 720 });
    k.bell(midi(91), 0.72, 0.6, 0.14);
    return 1.3;
  },
};

R.servo = {
  once: (k) => {
    const d = rand(0.22, 0.34);
    const lp = k.filter('lowpass', 1100, 2);
    const g = k.ahr(0, 0.03, d - 0.08, 0.06, 0.07, lp);
    const o = k.osc('sawtooth', rand(170, 210), 0, d, g, { f2: rand(240, 290) });
    k.lfo(o.frequency, 38, 6, 0, 'sine', d);
    k.burst(0, d, 0.02, 'bandpass', 2800, 3);
    return d;
  },
};

// ---------------------------------------------------------------- people and objects
R.footsteps = {
  once: (k) => {
    for (const [t, p] of [
      [0, 1],
      [0.36, 0.86],
    ] as const) {
      k.burst(t, 0.09, 0.2, 'lowpass', 900 * p, 0.8, { brown: false });
      k.tone(95 * p, t, 0.08, 0.18, 'sine', { f2: 55 });
    }
    return 0.72;
  },
  period: () => 0.72,
};

R.thud = {
  once: (k) => {
    k.tone(110, 0, 0.32, 0.5, 'sine', { f2: 42 });
    k.burst(0, 0.16, 0.25, 'lowpass', 600, 0.7, { brown: true });
    return 0.35;
  },
};

R.bounce = {
  once: (k) => {
    k.tone(150, 0, 0.16, 0.45, 'sine', { f2: 62, glide: 0.12 });
    k.burst(0, 0.05, 0.14, 'bandpass', 1000, 1);
    return 0.18;
  },
  period: () => 0.55,
};

R.clap = {
  once: (k) => {
    for (let i = 0; i < 4; i++) {
      const t = i * 0.3 + rand(-0.01, 0.01);
      k.burst(t, 0.07, 0.3, 'bandpass', rand(1100, 1500), 1.2);
      k.burst(t + 0.008, 0.05, 0.12, 'highpass', 2500, 0.7);
    }
    return 1.2;
  },
};

R.cheer = {
  once: (k) => {
    const dur = 2.2;
    const env = k.ctx.createGain();
    const T = k.t0;
    env.gain.setValueAtTime(0, T);
    env.gain.linearRampToValueAtTime(0.32, T + 0.35);
    env.gain.setValueAtTime(0.32, T + 1.1);
    env.gain.linearRampToValueAtTime(0, T + dur);
    env.connect(k.out);
    // Bright crowd "yaaay": a few vowel voices plus breathy noise through vowel formants.
    for (const f of [700, 1150, 2500]) k.noise(0, dur, k.filter('bandpass', f, 3.5, env));
    for (let i = 0; i < 7; i++) {
      const g = k.gain(0.035, k.filter('bandpass', rand(700, 1100), 2, env));
      const o = k.osc('sawtooth', rand(260, 420), rand(0, 0.25), dur, g, { f2: rand(300, 520), glide: 0.6 });
      k.lfo(o.frequency, rand(5, 7), rand(6, 14), 0, 'sine', dur);
    }
    return dur;
  },
};

R.laugh = {
  // Light kid giggle "ha-ha-ha-ha".
  once: (k) => {
    const n = 5;
    const out = k.filter('bandpass', 1000, 1.2);
    for (let i = 0; i < n; i++) {
      const t = i * 0.13;
      const f0 = 420 - i * 22;
      const g = k.env(t, 0.11, 0.2, 0.012, out);
      k.osc('sawtooth', f0, t, 0.11, g, { f2: f0 * 0.9 });
      k.burst(t, 0.05, 0.05, 'highpass', 3000, 0.7);
    }
    return n * 0.13 + 0.1;
  },
};

R.cough = {
  once: (k) => {
    for (const t of [0, 0.3]) {
      const g = k.env(t, 0.2, 0.32, 0.008);
      k.noise(t, 0.2, k.filter('bandpass', 520, 1.4, g));
      k.noise(t, 0.12, k.filter('bandpass', 1600, 2, k.gain(0.5, g)));
    }
    return 0.55;
  },
};

R.whistle = {
  once: (k) => {
    const g = k.ahr(0, 0.02, 0.45, 0.08, 0.1);
    const o = k.osc('sine', 2750, 0, 0.56, g);
    k.lfo(o.frequency, 28, 160, 0, 'square', 0.56);
    k.burst(0, 0.5, 0.03, 'bandpass', 3000, 2);
    return 0.6;
  },
};

R.seatbelt = {
  once: (k) => {
    for (const [t, f] of [
      [0, 2600],
      [0.08, 3400],
    ] as const) {
      k.burst(t, 0.02, 0.35, 'bandpass', f, 4);
      k.tone(f * 0.7, t, 0.03, 0.06, 'square');
    }
    return 0.15;
  },
};

R.snip = {
  once: (k) => {
    for (const t of [0, 0.22]) {
      k.burst(t, 0.04, 0.3, 'highpass', 4200, 1);
      k.tone(3300, t + 0.01, 0.07, 0.05, 'sine');
    }
    return 0.32;
  },
};

R.spray = {
  once: (k) => {
    const g = k.ahr(0, 0.06, 1.1, 0.35, 0.22);
    k.noise(0, 1.55, k.filter('highpass', 1700, 0.6, g));
    k.noise(0, 1.55, k.filter('bandpass', 700, 1, k.gain(0.3, g)));
    return 1.55;
  },
};

R.splash = {
  once: (k) => {
    k.burst(0, 0.5, 0.35, 'lowpass', 4200, 0.7, { f2: 700 });
    for (let i = 0; i < 9; i++) k.tone(rand(900, 2600), 0.05 + i * rand(0.03, 0.06), 0.06, 0.05, 'sine', { f2: rand(1600, 3600) });
    return 0.6;
  },
};

R.drips = {
  once: (k) => {
    let t = 0;
    for (let i = 0; i < 3; i++) {
      const f = rand(700, 1300);
      k.tone(f, t, 0.08, 0.16, 'sine', { f2: f * 2.1, glide: 0.035 });
      t += rand(0.25, 0.5);
    }
    return t + 0.1;
  },
  loop: (k) => {
    k.repeat(
      (q) => {
        const f = rand(650, 1400);
        q.tone(f, 0, 0.08, rand(0.06, 0.14), 'sine', { f2: f * 2.1, glide: 0.035, dest: q.pan(rand(-0.6, 0.6)) });
      },
      () => rand(0.25, 1.1),
    );
  },
};

R.tap = {
  // Water running from a tap.
  loop: (k) => {
    const g = k.ahr(0, 0.15, 1e6, 0, 0.22);
    const b = k.filter('bandpass', 1700, 0.9, g);
    k.lfo(b.frequency, 9, 500, 0, 'sine');
    k.noise(0, Infinity, b);
    k.noise(0, Infinity, k.filter('lowpass', 500, 0.7, k.gain(0.5, g)), true);
  },
  onceFor: 2,
};

R.heartbeat = {
  once: (k) => {
    k.tone(62, 0, 0.18, 0.5, 'sine', { f2: 45 });
    k.tone(58, 0.22, 0.2, 0.38, 'sine', { f2: 42 });
    return 0.45;
  },
  period: () => 0.95,
};

// ---------------------------------------------------------------- school
R.bell = {
  // A gentle four-note school chime.
  once: (k) => {
    const notes = [76, 72, 74, 67];
    notes.forEach((n, i) => k.bell(midi(n), i * 0.48, 1.3, 0.2, k.out, 0.8));
    return notes.length * 0.48 + 1.1;
  },
};

R.fireAlarm = {
  // Two-tone alarm, soft triangle tones through a low-pass so it is clear but not frightening.
  once: (k) => {
    const out = k.filter('lowpass', 1800, 0.7);
    for (let i = 0; i < 4; i++) {
      const g = k.ahr(i * 0.4, 0.015, 0.33, 0.04, 0.13, out);
      k.osc('triangle', i % 2 ? 740 : 960, i * 0.4, 0.4, g);
    }
    return 1.6;
  },
  period: () => 1.6,
};

R.murmur = {
  // Many children talking in the distance.
  loop: (k) => {
    const g = k.ahr(0, 1.2, 1e6, 0, 0.16);
    const lp = k.filter('lowpass', 2200, 0.7, g);
    for (let i = 0; i < 5; i++) {
      const vg = k.gain(0.25, lp);
      k.lfo(vg.gain, rand(3.5, 6.5), 0.22, 0, 'sine');
      const b = k.filter('bandpass', rand(450, 1300), rand(3, 6), vg);
      k.lfo(b.frequency, rand(2, 4), rand(120, 260), 0, 'sine');
      k.noise(0, Infinity, b);
    }
  },
  onceFor: 3,
};

// ---------------------------------------------------------------- traffic
R.busEngine = {
  loop: (k) => {
    const g = k.ahr(0, 0.8, 1e6, 0, 0.3);
    const lp = k.filter('lowpass', 260, 1.2, g);
    const am = k.gain(0.7, lp);
    k.lfo(am.gain, 7.5, 0.25, 0, 'sine');
    k.osc('sawtooth', 44, 0, Infinity, am);
    k.osc('square', 88, 0, Infinity, k.gain(0.25, am));
    k.noise(0, Infinity, k.filter('lowpass', 320, 0.7, k.gain(0.6, g)), true);
  },
  onceFor: 3,
};

R.doorHiss = {
  once: (k) => {
    const g = k.ahr(0, 0.02, 0.35, 0.5, 0.2);
    k.noise(0, 0.9, k.filter('bandpass', 4200, 0.9, g));
    k.tone(140, 0.85, 0.25, 0.3, 'sine', { f2: 60 });
    k.burst(0.85, 0.12, 0.15, 'lowpass', 900);
    return 1.1;
  },
};

R.carPass = {
  once: (k) => {
    const dur = 2.2;
    const T = k.t0;
    const p = k.ctx.createStereoPanner ? k.ctx.createStereoPanner() : null;
    const dest = p ?? k.out;
    if (p) {
      p.pan.setValueAtTime(-0.8, T);
      p.pan.linearRampToValueAtTime(0.8, T + dur);
      p.connect(k.out);
    }
    const g = k.ctx.createGain();
    g.gain.setValueAtTime(0.0001, T);
    g.gain.exponentialRampToValueAtTime(0.32, T + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, T + dur);
    g.connect(dest);
    const lp = k.filter('lowpass', 400, 0.8, g);
    lp.frequency.setValueAtTime(400, T);
    lp.frequency.linearRampToValueAtTime(1500, T + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(350, T + dur);
    k.noise(0, dur, lp);
    const o = k.osc('sawtooth', 92, 0, dur, k.gain(0.3, lp), { f2: 66, glide: dur, lin: true });
    o.frequency.setValueAtTime(92, T);
    o.frequency.setValueAtTime(92, T + dur * 0.45);
    o.frequency.linearRampToValueAtTime(70, T + dur * 0.6);
    return dur;
  },
};

R.engineRoar = {
  once: (k) => {
    const dur = 2.0;
    const T = k.t0;
    const g = k.ctx.createGain();
    g.gain.setValueAtTime(0.0001, T);
    g.gain.exponentialRampToValueAtTime(0.3, T + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, T + dur);
    g.connect(k.out);
    const lp = k.filter('lowpass', 500, 1.5, g);
    lp.frequency.exponentialRampToValueAtTime(1900, T + 0.9);
    lp.frequency.exponentialRampToValueAtTime(500, T + dur);
    k.osc('sawtooth', 70, 0, dur, lp, { f2: 190, glide: 1.0 });
    k.osc('sawtooth', 141, 0, dur, k.gain(0.4, lp), { f2: 384, glide: 1.0 });
    k.noise(0, dur, k.filter('bandpass', 900, 0.8, k.gain(0.5, g)));
    return dur;
  },
};

R.horn = {
  once: (k) => {
    const lp = k.filter('lowpass', 1500, 0.8);
    for (const t of [0, 0.3]) {
      const g = k.ahr(t, 0.02, 0.16, 0.05, 0.12, lp);
      k.osc('square', 392, t, 0.23, g);
      k.osc('square', 494, t, 0.23, g);
    }
    return 0.55;
  },
};

R.screech = {
  once: (k) => {
    const g = k.ahr(0, 0.04, 0.6, 0.3, 0.12);
    const b = k.filter('bandpass', 2400, 8, g);
    k.lfo(b.frequency, 11, 160, 0, 'sine', 0.95);
    k.noise(0, 0.95, b);
    const o = k.osc('sine', 2100, 0, 0.95, k.gain(0.25, g), { f2: 1700 });
    k.lfo(o.frequency, 13, 90, 0, 'sine', 0.95);
    return 0.95;
  },
};

// ---------------------------------------------------------------- weather and nature
R.rain = {
  loop: (k) => {
    const g = k.ahr(0, 1.2, 1e6, 0, 0.2);
    const hp = k.filter('highpass', 380, 0.5, g);
    const lp = k.filter('lowpass', 5200, 0.5, hp);
    k.noise(0, Infinity, lp);
    k.noise(0, Infinity, k.filter('lowpass', 900, 0.6, k.gain(0.5, g)), true);
    // A few soft droplets on top.
    k.repeat(
      (q) => {
        const f = rand(1800, 4200);
        q.tone(f, 0, 0.03, rand(0.01, 0.03), 'sine', { f2: f * 0.6, dest: q.pan(rand(-0.8, 0.8)) });
      },
      () => rand(0.04, 0.16),
    );
  },
  onceFor: 3,
};

R.thunder = {
  once: (k) => {
    const dur = 3.4;
    k.burst(0, 0.35, 0.18, 'bandpass', 700, 0.8, { brown: true });
    const g = k.ctx.createGain();
    const T = k.t0;
    g.gain.setValueAtTime(0, T);
    g.gain.linearRampToValueAtTime(0.5, T + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, T + dur);
    g.connect(k.out);
    const lp = k.filter('lowpass', 260, 0.7, g);
    k.lfo(lp.frequency, 1.7, 90, 0, 'sine', dur);
    k.noise(0, dur, lp, true);
    k.noise(0.4, dur - 0.4, k.filter('lowpass', 140, 0.7, k.gain(0.6, g)), true, 0.6);
    return dur;
  },
};

R.wind = {
  loop: (k) => {
    const g = k.ahr(0, 1.5, 1e6, 0, 0.2);
    k.lfo(g.gain, 0.13, 0.07, 0, 'sine');
    const b = k.filter('bandpass', 560, 1.6, g);
    k.lfo(b.frequency, 0.21, 260, 0, 'sine');
    k.noise(0, Infinity, b);
    const b2 = k.filter('bandpass', 1300, 4, k.gain(0.35, g));
    k.lfo(b2.frequency, 0.33, 420, 0, 'triangle');
    k.noise(0, Infinity, b2);
  },
  onceFor: 3,
};

R.birds = {
  loop: (k) => {
    k.repeat(
      (q) => {
        const n = 2 + Math.floor(Math.random() * 3);
        const base = rand(2400, 3600);
        const dest = q.pan(rand(-0.7, 0.7));
        for (let i = 0; i < n; i++) {
          const t = i * rand(0.09, 0.14);
          const g = q.env(t, 0.1, 0.05, 0.01, dest);
          const o = q.osc('sine', base, t, 0.1, g, { f2: base * rand(1.25, 1.55), glide: 0.05 });
          o.frequency.exponentialRampToValueAtTime(base * rand(0.85, 1.05), q.t0 + t + 0.1);
        }
      },
      () => rand(0.8, 2.6),
      0.3,
    );
  },
  onceFor: 2.5,
};

/** Recipe lookup (menuMusic is handled by music.ts). */
export const RECIPES = R as Record<SfxName, Recipe | undefined>;
