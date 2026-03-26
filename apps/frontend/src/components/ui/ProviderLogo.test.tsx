import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderLogo } from './ProviderLogo';

describe('ProviderLogo', () => {
  it('provider "openai" → renders an img with src containing "openai"', () => {
    render(<ProviderLogo provider="openai" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toMatch(/openai/);
  });

  it('provider "mistral" → renders an img with src containing "mistral"', () => {
    render(<ProviderLogo provider="mistral" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toMatch(/mistral/);
  });

  it('provider "anthropic" → no img, shows fallback icon + "Claude"', () => {
    render(<ProviderLogo provider="anthropic" showLabel />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Claude')).toBeInTheDocument();
  });

  it('provider "azure_openai" → no img, shows fallback + "Azure OpenAI"', () => {
    render(<ProviderLogo provider="azure_openai" showLabel />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Azure OpenAI')).toBeInTheDocument();
  });

  it('provider "azure_devops" → no img, shows fallback + "Azure DevOps"', () => {
    render(<ProviderLogo provider="azure_devops" showLabel />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Azure DevOps')).toBeInTheDocument();
  });

  it('provider "xray" → no img, shows fallback + "Xray"', () => {
    render(<ProviderLogo provider="xray" showLabel />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Xray')).toBeInTheDocument();
  });

  it('showLabel=true → label text always visible (even with a logo)', () => {
    render(<ProviderLogo provider="openai" showLabel />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('showLabel=false (default) + logo → no label text', () => {
    render(<ProviderLogo provider="openai" showLabel={false} />);
    expect(screen.queryByText('OpenAI')).toBeNull();
  });

  it('size prop → img or svg rendered with correct dimensions', () => {
    render(<ProviderLogo provider="openai" size={24} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('width')).toBe('24');
    expect(img.getAttribute('height')).toBe('24');
  });
});
