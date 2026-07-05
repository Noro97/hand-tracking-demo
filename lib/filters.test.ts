import { describe, expect, it } from 'vitest';
import { OneEuroFilter, PinchTracker } from './filters';

describe('OneEuroFilter', () => {
  it('returns the raw value unchanged on the first sample', () => {
    const filter = new OneEuroFilter(1.2, 0.01, 1.0);
    expect(filter.filter(10, 0)).toBe(10);
  });

  it('smooths a slow, small change more than it lets through a fast, large one', () => {
    // Same 5-unit jump, but the fast case arrives in one 33ms frame (a real
    // motion) vs. the slow case spread over 10 frames — the filter should
    // track the fast jump much more closely.
    const slow = new OneEuroFilter(1.2, 0.01, 1.0);
    slow.filter(0, 0);
    let slowResult = 0;
    for (let i = 1; i <= 10; i++) {
      slowResult = slow.filter(5, i * 100);
    }

    const fast = new OneEuroFilter(1.2, 0.01, 1.0);
    fast.filter(0, 0);
    const fastResult = fast.filter(5, 33);

    expect(Math.abs(slowResult - 5)).toBeLessThan(0.5);
    expect(Math.abs(fastResult - 5)).toBeGreaterThan(Math.abs(slowResult - 5));
  });

  it('forgets its history on reset — the next sample is raw again', () => {
    const filter = new OneEuroFilter(1.2, 0.01, 1.0);
    filter.filter(0, 0);
    filter.filter(100, 33);
    filter.reset();
    expect(filter.filter(42, 66)).toBe(42);
  });

  it('holds the previous value when two samples share a timestamp (dt <= 0)', () => {
    const filter = new OneEuroFilter(1.2, 0.01, 1.0);
    filter.filter(10, 100);
    expect(filter.filter(50, 100)).toBe(10);
  });
});

describe('PinchTracker', () => {
  const ENTER = 0.4;
  const EXIT = 0.55;
  const DEBOUNCE_MS = 150;

  it('does not confirm a pinch before the debounce window elapses', () => {
    const tracker = new PinchTracker(ENTER, EXIT, DEBOUNCE_MS);
    expect(tracker.update(0.1, 0)).toBe(false);
    expect(tracker.update(0.1, 100)).toBe(false); // still within debounce
  });

  it('confirms a pinch once the candidate state holds past the debounce window', () => {
    const tracker = new PinchTracker(ENTER, EXIT, DEBOUNCE_MS);
    tracker.update(0.1, 0);
    expect(tracker.update(0.1, 200)).toBe(true);
  });

  it('hysteresis: a value between EXIT and ENTER does not flicker once confirmed', () => {
    const tracker = new PinchTracker(ENTER, EXIT, DEBOUNCE_MS);
    tracker.update(0.1, 0);
    tracker.update(0.1, 200); // confirmed pinched

    // 0.45 is above ENTER but below EXIT — a naive single-threshold tracker
    // would drop out here; hysteresis should hold the confirmed state.
    expect(tracker.update(0.45, 250)).toBe(true);
  });

  it('releases once the value crosses the EXIT threshold and the debounce elapses', () => {
    const tracker = new PinchTracker(ENTER, EXIT, DEBOUNCE_MS);
    tracker.update(0.1, 0);
    tracker.update(0.1, 200); // confirmed
    tracker.update(0.6, 250); // candidate flips to released
    expect(tracker.update(0.6, 450)).toBe(false);
  });

  it('a brief flicker under the debounce window does not confirm', () => {
    const tracker = new PinchTracker(ENTER, EXIT, DEBOUNCE_MS);
    tracker.update(0.1, 0); // candidate: pinched
    tracker.update(0.9, 50); // candidate flips back to released within debounce
    expect(tracker.update(0.9, 200)).toBe(false);
  });

  it('resets to the released state with no debounce carry-over', () => {
    const tracker = new PinchTracker(ENTER, EXIT, DEBOUNCE_MS);
    tracker.update(0.1, 0);
    tracker.update(0.1, 200); // confirmed
    tracker.reset();
    expect(tracker.update(0.1, 200)).toBe(false); // needs a fresh debounce window
    expect(tracker.update(0.1, 400)).toBe(true);
  });
});
