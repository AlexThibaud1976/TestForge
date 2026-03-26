import { useState } from 'react';
import { api } from '../../lib/api.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select.js';

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Connectez votre outil de gestion de projet pour importer vos user stories.
      </p>

      <div>
        <Label className="block text-xs font-medium text-gray-700 mb-1">Type de connexion</Label>
        <Select
          value={type}
          onValueChange={(v) => handleTypeChange(v as ConnectionType)}
          data-testid="connection-type"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jira">Jira Cloud</SelectItem>
            <SelectItem value="azure_devops">Azure DevOps</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="block text-xs font-medium text-gray-700 mb-1">Nom de la connexion</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {type === 'jira' ? (
        <>
          <div>
            <Label className="block text-xs font-medium text-gray-700 mb-1">URL Jira (ex: https://acme.atlassian.net)</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-700 mb-1">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-700 mb-1">API Token</Label>
            <Input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-700 mb-1">Clé de projet (ex: PROJ)</Label>
            <Input value={projectKey} onChange={(e) => setProjectKey(e.target.value)} />
          </div>
        </>
      ) : (
        <>
          <div>
            <Label className="block text-xs font-medium text-gray-700 mb-1">URL organisation (ex: https://dev.azure.com/acme)</Label>
            <Input value={orgUrl} onChange={(e) => setOrgUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-700 mb-1">Nom du projet</Label>
            <Input value={project} onChange={(e) => setProject(e.target.value)} />
          </div>
          <div>
            <Label className="block text-xs font-medium text-gray-700 mb-1">Personal Access Token (PAT)</Label>
            <Input type="password" value={pat} onChange={(e) => setPat(e.target.value)} />
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button
        onClick={() => void handleSave()}
        disabled={saving}
        className="w-full"
      >
        {saving ? 'Sauvegarde...' : 'Sauvegarder et continuer →'}
      </Button>
    </div>
  );
}
