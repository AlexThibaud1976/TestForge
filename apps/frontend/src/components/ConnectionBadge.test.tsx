import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionBadge } from './ConnectionBadge.js';

describe('ConnectionBadge', () => {
  it('should render the connection name', () => {
    render(<ConnectionBadge name="Backend API" type="jira" connectionId="123" />);
    expect(screen.getByText('Backend API')).toBeDefined();
  });

  it('should truncate name longer than 20 characters', () => {
    render(
      <ConnectionBadge name="Very Long Project Name That Exceeds" type="jira" connectionId="123" />,
    );
    expect(screen.getByText('Very Long Project Na…')).toBeDefined();
  });

  it('should display a Jira-style indicator for type jira', () => {
    const { container } = render(
      <ConnectionBadge name="X" type="jira" connectionId="123" />,
    );
    expect(container.querySelector('.bg-blue-600')).not.toBeNull();
  });

  it('should display an ADO-style indicator for type azure_devops', () => {
    const { container } = render(
      <ConnectionBadge name="X" type="azure_devops" connectionId="123" />,
    );
    expect(container.querySelector('.bg-purple-600')).not.toBeNull();
  });

  it('should call onClick with connectionId when clicked', () => {
    const onClick = vi.fn();
    render(<ConnectionBadge name="X" type="jira" connectionId="abc" onClick={onClick} />);
    fireEvent.click(screen.getByText('X'));
    expect(onClick).toHaveBeenCalledWith('abc');
  });

  it('should render fallback for missing connection', () => {
    render(<ConnectionBadge name={null} type={null} connectionId={null} />);
    expect(screen.getByText('Projet supprimé')).toBeDefined();
  });
});
