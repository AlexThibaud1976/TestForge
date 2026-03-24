import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

interface UserStory {
  id: string;
  externalId: string;
  title: string;
  description: string;
  status: string;
  labels: string[];
  connectionId: string;
  fetchedAt: string;
}

interface Connection {
  id: string;
  name: string;
  type: string;
}

interface PaginatedResponse {
  data: UserStory[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export function StoriesPage() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<UserStory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [connectionFilter, setConnectionFilter] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
      ...(connectionFilter && { connectionId: connectionFilter }),
    });
    const data = await api.get<PaginatedResponse>(`/api/user-stories?${params.toString()}`);
    setStories(data.data);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, statusFilter, connectionFilter]);

  useEffect(() => {
    api.get<Connection[]>('/api/connections').then(setConnections).catch(() => {});
  }, []);

  useEffect(() => {
    void fetchStories();
  }, [fetchStories]);

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const result = await api.post<{ synced: number }>('/api/user-stories/sync', { connectionId });
      alert(`${result.synced} user stories synchronisées`);
      void fetchStories();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur de synchronisation');
    } finally {
      setSyncing(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Stories</h1>
          <p className="text-sm text-gray-500 mt-1">{total} story{total !== 1 ? 's' : ''}</p>
        </div>
        {connections.length > 0 && (
          <div className="flex gap-2">
            {connections.map((conn) => (
              <button
                key={conn.id}
                onClick={() => void handleSync(conn.id)}
                disabled={syncing === conn.id}
                className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {syncing === conn.id ? '↻ Sync...' : `↻ ${conn.name}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous statuts</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
          <option value="Active">Active</option>
          <option value="New">New</option>
          <option value="Resolved">Resolved</option>
        </select>
        {connections.length > 1 && (
          <select
            value={connectionFilter}
            onChange={(e) => { setConnectionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes connexions</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📋</p>
          {connections.length === 0 ? (
            <>
              <p className="text-sm font-medium text-gray-700 mb-1">Aucune connexion configurée</p>
              <p className="text-sm text-gray-400 mb-4">Connectez Jira ou Azure DevOps pour importer vos user stories.</p>
              <a href="/settings/connections" className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                Ajouter une connexion →
              </a>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 mb-1">Aucune user story importée</p>
              <p className="text-sm text-gray-400 mb-4">Lancez une synchronisation depuis votre Jira ou Azure DevOps.</p>
              <p className="text-xs text-gray-300">Utilisez le bouton ↻ en haut à droite pour synchroniser</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {stories.map((story) => (
            <UserStoryCard
              key={story.id}
              story={story}
              onClick={() => void navigate(`/stories/${story.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            ← Précédent
          </button>
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── UserStoryCard ─────────────────────────────────────────────────────────────

function UserStoryCard({ story, onClick }: { story: UserStory; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{story.externalId}</span>
            <StatusBadge status={story.status} />
          </div>
          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
            {story.title}
          </p>
          {story.description && (
            <p className="text-xs text-gray-400 mt-1 truncate">{story.description}</p>
          )}
          {story.labels.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {story.labels.slice(0, 4).map((label) => (
                <span key={label} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-gray-300 group-hover:text-blue-400 text-sm">→</span>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'To Do': 'bg-gray-100 text-gray-600',
    'New': 'bg-gray-100 text-gray-600',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Active': 'bg-blue-100 text-blue-700',
    'Done': 'bg-green-100 text-green-700',
    'Resolved': 'bg-green-100 text-green-700',
    'Closed': 'bg-green-100 text-green-700',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status || '—'}
    </span>
  );
}
