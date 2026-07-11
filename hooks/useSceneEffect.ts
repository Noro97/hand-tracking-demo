import { useCallback, useRef, useState } from 'react';

export interface SceneEffectSelection {
  active: string | null;
  /** Selecting the already-active effect deselects it (chip acts as a toggle). */
  select: (id: string) => void;
  /** Stable identity — safe in an engine's effect deps; reads via ref so
   *  switching effects never restarts the camera (task-017 lesson). */
  getActiveSceneEffect: () => string | null;
}

/** Single-select counterpart of useActiveFilters, for the two-hand scene effect. */
export function useSceneEffect(): SceneEffectSelection {
  const [active, setActive] = useState<string | null>(null);
  const activeRef = useRef(active);

  const select = useCallback((id: string) => {
    const next = activeRef.current === id ? null : id;
    activeRef.current = next;
    setActive(next);
  }, []);

  const getActiveSceneEffect = useCallback(() => activeRef.current, []);

  return { active, select, getActiveSceneEffect };
}
