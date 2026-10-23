/**
 * Tiny additive synthesizer for the world sound packs (no dependencies). Everything is original:
 * plain oscillators, envelopes, a one-pole low-pass and a feedback echo, rendered at 44.1 kHz mono.
 */

export const SR = 44100;
const TAU = Math.PI * 2;

export const buffer = (sec) => new Float32Array(Math.ceil(sec * SR));
export const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

/** Deterministic noise (same files on every build). */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Attack (linear) then exponential decay with time constant `tau`. */
const env = (t, attack, tau) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));

const sine = (ph) => Math.sin(TAU * ph);
const tri = (ph) => {
  const x = ph % 1;
  return x < 0.25 ? 4 * x : x < 0.75 ? 2 - 4 * x : 4 * x - 4;
};
const pulse = (ph, duty) => (ph % 1 < duty ? 1 : -1);

/**
 * Voices: (out, t0, midi, opts) adds one note into `out`. opts: { dur, amp, tau, glide }.
 * `glide` = semitones the pitch slides by over the note (negative = down).
 */
function addNote(out, t0, dur, fn) {
  const start = Math.floor(t0 * SR);
  const n = Math.min(Math.ceil(dur * SR), out.length - start);
  for (let i = 0; i < n; i++) {
    // 6 ms release at the very end of the note window to avoid clicks
    const tail = Math.min(1, (n - i) / (0.006 * SR));
    out[start + i] += fn(i / SR, i) * tail;
  }
}

/** Phase accumulator with an optional pitch glide. */
function phaser(f0, glide = 0, glideTime = 0.06) {
  let ph = 0;
  return (t) => {
    const k = glide ? Math.min(1, t / glideTime) : 1;
    const f = f0 * 2 ** ((glide * k) / 12);
    ph += f / SR;
    return ph;
  };
}

