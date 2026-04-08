// components/companion/ActionCard.tsx
// Zeigt eine ausgefuehrte KI-Aktion als kleine Karte im Chat an

import { CircleCheck, CircleX } from "lucide-react";
import { Linkify } from "./Linkify";

interface ActionCardProps {
  tool: string;
  summary: string;
  success: boolean;
}

/** Inline-Karte für Tool-Ergebnisse im Chat */
export function ActionCard({ tool, summary, success }: ActionCardProps) {
  return (
    <div
      data-testid="action-card"
      className={`mt-2 rounded-lg border p-3 text-sm ${
        success
          ? "border-quartier-green/30 bg-quartier-green/5"
          : "border-red-300 bg-red-50"
      }`}
    >
      <div className="flex items-start gap-2">
        {success ? (
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-quartier-green" />
        ) : (
          <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        )}
        <div>
          <p className="font-medium text-anthrazit">{tool}</p>
          <p className="text-muted-foreground whitespace-pre-wrap break-words">
            <Linkify text={summary} />
          </p>
        </div>
      </div>
    </div>
  );
}
