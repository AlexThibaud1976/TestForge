import { useState } from 'react';
import { api } from '../../lib/api.js';

type ConnectionType = 'jira' | 'azure_devops';

interface StepConnectionProps {
  onComplete: () => void;
}

export function StepConnection({ onComplete }: StepConnectionProps) {
  const [type, setType] = useState<ConnectionType>('jira');
  const [name, setName] = useState('Mon projet Jira');
  // Jira fields
  const [baseUrl, setBaseUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [projectKey, setProjectKey] = useState('');
  // ADO fields
  const [orgUrl, setOrgUrl] = useState('');
  const [pat, setPat] = useState('');
  const [project, setProject] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (t: ConnectionType) => {
    setType(t);
    setName(t === 'jira' ? 'Mon projet Jira' : 'Mon projet ADO');
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = type === 'jira'
        ? { type: 'jira', name, baseUrl, email, apiToken, projectKey }
        : { type: 'azure_devops', name, baseUrl: orgUrl, pat, project };
      await api.post('/api/connections', body);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Connectez votre outil de gestion de projet pour importer vos user stories.
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Type de connexion</label>
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as ConnectionType)}
          className={inputClass}
          data-testid="connection-type"
        >
          <option value="jira">Jira Cloud</option>
          <option value="azure_devops">Azure DevOps</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nom de la connexion</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      {type === 'jira' ? (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL Jira (ex: https://acme.atlassian.net)</label>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={inputClass} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">API Token</label>
            <input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Clé de projet (ex: PROJ)</label>
            <input value={projectKey} onChange={(e) => setProjectKey(e.target.value)} className={inputClass} />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL organisation (ex: https://dev.azure.com/acme)</label>
            <input value={orgUrl} onChange={(e) => setOrgUrl(e.target.value)} className={inputClass} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nom du projet</label>
            <input value={project} onChange={(e) => setProject(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Personal Access Token (PAT)</label>
            <input type="password" value={pat} onChange={(e) => setPat(e.target.value)} className={inputClass} />
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={() => void handleSave()}
        disabled={saving}
        className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Sauvegarde...' : 'Sauvegarder et continuer →'}
      </button>
    </div>
  );
}
