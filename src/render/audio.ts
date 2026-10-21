export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: AudioBufferSourceNode | null = null;
  muted = false;
  /** Set only from a user gesture so autoplay policy never logs a warning. */
  private armed = false;
  private started = false;

  private ensure(): AudioContext | null {
    if (!this.armed || this.muted) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  unlock(): void {
    this.armed = true;
    const ctx = this.ensure();
    if (!ctx || this.started || !this.master) return;
    this.started = true;
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + (Math.random() * 2 - 1) * 0.02) / 1.02;
      data[i] = brown * 3.2;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const gain = ctx.createGain();
    gain.gain.value = 0.18;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
    this.ambient = source;
    this.tone(92, 3.2, 'sine', 0.03);
    this.tone(138, 3.2, 'sine', 0.02);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
    if (!this.muted) this.unlock();
    return this.muted;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slideTo?: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  click(): void {
    this.tone(520, 0.06, 'triangle', 0.05);
  }

  spin(): void {
    this.tone(180, 0.25, 'sawtooth', 0.03, 0, 90);
  }

  land(column: number, anticipate: boolean): void {
    const freq = 320 + column * 38;
    this.tone(freq, anticipate ? 0.14 : 0.07, 'sine', anticipate ? 0.06 : 0.04);
  }

  win(size: number): void {
    const base = size > 5 ? 523 : 392;
    this.tone(base, 0.12, 'triangle', 0.06);
    this.tone(base * 1.25, 0.16, 'sine', 0.05, 0.06);
    this.tone(base * 1.5, 0.2, 'sine', 0.04, 0.12);
  }

  tumble(): void {
    this.tone(240, 0.1, 'sine', 0.03, 0, 140);
  }

  multiplier(value: number): void {
    this.tone(80, 0.35, 'sine', 0.08, 0, 42);
    this.tone(640 + Math.min(800, value), 0.28, 'triangle', 0.05, 0.05);
  }

  scatter(): void {
    this.tone(880, 0.2, 'sine', 0.05);
    this.tone(1320, 0.28, 'triangle', 0.04, 0.08);
  }

  feature(): void {
    [261, 329, 392, 523, 659].forEach((freq, i) => this.tone(freq, 0.4, 'sine', 0.05, i * 0.08));
  }

  bigWin(): void {
    [196, 247, 294, 392, 494].forEach((freq, i) => this.tone(freq, 0.7, 'sawtooth', 0.03, i * 0.1));
    this.tone(98, 1.1, 'sine', 0.07, 0, 70);
  }

  stopAmbient(): void {
    this.ambient?.stop();
    this.ambient = null;
  }
}
