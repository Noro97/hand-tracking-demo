import { useCallback, useRef, useState } from 'react';

export interface ActiveFilters {
  active: readonly string[];
  toggle: (id: string) => void;
  /** Stable identity — safe to pass into an engine's effect deps. Reads via ref,
   *  so toggling filters never recreates the engine / restarts the camera
   *  (the task-017 lesson about callbacks in effect deps). */
  getActiveFilters: () => readonly string[];
}

export function useActiveFilters(): ActiveFilters {
  const [active, setActive] = useState<readonly string[]>([]);
  const activeRef = useRef(active);

  const toggle = useCallback((id: string) => {
    const current = activeRef.current;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    activeRef.current = next;
    setActive(next);
  }, []);

  const getActiveFilters = useCallback(() => activeRef.current, []);

  return { active, toggle, getActiveFilters };
}
