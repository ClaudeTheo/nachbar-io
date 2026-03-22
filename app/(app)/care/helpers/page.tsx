'use client';

import { useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { HelperList } from '@/components/care/HelperList';
import { HelperRegistrationForm } from '@/components/care/HelperRegistrationForm';
import { useAuth } from '@/hooks/use-auth';

export default function HelpersPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [listKey, setListKey] = useState(0);

  function handleSuccess() {
    setShowForm(false);
    setListKey((k) => k + 1);
  }

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
            <Users className="h-6 w-6 text-quartier-green" />
            Helfer
          </h1>
          <p className="text-muted-foreground mt-1">Nachbarschaftliche Helfer koordinieren</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="min-h-[80px] min-w-[80px] flex flex-col items-center justify-center gap-1 rounded-xl border bg-card px-3 py-2 text-sm font-medium text-anthrazit hover:bg-muted transition-colors"
          aria-label={showForm ? 'Formular schliessen' : 'Als Helfer registrieren'}
        >
          {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {showForm ? 'Schliessen' : 'Als Helfer registrieren'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-4">
          <HelperRegistrationForm
            seniorId={user!.id}
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Registrierte Helfer</h2>
        <HelperList key={listKey} showPending={true} currentUserId={user!.id} />
      </div>
    </div>
  );
}
