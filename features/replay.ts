import { BBTSessionController, type BBTSessionSummary } from './bbtSession';
import { GestureEventDispatcher } from '../lib/gestureEventDispatcher';
import { HandRecognizer, type Handedness } from '../lib/recognition';
import type { RecordedFixture } from '../lib/fixtures';

export interface ReplayOptions {
  selectedHand: Handedness;
  /** Session length in ms — should be >= the fixture's recorded duration or the session will time out mid-replay. */
  durationMs?: number;
}

export interface ReplayResult {
  summary: BBTSessionSummary;
  /** The controller's final state, in case the recording ended mid-rep (session never stopped). */
  finalBlockCount: number;
}

/**
 * Replays a recorded (or hand-authored) fixture through the exact same
 * recognition → gesture-edge-detection → BBT-counting pipeline `HandEngine`
 * drives live, headlessly — no camera, no canvas, no DOM. This is what makes
 * a real bug captured on a real camera (via the debug panel's Record button)
 * reproducible and fixable without ever touching a webcam again.
 *
 * Deliberately reuses `GestureEventDispatcher` and `HandRecognizer` directly
 * (not a reimplementation) so replay can't silently drift from what
 * `HandEngine.onResults` actually does.
 */
export function replayFixture(fixture: RecordedFixture, options: ReplayOptions): ReplayResult {
  const recognizer = new HandRecognizer();
  const dispatcher = new GestureEventDispatcher();

  // The controller's timing logic (RELABEL_GRACE_MS, rep duration/speed, session
  // countdown) all read `now()` — drive it from the fixture's recorded tMs
  // instead of the real clock, so a fixture replays at its ORIGINAL timing
  // regardless of how fast the replay loop itself executes.
  let simulatedNow = 0;
  const controller = new BBTSessionController(
    () => fixture.meta.canvasWidth,
    () => {},
    () => simulatedNow,
  );

  controller.start(options.selectedHand, options.durationMs ?? fixture.meta.durationMs + 1);

  for (const frame of fixture.frames) {
    simulatedNow = frame.tMs;

    const observations = frame.hands
      .map((hand) =>
        recognizer.recognize(
          hand.handedness,
          hand.landmarks,
          fixture.meta.canvasWidth,
          fixture.meta.canvasHeight,
          frame.tMs,
          hand.score,
        ),
      )
      .filter((obs) => obs !== null);

    recognizer.retainOnly(new Set(frame.hands.map((h) => h.handedness)));
    dispatcher.dispatch(
      observations,
      controller.handleGestureStart.bind(controller),
      controller.handleGestureEnd.bind(controller),
    );
    controller.frame(observations);
  }

  const summary = controller.stop();
  return { summary, finalBlockCount: summary.blockCount };
}
