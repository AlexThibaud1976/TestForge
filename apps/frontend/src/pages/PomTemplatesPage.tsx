import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

interface PomTemplate {
  id: string;
  framework: string;
  language: string;
  content: string;
  updatedAt: string;
}

const FRAMEWORKS = ['playwright', 'selenium', 'cypress'];
const LANGUAGES = ['typescript', 'javascript', 'python', 'java', 'csharp', 'ruby', 'kotlin'];

export function PomTemplatesPage() {
  const [templates, setTemplates] = useState<PomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ framework: 'playwright', language: 'typescript', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<PomTemplate[]>('/api/pom-templates')
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.post<PomTemplate>('/api/pom-templates', form);
      setTemplates((prev) => {
        const filtered = prev.filter((t) => !(t.framework === form.framework && t.language === form.language));
        return [...filtered, created];
      });
      setShowForm(false);
      setForm({ framework: 'playwright', language: 'typescript', content: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce template ?')) return;
    await api.delete(`/api/pom-templates/${id}`).catch(() => null);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates POM</h1>
          <p className="text-sm text-gray-500 mt-1">
            Définissez un template de Page Object pour chaque framework/langage. Il sera injecté dans le prompt de génération.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Nouveau template
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Nouveau template POM</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Framework</label>
              <select
                value={form.framework}
                onChange={(e) => setForm((f) => ({ ...f, framework: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {FRAMEWORKS.map((fw) => <option key={fw} value={fw}>{fw}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Langage</label>
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template (coller un exemple de Page Object)</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={12}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="import { type Page, type Locator } from '@playwright/test';\n\nexport class BasePage { ... }"
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-600 px-4 py-2 text-sm hover:text-gray-900">Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Chargement...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Aucun template configuré.</p>
          <p className="text-xs mt-1">Ajoutez un template pour personnaliser le code généré.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 text-sm font-mono">{t.framework} / {t.language}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">{t.content.slice(0, 80)}…</div>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
