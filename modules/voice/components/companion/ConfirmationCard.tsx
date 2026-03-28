// components/companion/ConfirmationCard.tsx
// Bestätigungskarte für Write-Aktionen — Nutzer muss explizit zustimmen

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConfirmationCardProps {
  tool: string;
  summary: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

/** Karte mit Abschicken/Abbrechen für schreibende KI-Aktionen */
export function ConfirmationCard({
  tool,
  summary,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmationCardProps) {
  return (
    <div
      data-testid="confirmation-card"
      className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-4"
    >
      {/* Beschreibung */}
      <p className="mb-1 text-xs font-medium text-amber-700">{tool}</p>
      <p className="mb-3 text-sm text-anthrazit">{summary}</p>

      {/* Buttons — Senior Mode: min 80px Höhe */}
      <div className="flex gap-2">
        <Button
          data-testid="confirm-action"
          onClick={onConfirm}
          disabled={loading}
          className="min-h-[44px] flex-1 bg-quartier-green hover:bg-quartier-green/90 sm:min-h-[80px]"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Abschicken
        </Button>
        <Button
          data-testid="cancel-action"
          onClick={onCancel}
          disabled={loading}
          variant="outline"
          className="min-h-[44px] flex-1 sm:min-h-[80px]"
        >
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
