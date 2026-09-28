export class DogSoundController {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.6; // 0.0 to 1.0

  constructor(enabled: boolean = true, volume: number = 0.6) {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  private initContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Friendly soft puppy double-bark ("yip yip!")
  public bark(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const playYip = (delay: number, pitchMult: number) => {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900 * pitchMult, now);
      filter.Q.setValueAtTime(3, now);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420 * pitchMult, now);
      osc.frequency.exponentialRampToValueAtTime(750 * pitchMult, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(320 * pitchMult, now + 0.12);

      const v = this.volume * 0.45;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(v, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    };

    playYip(0, 1.0);
    playYip(0.12, 1.15);
  }

  // Happy ascending chirp / purr trill
  public chirpHappy(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.16);

    const v = this.volume * 0.35;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(v, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  // Sleepy yawn sound
  public yawn(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(300, now + 0.7);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.6);

    const v = this.volume * 0.25;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(v, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  // Snooze gentle breathing sigh
  public snooze(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.5);

    const v = this.volume * 0.15;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(v, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
  }
}
