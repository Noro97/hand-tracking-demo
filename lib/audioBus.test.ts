import { describe, expect, it, vi } from 'vitest';
import { AudioBus } from './audioBus';

function createMockAudioContext() {
  const masterGain = {
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
  };

  const createGain = vi.fn().mockReturnValue({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  });

  const createOscillator = vi.fn().mockReturnValue({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });

  const resume = vi.fn().mockResolvedValue(undefined);
  const ctx = {
    state: 'suspended',
    currentTime: 10,
    destination: {},
    createGain: vi.fn().mockImplementation(() => masterGain),
    createOscillator,
    resume,
  } as unknown as AudioContext;

  // Let subsequent createGain calls return node gain
  ctx.createGain = vi.fn()
    .mockReturnValueOnce(masterGain)
    .mockImplementation(createGain);

  return { ctx, masterGain, createGain, createOscillator, resume };
}

describe('AudioBus', () => {
  it('safe in headless environment without AudioContext', () => {
    const bus = new AudioBus();
    expect(bus.isMuted()).toBe(false);
    expect(() => bus.play('shoot')).not.toThrow();
    expect(() => bus.setVolume(0.8)).not.toThrow();
    expect(bus.getVolume()).toBe(0.8);
    expect(() => bus.setMuted(true)).not.toThrow();
    expect(bus.isMuted()).toBe(true);
  });

  it('unlocks suspended context on user interaction', async () => {
    const { ctx, resume } = createMockAudioContext();
    const bus = new AudioBus({ context: ctx });

    await bus.unlock();
    expect(resume).toHaveBeenCalled();
  });

  it('plays sounds when running and not muted', () => {
    const { ctx, createOscillator } = createMockAudioContext();
    Object.defineProperty(ctx, 'state', { value: 'running' });

    const bus = new AudioBus({ context: ctx });
    bus.play('shoot');
    expect(createOscillator).toHaveBeenCalled();
  });

  it('suppresses playback when muted', () => {
    const { ctx, createOscillator } = createMockAudioContext();
    Object.defineProperty(ctx, 'state', { value: 'running' });

    const bus = new AudioBus({ context: ctx, muted: true });
    bus.play('shoot');
    expect(createOscillator).not.toHaveBeenCalled();
  });
});
