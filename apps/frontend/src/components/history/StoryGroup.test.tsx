import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoryGroup } from './StoryGroup.js';
import type { StoryGroupData } from '../../hooks/useHistoryData.js';

const storyGroup: StoryGroupData = {
  userStoryId: 'us-1',
  userStoryTitle: 'Login utilisateur',
  userStoryExternalId: 'PROJ-42',
  generations: [
    {
      id: 'gen-1', analysisId: null, framework: 'playwright', language: 'typescript',
      usedImprovedVersion: false, llmProvider: 'openai', llmModel: 'gpt-4o',
      status: 'success', durationMs: null, createdAt: '2024-01-15T10:00:00Z',
      userStoryId: 'us-1', userStoryTitle: 'Login', userStoryExternalId: 'PROJ-42',
      connectionId: 'conn-1', connectionName: 'Backend', connectionType: 'jira',
    },
    {
      id: 'gen-2', analysisId: null, framework: 'selenium', language: 'python',
      usedImprovedVersion: false, llmProvider: 'openai', llmModel: 'gpt-4o',
      status: 'error', durationMs: null, createdAt: '2024-01-14T10:00:00Z',
      userStoryId: 'us-1', userStoryTitle: 'Login', userStoryExternalId: 'PROJ-42',
      connectionId: 'conn-1', connectionName: 'Backend', connectionType: 'jira',
    },
  ],
};

describe('StoryGroup', () => {
  it('should render user story externalId and title', () => {
    render(<StoryGroup group={storyGroup} defaultOpen={false}><div /></StoryGroup>);
    expect(screen.getByText('PROJ-42')).toBeDefined();
    expect(screen.getByText('Login utilisateur')).toBeDefined();
  });

  it('should show generation count', () => {
    render(<StoryGroup group={storyGroup} defaultOpen={false}><div /></StoryGroup>);
    expect(screen.getByText(/2 génération/)).toBeDefined();
  });

  it('should render children when defaultOpen is true', () => {
    render(
      <StoryGroup group={storyGroup} defaultOpen={true}>
        <div data-testid="child-content">enfant</div>
      </StoryGroup>,
    );
    const content = screen.getByTestId('group-content');
    expect(content.className).toContain('max-h-');
    expect(content.className).not.toContain('max-h-0');
  });

  it('should hide children when defaultOpen is false', () => {
    render(
      <StoryGroup group={storyGroup} defaultOpen={false}>
        <div>enfant</div>
      </StoryGroup>,
    );
    const content = screen.getByTestId('group-content');
    expect(content.className).toContain('max-h-0');
  });

  it('should toggle open/close on header button click', () => {
    render(
      <StoryGroup group={storyGroup} defaultOpen={false}>
        <div>enfant</div>
      </StoryGroup>,
    );
    const header = screen.getByRole('button');
    const content = screen.getByTestId('group-content');

    expect(content.className).toContain('max-h-0');
    fireEvent.click(header);
    expect(content.className).not.toContain('max-h-0');
    fireEvent.click(header);
    expect(content.className).toContain('max-h-0');
  });

  it('should show "Sans titre" when title is null', () => {
    const noTitle: StoryGroupData = { ...storyGroup, userStoryTitle: null };
    render(<StoryGroup group={noTitle} defaultOpen={false}><div /></StoryGroup>);
    expect(screen.getByText('Sans titre')).toBeDefined();
  });

  it('should show "—" when externalId is null', () => {
    const noExtId: StoryGroupData = { ...storyGroup, userStoryExternalId: null };
    render(<StoryGroup group={noExtId} defaultOpen={false}><div /></StoryGroup>);
    expect(screen.getByText('—')).toBeDefined();
  });
});
