/**
 * Builds the world sound packs (run `npm run sounds:build`):
 *   assets/sounds/<pack>/<sound>.wav|mp3        12 packs × 6 sounds, 44.1 kHz mono, < 30 KB each
 *   src/features/sound/soundAssets.generated.ts  pack -> sound -> require(asset)
 * Every sound is synthesized here from plain oscillators (scripts/sounds/synth.mjs), so nothing is
 * licensed or sampled. Short sounds (tap, correct, wrong) are 16-bit WAV for instant start; the
 * longer ones (celebrate, levelUp, unlock) are MP3 (@breezystack/lamejs, devDependency) to stay
 * small — 44.1 kHz 16-bit WAV is ~88 KB per second.
 * Kid-friendly rules: modest peaks, soft attacks, no harsh intervals; `wrong` is a soft low
 * two-note "boop", never a buzzer.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Mp3Encoder } from '@breezystack/lamejs';

import { buffer, echo, finish, lowpass, toInt16, VOICES, wav } from './synth.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'assets/sounds');
const tsOut = join(root, 'src/features/sound/soundAssets.generated.ts');

export const PACKS = [
  'candy',
  'jungle',
  'space',
  'neon',
  'glass',
  'calm',
  'sea',
  'dino',
  'sticker',
  'lofi',
  'nature',
  'midnight',
];
export const SOUNDS = ['tap', 'correct', 'wrong', 'celebrate', 'levelUp', 'unlock'];
const MP3 = new Set(['celebrate', 'levelUp', 'unlock']);
const MAX_BYTES = 30 * 1024;

/** Per pack: transposition, overall loudness, post effects and voice tweaks. */
const PACK = {
  candy: { shift: 0, gain: 1, lp: 9000 },
  jungle: { shift: -5, gain: 1, lp: 7000 },
  space: { shift: 0, gain: 0.95, lp: 6000, echo: [0.11, 0.32] },
  neon: { shift: 0, gain: 0.8, lp: 4200 },
  glass: { shift: 7, gain: 0.9, lp: 9000, echo: [0.07, 0.18] },
  calm: { shift: -5, gain: 0.6, lp: 2400 },
  sea: { shift: 0, gain: 0.95, lp: 6500, echo: [0.06, 0.22] },
  dino: { shift: -12, gain: 1, lp: 3200 },
  sticker: { shift: 0, gain: 0.85, lp: 8000 },
  lofi: { shift: -5, gain: 0.7, lp: 2600, echo: [0.16, 0.2] },
  nature: { shift: 0, gain: 0.6, lp: 3200, echo: [0.18, 0.15] },
  midnight: { shift: 0, gain: 0.65, lp: 6000, echo: [0.14, 0.3] },
};

