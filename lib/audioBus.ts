export type SoundEffect = 'shoot' | 'hit' | 'miss' | 'spawn' | 'expire';

export interface AudioBusOptions {
  masterVolume?: number;
  muted?: boolean;
  context?: AudioContext;
}

/**
 * Web Audio-based game audio manager.
 *
 * Provides synthesized sound effects (laser shot, hit impact, miss click)
 * with zero external asset dependencies, while seamlessly supporting
 * browser autoplay policy unlocking and global mute.
 *
 * Silently no-ops in non-browser / headless environments where AudioContext is absent.
 */
export class AudioBus {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number;
  private muted: boolean;

  constructor(options: AudioBusOptions = {}) {
    this.volume = options.masterVolume ?? 0.4;
    this.muted = options.muted ?? false;

    if (options.context) {
      this.initContext(options.context);
    }
  }

  private getContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AudioCtor =
      typeof window !== 'undefined'
        ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : null;

    if (!AudioCtor) return null;

    try {
      const ctx = new AudioCtor();
      this.initContext(ctx);
      return ctx;
    } catch {
      return null;
    }
  }

  private initContext(ctx: AudioContext): void {
    this.ctx = ctx;
    try {
      const gain = ctx.createGain();
      gain.gain.value = this.muted ? 0 : this.volume;
      gain.connect(ctx.destination);
      this.masterGain = gain;
    } catch {
      // Ignored if mock context lacks gain nodes
    }
  }

  /**
   * Resumes AudioContext on user gesture to comply with browser autoplay policies.
   */
  async unlock(): Promise<void> {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignored
      }
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  play(sound: SoundEffect, options: { volume?: number } = {}): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running' || !this.masterGain) return;

    const gainScale = options.volume ?? 1;
    const now = ctx.currentTime;

    try {
      switch (sound) {
        case 'shoot':
          this.synthLaser(ctx, this.masterGain, now, gainScale);
          break;
        case 'hit':
          this.synthHit(ctx, this.masterGain, now, gainScale);
          break;
        case 'miss':
          this.synthMiss(ctx, this.masterGain, now, gainScale);
          break;
        case 'spawn':
          this.synthSpawn(ctx, this.masterGain, now, gainScale);
          break;
        case 'expire':
          this.synthExpire(ctx, this.masterGain, now, gainScale);
          break;
      }
    } catch {
      // Gracefully catch audio synthesis errors in exotic environments
    }
  }

  private synthLaser(ctx: AudioContext, destination: AudioNode, now: number, scale: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

    gain.gain.setValueAtTime(0.35 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  private synthHit(ctx: AudioContext, destination: AudioNode, now: number, scale: number): void {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(520, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(260, now);
    osc2.frequency.exponentialRampToValueAtTime(440, now + 0.12);

    gain.gain.setValueAtTime(0.5 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.12);
    osc2.stop(now + 0.12);
  }

  private synthMiss(ctx: AudioContext, destination: AudioNode, now: number, scale: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);

    gain.gain.setValueAtTime(0.18 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  private synthSpawn(ctx: AudioContext, destination: AudioNode, now: number, scale: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.07);

    gain.gain.setValueAtTime(0.15 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  private synthExpire(ctx: AudioContext, destination: AudioNode, now: number, scale: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);

    gain.gain.setValueAtTime(0.2 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }
}
