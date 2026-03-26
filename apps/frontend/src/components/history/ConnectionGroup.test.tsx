import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionGroup } from './ConnectionGroup.js';
import type { ConnectionGroupData } from '../../hooks/useHistoryData.js';

const makeGroup = (overrides: Partial<ConnectionGroupData> = {}): ConnectionGroupData => ({
  connectionId: 'conn-1',
  connectionName: 'Backend Jira',
  connectionType: 'jira',
  totalGenerations: 5,
  stories: [],
  ...overrides,
});

describe('ConnectionGroup', () => {
  it('should render connection name', () => {
    render(<ConnectionGroup group={makeGroup()} defaultOpen={false}><div /></ConnectionGroup>);
    expect(screen.getByText('Backend Jira')).toBeDefined();
  });

  it('should show Jira indicator (🔵) for type jira', () => {
    render(<ConnectionGroup group={makeGroup({ connectionType: 'jira' })} defaultOpen={false}><div /></ConnectionGroup>);
    expect(screen.getByText('🔵')).toBeDefined();
  });

  it('should show ADO indicator (🟣) for type azure_devops', () => {
    render(
      <ConnectionGroup
        group={makeGroup({ connectionType: 'azure_devops', connectionName: 'ADO Proj' })}
        defaultOpen={false}
      >
        <div />
      </ConnectionGroup>,
    );
    expect(screen.getByText('🟣')).toBeDefined();
  });

  it('should show ⚪ and "Non liées" when connectionName is null', () => {
    render(
      <ConnectionGroup
        group={makeGroup({ connectionId: null, connectionName: null, connectionType: null })}
        defaultOpen={false}
      >
        <div />
      </ConnectionGroup>,
    );
    expect(screen.getByText('⚪')).toBeDefined();
    expect(screen.getByText('Non liées')).toBeDefined();
  });

  it('should show totalGenerations count', () => {
    render(<ConnectionGroup group={makeGroup({ totalGenerations: 12 })} defaultOpen={false}><div /></ConnectionGroup>);
    expect(screen.getByText(/12 génération/)).toBeDefined();
  });

  it('should render children when defaultOpen is true', () => {
    render(
      <ConnectionGroup group={makeGroup()} defaultOpen={true}>
        <div data-testid="story-child">child</div>
      </ConnectionGroup>,
    );
    const content = screen.getByTestId('conn-group-content');
    expect(content.className).not.toContain('max-h-0');
  });

  it('should hide children when defaultOpen is false', () => {
    render(
      <ConnectionGroup group={makeGroup()} defaultOpen={false}>
        <div>child</div>
      </ConnectionGroup>,
    );
    const content = screen.getByTestId('conn-group-content');
    expect(content.className).toContain('max-h-0');
  });

  it('should toggle open/close on header button click', () => {
    render(
      <ConnectionGroup group={makeGroup()} defaultOpen={false}>
        <div>child</div>
      </ConnectionGroup>,
    );
    const header = screen.getByRole('button');
    const content = screen.getByTestId('conn-group-content');

    expect(content.className).toContain('max-h-0');
    fireEvent.click(header);
    expect(content.className).not.toContain('max-h-0');
  });
});
