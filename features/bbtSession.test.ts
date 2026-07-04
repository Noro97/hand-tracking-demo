import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BBTSessionController } from './bbtSession';
import type { HandObservation, Handedness } from '../lib/recognition';

const CANVAS_WIDTH = 200; // partition sits at x=100

function hand(handedness: Handedness, x: number, y = 0): HandObservation {
  return { handedness, pointer: { x, y }, gestures: {}, landmarks: [] };
}

function makeController(): BBTSessionController {
  return new BBTSessionController(
    () => CANVAS_WIDTH,
    () => {},
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BBTSessionController', () => {
  it('counts a valid single-hand transfer crossing the partition', () => {
    const controller = makeController();
    controller.start('Right', 60_000);

    controller.handleGestureStart('Right', 'thumb-index');
    controller.frame([hand('Right', 20)]); // compartment A
    vi.setSystemTime(50);
    controller.frame([hand('Right', 60)]);
    vi.setSystemTime(100);
    controller.frame([hand('Right', 150)]); // compartment B
    controller.handleGestureEnd('Right', 'thumb-index');

    vi.setSystemTime(100 + 260); // past RELABEL_GRACE_MS
    controller.tick();

    const state = controller.getState();
    expect(state.blockCount).toBe(1);
    expect(state.lastRep?.pathLengthPx).toBeCloseTo(130); // 40 + 90
    expect(state.lastRep?.smoothness).toBeCloseTo(1); // straight line
  });

  it('rejects jitter below the minimum path length', () => {
    const controller = makeController();
    controller.start('Right', 60_000);

    controller.handleGestureStart('Right', 'thumb-index');
    controller.frame([hand('Right', 20)]);
    vi.setSystemTime(50);
    controller.frame([hand('Right', 25)]); // 5px of movement, well under the 40px floor
    controller.handleGestureEnd('Right', 'thumb-index');

    vi.setSystemTime(50 + 260);
    controller.tick();

    expect(controller.getState().blockCount).toBe(0);
  });

  it('rejects a pinch that never crosses the partition', () => {
    const controller = makeController();
    controller.start('Right', 60_000);

    controller.handleGestureStart('Right', 'thumb-index');
    controller.frame([hand('Right', 10)]); // compartment A
    vi.setSystemTime(50);
    controller.frame([hand('Right', 90)]); // still compartment A (partition at 100)
    controller.handleGestureEnd('Right', 'thumb-index');

    vi.setSystemTime(50 + 260);
    controller.tick();

    expect(controller.getState().blockCount).toBe(0);
  });

  it('ignores gestures from a hand other than the selected one', () => {
    const controller = makeController();
    controller.start('Right', 60_000);

    controller.handleGestureStart('Left', 'thumb-index');
    controller.frame([hand('Left', 10)]);
    vi.setSystemTime(100);
    controller.frame([hand('Left', 190)]);
    controller.handleGestureEnd('Left', 'thumb-index');

    vi.setSystemTime(100 + 260);
    controller.tick();

    expect(controller.getState().blockCount).toBe(0);
  });

  it('tolerates a brief handedness relabel and counts the transfer as one rep', () => {
    const controller = makeController();
    controller.start('Left', 60_000);

    controller.handleGestureStart('Left', 'thumb-index');
    controller.frame([hand('Left', 20)]); // compartment A
    vi.setSystemTime(50);
    controller.frame([hand('Left', 60)]);
    vi.setSystemTime(60);
    controller.handleGestureEnd('Left', 'thumb-index'); // MediaPipe "loses" Left this frame

    // Relabel: the SAME physical hand reappears as "Right" nearby, within the grace window.
    vi.setSystemTime(70);
    controller.handleGestureStart('Right', 'thumb-index');
    vi.setSystemTime(110);
    controller.frame([hand('Right', 65)]); // close to the last known point (60,0)

    // Movement continues under the new label, crossing into compartment B.
    vi.setSystemTime(150);
    controller.frame([hand('Right', 150)]);
    controller.handleGestureEnd('Right', 'thumb-index');

    vi.setSystemTime(150 + 260);
    controller.tick();

    const state = controller.getState();
    expect(state.blockCount).toBe(1); // ONE rep, not zero (lost) or two (double-counted)
  });

  it('rejects a resume candidate that is too far away, without corrupting the original rep', () => {
    const controller = makeController();
    controller.start('Left', 60_000);

    controller.handleGestureStart('Left', 'thumb-index');
    controller.frame([hand('Left', 20)]);
    vi.setSystemTime(50);
    controller.frame([hand('Left', 60)]);
    vi.setSystemTime(60);
    controller.handleGestureEnd('Left', 'thumb-index');

    // A genuinely different hand starts elsewhere in frame — must NOT be adopted.
    vi.setSystemTime(70);
    controller.handleGestureStart('Right', 'thumb-index');
    vi.setSystemTime(80);
    controller.frame([hand('Right', 500)]); // far from (60, 0)

    // The real hand resumes under its original label, close to where it left off.
    vi.setSystemTime(90);
    controller.handleGestureStart('Left', 'thumb-index');
    vi.setSystemTime(100);
    controller.frame([hand('Left', 65)]);
    vi.setSystemTime(150);
    controller.frame([hand('Left', 150)]); // crosses into compartment B
    controller.handleGestureEnd('Left', 'thumb-index');

    vi.setSystemTime(150 + 260);
    controller.tick();

    expect(controller.getState().blockCount).toBe(1);
  });

  it('tick() ends the session once the duration elapses, preserving already-counted reps', () => {
    const controller = makeController();
    controller.start('Right', 1_000);

    controller.handleGestureStart('Right', 'thumb-index');
    controller.frame([hand('Right', 10)]);
    vi.setSystemTime(50);
    controller.frame([hand('Right', 190)]);
    controller.handleGestureEnd('Right', 'thumb-index');
    vi.setSystemTime(50 + 260);
    controller.tick(); // finalizes the rep, session still running (remaining > 0)
    expect(controller.getState().blockCount).toBe(1);
    expect(controller.getState().running).toBe(true);

    vi.setSystemTime(1_001);
    controller.tick(); // duration elapsed — session stops

    const state = controller.getState();
    expect(state.running).toBe(false);
    expect(state.blockCount).toBe(1); // the earlier rep is not lost
  });

  it('stop() returns a summary matching the selected hand and counted reps', () => {
    const controller = makeController();
    controller.start('Left', 60_000);

    controller.handleGestureStart('Left', 'thumb-index');
    controller.frame([hand('Left', 10)]);
    vi.setSystemTime(50);
    controller.frame([hand('Left', 190)]);
    controller.handleGestureEnd('Left', 'thumb-index');
    vi.setSystemTime(50 + 260);
    controller.tick();
    expect(controller.getState().blockCount).toBe(1);

    const summary = controller.stop();
    expect(summary.selectedHand).toBe('Left');
    expect(summary.blockCount).toBe(1);
    expect(summary.reps).toHaveLength(1);
    expect(summary.avgDurationMs).toBe(summary.reps[0]?.durationMs);
    expect(controller.getLastSummary()).toEqual(summary);
  });
});
