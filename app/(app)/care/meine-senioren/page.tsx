// app/(app)/care/meine-senioren/page.tsx
// Uebersichtsseite: Zeigt dem Angehoerigen/Pflegedienst alle zugewiesenen Senioren
'use client';

import { ArrowRight, Users, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { useAssignedSeniors } from '@/lib/care/hooks/useAssignedSeniors';

export default function MeineSeniorenPage() {
  const { seniors, helperRole, loading, error } = useAssignedSeniors();

  if (loading) {
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
      {/* Header */}
      <PageHeader
        title={<><Users className="h-6 w-6 text-quartier-green" /> Meine Senioren</>}
        subtitle={
          helperRole === 'relative'
            ? 'Ihre betreuten Angehoerigen'
            : helperRole === 'care_service'
              ? 'Ihre betreuten Klienten'
              : 'Ihre zugewiesenen Senioren'
        }
        backHref="/care"
        backLabel="Zurück zum Pflege-Dashboard"
      />

      {/* Fehler */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Fehler beim Laden: {error}
        </div>
      )}

      {/* Leerer Zustand */}
      {!error && seniors.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-muted p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium text-anthrazit">
            Keine Senioren zugewiesen
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Sie sind noch keinem Senior zugewiesen. Registrieren Sie sich als Helfer, um Senioren betreuen zu koennen.
          </p>
          <Link
            href="/care/helpers"
            className="inline-flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white hover:bg-quartier-green/90"
          >
            <UserPlus className="h-4 w-4" />
            Als Helfer registrieren
          </Link>
        </div>
      )}

      {/* Senior-Cards Grid */}
      {seniors.length > 0 && (
        <div className="grid gap-3">
          {seniors.map((senior) => (
            <Link
              key={senior.id}
              href={`/care/meine-senioren/${senior.id}`}
              className="rounded-xl border bg-card p-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {senior.avatar_url ? (
                  <img
                    src={senior.avatar_url}
                    alt={senior.display_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-quartier-green/20 flex items-center justify-center text-quartier-green font-semibold text-lg">
                    {senior.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name + Rolle */}
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-anthrazit truncate">
                  {senior.display_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Medikamente, Check-ins und SOS-Verlauf einsehen
                </p>
              </div>

              {/* Pfeil */}
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
