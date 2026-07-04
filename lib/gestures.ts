import { LM } from './landmarks';
import { PINCH_DEBOUNCE_MS, PINCH_ENTER_REL, PINCH_EXIT_REL } from './filters';

/**
 * Declarative definition of a touch gesture: two landmarks whose normalized
 * distance, when it drops below `enterRel` (and rises above `exitRel` to
 * release), counts as the gesture being held. The recognition layer iterates
 * this registry, so adding a gesture is a data edit — no new branches.
 */
export interface GestureDef {
  id: string;
  label: string;
  fingerA: number;
  fingerB: number;
  enterRel: number;
  exitRel: number;
  debounceMs: number;
}

/**
 * Thumb tip touching each other fingertip. Four gestures per hand; the action
 * layer (lib/actions.ts) binds each to a Left/Right-specific command.
 * Thresholds are shared from the tuned pinch constants and are per-gesture
 * overridable here if ring/pinky need loosening on a given camera.
 */
export const GESTURES: GestureDef[] = [
  gesture('thumb-index', 'Index', LM.INDEX_TIP),
  gesture('thumb-middle', 'Middle', LM.MIDDLE_TIP),
  gesture('thumb-ring', 'Ring', LM.RING_TIP),
  gesture('thumb-pinky', 'Pinky', LM.PINKY_TIP),
];

function gesture(id: string, label: string, fingerTip: number): GestureDef {
  return {
    id,
    label,
    fingerA: LM.THUMB_TIP,
    fingerB: fingerTip,
    enterRel: PINCH_ENTER_REL,
    exitRel: PINCH_EXIT_REL,
    debounceMs: PINCH_DEBOUNCE_MS,
  };
}
