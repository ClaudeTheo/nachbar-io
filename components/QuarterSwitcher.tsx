"use client";

import { useQuarter, useUserRole } from "@/lib/quarters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";
import type { QuarterStatus } from "@/lib/quarters";

// Status-Punkt: Grün=aktiv, Gelb=Entwurf, Grau=archiviert
function StatusDot({ status }: { status: QuarterStatus }) {
  const colors: Record<QuarterStatus, string> = {
    active: "bg-quartier-green",
    draft: "bg-amber-400",
    archived: "bg-gray-400",
  };
  const labels: Record<QuarterStatus, string> = {
    active: "Aktiv",
    draft: "Entwurf",
    archived: "Archiviert",
  };
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${colors[status]}`}
      title={labels[status]}
      aria-label={labels[status]}
    />
  );
}

// Quartier-Umschalter — nur für Super-Admins sichtbar
export function QuarterSwitcher() {
  const { currentQuarter, allQuarters, loading, switchQuarter } = useQuarter();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();

  // Nicht rendern wenn kein Super-Admin oder noch ladend
  if (roleLoading || loading || !isSuperAdmin) return null;
  // Nicht rendern wenn weniger als 2 Quartiere vorhanden
  if (allQuarters.length < 2) return null;

  return (
    <div className="mx-auto flex max-w-lg items-center gap-2 px-4 pt-3 pb-0">
      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Select
        value={currentQuarter?.id ?? null}
        onValueChange={(val) => {
          if (val) switchQuarter(val as string);
        }}
      >
        <SelectTrigger className="h-8 w-full text-xs" size="sm">
          <SelectValue placeholder="Quartier wählen...">
            {currentQuarter && (
              <span className="flex items-center gap-1.5">
                <StatusDot status={currentQuarter.status} />
                <span className="truncate font-medium">
                  {currentQuarter.name}
                </span>
                {currentQuarter.city && (
                  <span className="truncate text-muted-foreground">
                    — {currentQuarter.city}
                  </span>
                )}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" sideOffset={4}>
          {allQuarters.map((q) => (
            <SelectItem key={q.id} value={q.id}>
              <span className="flex items-center gap-1.5">
                <StatusDot status={q.status} />
                <span className="font-medium">{q.name}</span>
                {q.city && (
                  <span className="text-muted-foreground">— {q.city}</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
