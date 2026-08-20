import type { FC } from 'react';
import { Sparkles } from 'lucide-react';

export interface FilterPickerSection {
  title: string;
  items: ReadonlyArray<{ id: string; label: string }>;
  active: readonly string[];
  onToggle: (id: string) => void;
}

/** Chip panel for toggling AR filters / scene effects — one panel, one or more
 *  titled sections, shared by the face and hand screens. */
const FilterPicker: FC<{ sections: readonly FilterPickerSection[] }> = ({ sections }) => (
  <div className="absolute top-6 right-6 z-40 bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[200px] flex flex-col gap-4">
    {sections.map((section) => (
      <div key={section.title}>
        <p className="flex items-center gap-1.5 text-xs text-text-muted uppercase tracking-wider font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5" /> {section.title}
        </p>
        <div className="flex flex-wrap gap-2">
          {section.items.map((item) => {
            const isActive = section.active.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => section.onToggle(item.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  isActive
                    ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                    : 'bg-border/20 border-border text-text-muted'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

export default FilterPicker;