export const VOICES = {
  /** Candy: bubbly plucks, a little upward "bloop" at the start of every note. */
  candy(out, t0, m, { dur = 0.4, amp = 1, tau = 0.09, glide } = {}) {
    const f = midiHz(m);
    const p = phaser(f * 2 ** (-2.5 / 12), glide ?? 2.5, 0.018);
    addNote(out, t0, dur, (t) => {
      const ph = p(t);
      return amp * env(t, 0.003, tau) * (sine(ph) + 0.28 * sine(2 * ph) + 0.08 * sine(3 * ph));
    });
  },
  /** Jungle: marimba (tuned 4th and 10th partials) with a soft wooden knock. */
  jungle(out, t0, m, { dur = 0.5, amp = 1, tau = 0.13, glide = 0 } = {}) {
    const f = midiHz(m);
    const p = phaser(f, glide, 0.2);
    const noise = rng(m * 31 + Math.round(t0 * 1000));
    let lp = 0;
    addNote(out, t0, dur, (t) => {
      const ph = p(t);
      const body =
        sine(ph) * env(t, 0.002, tau) +
        0.32 * sine(4 * ph) * env(t, 0.001, tau * 0.25) +
        0.08 * sine(9.9 * ph) * env(t, 0.001, tau * 0.08);
      lp += 0.25 * (noise() * 2 - 1 - lp);
      const knock = t < 0.012 ? lp * 0.5 * (1 - t / 0.012) : 0;
      return amp * (body + knock);
    });
  },
  /** Space: soft synth ping, slight vibrato and a detuned twin (echo added per sound). */
  space(out, t0, m, { dur = 0.6, amp = 1, tau = 0.22, glide = 0 } = {}) {
    const f = midiHz(m);
    const p1 = phaser(f, glide, 0.2);
    const p2 = phaser(f * 1.006, glide, 0.2);
    addNote(out, t0, dur, (t) => {
      const vib = 1 + 0.003 * Math.sin(TAU * 5.5 * t);
      const a = p1(t) * vib;
      const b = p2(t);
      return amp * env(t, 0.008, tau) * (0.75 * sine(a) + 0.35 * sine(b) + 0.12 * tri(2 * a));
    });
  },
  /** Neon: 8-bit square (pulse) waves, held then released; the low-pass keeps it friendly. */
  neon(out, t0, m, { dur = 0.12, amp = 1, tau = 0.08, glide = 0, soft = false } = {}) {
    const f = midiHz(m);
    const p = phaser(f, glide, dur * 0.8);
    const hold = Math.max(0.01, dur * 0.55);
    addNote(out, t0, dur, (t) => {
      const ph = p(t);
      const e = t < 0.002 ? t / 0.002 : t < hold ? 1 : Math.exp(-(t - hold) / tau);
      const w = soft ? tri(ph) : pulse(ph, 0.25) * 0.55 + pulse(ph * 1.0, 0.5) * 0.15;
      return amp * e * w;
    });
  },
  /** Glass: bell-like inharmonic sines with long, clear decays. */
  glass(out, t0, m, { dur = 0.9, amp = 1, tau = 0.45, glide = 0 } = {}) {
    const f = midiHz(m);
    const parts = [
      [1, 1, 1],
      [2.756, 0.38, 0.5],
      [5.404, 0.16, 0.25],
      [8.933, 0.06, 0.12],
    ];
    const p = phaser(f, glide, 0.2);
    addNote(out, t0, dur, (t) => {
      const ph = p(t);
      let s = 0;
      for (const [r, a, k] of parts) s += a * sine(ph * r) * env(t, 0.002, tau * k);
      return amp * s;
    });
  },
  /** Calm: very soft sine with a slow attack, low register, no sharp edges. */
  calm(out, t0, m, { dur = 0.6, amp = 1, tau = 0.22, glide = 0 } = {}) {
    const f = midiHz(m);
    const p = phaser(f, glide, 0.25);
    addNote(out, t0, dur, (t) => {
      const ph = p(t);
      return amp * env(t, 0.025, tau) * (sine(ph) + 0.06 * sine(2 * ph));
    });
  },
  /** Sea: round "bloop" bubbles: every note starts low and slides up, with a watery wobble. */
  sea(out, t0, m, { dur = 0.4, amp = 1, tau = 0.11, glide } = {}) {
    const f = midiHz(m);
    const p = phaser(f * 2 ** (-5 / 12), glide ?? 5, 0.035);
    addNote(out, t0, dur, (t) => {
      const wob = 1 + 0.012 * Math.sin(TAU * 9 * t);
      const ph = p(t) * wob;
      return amp * env(t, 0.004, tau) * (sine(ph) + 0.18 * sine(2 * ph) + 0.05 * tri(3 * ph));
    });
  },
  /** Dino: low wooden "stomp" toms: triangle body with a pitch drop and a soft thump. */
  dino(out, t0, m, { dur = 0.45, amp = 1, tau = 0.12, glide = 0 } = {}) {
    const f = midiHz(m);
    const p = phaser(f * 2 ** (3 / 12), glide - 3, 0.05);
    const noise = rng(m * 17 + Math.round(t0 * 1000));
    let lp = 0;
    addNote(out, t0, dur, (t) => {
      const ph = p(t);
      lp += 0.08 * (noise() * 2 - 1 - lp);
      const thump = t < 0.03 ? lp * 1.6 * (1 - t / 0.03) : 0;
      return amp * (env(t, 0.003, tau) * (0.8 * tri(ph) + 0.35 * sine(ph * 2)) + thump);
    });
  },
  /** Sticker: snappy pluck (bright harmonics that close fast) with a tiny paper "slap". */
  sticker(out, t0, m, { dur = 0.3, amp = 1, tau = 0.08, glide = 0 } = {}) {
    const f = midiHz(m);
    const p = phaser(f, glide, 0.08);
    const noise = rng(m * 7 + Math.round(t0 * 1000));
    addNote(out, t0, dur, (t) => {
      const ph = p(t);
      const bright = Math.exp(-t / 0.03);
      let s = sine(ph);
      for (let k = 2; k <= 5; k++) s += (bright / k) * sine(k * ph);
      const slap = t < 0.006 ? (noise() * 2 - 1) * 0.5 * (1 - t / 0.006) : 0;
      return amp * (env(t, 0.002, tau) * s * 0.7 + slap);
    });
  },
  /** Lo-fi: warm electric piano (soft FM bell), detuned and wobbling like an old tape. */
  lofi(out, t0, m, { dur = 0.7, amp = 1, tau = 0.3, glide = 0 } = {}) {
    const f = midiHz(m);
    const p1 = phaser(f, glide, 0.2);
    const p2 = phaser(f * 1.004, glide, 0.2);
    addNote(out, t0, dur, (t) => {
      const flutter = 1 + 0.004 * Math.sin(TAU * 4.2 * t + m);
      const a = p1(t) * flutter;
      const mod = 0.9 * Math.exp(-t / 0.12) * sine(a);
      return (
        amp *
        env(t, 0.006, tau) *
        (0.8 * Math.sin(TAU * a + mod) + 0.3 * sine(p2(t)) + 0.06 * sine(2 * a))
      );
    });
  },
  /** Nature: breathy wooden flute: sine with a slow attack, gentle vibrato and a little air. */
  nature(out, t0, m, { dur = 0.6, amp = 1, tau = 0.24, glide = 0 } = {}) {
    const f = midiHz(m);
    const p = phaser(f, glide, 0.2);
    const noise = rng(m * 13 + Math.round(t0 * 1000));
    let lp = 0;
    addNote(out, t0, dur, (t) => {
      const vib = 1 + 0.004 * Math.sin(TAU * 5 * t) * Math.min(1, t / 0.15);
      const ph = p(t) * vib;
      lp += 0.05 * (noise() * 2 - 1 - lp);
      const e = env(t, 0.03, tau);
      return amp * e * (sine(ph) + 0.12 * sine(2 * ph) + 0.05 * sine(3 * ph) + lp * 0.5);
    });
  },
  /** Midnight: soft celesta / music box: a pure tone with a quiet bright overtone, long decay. */
  midnight(out, t0, m, { dur = 0.9, amp = 1, tau = 0.4, glide = 0 } = {}) {
    const f = midiHz(m);
    const p = phaser(f, glide, 0.2);
    addNote(out, t0, dur, (t) => {
      const ph = p(t);
      return (
        amp *
        (sine(ph) * env(t, 0.004, tau) +
          0.22 * sine(4 * ph) * env(t, 0.002, tau * 0.18) +
          0.08 * sine(3 * ph) * env(t, 0.003, tau * 0.4))
      );
    });
  },
};

