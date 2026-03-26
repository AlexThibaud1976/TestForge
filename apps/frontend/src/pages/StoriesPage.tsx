import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useConnectionFilter, type Connection } from '../hooks/useConnectionFilter.js';
import { ConnectionBadge } from '../components/ConnectionBadge.js';
import { BatchAnalysisModal } from '../components/batch/BatchAnalysisModal.js';
import { DuplicatesPanel, type DuplicatePair } from '../components/DuplicatesPanel.js';
import { SyncDialog, type SyncFilters } from '../components/SyncDialog.js';

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

interface PaginatedResponse {
  data: UserStory[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export function StoriesPage() {
  const navigate = useNavigate();
  const { connections, connectionId, setConnectionId, loading: connectionsLoading } = useConnectionFilter();

  const [stories, setStories] = useState<UserStory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Sélection + modal batch
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  // Feature 010: doublons
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  // Feature 009: sync dialog
  const [syncDialog, setSyncDialog] = useState<string | null>(null);
  // Feature 009: filtres locaux
  const [localSprintFilter, setLocalSprintFilter] = useState('');
  const [localLabelFilter, setLocalLabelFilter] = useState('');

  const fetchStories = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
      ...(connectionId && { connectionId }),
    });
    const data = await api.get<PaginatedResponse>(`/api/user-stories?${params.toString()}`);
    setStories(data.data);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, statusFilter, connectionId]);

  useEffect(() => {
    api.get<DuplicatePair[]>('/api/duplicates').then(setDuplicates).catch(() => null);
  }, []);

  useEffect(() => { void fetchStories(); }, [fetchStories]);

  const handleSync = async (connId: string, filters?: SyncFilters) => {
    setSyncDialog(null);
    setSyncing(connId);
    try {
      const body = filters && Object.keys(filters).length > 0
        ? { connectionId: connId, filters }
        : { connectionId: connId };
      const result = await api.post<{ synced: number }>('/api/user-stories/sync', body);
      alert(`${result.synced} user stories synchronisées`);
      void fetchStories();
      api.get<DuplicatePair[]>('/api/duplicates').then(setDuplicates).catch(() => null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur de synchronisation');
    } finally {
      setSyncing(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(selected.size === stories.length ? new Set() : new Set(stories.map((s) => s.id)));
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Feature 009: filtres locaux sur les US déjà chargées
  const filteredStories = stories.filter((s) => {
    if (localSprintFilter && !s.labels.some((l) => l.toLowerCase().includes(localSprintFilter.toLowerCase()))) {
      if (!s.title.toLowerCase().includes(localSprintFilter.toLowerCase()) &&
          !s.description?.toLowerCase().includes(localSprintFilter.toLowerCase())) return false;
    }
    if (localLabelFilter && !s.labels.some((l) => l.toLowerCase().includes(localLabelFilter.toLowerCase()))) {
      return false;
    }
    return true;
  });

  // Stories à analyser en batch (sélection ou toutes les stories affichées)
  const batchStories = selected.size > 0
    ? filteredStories.filter((s) => selected.has(s.id))
    : filteredStories;

  return (
    <div className="p-6">
      {/* Feature 009: Sync dialog avec filtres */}
      {syncDialog && (
        <SyncDialog
          connectionId={syncDialog}
          connectionName={connections.find((c) => c.id === syncDialog)?.name ?? ''}
          loading={syncing === syncDialog}
          onSync={(filters) => void handleSync(syncDialog, filters)}
          onCancel={() => setSyncDialog(null)}
        />
      )}

      {/* Feature 010: Doublons panel */}
      {showDuplicates && (
        <DuplicatesPanel
          pairs={duplicates}
          onIgnored={(id) => setDuplicates((prev) => prev.filter((p) => p.id !== id))}
          onClose={() => setShowDuplicates(false)}
        />
      )}

      {/* Modal d'analyse batch */}
      {batchModalOpen && (
        <BatchAnalysisModal
          stories={batchStories.map((s) => ({ id: s.id, title: s.title, externalId: s.externalId }))}
          onClose={() => { setBatchModalOpen(false); void fetchStories(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">User Stories</h1>
            {duplicates.length > 0 && (
              <button
                onClick={() => setShowDuplicates(true)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-300 rounded-full hover:bg-orange-100 font-medium"
              >
                ⚠️ Doublons potentiels ({duplicates.length})
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{total} story{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {filteredStories.length > 0 && (
            <button
              onClick={() => setBatchModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              📊 Analyser ({batchStories.length} stories)
            </button>
          )}
          {connections.map((conn) => (
            <button key={conn.id}
              onClick={() => setSyncDialog(conn.id)}
              disabled={syncing === conn.id}
              className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              {syncing === conn.id ? '↻ Sync...' : `↻ ${conn.name}`}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-3 flex-wrap">
        <input type="text" placeholder="🔍 Rechercher..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-40 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tous statuts</option>
          {['To Do', 'In Progress', 'Done', 'Active', 'New', 'Resolved'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* Feature 009: filtres locaux */}
        <input type="text" placeholder="Sprint..." value={localSprintFilter}
          onChange={(e) => setLocalSprintFilter(e.target.value)}
          className="w-28 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="Label..." value={localLabelFilter}
          onChange={(e) => setLocalLabelFilter(e.target.value)}
          className="w-28 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {/* Feature 014: filtre par connexion avec icônes */}
        {!connectionsLoading && connections.length > 0 && (
          <select
            value={connectionId ?? ''}
            onChange={(e) => { setConnectionId(e.target.value || null); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les projets</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === 'jira' ? '🔵' : '🟣'} {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Select all */}
      {stories.length > 0 && !loading && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <input type="checkbox" id="select-all"
            checked={selected.size === stories.length && stories.length > 0}
            onChange={toggleSelectAll}
            className="rounded text-indigo-600" />
          <label htmlFor="select-all" className="text-xs text-gray-500 cursor-pointer select-none">
            {selected.size === 0 ? 'Tout sélectionner' : `${selected.size} sélectionnée${selected.size > 1 ? 's' : ''}`}
          </label>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📋</p>
          {connections.length === 0 ? (
            <>
              <p className="text-sm font-medium text-gray-700 mb-1">Aucune connexion configurée</p>
              <a href="/settings/connections" className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md">Ajouter une connexion →</a>
            </>
          ) : (
            <p className="text-sm font-medium text-gray-700">Aucune user story — lancez une synchronisation</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStories.map((story) => (
            <UserStoryCard
              key={story.id}
              story={story}
              connection={connections.find((c) => c.id === story.connectionId)}
              selected={selected.has(story.id)}
              onSelect={() => toggleSelect(story.id)}
              onClick={() => void navigate(`/stories/${story.id}`)}
              onConnectionClick={(id) => { setConnectionId(id); setPage(1); }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50">← Précédent</button>
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50">Suivant →</button>
        </div>
      )}
    </div>
  );
}

function UserStoryCard({ story, connection, selected, onSelect, onClick, onConnectionClick }: {
  story: UserStory;
  connection: Connection | undefined;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onConnectionClick?: (connectionId: string) => void;
}) {
  return (
    <div className={`bg-white border rounded-lg p-4 flex items-start gap-3 hover:shadow-sm transition-all ${selected ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200'}`}>
      <input type="checkbox" checked={selected}
        onChange={(e) => { e.stopPropagation(); onSelect(); }}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 rounded text-indigo-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <button onClick={onClick} className="w-full text-left group">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{story.externalId}</span>
            <StatusBadge status={story.status} />
          </div>
          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">{story.title}</p>
          {story.description && <p className="text-xs text-gray-400 mt-1 truncate">{story.description}</p>}
        </button>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1 flex-wrap">
            {story.labels.slice(0, 4).map((label) => (
              <span key={label} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{label}</span>
            ))}
          </div>
          <ConnectionBadge
            name={connection?.name ?? null}
            type={connection?.type ?? null}
            connectionId={story.connectionId}
            onClick={onConnectionClick}
          />
        </div>
      </div>
      <span className="text-gray-300 text-sm shrink-0">→</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'To Do': 'bg-gray-100 text-gray-600', 'New': 'bg-gray-100 text-gray-600',
    'In Progress': 'bg-blue-100 text-blue-700', 'Active': 'bg-blue-100 text-blue-700',
    'Done': 'bg-green-100 text-green-700', 'Resolved': 'bg-green-100 text-green-700',
    'Closed': 'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status || '—'}
    </span>
  );
}
