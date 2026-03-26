import { useState } from 'react';
import type { StoryGroupData } from '../../hooks/useHistoryData.js';

interface StoryGroupProps {
  group: StoryGroupData;
  defaultOpen: boolean;
  children: React.ReactNode;
}

export function StoryGroup({ group, defaultOpen, children }: StoryGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const count = group.generations.length;

  return (
    <div className="ml-6 border-l-2 border-gray-100 pl-3 mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-2 text-left hover:bg-gray-50 rounded px-2 group"
      >
        <span
          className={`text-gray-400 text-xs transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
        >
          ►
        </span>
        <span className="text-xs font-mono text-gray-400 shrink-0">
          {group.userStoryExternalId ?? '—'}
        </span>
        <span className="text-sm text-gray-700 truncate flex-1">
          {group.userStoryTitle ?? 'Sans titre'}
        </span>
        <span className="text-xs text-gray-400 ml-auto shrink-0">
          {count} génération{count !== 1 ? 's' : ''}
        </span>
      </button>
      <div
        data-testid="group-content"
        className={`overflow-hidden transition-all duration-150 ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}
      >
        <div className="space-y-1.5 py-1">{children}</div>
      </div>
    </div>
  );
}
