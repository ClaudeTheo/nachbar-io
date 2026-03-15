'use client';

// Zeigt eine einzelne Einkaufsanfrage mit Status, Artikelliste und Aktions-Buttons

import { useState } from 'react';
import { Check, Clock, Package, ShoppingCart, Truck, UserCheck, X } from 'lucide-react';

// Datenstruktur einer Einkaufsanfrage (aus API)
export interface ShoppingRequest {
  id: string;
  requester_id: string;
  status: 'open' | 'claimed' | 'shopping' | 'delivered' | 'confirmed' | 'cancelled';
  items: { name: string; quantity?: string; checked?: boolean }[];
  note: string | null;
  due_date: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  delivered_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  requester?: { display_name: string | null };
  claimer?: { display_name: string | null };
}

interface ShoppingRequestCardProps {
  request: ShoppingRequest;
  currentUserId: string;
  onUpdate?: () => void;
}

// Status-Badge-Konfiguration
const STATUS_CONFIG: Record<
  ShoppingRequest['status'],
  { label: string; bg: string; text: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  open:      { label: 'Offen',       bg: 'bg-blue-100',   text: 'text-blue-700',    Icon: Clock },
  claimed:   { label: 'Uebernommen', bg: 'bg-amber-100',  text: 'text-amber-700',   Icon: UserCheck },
  shopping:  { label: 'Wird eingekauft', bg: 'bg-purple-100', text: 'text-purple-700', Icon: ShoppingCart },
  delivered: { label: 'Geliefert',    bg: 'bg-green-100',  text: 'text-green-700',   Icon: Truck },
  confirmed: { label: 'Bestaetigt',   bg: 'bg-emerald-100', text: 'text-emerald-800', Icon: Check },
  cancelled: { label: 'Storniert',    bg: 'bg-gray-100',   text: 'text-gray-500',    Icon: X },
};

// Datum formatieren: "10. Maer. 2026"
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ShoppingRequestCard({ request, currentUserId, onUpdate }: ShoppingRequestCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRequester = request.requester_id === currentUserId;
  const isClaimer = request.claimed_by === currentUserId;
  const config = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.open;
  const StatusIcon = config.Icon;

  // Aktion ausfuehren (PATCH /api/care/shopping/[id])
  async function executeAction(action: string) {
    setError(null);
    setLoading(action);

    try {
      const res = await fetch(`/api/care/shopping/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Aktion fehlgeschlagen.');
        return;
      }

      onUpdate?.();
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(null);
    }
  }

  // Aktions-Buttons je nach Status und Rolle
  function renderActions() {
    const buttons: React.ReactNode[] = [];

    // Offen + nicht Ersteller → Uebernehmen
    if (request.status === 'open' && !isRequester) {
      buttons.push(
        <button
          key="claim"
          onClick={() => executeAction('claim')}
          disabled={loading !== null}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-quartier-green py-3 text-sm font-bold text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-50"
          style={{ minHeight: '48px', touchAction: 'manipulation' }}
        >
          <UserCheck className="h-4 w-4" />
          {loading === 'claim' ? 'Wird uebernommen...' : 'Ich uebernehme das'}
        </button>
      );
    }

    // Uebernommen + ist Uebernehmender → Geliefert + Zurueckziehen
    if (request.status === 'claimed' && isClaimer) {
      buttons.push(
        <button
          key="deliver"
          onClick={() => executeAction('deliver')}
          disabled={loading !== null}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-quartier-green py-3 text-sm font-bold text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-50"
          style={{ minHeight: '48px', touchAction: 'manipulation' }}
        >
          <Truck className="h-4 w-4" />
          {loading === 'deliver' ? 'Wird markiert...' : 'Einkauf geliefert'}
        </button>,
        <button
          key="unclaim"
          onClick={() => executeAction('unclaim')}
          disabled={loading !== null}
          className="rounded-lg border-2 border-gray-300 px-4 py-3 text-sm font-medium text-anthrazit hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
          style={{ minHeight: '48px', touchAction: 'manipulation' }}
        >
          {loading === 'unclaim' ? '...' : 'Zurueckziehen'}
        </button>
      );
    }

    // Geliefert + ist Ersteller → Bestaetigen
    if (request.status === 'delivered' && isRequester) {
      buttons.push(
        <button
          key="confirm"
          onClick={() => executeAction('confirm')}
          disabled={loading !== null}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-quartier-green py-3 text-sm font-bold text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-50"
          style={{ minHeight: '48px', touchAction: 'manipulation' }}
        >
          <Check className="h-4 w-4" />
          {loading === 'confirm' ? 'Wird bestaetigt...' : 'Erhalten — Danke!'}
        </button>
      );
    }

    // Offen oder Uebernommen + ist Ersteller → Stornieren
    if (['open', 'claimed'].includes(request.status) && isRequester) {
      buttons.push(
        <button
          key="cancel"
          onClick={() => executeAction('cancel')}
          disabled={loading !== null}
          className="rounded-lg border-2 border-gray-300 px-4 py-3 text-sm font-medium text-anthrazit hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
          style={{ minHeight: '48px', touchAction: 'manipulation' }}
        >
          {loading === 'cancel' ? '...' : 'Stornieren'}
        </button>
      );
    }

    if (buttons.length === 0) return null;

    return <div className="flex gap-2 pt-2">{buttons}</div>;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      {/* Kopfzeile: Ersteller, Datum, Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="font-bold text-anthrazit leading-tight">
            {request.requester?.display_name ?? 'Unbekannt'}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatDate(request.created_at)}</span>
            {request.due_date && (
              <>
                <span>·</span>
                <span className="text-amber-600 font-medium">
                  bis {formatDate(request.due_date)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status-Badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.bg} ${config.text}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {config.label}
        </span>
      </div>

      {/* Artikel-Liste */}
      <ul className="space-y-1.5">
        {request.items.map((item, index) => (
          <li
            key={index}
            className={`flex items-center gap-2 text-sm ${
              item.checked ? 'text-muted-foreground line-through' : 'text-anthrazit'
            }`}
          >
            <span className="shrink-0">
              {item.checked ? (
                <Check className="h-4 w-4 text-quartier-green" />
              ) : (
                <Package className="h-4 w-4 text-gray-400" />
              )}
            </span>
            <span>{item.name}</span>
            {item.quantity && (
              <span className="text-muted-foreground">({item.quantity})</span>
            )}
          </li>
        ))}
      </ul>

      {/* Notiz */}
      {request.note && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-muted-foreground">
          {request.note}
        </div>
      )}

      {/* Uebernehmender */}
      {request.claimer?.display_name && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <UserCheck className="h-4 w-4 shrink-0" />
          <span>Uebernommen von {request.claimer.display_name}</span>
        </div>
      )}

      {/* Fehlermeldung */}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Aktions-Buttons */}
      {renderActions()}
    </div>
  );
}
