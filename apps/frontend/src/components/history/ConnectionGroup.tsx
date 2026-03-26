import { useState } from 'react';
import type { ConnectionGroupData } from '../../hooks/useHistoryData.js';

interface ConnectionGroupProps {
  group: ConnectionGroupData;
  defaultOpen: boolean;
  children: React.ReactNode;
}

export function ConnectionGroup({ group, defaultOpen, children }: ConnectionGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const count = group.totalGenerations;

  const icon =
    group.connectionType === 'jira'
      ? '🔵'
      : group.connectionType === 'azure_devops'
        ? '🟣'
        : '⚪';

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className={`text-gray-400 text-xs transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
          ►
        </span>
        <span className="text-base leading-none">{icon}</span>
        <span className="font-medium text-gray-900 flex-1 truncate">
          {group.connectionName ?? 'Non liées'}
        </span>
        <span className="text-xs text-gray-400 ml-auto shrink-0">
          {count} génération{count !== 1 ? 's' : ''}
        </span>
      </button>
      <div
        data-testid="conn-group-content"
        className={`overflow-hidden transition-all duration-150 ${isOpen ? 'max-h-[4000px]' : 'max-h-0'}`}
      >
        <div className="p-3 space-y-1">{children}</div>
      </div>
    </div>
  );
}
