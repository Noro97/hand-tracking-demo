export type EffectId = 'none' | 'invert' | 'blur' | 'grayscale';

export const EFFECTS: EffectId[] = ['none', 'invert', 'blur', 'grayscale'];

/** Canvas `filter` string for an effect, applied to the video frame draw. */
export function effectToFilter(effect: EffectId): string {
  switch (effect) {
    case 'invert':
      return 'invert(1)';
    case 'blur':
      return 'blur(6px)';
    case 'grayscale':
      return 'grayscale(1)';
    default:
      return 'none';
  }
}
