'use client';

// Einkaufshilfe-Seite: Einkaufsanfragen erstellen, ansehen und verwalten

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Plus, ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';
import { ShoppingRequestForm } from '@/components/care/ShoppingRequestForm';
import { ShoppingRequestCard } from '@/components/care/ShoppingRequestCard';
import type { ShoppingRequest } from '@/components/care/ShoppingRequestCard';
import { useAuth } from '@/hooks/use-auth';

type FilterTab = 'open' | 'mine' | 'all';

export default function ShoppingPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('open');
  const [requests, setRequests] = useState<ShoppingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Anfragen laden
  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // API-Status-Parameter: "open" fuer offene, "all" fuer alle
      const statusParam = activeTab === 'open' ? 'open' : 'all';
      const res = await fetch(`/api/care/shopping?status=${statusParam}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Einkaufsanfragen konnten nicht geladen werden.');
        return;
      }

      const data = await res.json() as ShoppingRequest[];
      setRequests(data);
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user, loadRequests]);

  // Formular-Erfolg: Formular schliessen und Liste aktualisieren
  function handleSuccess() {
    setShowForm(false);
    loadRequests();
  }

  // Gefilterte Anfragen: "Meine" filtert client-seitig
  const filteredRequests =
    activeTab === 'mine' && user
      ? requests.filter(
          (r) => r.requester_id === user.id || r.claimed_by === user.id
        )
      : requests;

  // Tab-Konfiguration
  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'open', label: 'Offen' },
    { key: 'mine', label: 'Meine' },
    { key: 'all', label: 'Alle' },
  ];

  // Ladeanimation
  if (!user) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/care"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit mb-2"
            style={{ touchAction: 'manipulation' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Zurueck
          </Link>
          <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-quartier-green" />
            Einkaufshilfe
          </h1>
          <p className="text-muted-foreground mt-1">
            Einkaufsanfragen erstellen und Nachbarn helfen
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="min-h-[80px] min-w-[80px] flex flex-col items-center justify-center gap-1 rounded-xl border bg-card px-3 py-2 text-sm font-medium text-anthrazit hover:bg-muted transition-colors"
          aria-label={showForm ? 'Formular schliessen' : 'Neue Einkaufsliste erstellen'}
          style={{ touchAction: 'manipulation' }}
        >
          {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {showForm ? 'Schliessen' : '+ Neue Liste'}
        </button>
      </div>

      {/* Formular (toggle) */}
      {showForm && (
        <div className="rounded-xl border bg-card p-4">
          <ShoppingRequestForm
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Filter-Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-anthrazit shadow-sm'
                : 'text-muted-foreground hover:text-anthrazit'
            }`}
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Fehlermeldung */}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Anfragen-Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border p-4 space-y-3">
              <div className="flex justify-between">
                <div className="h-5 bg-muted rounded w-1/3" />
                <div className="h-5 bg-muted rounded w-20" />
              </div>
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🛒</div>
          <p className="text-muted-foreground">
            {activeTab === 'open'
              ? 'Keine offenen Einkaufsanfragen.'
              : activeTab === 'mine'
                ? 'Sie haben noch keine Einkaufsanfragen erstellt oder uebernommen.'
                : 'Noch keine Einkaufsanfragen vorhanden.'}
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600 active:bg-green-700"
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              <Plus className="h-4 w-4" />
              Erste Einkaufsliste erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <ShoppingRequestCard
              key={req.id}
              request={req}
              currentUserId={user.id}
              onUpdate={loadRequests}
            />
          ))}
        </div>
      )}
    </div>
  );
}
