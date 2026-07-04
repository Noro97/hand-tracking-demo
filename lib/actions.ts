import type { Handedness } from './recognition';

export type ActionId =
  | 'paint'
  | 'toggle-eraser'
  | 'cycle-color'
  | 'clear'
  | 'toggle-draw'
  | 'cycle-effect'
  | 'cycle-size'
  | 'snapshot';

export interface ActionDef {
  id: ActionId;
  label: string;
}

/**
 * Code-defined gesture → action binding. Right hand = drawing tools, Left hand
 * = modifiers/global. Keyed by handedness then gesture id; the interaction
 * controller looks up the action when a gesture starts/ends.
 *
 * 'paint' is momentary (active while the gesture is held); every other action
 * is a trigger that fires once on gesture start.
 */
export const ACTION_MAP: Record<Handedness, Record<string, ActionDef>> = {
  Right: {
    'thumb-index': { id: 'paint', label: 'Paint' },
    'thumb-middle': { id: 'toggle-eraser', label: 'Eraser' },
    'thumb-ring': { id: 'cycle-color', label: 'Color' },
    'thumb-pinky': { id: 'clear', label: 'Clear' },
  },
  Left: {
    'thumb-index': { id: 'toggle-draw', label: 'Draw on/off' },
    'thumb-middle': { id: 'cycle-effect', label: 'Effect' },
    'thumb-ring': { id: 'cycle-size', label: 'Size' },
    'thumb-pinky': { id: 'snapshot', label: 'Snapshot' },
  },
};

export function lookupAction(handedness: Handedness, gestureId: string): ActionDef | null {
  return ACTION_MAP[handedness]?.[gestureId] ?? null;
}
