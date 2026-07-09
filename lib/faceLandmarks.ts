/**
 * MediaPipe Face Mesh emits 468 landmarks per face in a fixed order (478 with
 * refineLandmarks, adding irises). This module names the handful of indices
 * the metrics layer reads, so recognition code never deals in magic numbers.
 * Index reference: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
 *
 * "LEFT"/"RIGHT" are the SUBJECT's left/right (MediaPipe's convention), not
 * screen-side — the on-screen mirror (scaleX(-1)) is a render-only concern.
 */
export const FL = {
  // Right eye (subject's right)
  RIGHT_EYE_OUTER: 33,
  RIGHT_EYE_INNER: 133,
  RIGHT_EYE_UPPER: 159,
  RIGHT_EYE_LOWER: 145,
  // Left eye (subject's left)
  LEFT_EYE_OUTER: 263,
  LEFT_EYE_INNER: 362,
  LEFT_EYE_UPPER: 386,
  LEFT_EYE_LOWER: 374,
  // Mouth (inner lips + corners)
  MOUTH_CORNER_RIGHT: 61,
  MOUTH_CORNER_LEFT: 291,
  LIP_UPPER_INNER: 13,
  LIP_LOWER_INNER: 14,
  // Face frame
  TEMPLE_RIGHT: 234,
  TEMPLE_LEFT: 454,
  CHIN: 152,
  FOREHEAD: 10,
  NOSE_TIP: 1,
} as const;
