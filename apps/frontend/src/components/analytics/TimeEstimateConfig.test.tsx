import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../lib/api.js', () => ({
  api: { put: vi.fn() },
}));

import { api } from '../../lib/api.js';
import { TimeEstimateConfig } from './TimeEstimateConfig.js';

describe('TimeEstimateConfig', () => {
  it('should show the current value in the input', () => {
    render(<TimeEstimateConfig currentValue={30} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByTestId('estimate-input') as HTMLInputElement;
    expect(input.value).toBe('30');
  });

  it('should call api.put with new value when saved', async () => {
    vi.mocked(api.put).mockResolvedValue({ manualTestMinutes: 45 });
    const onSave = vi.fn();

    render(<TimeEstimateConfig currentValue={30} onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByTestId('estimate-input'), { target: { value: '45' } });
    fireEvent.click(screen.getByText('Sauvegarder'));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(api.put).toHaveBeenCalledWith('/api/analytics/test-estimate', { manualTestMinutes: 45 });
  });

  it('should call onCancel when Cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<TimeEstimateConfig currentValue={30} onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Annuler'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('should show error message on API failure', async () => {
    vi.mocked(api.put).mockRejectedValue(new Error('Accès refusé'));
    render(<TimeEstimateConfig currentValue={30} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Sauvegarder'));
    await waitFor(() => expect(screen.getByText('Accès refusé')).toBeDefined());
  });

  it('should disable save button while saving', async () => {
    vi.mocked(api.put).mockImplementation(() => new Promise(() => {})); // never resolves
    render(<TimeEstimateConfig currentValue={30} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Sauvegarder'));
    await waitFor(() => expect(screen.getByText('Sauvegarde...')).toBeDefined());
  });
});
