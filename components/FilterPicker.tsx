import type { FC } from 'react';
import { Sparkles } from 'lucide-react';

import type { FilterDef } from '../lib/filterRenderers';

/** Chip panel for toggling AR filters — shared by the face and hand screens. */
const FilterPicker: FC<{
  filters: readonly FilterDef[];
  active: readonly string[];
  onToggle: (id: string) => void;
}> = ({ filters, active, onToggle }) => (
  <div className="absolute top-6 right-6 z-40 bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[200px]">
    <p className="flex items-center gap-1.5 text-xs text-text-muted uppercase tracking-wider font-medium mb-3">
      <Sparkles className="w-3.5 h-3.5" /> Filters
    </p>
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const isActive = active.includes(filter.id);
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onToggle(filter.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              isActive
                ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                : 'bg-border/20 border-border text-text-muted'
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default FilterPicker;
