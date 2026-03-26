import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type Rating = 'positive' | 'negative';

type Tag =
  | 'import_missing'
  | 'wrong_selector'
  | 'incorrect_logic'
  | 'pom_not_respected'
  | 'data_not_externalized'
  | 'missing_edge_case'
  | 'other';

interface FeedbackRecord {
  id: string;
  rating: Rating;
  tags: Tag[];
  comment: string | null;
}

const TAG_LABELS: Record<Tag, string> = {
  import_missing: 'Import manquant',
  wrong_selector: 'Mauvais sélecteur',
  incorrect_logic: 'Logique incorrecte',
  pom_not_respected: 'Structure POM non respectée',
  data_not_externalized: 'Données non externalisées',
  missing_edge_case: 'Edge case manquant',
  other: 'Autre',
};

const ALL_TAGS = Object.keys(TAG_LABELS) as Tag[];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  generationId: string;
}

export function FeedbackWidget({ generationId }: Props) {
  const [existing, setExisting] = useState<FeedbackRecord | null | undefined>(undefined); // undefined = loading
  const [rating, setRating] = useState<Rating | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [comment, setComment] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<FeedbackRecord | null>(`/api/generations/${generationId}/feedback`)
      .then((fb) => {
        setExisting(fb);
        if (fb) {
          setRating(fb.rating);
          setTags(fb.tags);
          setComment(fb.comment ?? '');
          setSaved(true);
        }
      })
      .catch(() => setExisting(null));
  }, [generationId]);

  const handleRate = (r: Rating) => {
    setRating(r);
    setSaved(false);
    if (r === 'negative') {
      setShowPanel(true);
    } else {
      setShowPanel(false);
      setTags([]);
      void submitFeedback(r, [], comment);
    }
  };

  const toggleTag = (tag: Tag) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const submitFeedback = async (r: Rating, t: Tag[], c: string) => {
    setSaving(true);
    try {
      const fb = await api.post<FeedbackRecord>(`/api/generations/${generationId}/feedback`, {
        rating: r,
        tags: t,
        comment: c || undefined,
      });
      setExisting(fb);
      setSaved(true);
      setShowPanel(false);
    } catch {
      // silencieux
    } finally {
      setSaving(false);
    }
  };

  if (existing === undefined) return null; // loading

  return (
    <div className="mt-3 space-y-2">
      {/* Boutons thumbs */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Ce code est-il utile ?</span>
        <button
          onClick={() => handleRate('positive')}
          disabled={saving}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
            rating === 'positive'
              ? 'bg-green-50 text-green-700 border-green-300'
              : 'text-gray-400 border-gray-200 hover:bg-gray-50'
          }`}
          title="Utile"
        >
          👍 {rating === 'positive' && saved ? 'Merci !' : 'Oui'}
        </button>
        <button
          onClick={() => handleRate('negative')}
          disabled={saving}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
            rating === 'negative'
              ? 'bg-red-50 text-red-700 border-red-300'
              : 'text-gray-400 border-gray-200 hover:bg-gray-50'
          }`}
          title="À améliorer"
        >
          👎 {rating === 'negative' && saved ? 'Noté' : 'Non'}
        </button>
        {rating === 'negative' && !showPanel && (
          <button
            onClick={() => setShowPanel(true)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Détails
          </button>
        )}
      </div>

      {/* Panel négatif */}
      {showPanel && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-red-700">Qu'est-ce qui ne va pas ?</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  tags.includes(tag)
                    ? 'bg-red-100 text-red-700 border-red-400'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-red-200'
                }`}
              >
                {TAG_LABELS[tag]}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder="Commentaire optionnel (max 500 caractères)..."
            rows={2}
            className="w-full text-xs border border-red-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{comment.length}/500</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPanel(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={() => void submitFeedback('negative', tags, comment)}
                disabled={saving}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
