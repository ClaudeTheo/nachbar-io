'use client';

// Aufgabentafel-Seite: Aufgaben anzeigen, filtern und erstellen

import { useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { TaskCard } from '@/components/care/TaskCard';
import { TaskForm } from '@/components/care/TaskForm';
import type { CareTask, TaskCategory } from '@/components/care/TaskCard';
import { CATEGORY_CONFIG } from '@/components/care/TaskCard';
import { useAuth } from '@/hooks/use-auth';

// Alle Kategorien fuer den Filter
const ALL_CATEGORIES = Object.entries(CATEGORY_CONFIG) as [TaskCategory, { emoji: string; label: string }][];

export default function TasksPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | null>(null);

  // Aufgaben vom API laden
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (categoryFilter) {
        params.set('category', categoryFilter);
      }

      const url = `/api/care/tasks${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        setError('Aufgaben konnten nicht geladen werden.');
        return;
      }

      const data = await res.json();
      setTasks(data.tasks ?? data ?? []);
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  // Aufgaben laden wenn user oder Filter sich aendert
  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, loadTasks]);

  function handleFormSuccess() {
    setShowForm(false);
    loadTasks();
  }

  // Lade-Zustand (noch kein User)
  if (!user) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Kopfzeile: Titel + Neu-Button */}
      <PageHeader
        title="Aufgabentafel"
        subtitle="Helfen Sie Ihren Nachbarn oder bitten Sie um Unterstuetzung"
        backHref="/care"
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="min-h-[80px] min-w-[80px] flex flex-col items-center justify-center gap-1 rounded-xl border bg-card px-3 py-2 text-sm font-medium text-anthrazit hover:bg-muted transition-colors"
            aria-label={showForm ? 'Formular schliessen' : 'Neue Aufgabe erstellen'}
            style={{ touchAction: 'manipulation' }}
          >
            {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {showForm ? 'Schliessen' : 'Neue Aufgabe'}
          </button>
        }
      />

      {/* Formular (ein-/ausblendbar) */}
      {showForm && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-lg font-bold text-anthrazit mb-4">Neue Aufgabe erstellen</h2>
          <TaskForm
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Kategorie-Filter: horizontal scrollbare Chips */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Kategorie filtern</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {/* "Alle" Chip */}
          <button
            onClick={() => setCategoryFilter(null)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              categoryFilter === null
                ? 'bg-[#2D3142] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{ minHeight: '40px', touchAction: 'manipulation' }}
          >
            Alle
          </button>

          {/* Kategorie-Chips */}
          {ALL_CATEGORIES.map(([key, config]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                categoryFilter === key
                  ? 'bg-[#2D3142] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ minHeight: '40px', touchAction: 'manipulation' }}
            >
              {config.emoji} {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fehlermeldung */}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Lade-Zustand */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border p-4 space-y-3">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aufgabenliste */}
      {!loading && tasks.length > 0 && (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              currentUserId={user.id}
              onAction={loadTasks}
            />
          ))}
        </div>
      )}

      {/* Leerer Zustand */}
      {!loading && tasks.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-5xl mb-4">{'\uD83D\uDCCB'}</span>
          <p className="text-lg font-medium text-anthrazit">
            {categoryFilter ? 'Keine Aufgaben in dieser Kategorie' : 'Noch keine Aufgaben'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {categoryFilter
              ? 'Versuchen Sie einen anderen Filter oder erstellen Sie eine neue Aufgabe.'
              : 'Erstellen Sie die erste Aufgabe fuer Ihr Quartier!'}
          </p>
        </div>
      )}
    </div>
  );
}
