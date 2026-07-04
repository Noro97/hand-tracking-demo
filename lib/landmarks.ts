/**
 * MediaPipe Hands emits 21 landmarks per hand in a fixed order. This module
 * names every index and groups them by finger so recognition code never deals
 * in magic numbers.
 * Index reference: https://google.github.io/mediapipe/solutions/hands#hand-landmark-model
 */
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export const FINGER_TIP: Record<FingerName, number> = {
  thumb: LM.THUMB_TIP,
  index: LM.INDEX_TIP,
  middle: LM.MIDDLE_TIP,
  ring: LM.RING_TIP,
  pinky: LM.PINKY_TIP,
};

export const FINGER_MCP: Record<FingerName, number> = {
  thumb: LM.THUMB_MCP,
  index: LM.INDEX_MCP,
  middle: LM.MIDDLE_MCP,
  ring: LM.RING_MCP,
  pinky: LM.PINKY_MCP,
};