/** Note lists: [time s, midi (before shift), opts]. Times/midis are shared; voices differ. */
function score(sound, pack) {
  const neon = pack === 'neon';
  switch (sound) {
    case 'tap':
      return {
        len: 0.04,
        peak: 0.32,
        notes: [[0, 84, { dur: 0.04, tau: 0.012, ...(neon ? { dur: 0.03 } : {}) }]],
      };
    case 'correct':
      // happy rising arpeggio C–E–G–C
      return {
        len: 0.3,
        peak: 0.5,
        notes: [
          [0, 72, { dur: 0.12, tau: 0.06 }],
          [0.06, 76, { dur: 0.12, tau: 0.06 }],
          [0.12, 79, { dur: 0.12, tau: 0.07 }],
          [0.18, 84, { dur: 0.12, tau: 0.09 }],
        ],
      };
    case 'wrong':
      // soft low "boo-oop": a gentle falling third, low-passed, sine-like in every pack
      return {
        len: 0.3,
        peak: 0.42,
        lp: 1400,
        notes: [
          [0, 64, { dur: 0.13, tau: 0.08, ...(neon ? { soft: true } : {}) }],
          [0.12, 60, { dur: 0.18, tau: 0.1, glide: -1, ...(neon ? { soft: true } : {}) }],
        ],
      };
    case 'celebrate': {
      // fanfare: rising C–E–G–C, then a bright chord with sparkles on top
      const n = [
        [0, 72, { dur: 0.14, tau: 0.08 }],
        [0.11, 76, { dur: 0.14, tau: 0.08 }],
        [0.22, 79, { dur: 0.14, tau: 0.08 }],
        [0.33, 84, { dur: 0.25, tau: 0.12 }],
        [0.55, 72, { dur: 0.65, tau: 0.3, amp: 0.55 }],
        [0.55, 76, { dur: 0.65, tau: 0.3, amp: 0.55 }],
        [0.55, 79, { dur: 0.65, tau: 0.3, amp: 0.55 }],
        [0.55, 84, { dur: 0.65, tau: 0.32, amp: 0.7 }],
      ];
      [
        [0.66, 96],
        [0.76, 100],
        [0.86, 103],
        [0.98, 108],
      ].forEach(([t, m]) => n.push([t, m, { dur: 0.2, tau: 0.06, amp: 0.25 }]));
      return { len: 1.2, peak: 0.52, notes: n };
    }
    case 'levelUp': {
      // quick pentatonic run up, landing on a held octave
      const run = [72, 74, 76, 79, 81, 84, 86, 88];
      const n = run.map((m, i) => [i * 0.05, m, { dur: 0.1, tau: 0.05, amp: 0.8 }]);
      n.push([0.42, 91, { dur: 0.38, tau: 0.16 }], [0.42, 84, { dur: 0.38, tau: 0.18, amp: 0.6 }]);
      return { len: 0.8, peak: 0.5, notes: n };
    }
    case 'unlock': {
      // sparkle: a twinkle of high notes, then a soft open fifth
      const tw = [91, 96, 93, 98, 100, 103];
      const n = tw.map((m, i) => [i * 0.045, m, { dur: 0.14, tau: 0.045, amp: 0.45 }]);
      n.push(
        [0.3, 84, { dur: 0.4, tau: 0.16, amp: 0.8 }],
        [0.3, 91, { dur: 0.4, tau: 0.14, amp: 0.5 }],
      );
      return { len: 0.7, peak: 0.45, notes: n };
    }
    default:
      throw new Error(sound);
  }
}

function render(pack, sound) {
  const p = PACK[pack];
  const s = score(sound, pack);
  const out = buffer(s.len);
  const voice = VOICES[pack];
  for (const [t, m, o] of s.notes) voice(out, t, m + p.shift, o);
  if (p.echo && sound !== 'tap') echo(out, p.echo[0], p.echo[1]);
  lowpass(out, Math.min(p.lp, s.lp ?? Infinity));
  return finish(out, s.peak * p.gain, sound === 'tap' ? 0.008 : 0.03);
}

function mp3(buf) {
  const enc = new Mp3Encoder(1, 44100, 80);
  const pcm = toInt16(buf);
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const c = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (c.length) chunks.push(Buffer.from(c));
  }
  chunks.push(Buffer.from(enc.flush()));
  return Buffer.concat(chunks);
}

rmSync(outDir, { recursive: true, force: true });
const rows = [];
const files = {};
for (const pack of PACKS) {
  mkdirSync(join(outDir, pack), { recursive: true });
  files[pack] = {};
  for (const sound of SOUNDS) {
    const buf = render(pack, sound);
    const ext = MP3.has(sound) ? 'mp3' : 'wav';
    const bytes = ext === 'mp3' ? mp3(buf) : wav(buf);
    if (bytes.length > MAX_BYTES) throw new Error(`${pack}/${sound} is ${bytes.length} bytes`);
    writeFileSync(join(outDir, pack, `${sound}.${ext}`), bytes);
    files[pack][sound] = `${sound}.${ext}`;
    rows.push(`${pack}/${sound}.${ext} ${(bytes.length / 1024).toFixed(1)} KB`);
  }
}
// sanity: no stray files from older builds
for (const pack of readdirSync(outDir)) if (!PACKS.includes(pack)) throw new Error(pack);

const ts = [
  '// Generated by scripts/sounds/build.mjs (`npm run sounds:build`). Do not edit by hand.',
  "import type { SoundName, SoundPack } from './types';",
  '',
  '/** Pack -> sound -> bundled asset (Metro module id). */',
  'export const SOUND_ASSETS: Readonly<Record<SoundPack, Readonly<Record<SoundName, number>>>> = {',
  ...PACKS.flatMap((pack) => [
    `  ${pack}: {`,
    ...SOUNDS.map(
      (s) => `    ${s}: require('../../../assets/sounds/${pack}/${files[pack][s]}') as number,`,
    ),
    '  },',
  ]),
  '};',
  '',
];
writeFileSync(tsOut, ts.join('\n'));
console.log(rows.join('\n'));
console.log(`sounds: ${rows.length} files in assets/sounds`);
