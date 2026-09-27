// Tiny synthesized sound effects (no audio files needed).
let ac = null;
let enabled = true;
let lastCoin = 0;

export function setSound(on) { enabled = on; }

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq, dur, { type = 'sine', vol = 0.15, delay = 0, slide = 0 } = {}) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  tap() { if (enabled) tone(660, 0.06, { type: 'triangle', vol: 0.08 }); },
  coin() {
    if (!enabled) return;
    const now = performance.now();
    if (now - lastCoin < 90) return;
    lastCoin = now;
    tone(988, 0.07, { type: 'square', vol: 0.05 });
    tone(1319, 0.14, { type: 'square', vol: 0.05, delay: 0.06 });
  },
  buy() { if (enabled) { tone(523, 0.08, { type: 'triangle', vol: 0.1 }); tone(784, 0.12, { type: 'triangle', vol: 0.1, delay: 0.07 }); } },
  no() { if (enabled) tone(200, 0.18, { type: 'sawtooth', vol: 0.06, slide: 0.7 }); },
  pop() { if (enabled) tone(420, 0.09, { type: 'sine', vol: 0.12, slide: 1.8 }); },
  splash() { if (enabled) tone(300, 0.3, { type: 'triangle', vol: 0.12, slide: 0.4 }); },
  win() {
    if (!enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.12, delay: i * 0.1 }));
  },
  fanfare() {
    if (!enabled) return;
    [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'square', vol: 0.06, delay: i * 0.12 }));
  },
  open() { if (enabled) { tone(392, 0.1, { type: 'triangle', vol: 0.1 }); tone(523, 0.1, { type: 'triangle', vol: 0.1, delay: 0.1 }); tone(659, 0.2, { type: 'triangle', vol: 0.1, delay: 0.2 }); } },
};
