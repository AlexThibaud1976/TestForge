import { Button } from './ui/button.js';
import { Badge } from './ui/badge.js';

interface ConnectionBadgeProps {
  name: string | null;
  type: 'jira' | 'azure_devops' | null;
  connectionId: string | null;
  onClick?: (connectionId: string) => void;
}

export function ConnectionBadge({ name, type, connectionId, onClick }: ConnectionBadgeProps) {
  if (!name) {
    return <Badge variant="secondary" className="text-gray-400 italic font-normal">Projet supprimé</Badge>;
  }

  const truncated = name.length > 20 ? name.slice(0, 20) + '…' : name;

  const indicator =
    type === 'jira' ? (
      <span className="inline-block w-2 h-2 rounded-full bg-blue-600 shrink-0" aria-label="Jira" />
    ) : (
      <span
        className="inline-block w-2 h-2 rounded-full bg-purple-600 shrink-0"
        aria-label="Azure DevOps"
      />
    );

  const baseClass =
    'flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5';

  if (onClick && connectionId) {
    return (
      <Button
        variant="ghost"
        size="xs"
        onClick={(e) => {
          e.stopPropagation();
          onClick(connectionId);
        }}
        className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 h-auto hover:bg-gray-100"
      >
        {indicator}
        <span>{truncated}</span>
      </Button>
    );
  }

  return (
    <span className={baseClass}>
      {indicator}
      <span>{truncated}</span>
    </span>
  );
}
