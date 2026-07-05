import { describe, expect, it, vi } from 'vitest';
import { GestureEventDispatcher } from './gestureEventDispatcher';
import type { HandObservation } from './recognition';

function obs(handedness: 'Left' | 'Right', gestures: Record<string, boolean>): HandObservation {
  return { handedness, pointer: { x: 0, y: 0 }, gestures, gestureDistances: {}, landmarks: [] };
}

describe('GestureEventDispatcher', () => {
  it('fires onGestureStart the first frame a gesture becomes active', () => {
    const dispatcher = new GestureEventDispatcher();
    const onStart = vi.fn();
    const onEnd = vi.fn();

    dispatcher.dispatch([obs('Right', { 'thumb-index': true })], onStart, onEnd);

    expect(onStart).toHaveBeenCalledExactlyOnceWith('Right', 'thumb-index');
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('does not re-fire onGestureStart on subsequent frames while still active', () => {
    const dispatcher = new GestureEventDispatcher();
    const onStart = vi.fn();

    dispatcher.dispatch([obs('Right', { 'thumb-index': true })], onStart, undefined);
    dispatcher.dispatch([obs('Right', { 'thumb-index': true })], onStart, undefined);

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('fires onGestureEnd the frame a gesture stops being observed', () => {
    const dispatcher = new GestureEventDispatcher();
    const onStart = vi.fn();
    const onEnd = vi.fn();

    dispatcher.dispatch([obs('Right', { 'thumb-index': true })], onStart, onEnd);
    dispatcher.dispatch([obs('Right', { 'thumb-index': false })], onStart, onEnd);

    expect(onEnd).toHaveBeenCalledExactlyOnceWith('Right', 'thumb-index');
  });

  it('fires onGestureEnd when the hand disappears from the observations entirely', () => {
    const dispatcher = new GestureEventDispatcher();
    const onEnd = vi.fn();

    dispatcher.dispatch([obs('Right', { 'thumb-index': true })], undefined, onEnd);
    dispatcher.dispatch([], undefined, onEnd); // hand vanished — no observation at all

    expect(onEnd).toHaveBeenCalledExactlyOnceWith('Right', 'thumb-index');
  });

  it('tracks two hands independently', () => {
    const dispatcher = new GestureEventDispatcher();
    const onStart = vi.fn();

    dispatcher.dispatch(
      [obs('Left', { 'thumb-index': true }), obs('Right', { 'thumb-index': false })],
      onStart,
      undefined,
    );

    expect(onStart).toHaveBeenCalledExactlyOnceWith('Left', 'thumb-index');
  });
});
