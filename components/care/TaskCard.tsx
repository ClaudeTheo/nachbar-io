'use client';

// Zeigt eine einzelne Aufgabe mit Kategorie, Dringlichkeit, Status und Aktions-Buttons

import { useState } from 'react';

// Kategorie-Typ
export type TaskCategory =
  | 'transport'
  | 'shopping'
  | 'companionship'
  | 'garden'
  | 'tech_help'
  | 'pet_care'
  | 'household'
  | 'other';

// Dringlichkeit
export type TaskUrgency = 'low' | 'normal' | 'urgent';

// Status
export type TaskStatus =
  | 'open'
  | 'claimed'
  | 'in_progress'
  | 'done'
  | 'confirmed'
  | 'cancelled';

// Aufgaben-Datenstruktur
export interface CareTask {
  id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  urgency: TaskUrgency;
  status: TaskStatus;
  preferred_date: string | null;
  preferred_time: string | null;
  creator_id: string;
  creator_name: string;
  claimer_id: string | null;
  claimer_name: string | null;
  created_at: string;
}

// Kategorie-Konfiguration: Emoji + Label
export const CATEGORY_CONFIG: Record<TaskCategory, { emoji: string; label: string }> = {
  transport:     { emoji: '\uD83D\uDE97', label: 'Fahrdienst' },
  shopping:      { emoji: '\uD83D\uDED2', label: 'Einkauf' },
  companionship: { emoji: '\u2615',       label: 'Begleitung' },
  garden:        { emoji: '\uD83C\uDF31', label: 'Garten' },
  tech_help:     { emoji: '\uD83D\uDCBB', label: 'Technik' },
  pet_care:      { emoji: '\uD83D\uDC15', label: 'Tierpflege' },
  household:     { emoji: '\uD83C\uDFE0', label: 'Haushalt' },
  other:         { emoji: '\uD83D\uDCCB', label: 'Sonstiges' },
};

// Dringlichkeits-Randfarbe (linker Rand)
const URGENCY_BORDER: Record<TaskUrgency, string> = {
  low:    'border-l-gray-300',
  normal: 'border-l-[#4CAF87]',
  urgent: 'border-l-[#F59E0B]',
};

// Status-Badge Konfiguration
const STATUS_CONFIG: Record<TaskStatus, { label: string; classes: string }> = {
  open:      { label: 'Offen',       classes: 'bg-blue-100 text-blue-700' },
  claimed:   { label: 'Angenommen',  classes: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'In Arbeit', classes: 'bg-purple-100 text-purple-700' },
  done:      { label: 'Erledigt',    classes: 'bg-green-100 text-green-700' },
  confirmed: { label: 'Bestaetigt', classes: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Storniert',   classes: 'bg-gray-100 text-gray-500' },
};

interface TaskCardProps {
  task: CareTask;
  currentUserId: string;
  onAction?: () => void;
}

// Datum im deutschen Format: "Mo., 10. Maer."
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function TaskCard({ task, currentUserId, onAction }: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = CATEGORY_CONFIG[task.category] ?? CATEGORY_CONFIG.other;
  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.open;
  const urgencyBorder = URGENCY_BORDER[task.urgency] ?? URGENCY_BORDER.normal;

  const isCreator = task.creator_id === currentUserId;
  const isClaimer = task.claimer_id === currentUserId;

  // API-Aufruf fuer Status-Aenderungen
  async function handleAction(action: string) {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/care/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Ein Fehler ist aufgetreten.');
        return;
      }

      onAction?.();
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 border-l-4 ${urgencyBorder} bg-white p-4 space-y-3`}
    >
      {/* Kopfzeile: Kategorie-Emoji, Titel, Status-Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Kategorie-Emoji */}
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl">
            {category.emoji}
          </div>

          {/* Titel + Ersteller */}
          <div className="space-y-0.5">
            <p className="font-bold text-anthrazit leading-tight">{task.title}</p>
            <p className="text-sm text-muted-foreground">
              {category.label} · von {task.creator_name}
            </p>
          </div>
        </div>

        {/* Status-Badge */}
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.classes}`}>
          {status.label}
        </span>
      </div>

      {/* Beschreibung */}
      {task.description && (
        <p className="text-sm text-muted-foreground">{task.description}</p>
      )}

      {/* Wunschdatum und -zeit */}
      {(task.preferred_date || task.preferred_time) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Gewuenscht:</span>
          {task.preferred_date && (
            <span className="font-medium text-anthrazit">{formatDate(task.preferred_date)}</span>
          )}
          {task.preferred_time && (
            <span className="font-medium text-anthrazit">{task.preferred_time} Uhr</span>
          )}
        </div>
      )}

      {/* Helfer-Info (wenn angenommen) */}
      {task.claimer_name && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground border-t pt-2">
          <span>Helfer/in:</span>
          <span className="font-medium text-anthrazit">{task.claimer_name}</span>
        </div>
      )}

      {/* Fehlermeldung */}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Aktions-Buttons je nach Status und Rolle */}
      <div className="flex flex-wrap gap-2 pt-1">
        {/* Offen + nicht Ersteller → "Ich helfe" */}
        {task.status === 'open' && !isCreator && (
          <button
            onClick={() => handleAction('claim')}
            disabled={loading}
            className="rounded-lg bg-[#4CAF87] px-4 py-2.5 text-sm font-bold text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-50"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            {loading ? 'Wird gespeichert...' : 'Ich helfe'}
          </button>
        )}

        {/* Angenommen + ist Helfer → "Erledigt" + "Zurueckziehen" */}
        {task.status === 'claimed' && isClaimer && (
          <>
            <button
              onClick={() => handleAction('complete')}
              disabled={loading}
              className="rounded-lg bg-[#4CAF87] px-4 py-2.5 text-sm font-bold text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-50"
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              {loading ? '...' : 'Erledigt'}
            </button>
            <button
              onClick={() => handleAction('unclaim')}
              disabled={loading}
              className="rounded-lg border-2 border-gray-300 px-4 py-2.5 text-sm font-medium text-anthrazit hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              {loading ? '...' : 'Zurueckziehen'}
            </button>
          </>
        )}

        {/* Erledigt + ist Ersteller → "Bestaetigen — Danke!" */}
        {task.status === 'done' && isCreator && (
          <button
            onClick={() => handleAction('confirm')}
            disabled={loading}
            className="rounded-lg bg-[#4CAF87] px-4 py-2.5 text-sm font-bold text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-50"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            {loading ? '...' : 'Bestaetigen \u2014 Danke!'}
          </button>
        )}

        {/* Offen oder Angenommen + ist Ersteller → "Stornieren" */}
        {(task.status === 'open' || task.status === 'claimed') && isCreator && (
          <button
            onClick={() => handleAction('cancel')}
            disabled={loading}
            className="rounded-lg border-2 border-gray-300 px-4 py-2.5 text-sm font-medium text-anthrazit hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            {loading ? '...' : 'Stornieren'}
          </button>
        )}
      </div>
    </div>
  );
}
