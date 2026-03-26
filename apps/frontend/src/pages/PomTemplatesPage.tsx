import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Button } from '@/components/ui/button.js';
import { Label } from '@/components/ui/label.js';
import { Card, CardContent } from '@/components/ui/card.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js';
import { Textarea } from '@/components/ui/textarea.js';

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
        <Button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          + Nouveau template
        </Button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSave(e)} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Nouveau template POM</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">Framework</Label>
              <Select
                value={form.framework}
                onValueChange={(v) => setForm((f) => ({ ...f, framework: v }))}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((fw) => (
                    <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">Langage</Label>
              <Select
                value={form.language}
                onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Template (coller un exemple de Page Object)</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={12}
              className="w-full font-mono text-sm"
              placeholder="import { type Page, type Locator } from '@playwright/test';\n\nexport class BasePage { ... }"
              required
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
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
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 text-sm font-mono">{t.framework} / {t.language}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">{t.content.slice(0, 80)}…</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDelete(t.id)}
                  className="text-xs text-red-500 border-red-200 hover:text-red-700"
                >
                  Supprimer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