// ---------------------------------------------------------------------------
// effects
// ---------------------------------------------------------------------------

export function lowpass(buf, hz) {
  const a = 1 - Math.exp((-TAU * hz) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += a * (buf[i] - y);
    buf[i] = y;
  }
  return buf;
}

export function echo(buf, delaySec, feedback, mix = 1) {
  const dl = Math.round(delaySec * SR);
  for (let i = dl; i < buf.length; i++) buf[i] += buf[i - dl] * feedback * mix;
  return buf;
}

/** Remove DC, fade the last `fadeSec`, scale the peak to `peak` (0..1). */
export function finish(buf, peak, fadeSec = 0.02) {
  let mean = 0;
  for (const v of buf) mean += v;
  mean /= buf.length;
  const fade = Math.round(fadeSec * SR);
  let max = 0;
  for (let i = 0; i < buf.length; i++) {
    buf[i] -= mean;
    const k = buf.length - i;
    if (k < fade) buf[i] *= k / fade;
    if (i < 32) buf[i] *= i / 32;
    max = Math.max(max, Math.abs(buf[i]));
  }
  const g = max > 0 ? peak / max : 0;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

export function toInt16(buf) {
  const out = new Int16Array(buf.length);
  for (let i = 0; i < buf.length; i++)
    out[i] = Math.max(-32768, Math.min(32767, Math.round(buf[i] * 32767)));
  return out;
}

/** 16-bit PCM mono WAV. */
export function wav(buf) {
  const pcm = toInt16(buf);
  const data = Buffer.from(pcm.buffer);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
