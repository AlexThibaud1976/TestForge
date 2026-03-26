import type { LucideIcon } from 'lucide-react';
import { Bot, Plug, GitBranch, TestTube2, HelpCircle, Cloud } from 'lucide-react';

// SVG logo imports (bundlés statiquement par Vite)
import openaiLogo from '../../assets/logos/openai.svg';
import mistralLogo from '../../assets/logos/mistral.svg';
import ollamaLogo from '../../assets/logos/ollama.svg';
import jiraLogo from '../../assets/logos/jira.svg';
import githubLogo from '../../assets/logos/github.svg';
import gitlabLogo from '../../assets/logos/gitlab.svg';
import playwrightLogo from '../../assets/logos/playwright.svg';
import seleniumLogo from '../../assets/logos/selenium.svg';
import cypressLogo from '../../assets/logos/cypress.svg';

/** Providers supportés par le registry. */
export type LogoProvider =
  | 'openai' | 'anthropic' | 'mistral' | 'azure_openai' | 'ollama'
  | 'jira' | 'azure_devops' | 'xray' | 'github' | 'gitlab' | 'azure_repos'
  | 'playwright' | 'selenium' | 'cypress';

interface ProviderMeta {
  logo: string | null;
  label: string;
  FallbackIcon: LucideIcon;
}

const PROVIDER_REGISTRY: Record<LogoProvider, ProviderMeta> = {
  openai:       { logo: openaiLogo,     label: 'OpenAI',       FallbackIcon: Bot },
  anthropic:    { logo: null,           label: 'Claude',       FallbackIcon: Bot },
  mistral:      { logo: mistralLogo,    label: 'Mistral AI',   FallbackIcon: Bot },
  azure_openai: { logo: null,           label: 'Azure OpenAI', FallbackIcon: Cloud },
  ollama:       { logo: ollamaLogo,     label: 'Ollama',       FallbackIcon: Bot },
  jira:         { logo: jiraLogo,       label: 'Jira',         FallbackIcon: Plug },
  azure_devops: { logo: null,           label: 'Azure DevOps', FallbackIcon: Plug },
  xray:         { logo: null,           label: 'Xray',         FallbackIcon: TestTube2 },
  github:       { logo: githubLogo,     label: 'GitHub',       FallbackIcon: GitBranch },
  gitlab:       { logo: gitlabLogo,     label: 'GitLab',       FallbackIcon: GitBranch },
  azure_repos:  { logo: null,           label: 'Azure Repos',  FallbackIcon: GitBranch },
  playwright:   { logo: playwrightLogo, label: 'Playwright',   FallbackIcon: TestTube2 },
  selenium:     { logo: seleniumLogo,   label: 'Selenium',     FallbackIcon: TestTube2 },
  cypress:      { logo: cypressLogo,    label: 'Cypress',      FallbackIcon: TestTube2 },
};

/** Props du composant ProviderLogo. */
export interface ProviderLogoProps {
  /** Identifiant du provider. */
  provider: LogoProvider;
  /** Taille en pixels (logo ou icône). Défaut : 20. */
  size?: number;
  /** Affiche toujours le label texte. Défaut : false. */
  showLabel?: boolean;
  /** Classes CSS supplémentaires. */
  className?: string;
}

/**
 * Affiche le logo officiel d'un provider tiers, ou un fallback Lucide + texte
 * pour les marques sans press kit public autorisé.
 *
 * Providers avec logo SVG : openai, mistral, ollama, jira, github, gitlab, playwright, selenium, cypress.
 * Providers avec fallback icône : anthropic, azure_openai, azure_devops, xray, azure_repos.
 */
export function ProviderLogo({ provider, size = 20, showLabel = false, className = '' }: ProviderLogoProps) {
  const meta = PROVIDER_REGISTRY[provider] ?? {
    logo: null,
    label: provider,
    FallbackIcon: HelpCircle,
  };

  const { logo, label, FallbackIcon } = meta;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {logo ? (
        <img src={logo} alt={label} width={size} height={size} />
      ) : (
        <FallbackIcon size={size} className="text-gray-500 shrink-0" />
      )}
      {showLabel && (
        <span className="text-sm text-gray-700">{label}</span>
      )}
    </span>
  );
}
