// components/companion/ActionCard.tsx
// Zeigt eine ausgefuehrte KI-Aktion als kleine Karte im Chat an

import { CheckCircle, XCircle } from 'lucide-react';

interface ActionCardProps {
  tool: string;
  summary: string;
  success: boolean;
}

/** Inline-Karte fuer Tool-Ergebnisse im Chat */
export function ActionCard({ tool, summary, success }: ActionCardProps) {
  return (
    <div
      data-testid="action-card"
      className={`mt-2 rounded-lg border p-3 text-sm ${
        success
          ? 'border-quartier-green/30 bg-quartier-green/5'
          : 'border-red-300 bg-red-50'
      }`}
    >
      <div className="flex items-start gap-2">
        {success ? (
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-quartier-green" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        )}
        <div>
          <p className="font-medium text-anthrazit">{tool}</p>
          <p className="text-muted-foreground">{summary}</p>
        </div>
      </div>
    </div>
  );
}
