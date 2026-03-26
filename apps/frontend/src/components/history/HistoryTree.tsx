import { ConnectionGroup } from './ConnectionGroup.js';
import { StoryGroup } from './StoryGroup.js';
import { GenerationCard } from './GenerationCard.js';
import type { ConnectionGroupData } from '../../hooks/useHistoryData.js';

interface HistoryTreeProps {
  groups: ConnectionGroupData[];
  onDownload: (generationId: string) => void;
}

export function HistoryTree({ groups, onDownload }: HistoryTreeProps) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map((connGroup, i) => (
        <ConnectionGroup
          key={connGroup.connectionId ?? 'orphan'}
          group={connGroup}
          defaultOpen={i === 0}
        >
          {connGroup.stories.map((storyGroup) => (
            <StoryGroup
              key={storyGroup.userStoryId ?? 'no-us'}
              group={storyGroup}
              defaultOpen={false}
            >
              {storyGroup.generations.map((gen) => (
                <GenerationCard key={gen.id} generation={gen} onDownload={onDownload} />
              ))}
            </StoryGroup>
          ))}
        </ConnectionGroup>
      ))}
    </div>
  );
}
