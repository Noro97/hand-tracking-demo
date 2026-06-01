/**
 * Centralised palette. Canvas drawing reads these directly; Tailwind reads the
 * same values via `@theme` variables declared in `index.css`. Keep both in sync.
 */
export const COLORS = {
  bgPage: '#121212',
  bgSurface: '#1e1e1e',
  bgSurfaceMuted: '#252525',
  border: '#444746',
  textPrimary: '#e3e3e3',
  textMuted: '#c4c7c5',
  textDim: '#757575',
  accentBlue: '#42a5f5',
  accentGreen: '#66bb6a',
  accentYellow: '#fdd835',
  accentRed: '#ef5350',
  landmarkLine: '#669df6',
  landmarkPoint: '#aecbfa',
  cursorIdle: '#ffffff',
  videoOverlay: 'rgba(18, 18, 18, 0.55)',
} as const;

// Pointer indicator geometry.
export const POINTER_RADIUS_IDLE = 20;
export const POINTER_RADIUS_PINCH = 28;
export const POINTER_DOT_RADIUS = 6;
