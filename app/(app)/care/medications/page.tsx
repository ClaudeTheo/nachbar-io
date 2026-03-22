'use client';

import { useState } from 'react';
import { ArrowLeft, Pill, Plus } from 'lucide-react';
import Link from 'next/link';
import { MedicationList } from '@/components/care/MedicationList';
import { MedicationManagementList } from '@/components/care/MedicationManagementList';
import { useAuth } from '@/hooks/use-auth';

type TabView = 'due' | 'all';

export default function MedicationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabView>('due');

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
      {/* Zurueck-Link */}
      <Link
        href="/care"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck
      </Link>

      {/* Header mit Hinzufuegen-Button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
            <Pill className="h-6 w-6 text-quartier-green" />
            Erinnerungen
          </h1>
          <p className="text-muted-foreground mt-1">Verwaltung und Alltags-Protokoll</p>
        </div>
        <Link
          href="/care/medications/new"
          className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Neu
        </Link>
      </div>

      {/* Tab-Umschalter */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('due')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'due'
              ? 'bg-anthrazit text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Heute faellig
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-anthrazit text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Alle Medikamente
        </button>
      </div>

      {/* Inhalt je nach Tab */}
      {activeTab === 'due' ? (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Heute faellig</h2>
          <MedicationList seniorId={user.id} />
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Alle aktiven Medikamente</h2>
          <MedicationManagementList seniorId={user.id} />
        </div>
      )}
    </div>
  );
}
