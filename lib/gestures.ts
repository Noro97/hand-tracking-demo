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
 * Thumb tip touching the index fingertip — the one gesture the BBT
 * measurement loop (`features/bbtSession.ts`) reacts to as a "grab".
 */
export const GESTURES: GestureDef[] = [gesture('thumb-index', 'Index', LM.INDEX_TIP)];

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
