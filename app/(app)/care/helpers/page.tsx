'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Plus, X } from 'lucide-react';
import { HelperList } from '@/components/care/HelperList';
import { HelperRegistrationForm } from '@/components/care/HelperRegistrationForm';

export default function HelpersPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  function handleSuccess() {
    setShowForm(false);
    setListKey((k) => k + 1);
  }

  if (!userId) {
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
            seniorId={userId}
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Registrierte Helfer</h2>
        <HelperList key={listKey} showPending={true} currentUserId={userId} />
      </div>
    </div>
  );
}
