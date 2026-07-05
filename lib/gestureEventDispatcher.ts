import type { HandObservation, Handedness } from './recognition';

/**
 * Turns per-frame gesture booleans (`HandObservation.gestures`) into edge
 * events (start/end), the same way a keyboard driver turns "key is down this
 * frame" into keydown/keyup. Framework- and engine-agnostic on purpose: both
 * `HandEngine` (live camera) and a headless fixture replay drive it the same
 * way, so replay can't silently drift from production behavior.
 */
export class GestureEventDispatcher {
  /** Active gesture state keyed by `${handedness}:${gestureId}`. */
  private readonly activeGestures = new Set<string>();

  dispatch(
    observations: HandObservation[],
    onGestureStart: ((handedness: Handedness, gestureId: string) => void) | undefined,
    onGestureEnd: ((handedness: Handedness, gestureId: string) => void) | undefined,
  ): void {
    const stillActive = new Set<string>();
    for (const obs of observations) {
      for (const [gestureId, isActive] of Object.entries(obs.gestures)) {
        if (!isActive) continue;
        const key = `${obs.handedness}:${gestureId}`;
        stillActive.add(key);
        if (!this.activeGestures.has(key)) {
          this.activeGestures.add(key);
          onGestureStart?.(obs.handedness, gestureId);
        }
      }
    }
    for (const key of [...this.activeGestures]) {
      if (stillActive.has(key)) continue;
      const [handedness, gestureId] = key.split(':') as [Handedness, string];
      this.activeGestures.delete(key);
      onGestureEnd?.(handedness, gestureId);
    }
  }
}
