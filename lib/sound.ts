"use client";
/**
 * xor sound effects, made in code with the Web Audio API.
 * No audio files: instant, tiny, and nothing to license.
 * Everyone can turn them off from the profile menu (saved per browser).
 */

export type SoundName =
  | "tap"
  | "select"
  | "flip"
  | "next"
  | "know"
  | "learning"
  | "success"
  | "error"
  | "submit"
  | "warn"
  | "tick"
  | "deckDone"
  | "resultGreat"
  | "resultGood"
  | "resultOk";

const KEY = "xor-sound";
export const SOUND_EVENT = "xor:sound-setting";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  window.dispatchEvent(new Event(SOUND_EVENT));
  if (on) play("success");
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Browsers only allow sound after the first tap, so warm up on first interaction. */
export function unlockAudio() {
  if (!soundEnabled()) return;
  audio();
}

type Tone = {
  f: number; // frequency (Hz)
  t?: number; // start offset (s)
  d?: number; // duration (s)
  v?: number; // volume 0..1
  type?: OscillatorType;
  to?: number; // glide to this frequency
};

function tone({ f, t = 0, d = 0.12, v = 0.5, type = "sine", to }: Tone) {
  const c = audio();
  if (!c || !master) return;
  const start = c.currentTime + t + 0.005;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + d);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(v, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + d);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + d + 0.02);
}

/** Short filtered noise: page-turn / whoosh. */
function whoosh({ t = 0, d = 0.18, v = 0.35, from = 600, to = 3200 }: { t?: number; d?: number; v?: number; from?: number; to?: number }) {
  const c = audio();
  if (!c || !master) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let k = 0; k < data.length; k++) data[k] = Math.random() * 2 - 1;
  }
  const start = c.currentTime + t + 0.005;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(from, start);
  bp.frequency.exponentialRampToValueAtTime(to, start + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(v, start + d * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, start + d);
  src.connect(bp).connect(g).connect(master);
  src.start(start);
  src.stop(start + d + 0.02);
}

// musical notes (Hz)
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568, G4: 392, A4: 440, E4: 329.63, C4: 261.63 };

const SOUNDS: Record<SoundName, () => void> = {
  // soft click for buttons
  tap: () => tone({ f: 1800, to: 1200, d: 0.035, v: 0.12, type: "triangle" }),
  // picking an answer: bubbly pop
  select: () => tone({ f: 520, to: 880, d: 0.09, v: 0.35, type: "sine" }),
  // flashcard flip
  flip: () => {
    whoosh({ d: 0.16, v: 0.3, from: 900, to: 3800 });
    tone({ f: 660, to: 990, t: 0.03, d: 0.08, v: 0.12, type: "triangle" });
  },
  // moving to the next card/question
  next: () => tone({ f: 990, to: 1320, d: 0.05, v: 0.14, type: "triangle" }),
  // "I know this"
  know: () => {
    tone({ f: N.E5, d: 0.1, v: 0.3, type: "triangle" });
    tone({ f: N.B5, t: 0.07, d: 0.16, v: 0.3, type: "triangle" });
  },
  // "still learning"
  learning: () => tone({ f: N.A4, to: N.G4, d: 0.16, v: 0.25, type: "sine" }),
  // saved / done
  success: () => {
    tone({ f: N.G5, d: 0.1, v: 0.25, type: "sine" });
    tone({ f: N.C6, t: 0.08, d: 0.18, v: 0.25, type: "sine" });
  },
  // something went wrong (gentle, not alarming)
  error: () => {
    tone({ f: N.E4, d: 0.12, v: 0.25, type: "triangle" });
    tone({ f: N.C4, t: 0.1, d: 0.2, v: 0.25, type: "triangle" });
  },
  // submitting a quiz
  submit: () => {
    whoosh({ d: 0.28, v: 0.25, from: 400, to: 2600 });
    tone({ f: N.C5, to: N.C6, t: 0.05, d: 0.25, v: 0.15, type: "sine" });
  },
  // one minute left
  warn: () => {
    tone({ f: N.A5, d: 0.1, v: 0.25, type: "square" });
    tone({ f: N.A5, t: 0.18, d: 0.1, v: 0.25, type: "square" });
  },
  // last seconds of a timer
  tick: () => tone({ f: 1400, d: 0.03, v: 0.15, type: "square" }),
  // deck finished
  deckDone: () => [N.C5, N.E5, N.G5, N.C6].forEach((f, k) => tone({ f, t: k * 0.08, d: 0.22, v: 0.25, type: "triangle" })),
  // quiz results
  resultGreat: () => {
    [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((f, k) => tone({ f, t: k * 0.085, d: 0.3, v: 0.24, type: "triangle" }));
    [N.G6, N.E6, N.G6].forEach((f, k) => tone({ f, t: 0.5 + k * 0.07, d: 0.12, v: 0.12, type: "sine" }));
  },
  resultGood: () => [N.C5, N.E5, N.G5].forEach((f, k) => tone({ f, t: k * 0.1, d: 0.28, v: 0.24, type: "triangle" })),
  resultOk: () => {
    tone({ f: N.G4, d: 0.2, v: 0.22, type: "sine" });
    tone({ f: N.C5, t: 0.16, d: 0.32, v: 0.22, type: "sine" });
  },
};

let last = 0;
export function play(name: SoundName) {
  if (typeof window === "undefined" || !soundEnabled()) return;
  // don't stack identical taps when something fires twice
  const now = performance.now();
  if (name === "tap" && now - last < 40) return;
  last = now;
  try {
    SOUNDS[name]();
  } catch {}
}
