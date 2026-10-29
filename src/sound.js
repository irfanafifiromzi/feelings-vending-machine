// Sound effects are synthesised with the Web Audio API; only the background music is a file.
// Music: "Pitcher Perfect Theme" from the Not Jam Music Pack (CC0) - https://not-jam.itch.io/not-jam-music-pack
const KEY = 'fvm-sound';
const VOLUME = 0.55;
const MUSIC_URL = '/music/pitcher-perfect-theme.mp3';
const MUSIC_VOLUME = 0.3;

// MP3 encoding pads the start and end with a little silence, which would click on every loop.
function audibleRange(buffer) {
  const data = buffer.getChannelData(0);
  const limit = Math.floor(buffer.sampleRate * 0.5);
  let start = 0;
  while (start < limit && Math.abs(data[start]) < 1e-3) start++;
  let end = data.length - 1;
  while (end > data.length - limit && Math.abs(data[end]) < 1e-3) end--;
  return [start / buffer.sampleRate, (end + 1) / buffer.sampleRate];
}

function readPref() {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

function writePref(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // private mode or blocked storage: the setting just won't be remembered
  }
}

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = readPref();
  }

  // Browsers only allow audio after a user gesture, so this runs on the first click.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? VOLUME : 0;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.startMusic();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // Looping background track, faded in. It goes through the master gain, so mute covers it too.
  async startMusic() {
    try {
      const res = await fetch(MUSIC_URL);
      const buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      [src.loopStart, src.loopEnd] = audibleRange(buffer);
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(MUSIC_VOLUME, t + 2.5);
      src.connect(gain).connect(this.master);
      src.start(0, src.loopStart);
    } catch {
      // missing file or a browser that can't decode it: the site just plays without music
    }
  }

  setEnabled(on) {
    this.enabled = on;
    writePref(on);
    if (this.master) this.master.gain.setTargetAtTime(on ? VOLUME : 0, this.ctx.currentTime, 0.05);
  }

  get live() {
    return !!this.ctx && this.enabled;
  }

  envelope(gain, t, peak, attack, dur) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  tone({ type = 'sine', freq = 440, to, dur = 0.2, gain = 0.2, attack = 0.005, at = 0 }) {
    if (!this.live) return;
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    this.envelope(g, t, gain, attack, dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noise({ dur = 0.2, gain = 0.2, type = 'lowpass', freq = 1000, to, q = 1, attack = 0.005, at = 0 }) {
    if (!this.live) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    this.envelope(g, t, gain, attack, dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  tick() {
    this.tone({ type: 'triangle', freq: 2200, dur: 0.025, gain: 0.03 });
  }

  beep(freq = 988, at = 0) {
    this.tone({ type: 'square', freq, dur: 0.09, gain: 0.06, at });
  }

  motor(dur) {
    if (!this.live) return;
    const t = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.08);
    g.gain.setValueAtTime(0.12, t + dur - 0.12);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    filter.connect(g).connect(this.master);
    for (const [type, freq] of [['sawtooth', 62], ['square', 124]]) {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 1.06, t + dur);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
    this.noise({ dur, gain: 0.03, type: 'bandpass', freq: 1300, q: 2 });
  }

  clunk(at = 0) {
    this.noise({ dur: 0.16, gain: 0.5, type: 'lowpass', freq: 420, at });
    this.tone({ freq: 120, to: 45, dur: 0.26, gain: 0.55, at });
  }

  thud(at = 0) {
    this.tone({ freq: 90, to: 50, dur: 0.12, gain: 0.25, at });
  }

  psst() {
    this.noise({ dur: 0.22, gain: 0.35, type: 'highpass', freq: 2600, attack: 0.002 });
    this.noise({ dur: 1.4, gain: 0.05, type: 'bandpass', freq: 5200, q: 0.7, at: 0.08 });
  }

  gulp(at = 0) {
    this.tone({ freq: 340, to: 140, dur: 0.14, gain: 0.22, at });
  }

  whoosh() {
    this.noise({ dur: 0.5, gain: 0.12, type: 'bandpass', freq: 400, to: 2400, q: 1.2, attack: 0.15 });
  }

  buzz() {
    this.tone({ type: 'square', freq: 120, dur: 0.32, gain: 0.07 });
    this.tone({ type: 'square', freq: 90, dur: 0.32, gain: 0.07, at: 0.06 });
  }

  chime(root = 523) {
    [0, 4, 7, 12].forEach((semi, i) => {
      const freq = root * 2 ** (semi / 12);
      this.tone({ type: 'triangle', freq, dur: 0.7, gain: 0.12, at: i * 0.09 });
      this.tone({ freq: freq * 2, dur: 0.5, gain: 0.04, at: i * 0.09 });
    });
  }
}
