/* Tiny WebAudio engine: all music + SFX synthesized, no downloads. */

const MIDI = (m) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.musicTimer = null;
    this.step = 0;
    this.nextNoteTime = 0;
    this.noiseBuf = null;
    this.musicPlaying = false;
    this.tempo = 112;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      this.noiseBuf = this.makeNoise(1.2);
    } catch (e) { /* audio unavailable */ }
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
    }
    if (on) this.init();
  }

  tone({ freq = 440, endFreq = null, dur = 0.15, type = 'sine', vol = 0.3, delay = 0, dest = null, attack = 0.005 }) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise({ dur = 0.2, vol = 0.25, freq = 1200, q = 1, type = 'bandpass', delay = 0, dest = null, sweep = null }) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t + dur);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(dest || this.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'click':
        this.tone({ freq: 520, endFreq: 720, dur: 0.06, type: 'square', vol: 0.08 });
        break;
      case 'pop':
        this.tone({ freq: 300, endFreq: 500, dur: 0.08, type: 'triangle', vol: 0.2 });
        break;
      case 'coin':
        this.tone({ freq: 880, dur: 0.08, type: 'triangle', vol: 0.2 });
        this.tone({ freq: 1320, dur: 0.16, type: 'triangle', vol: 0.18, delay: 0.07 });
        break;
      case 'bounce':
        this.tone({ freq: 190, endFreq: 70, dur: 0.16, type: 'sine', vol: 0.5 });
        this.noise({ dur: 0.05, vol: 0.1, freq: 500, type: 'lowpass' });
        break;
      case 'pass':
        this.noise({ dur: 0.14, vol: 0.13, freq: 900, sweep: 2600, type: 'bandpass', q: 1.2 });
        break;
      case 'rim':
        this.tone({ freq: 320, endFreq: 210, dur: 0.22, type: 'square', vol: 0.12 });
        this.noise({ dur: 0.18, vol: 0.16, freq: 2600, q: 6 });
        break;
      case 'swish':
        this.noise({ dur: 0.22, vol: 0.22, freq: 3200, sweep: 1400, type: 'highpass' });
        this.tone({ freq: 1500, endFreq: 2200, dur: 0.12, type: 'sine', vol: 0.1, delay: 0.03 });
        break;
      case 'cheer': {
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
        src.connect(f); f.connect(g); g.connect(this.sfxGain);
        src.start(t); src.stop(t + 1.2);
        for (let i = 0; i < 7; i++) {
          this.noise({ dur: 0.07, vol: 0.09, freq: 1400 + Math.random() * 900, q: 2, delay: 0.05 + Math.random() * 0.8 });
        }
        break;
      }
      case 'whistle':
        this.tone({ freq: 2100, endFreq: 2300, dur: 0.18, type: 'sine', vol: 0.12 });
        this.tone({ freq: 2400, endFreq: 2500, dur: 0.3, type: 'sine', vol: 0.1, delay: 0.2 });
        break;
      case 'buzzer':
        this.tone({ freq: 170, dur: 0.7, type: 'square', vol: 0.16 });
        this.tone({ freq: 173, dur: 0.7, type: 'sawtooth', vol: 0.1 });
        break;
      case 'steal':
        this.noise({ dur: 0.1, vol: 0.22, freq: 1800, sweep: 500, type: 'bandpass' });
        this.tone({ freq: 640, endFreq: 300, dur: 0.12, type: 'square', vol: 0.12 });
        break;
      case 'block':
        this.tone({ freq: 120, endFreq: 55, dur: 0.22, type: 'square', vol: 0.3 });
        this.noise({ dur: 0.12, vol: 0.2, freq: 300, type: 'lowpass' });
        break;
      case 'score':
        this.play('swish');
        this.play('cheer');
        this.tone({ freq: 660, dur: 0.1, type: 'triangle', vol: 0.14, delay: 0.05 });
        this.tone({ freq: 990, dur: 0.18, type: 'triangle', vol: 0.14, delay: 0.16 });
        break;
      case 'dunk':
        this.tone({ freq: 100, endFreq: 45, dur: 0.4, type: 'sine', vol: 0.45 });
        this.noise({ dur: 0.3, vol: 0.25, freq: 260, type: 'lowpass' });
        this.play('cheer');
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.18, delay: i * 0.12 }));
        this.play('cheer');
        break;
      case 'lose':
        [392, 349, 294, 262].forEach((f, i) => this.tone({ freq: f, dur: 0.24, type: 'sine', vol: 0.16, delay: i * 0.15 }));
        break;
      case 'card':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone({ freq: f, dur: 0.14, type: 'triangle', vol: 0.13, delay: i * 0.07 }));
        break;
      case 'upgrade':
        [523, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.12, type: 'square', vol: 0.1, delay: i * 0.07 }));
        break;
      case 'trial':
        [659, 880, 1109, 1319].forEach((f, i) => this.tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.16, delay: i * 0.11 }));
        this.play('cheer');
        break;
      default: break;
    }
  }

  startMusic() {
    this.init();
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.schedule(), 120);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  schedule() {
    if (!this.ctx || !this.musicPlaying) return;
    const spb = 60 / this.tempo / 2; // eighth notes
    while (this.nextNoteTime < this.ctx.currentTime + 0.35) {
      this.playStep(this.step, this.nextNoteTime - this.ctx.currentTime);
      this.nextNoteTime += spb;
      this.step = (this.step + 1) % 32;
    }
  }

  playStep(step, delay) {
    const t = Math.max(0, delay);
    const bassNotes = [36, 36, 45, 36, 41, 41, 43, 43]; // C C A C F F G G
    const chordTones = [
      [60, 64, 67], [60, 64, 67], [57, 60, 64], [60, 64, 67],
      [53, 57, 60], [53, 57, 60], [55, 59, 62], [55, 59, 62]
    ];
    const bar = Math.floor(step / 4) % 8;
    const beat = step % 4;
    if (beat === 0) {
      this.tone({ freq: MIDI(bassNotes[bar]), dur: 0.32, type: 'triangle', vol: 0.22, delay: t, dest: this.musicGain });
    }
    if (beat === 2) {
      this.tone({ freq: MIDI(bassNotes[bar] + 12), dur: 0.18, type: 'triangle', vol: 0.1, delay: t, dest: this.musicGain });
    }
    const chord = chordTones[bar];
    if (beat % 2 === 0) {
      const note = chord[(step + bar) % chord.length] + 12;
      this.tone({ freq: MIDI(note), dur: 0.16, type: 'square', vol: 0.045, delay: t, dest: this.musicGain });
    }
    if (beat === 1 || beat === 3) {
      this.noise({ dur: 0.035, vol: 0.03, freq: 7000, type: 'highpass', delay: t, dest: this.musicGain });
    }
    if (step === 0 || step === 16) {
      this.noise({ dur: 0.12, vol: 0.05, freq: 180, type: 'lowpass', delay: t, dest: this.musicGain });
    }
  }
}

export const audio = new AudioEngine();
