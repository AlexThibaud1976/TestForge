import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

interface Connection {
  id: string;
  type: 'jira' | 'azure_devops';
  name: string;
  baseUrl: string;
  projectKey: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  xrayClientId?: string | null;
  hasXray?: boolean;
}

type FormType = 'jira' | 'azure_devops' | null;

export function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showForm, setShowForm] = useState<FormType>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, boolean | string>>({});
  const [xrayFormId, setXrayFormId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Connection[]>('/api/connections')
      .then((data) => { setConnections(data); setLoading(false); })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Erreur de chargement');
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette connexion ?')) return;
    await api.delete(`/api/connections/${id}`);
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await api.post(`/api/connections/${id}/test`, {});
      setTestResult((prev) => ({ ...prev, [id]: true }));
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : 'Erreur' }));
    } finally {
      setTestingId(null);
    }
  };

  const handleCreated = (conn: Connection) => {
    setConnections((prev) => [...prev, conn]);
    setShowForm(null);
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Connexions</h1>
          <p className="text-sm text-gray-500 mt-1">Jira Cloud et Azure DevOps</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm('jira')}
            className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Jira
          </button>
          <button
            onClick={() => setShowForm('azure_devops')}
            className="px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            + Azure DevOps
          </button>
        </div>
      </div>

      {showForm === 'jira' && (
        <JiraForm onCreated={handleCreated} onCancel={() => setShowForm(null)} />
      )}
      {showForm === 'azure_devops' && (
        <ADOForm onCreated={handleCreated} onCancel={() => setShowForm(null)} />
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : loadError ? (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-4">
          Erreur : {loadError}
        </div>
      ) : connections.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🔌</p>
          <p className="text-sm">Aucune connexion. Ajoutez Jira ou Azure DevOps.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => (
            <div key={conn.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{conn.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {conn.type === 'jira' ? 'Jira' : 'Azure DevOps'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{conn.baseUrl} · {conn.projectKey}</p>
                  {conn.lastSyncAt && (
                    <p className="text-xs text-gray-400">
                      Synchro: {new Date(conn.lastSyncAt).toLocaleString('fr-FR')}
                    </p>
                  )}
                  {conn.type === 'jira' && (
                    <p className="text-xs mt-1">
                      {conn.hasXray
                        ? <span className="text-green-600">✅ Xray configuré ({conn.xrayClientId})</span>
                        : <span className="text-gray-400">Xray non configuré</span>}
                    </p>
                  )}
                  {testResult[conn.id] !== undefined && (
                    <p className={`text-xs mt-1 ${testResult[conn.id] === true ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult[conn.id] === true ? '✓ Connexion OK' : `✗ ${String(testResult[conn.id])}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => void handleTest(conn.id)}
                    disabled={testingId === conn.id}
                    className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {testingId === conn.id ? '...' : 'Tester'}
                  </button>
                  {conn.type === 'jira' && (
                    <button
                      onClick={() => setXrayFormId(xrayFormId === conn.id ? null : conn.id)}
                      className="text-xs px-2 py-1 border border-purple-200 rounded text-purple-600 hover:bg-purple-50"
                    >
                      🔗 Xray
                    </button>
                  )}
                  <button
                    onClick={() => void handleDelete(conn.id)}
                    className="text-xs px-2 py-1 border border-red-200 rounded text-red-500 hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              {xrayFormId === conn.id && conn.type === 'jira' && (
                <XrayConfigForm
                  connectionId={conn.id}
                  currentClientId={conn.xrayClientId ?? null}
                  onSaved={(updated) => {
                    setConnections((prev) => prev.map((c) => c.id === conn.id ? { ...c, ...updated } : c));
                    setXrayFormId(null);
                  }}
                  onCancel={() => setXrayFormId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Formulaire Jira ──────────────────────────────────────────────────────────

function JiraForm({ onCreated, onCancel }: { onCreated: (c: Connection) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', baseUrl: '', email: '', apiToken: '', projectKey: '', xrayClientId: '', xrayClientSecret: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        type: 'jira',
        name: form.name,
        baseUrl: form.baseUrl,
        email: form.email,
        apiToken: form.apiToken,
        projectKey: form.projectKey,
        ...(form.xrayClientId && form.xrayClientSecret ? {
          xrayClientId: form.xrayClientId,
          xrayClientSecret: form.xrayClientSecret,
        } : {}),
      };
      const conn = await api.post<Connection>('/api/connections', body);
      onCreated(conn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 space-y-3">
      <h3 className="text-sm font-semibold text-blue-800">Nouvelle connexion Jira Cloud</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom affiché" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Jira Acme" />
        <Field label="URL Jira" value={form.baseUrl} onChange={(v) => setForm({ ...form, baseUrl: v })} placeholder="https://acme.atlassian.net" />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@acme.com" />
        <Field label="API Token" value={form.apiToken} onChange={(v) => setForm({ ...form, apiToken: v })} placeholder="ATATxxxx..." type="password" />
        <Field label="Project Key" value={form.projectKey} onChange={(v) => setForm({ ...form, projectKey: v })} placeholder="ACME" />
      </div>

      <div className="border-t border-blue-200 pt-3">
        <p className="text-xs font-medium text-blue-700 mb-2">🔗 Xray Cloud (optionnel)</p>
        <div className="grid grid-cols-2 gap-3">
          <OptionalField label="Client ID" value={form.xrayClientId} onChange={(v) => setForm({ ...form, xrayClientId: v })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx" />
          <OptionalField label="Client Secret" value={form.xrayClientSecret} onChange={(v) => setForm({ ...form, xrayClientSecret: v })} placeholder="secret..." type="password" />
        </div>
        <p className="text-xs text-blue-500 mt-1">Obtenez vos clés dans Xray Cloud → API Keys. Laissez vide si non utilisé.</p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Création...' : 'Créer'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ─── Formulaire Xray inline (sur connexion existante) ─────────────────────────

function XrayConfigForm({ connectionId, currentClientId, onSaved, onCancel }: {
  connectionId: string;
  currentClientId: string | null;
  onSaved: (data: { xrayClientId: string | null; hasXray: boolean }) => void;
  onCancel: () => void;
}) {
  const [clientId, setClientId] = useState(currentClientId ?? '');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.put<{ xrayClientId: string | null; hasXray: boolean }>(
        `/api/connections/${connectionId}/xray`,
        { clientId: clientId || null, clientSecret: clientSecret || null },
      );
      onSaved(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Retirer la config Xray de cette connexion ?')) return;
    setLoading(true);
    try {
      const data = await api.put<{ xrayClientId: string | null; hasXray: boolean }>(
        `/api/connections/${connectionId}/xray`,
        { clientId: null, clientSecret: null },
      );
      onSaved(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSave(e)} className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-purple-800">🔗 Configuration Xray Cloud</p>
      <div className="grid grid-cols-2 gap-2">
        <OptionalField label="Client ID" value={clientId} onChange={setClientId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx" />
        <OptionalField label="Client Secret" value={clientSecret} onChange={setClientSecret} placeholder={currentClientId ? '(inchangé si vide)' : 'secret...'} type="password" />
      </div>
      <p className="text-xs text-purple-500">Xray Cloud → Settings → API Keys</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        {currentClientId && (
          <button type="button" onClick={() => void handleRemove()} disabled={loading} className="px-2 py-1 text-xs border border-red-200 text-red-500 rounded hover:bg-red-50">
            Retirer Xray
          </button>
        )}
        <button type="button" onClick={onCancel} className="px-2 py-1 text-xs border border-gray-200 text-gray-500 rounded hover:bg-gray-50">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ─── Formulaire Azure DevOps ──────────────────────────────────────────────────

function ADOForm({ onCreated, onCancel }: { onCreated: (c: Connection) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', baseUrl: '', pat: '', project: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const conn = await api.post<Connection>('/api/connections', { type: 'azure_devops', ...form });
      onCreated(conn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4 space-y-3">
      <h3 className="text-sm font-semibold text-indigo-800">Nouvelle connexion Azure DevOps</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom affiché" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="ADO Acme" />
        <Field label="URL organisation" value={form.baseUrl} onChange={(v) => setForm({ ...form, baseUrl: v })} placeholder="https://dev.azure.com/myorg" />
        <Field label="Personal Access Token" value={form.pat} onChange={(v) => setForm({ ...form, pat: v })} placeholder="xxxxx..." type="password" />
        <Field label="Projet" value={form.project} onChange={(v) => setForm({ ...form, project: v })} placeholder="MyProject" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Création...' : 'Créer'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
          Annuler
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function OptionalField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
      />
    </div>
  );
}
